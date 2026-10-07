import { addDays, balancesFrom, legStatus, receiptCheck, todayIn, type LocalDate, type MovementReason, type MovementView, type ReceiptView, type ReorderPolicyView, type StockBalanceView, type StockLocationView } from '@basis/shared';
import type { MovementInput, NewLocationInput, ReceiveInput, ReorderInput, RollPosition } from './inventory';

// SAMPLE DATA for `--mode sample`: a warehouse and a showroom, the sample kit
// shipment received, one lot in stock from an earlier shipment with a cut
// taken for swatches. Balances are derived from the ledger here as in the
// functions; nothing is typed in.

const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const LOCATIONS: Mutable<StockLocationView>[] = [
  { id: 'sl-wh', name: 'BASIS warehouse', kind: 'physical', zone: '', placeName: 'Tel Aviv', isDefault: true },
  { id: 'sl-show', name: 'Showroom', kind: 'physical', zone: 'A1', placeName: 'Tel Aviv', isDefault: false },
  { id: 'sl-samples', name: 'Samples', kind: 'samples', zone: '', placeName: '', isDefault: false },
  { id: 'sl-adjust', name: 'Adjustments', kind: 'adjustment', zone: '', placeName: '', isDefault: false },
  { id: 'sl-scrap', name: 'Scrap', kind: 'scrap', zone: '', placeName: '', isDefault: false },
  { id: 'sl-customer', name: 'With customers', kind: 'customer', zone: '', placeName: '', isDefault: false },
];

interface SkuFacts { productName: string; variantName: string; shadeCode: string; shadeName: string; shadeHex: string; familyCode: string; familyName: string }
const SKUS: Record<string, SkuFacts> = {
  'PWM-160-SK02': { productName: 'Powermesh', variantName: '160 cm', shadeCode: 'SK02', shadeName: 'Skin 02', shadeHex: '#D9B59A', familyCode: 'MSH', familyName: 'Mesh' },
  'SHL-150-BNE': { productName: 'Shanel Lining', variantName: '150 cm', shadeCode: 'BNE', shadeName: 'Bone', shadeHex: '#E8DFD0', familyCode: 'LIN', familyName: 'Lining' },
  'BTL-160-MLK': { productName: 'Bridal Tulle', variantName: '160 cm', shadeCode: 'MLK', shadeName: 'Milk', shadeHex: '#F3EEE4', familyCode: 'TUL', familyName: 'Tulle' },
  'ISM-160-SK02': { productName: 'Illusion Stretch Mesh', variantName: '160 cm', shadeCode: 'SK02', shadeName: 'Skin 02', shadeHex: '#D9B59A', familyCode: 'MSH', familyName: 'Mesh' },
};

const store = {
  locations: LOCATIONS,
  movements: [] as Mutable<MovementView>[],
  receipts: [] as ReceiptView[],
  policies: [] as Mutable<ReorderPolicyView>[],
  /** Rolls known to the ledger: measured length, where they are, what is left. */
  rolls: new Map<string, { lotNumber: string; measuredLength: string; remaining: string; locationId: string | null }>(),
  sequence: { RCV: 2, MOVE: 0, LOC: 0 },
};

const locationName = (id: string | null) => store.locations.find((location) => location.id === id)?.name ?? '';

function push(movement: Omit<MovementView, 'id' | 'fromLocationName' | 'toLocationName' | 'actorName'>): void {
  store.sequence.MOVE += 1;
  store.movements.unshift({ ...movement, id: `mv-${store.sequence.MOVE}`, fromLocationName: locationName(movement.fromLocationId), toLocationName: locationName(movement.toLocationId), actorName: 'Sample session' });
  if (movement.rollNumber) {
    const roll = store.rolls.get(movement.rollNumber);
    if (roll) {
      const quantity = BigInt(movement.quantity);
      const left = BigInt(roll.remaining);
      if (quantity < left) roll.remaining = (left - quantity).toString();
      else {
        roll.locationId = movement.toLocationId;
        if (!movement.toLocationId) roll.remaining = '0';
      }
    }
  }
}

function seed(): void {
  const t = today();
  const at = (offset: number, hour = 9) => `${addDays(t, offset)}T${String(hour).padStart(2, '0')}:00:00Z`;
  // An earlier shipment, long received: 21 cartons of Powermesh and 8 of lining.
  for (let roll = 1; roll <= 126; roll += 1) {
    const number = `LOT-26-0003-${String(roll).padStart(2, '0')}`;
    store.rolls.set(number, { lotNumber: 'LOT-26-0003', measuredLength: '50000', remaining: '50000', locationId: 'sl-wh' });
    push({ skuCode: 'PWM-160-SK02', lotNumber: 'LOT-26-0003', rollNumber: number, quantity: '50000', fromLocationId: null, toLocationId: 'sl-wh', reason: 'receipt', sourceType: 'receipt', sourceId: 'RCV-26-0001', note: '', occurredAt: at(-41) });
  }
  for (let roll = 1; roll <= 48; roll += 1) {
    const number = `LOT-26-0004-${String(roll).padStart(2, '0')}`;
    store.rolls.set(number, { lotNumber: 'LOT-26-0004', measuredLength: '50000', remaining: '50000', locationId: 'sl-wh' });
    push({ skuCode: 'SHL-150-BNE', lotNumber: 'LOT-26-0004', rollNumber: number, quantity: '50000', fromLocationId: null, toLocationId: 'sl-wh', reason: 'receipt', sourceType: 'receipt', sourceId: 'RCV-26-0001', note: '', occurredAt: at(-41) });
  }
  store.receipts.push({ id: 'rcv-1', number: 'RCV-26-0001', shipmentNumber: 'SHP-26-0011', locationName: 'BASIS warehouse', receivedOn: addDays(t, -41), receivedByName: 'Sample session', note: '', lines: [{ lotNumber: 'LOT-26-0003', skuCode: 'PWM-160-SK02', expected: '6300000', received: '6300000', rollsExpected: 126, rollsReceived: 126, note: '' }, { lotNumber: 'LOT-26-0004', skuCode: 'SHL-150-BNE', expected: '2400000', received: '2400000', rollsExpected: 48, rollsReceived: 48, note: '' }], discrepancies: 0, createdAt: at(-41) });
  // Two rolls to the showroom, swatches cut, a stocktake adjustment, a courier pick for a customer.
  push({ skuCode: 'PWM-160-SK02', lotNumber: 'LOT-26-0003', rollNumber: 'LOT-26-0003-01', quantity: '50000', fromLocationId: 'sl-wh', toLocationId: 'sl-show', reason: 'transfer', sourceType: 'manual', sourceId: '', note: 'Display roll', occurredAt: at(-38) });
  push({ skuCode: 'SHL-150-BNE', lotNumber: 'LOT-26-0004', rollNumber: 'LOT-26-0004-01', quantity: '50000', fromLocationId: 'sl-wh', toLocationId: 'sl-show', reason: 'transfer', sourceType: 'manual', sourceId: '', note: 'Display roll', occurredAt: at(-38) });
  push({ skuCode: 'PWM-160-SK02', lotNumber: 'LOT-26-0003', rollNumber: 'LOT-26-0003-01', quantity: '3000', fromLocationId: 'sl-show', toLocationId: 'sl-samples', reason: 'sample_cut', sourceType: 'manual', sourceId: '', note: 'Swatches for Maison Avelline', occurredAt: at(-20) });
  push({ skuCode: 'PWM-160-SK02', lotNumber: 'LOT-26-0003', rollNumber: 'LOT-26-0003-02', quantity: '50000', fromLocationId: 'sl-wh', toLocationId: 'sl-customer', reason: 'ship', sourceType: 'sales_order', sourceId: 'SO-26-0031', note: '', occurredAt: at(-12) });
  push({ skuCode: 'SHL-150-BNE', lotNumber: 'LOT-26-0004', rollNumber: null, quantity: '1200', fromLocationId: 'sl-wh', toLocationId: 'sl-adjust', reason: 'adjust', sourceType: 'manual', sourceId: '', note: 'Stocktake: one roll measured short', occurredAt: at(-5) });
  // The sample kit, received yesterday.
  store.rolls.set('LOT-26-0009-KIT', { lotNumber: 'LOT-26-0009', measuredLength: '12000', remaining: '12000', locationId: 'sl-wh' });
  push({ skuCode: 'PWM-160-SK02', lotNumber: 'LOT-26-0009', rollNumber: null, quantity: '12000', fromLocationId: null, toLocationId: 'sl-wh', reason: 'receipt', sourceType: 'receipt', sourceId: 'RCV-26-0002', note: '', occurredAt: at(-1) });
  store.receipts.unshift({ id: 'rcv-2', number: 'RCV-26-0002', shipmentNumber: 'SHP-26-0013', locationName: 'BASIS warehouse', receivedOn: addDays(t, -1), receivedByName: 'Sample session', note: 'Sample kit returned from the courier run', lines: [{ lotNumber: 'LOT-26-0009', skuCode: 'PWM-160-SK02', expected: '12000', received: '12000', rollsExpected: 0, rollsReceived: 0, note: '' }], discrepancies: 0, createdAt: at(-1) });
  store.policies = [
    { id: 'rp-1', skuCode: 'PWM-160-SK02', reorderPoint: '7000000', targetLevel: '15000000', productName: 'Powermesh', shadeName: 'Skin 02', locationName: '' },
    { id: 'rp-2', skuCode: 'SHL-150-BNE', reorderPoint: '1000000', targetLevel: '4000000', productName: 'Shanel Lining', shadeName: 'Bone', locationName: '' },
    { id: 'rp-3', skuCode: 'BTL-160-MLK', reorderPoint: '3000000', targetLevel: '9000000', productName: 'Bridal Tulle', shadeName: 'Milk', locationName: '' },
  ];
}
seed();

function balances(): StockBalanceView[] {
  return balancesFrom(store.movements).map((balance) => {
    const location = store.locations.find((candidate) => candidate.id === balance.locationId)!;
    const facts = SKUS[balance.skuCode] ?? { productName: balance.skuCode, variantName: '', shadeCode: '', shadeName: '', shadeHex: '#CCCCCC', familyCode: '', familyName: '' };
    const rolls = [...store.rolls.values()].filter((roll) => roll.lotNumber === balance.lotNumber && roll.locationId === balance.locationId && roll.remaining !== '0').length;
    return { id: `${balance.lotNumber}-${balance.locationId}`, ...balance, locationName: location.name, locationKind: location.kind, ...facts, rolls, updatedAt: store.movements.find((movement) => movement.lotNumber === balance.lotNumber)?.occurredAt ?? '' };
  });
}

export const sampleInventory = {
  async locations(): Promise<StockLocationView[]> {
    return structuredClone(store.locations);
  },
  async balances(): Promise<StockBalanceView[]> {
    return structuredClone(balances());
  },
  async movements(lotNumber?: string): Promise<MovementView[]> {
    const list = lotNumber ? store.movements.filter((movement) => movement.lotNumber === lotNumber) : store.movements.slice(0, 200);
    return structuredClone(list);
  },
  async receipts(): Promise<ReceiptView[]> {
    return structuredClone(store.receipts);
  },
  async reorderPolicies(): Promise<ReorderPolicyView[]> {
    return structuredClone(store.policies);
  },
  async rollPositions(lotNumber: string): Promise<RollPosition[]> {
    const { sampleManufacturing } = await import('./sample-manufacturing');
    const lot = await sampleManufacturing.lot(lotNumber);
    const known = [...store.rolls.entries()].filter(([, roll]) => roll.lotNumber === lotNumber).map(([number, roll]) => ({ number, remainingLength: roll.remaining, locationId: roll.locationId, locationName: locationName(roll.locationId) }));
    if (known.length > 0) return known;
    return (lot?.rolls ?? []).map((roll) => ({ number: roll.number, remainingLength: null, locationId: null, locationName: '' }));
  },
  async createLocation(input: NewLocationInput): Promise<{ id: string }> {
    store.sequence.LOC += 1;
    const id = `sl-${store.sequence.LOC}`;
    if (input.isDefault) for (const location of store.locations) location.isDefault = false;
    store.locations.push({ id, name: input.name, kind: input.kind ?? 'physical', zone: input.zone ?? '', placeName: '', isDefault: input.isDefault ?? false });
    return { id };
  },
  async receive(input: ReceiveInput): Promise<{ receipt: string; received: string; rolls: number; discrepancies: number; closed: boolean }> {
    const { sampleLogistics } = await import('./sample-logistics');
    const shipment = await sampleLogistics.shipment(input.number);
    if (!shipment) throw new Error(`No shipment ${input.number}.`);
    const main = shipment.legs.find((leg) => leg.type === 'main_carriage') ?? shipment.legs[shipment.legs.length - 1];
    if (main && legStatus(main) !== 'arrived') throw new Error(`${input.number} has not arrived: the main carriage is ${legStatus(main)}. Record the arrival on its leg first.`);
    const location = store.locations.find((candidate) => candidate.id === input.locationId);
    if (!location || location.kind !== 'physical') throw new Error('Goods are received into a warehouse.');
    store.sequence.RCV += 1;
    const number = `RCV-26-${String(store.sequence.RCV).padStart(4, '0')}`;
    const when = new Date().toISOString();
    const lines: Mutable<ReceiptView['lines'][number]>[] = [];
    let total = 0n;
    let rolls = 0;
    for (const entry of input.lines) {
      const line = shipment.lines.find((candidate) => candidate.id === entry.shipmentLineId);
      if (!line) throw new Error('A line that is not on this shipment.');
      const travelling = shipment.units.flatMap((unit) => unit.contents.filter((content) => content.lotNumber === line.lotNumber && content.rollNumber).map((content) => ({ number: content.rollNumber!, measuredLength: content.quantity })));
      let received = 0n;
      let count = 0;
      if (travelling.length > 0) {
        const chosen = entry.rollNumbers ? travelling.filter((roll) => entry.rollNumbers!.includes(roll.number)) : travelling;
        for (const roll of chosen) {
          store.rolls.set(roll.number, { lotNumber: line.lotNumber, measuredLength: roll.measuredLength, remaining: roll.measuredLength, locationId: null });
          push({ skuCode: line.skuCode, lotNumber: line.lotNumber, rollNumber: roll.number, quantity: roll.measuredLength, fromLocationId: null, toLocationId: location.id, reason: 'receipt', sourceType: 'receipt', sourceId: number, note: '', occurredAt: when });
          received += BigInt(roll.measuredLength);
          count += 1;
        }
      } else {
        received = BigInt(entry.receivedQuantity ?? line.quantity);
        if (received > 0n) push({ skuCode: line.skuCode, lotNumber: line.lotNumber, rollNumber: null, quantity: received.toString(), fromLocationId: null, toLocationId: location.id, reason: 'receipt', sourceType: 'receipt', sourceId: number, note: '', occurredAt: when });
      }
      lines.push({ lotNumber: line.lotNumber, skuCode: line.skuCode, expected: line.quantity, received: received.toString(), rollsExpected: travelling.length, rollsReceived: count, note: entry.note ?? '' });
      total += received;
      rolls += count;
    }
    const discrepancies = receiptCheck(lines.map((line, index) => ({ shipmentLineId: String(index), lotNumber: line.lotNumber, expected: line.expected, received: line.received }))).filter((check) => check.short || check.over).length;
    store.receipts.unshift({ id: `rcv-${number}`, number, shipmentNumber: input.number, locationName: location.name, receivedOn: (input.receivedOn ?? today()) as LocalDate, receivedByName: 'Sample session', note: input.note ?? '', lines, discrepancies, createdAt: when });
    const receivedLots = new Set(store.receipts.filter((receipt) => receipt.shipmentNumber === input.number).flatMap((receipt) => receipt.lines.map((line) => line.lotNumber)));
    const closed = shipment.lines.every((line) => receivedLots.has(line.lotNumber));
    if (closed) await sampleLogistics.close(input.number);
    return { receipt: number, received: total.toString(), rolls, discrepancies, closed };
  },
  async move(input: MovementInput): Promise<{ lotNumber: string; quantity: string }> {
    const roll = input.rollNumber ? store.rolls.get(input.rollNumber) : null;
    if (input.rollNumber && !roll) throw new Error(`${input.rollNumber} is not in stock.`);
    const virtual = (kind: StockLocationView['kind']) => store.locations.find((candidate) => candidate.kind === kind)!.id;
    let fromId = input.fromLocationId ?? roll?.locationId ?? null;
    let toId = input.toLocationId ?? null;
    let quantity: bigint;
    const left = roll ? BigInt(roll.remaining) : 0n;
    switch (input.kind) {
      case 'transfer':
        if (!fromId || !toId) throw new Error('A transfer has a place from and a place to.');
        quantity = roll ? left : BigInt(input.quantity ?? '0');
        break;
      case 'sample_cut':
        if (!fromId) throw new Error('Where the cut is taken from.');
        toId = virtual('samples');
        quantity = BigInt(input.quantity ?? '0');
        if (roll && quantity > left) throw new Error(`${input.rollNumber} has ${Number(left) / 1000} m left.`);
        break;
      case 'scrap':
        if (!fromId) throw new Error('Where the scrap is taken from.');
        toId = virtual('scrap');
        quantity = roll ? (input.quantity ? BigInt(input.quantity) : left) : BigInt(input.quantity ?? '0');
        break;
      case 'return':
        if (!toId) throw new Error('Where the return goes.');
        fromId = fromId ?? virtual('customer');
        quantity = roll ? left : BigInt(input.quantity ?? '0');
        break;
      case 'adjust': {
        const signed = BigInt(input.quantity ?? '0');
        const place = input.toLocationId ?? input.fromLocationId;
        if (!place) throw new Error('Which place is adjusted.');
        if (signed >= 0n) {
          fromId = virtual('adjustment');
          toId = place;
          quantity = signed;
        } else {
          fromId = place;
          toId = virtual('adjustment');
          quantity = -signed;
        }
        break;
      }
    }
    if (quantity <= 0n) throw new Error('A quantity is more than zero.');
    if (fromId && store.locations.find((candidate) => candidate.id === fromId)?.kind !== 'adjustment') {
      const have = balancesFrom(store.movements).find((balance) => balance.lotNumber === input.lotNumber && balance.locationId === fromId);
      if (BigInt(have?.onHand ?? '0') < quantity) throw new Error(`Only ${Number(have?.onHand ?? 0) / 1000} m of ${input.lotNumber} is at that place.`);
    }
    const skuCode = store.movements.find((movement) => movement.lotNumber === input.lotNumber)?.skuCode ?? 'BTL-160-MLK';
    push({ skuCode, lotNumber: input.lotNumber, rollNumber: input.rollNumber ?? null, quantity: quantity.toString(), fromLocationId: fromId, toLocationId: toId, reason: input.kind as MovementReason, sourceType: 'manual', sourceId: '', note: input.note, occurredAt: new Date().toISOString() });
    return { lotNumber: input.lotNumber, quantity: quantity.toString() };
  },
  async setReorder(input: ReorderInput): Promise<{ skuCode: string }> {
    const existing = store.policies.find((policy) => policy.skuCode === input.skuCode);
    const facts = SKUS[input.skuCode];
    if (existing) Object.assign(existing, { reorderPoint: input.reorderPoint, targetLevel: input.targetLevel });
    else store.policies.push({ id: `rp-${input.skuCode}`, skuCode: input.skuCode, reorderPoint: input.reorderPoint, targetLevel: input.targetLevel, productName: facts?.productName ?? input.skuCode, shadeName: facts?.shadeName ?? '', locationName: '' });
    return { skuCode: input.skuCode };
  },
};
