import { addDays, fulfilmentOf, lineTotal, orderTotal, suggestAllocation, todayIn, type CustomerProfileView, type LocalDate, type OrderLineView, type QuoteDetail, type QuoteSummary, type SalesOrderDetail, type SalesOrderSummary, type StockForAllocation } from '@basis/shared';
import type { AllocateOrderInput, InvoiceInput, OrderInput, OrderTransition, ProfileInput, QuoteInput, QuoteTransition, ShipInput } from './commercial';

// SAMPLE DATA for `--mode sample`: a few quotes and orders for the sample
// customers, one shipped, one allocated and waiting, one awaiting stock.
// Allocation and fulfilment run on the same rules as the functions.

const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const CUSTOMERS: Record<string, string> = { 'co-avelline': 'Maison Avelline', 'co-solenne': 'Atelier Solenne', 'co-novia': 'Novia Estudio', 'co-halden': 'Halden Bridal', 'co-lorena': 'Casa Lorena Atelier' };
const SKUS: Record<string, { productName: string; shadeCode: string; shadeName: string; shadeHex: string }> = {
  'PWM-160-SK02': { productName: 'Powermesh', shadeCode: 'SK02', shadeName: 'Skin 02', shadeHex: '#D9B59A' },
  'SHL-150-BNE': { productName: 'Shanel Lining', shadeCode: 'BNE', shadeName: 'Bone', shadeHex: '#E8DFD0' },
  'BTL-160-MLK': { productName: 'Bridal Tulle', shadeCode: 'MLK', shadeName: 'Milk', shadeHex: '#F3EEE4' },
  'ISM-160-SK02': { productName: 'Illusion Stretch Mesh', shadeCode: 'SK02', shadeName: 'Skin 02', shadeHex: '#D9B59A' },
};

type QuoteRecord = Mutable<Omit<QuoteDetail, 'total' | 'lineCount' | 'products' | 'orderNumber'>>;
interface OrderRecord extends Mutable<Omit<SalesOrderDetail, 'total' | 'metres' | 'lineCount' | 'products' | 'stage' | 'progress' | 'shipmentNumbers' | 'lines'>> {
  lines: Mutable<Omit<OrderLineView, 'allocated' | 'shipped' | 'allocations'> & { allocations: Mutable<OrderLineView['allocations'][number]>[] }>[];
}

const store = {
  quotes: [] as QuoteRecord[],
  orders: [] as OrderRecord[],
  profiles: new Map<string, Mutable<CustomerProfileView>>(),
  sequence: { QUO: 18, SO: 42, SHP: 20, ALLOC: 0 },
};

const line = (lineNo: number, skuCode: string, quantity: string, unitPrice: string) => ({ id: `ol-${lineNo}-${skuCode}-${quantity}`, lineNo, skuCode, ...SKUS[skuCode]!, quantity, unitPrice, allocations: [] as Mutable<OrderLineView['allocations'][number]>[] });

function seed(): void {
  const t = today();
  store.profiles.set('co-avelline', { type: 'atelier', tier: 'key', paymentTerms: '30 days', currency: 'EUR', notes: 'Couture house; samples go to Claire directly.' });
  store.profiles.set('co-halden', { type: 'salon', tier: 'preferred', paymentTerms: 'Prepaid', currency: 'GBP', notes: '' });
  store.quotes = [
    { id: 'q-18', number: 'QUO-26-0018', state: 'sent', customerId: 'co-solenne', customerName: 'Atelier Solenne', currency: 'EUR', validUntil: addDays(t, 20), createdAt: `${addDays(t, -3)}T10:00:00Z`, contactName: 'Giulia Ferrante', incoterm: 'DAP', namedPlace: 'Milan', paymentTerms: '30 days', notes: '', sentOn: addDays(t, -2), lines: [{ id: 'ql-1', lineNo: 1, skuCode: 'BTL-160-MLK', ...SKUS['BTL-160-MLK']!, quantity: '800000', unitPrice: '42000', leadTimeDays: 10, note: '' }, { id: 'ql-2', lineNo: 2, skuCode: 'PWM-160-SK02', ...SKUS['PWM-160-SK02']!, quantity: '300000', unitPrice: '68000', leadTimeDays: 7, note: '' }] },
    { id: 'q-17', number: 'QUO-26-0017', state: 'draft', customerId: 'co-novia', customerName: 'Novia Estudio', currency: 'EUR', validUntil: null, createdAt: `${addDays(t, -1)}T15:00:00Z`, contactName: '', incoterm: 'DAP', namedPlace: 'Barcelona', paymentTerms: '', notes: 'First order; samples approved last week.', sentOn: null, lines: [{ id: 'ql-3', lineNo: 1, skuCode: 'ISM-160-SK02', ...SKUS['ISM-160-SK02']!, quantity: '200000', unitPrice: '74000', leadTimeDays: null, note: '' }] },
    { id: 'q-16', number: 'QUO-26-0016', state: 'accepted', customerId: 'co-avelline', customerName: 'Maison Avelline', currency: 'EUR', validUntil: addDays(t, -2), createdAt: `${addDays(t, -16)}T10:00:00Z`, contactName: 'Claire Vautrin', incoterm: 'DAP', namedPlace: 'Paris', paymentTerms: '30 days', notes: '', sentOn: addDays(t, -15), lines: [{ id: 'ql-4', lineNo: 1, skuCode: 'PWM-160-SK02', ...SKUS['PWM-160-SK02']!, quantity: '1200000', unitPrice: '68000', leadTimeDays: 5, note: '' }] },
  ];
  store.orders = [
    { id: 'so-41', number: 'SO-26-0041', state: 'confirmed', customerId: 'co-avelline', customerName: 'Maison Avelline', currency: 'EUR', requestedDelivery: addDays(t, 16), confirmedOn: addDays(t, -14), createdAt: `${addDays(t, -14)}T10:00:00Z`, quoteNumber: 'QUO-26-0016', contactName: 'Claire Vautrin', incoterm: 'DAP', namedPlace: 'Paris', paymentTerms: '30 days', shipToName: 'Maison Avelline atelier', shipToAddress: '12 rue de Turenne, 75003 Paris', notes: '', lines: [line(1, 'PWM-160-SK02', '1200000', '68000')], invoices: [] },
    { id: 'so-40', number: 'SO-26-0040', state: 'confirmed', customerId: 'co-halden', customerName: 'Halden Bridal', currency: 'GBP', requestedDelivery: addDays(t, 9), confirmedOn: addDays(t, -6), createdAt: `${addDays(t, -6)}T10:00:00Z`, quoteNumber: null, contactName: '', incoterm: 'DAP', namedPlace: 'London', paymentTerms: 'Prepaid', shipToName: 'Halden Bridal, Marylebone', shipToAddress: '', notes: 'Repeat order.', lines: [line(1, 'SHL-150-BNE', '400000', '45000'), line(2, 'PWM-160-SK02', '250000', '59000')], invoices: [] },
    { id: 'so-39', number: 'SO-26-0039', state: 'shipped', customerId: 'co-lorena', customerName: 'Casa Lorena Atelier', currency: 'USD', requestedDelivery: addDays(t, -10), confirmedOn: addDays(t, -22), createdAt: `${addDays(t, -22)}T10:00:00Z`, quoteNumber: null, contactName: '', incoterm: 'DAP', namedPlace: 'Los Angeles', paymentTerms: '30 days', shipToName: 'Casa Lorena Atelier', shipToAddress: '', notes: '', lines: [line(1, 'PWM-160-SK02', '50000', '72000')], invoices: [{ id: 'inv-1', number: 'INV-2026-0098', amount: '36000000', currency: 'USD', issuedOn: addDays(t, -11), dueOn: addDays(t, 19), paidOn: null }] },
    { id: 'so-38', number: 'SO-26-0038', state: 'closed', customerId: 'co-avelline', customerName: 'Maison Avelline', currency: 'EUR', requestedDelivery: addDays(t, -40), confirmedOn: addDays(t, -52), createdAt: `${addDays(t, -52)}T10:00:00Z`, quoteNumber: null, contactName: 'Claire Vautrin', incoterm: 'DAP', namedPlace: 'Paris', paymentTerms: '30 days', shipToName: 'Maison Avelline atelier', shipToAddress: '', notes: '', lines: [line(1, 'BTL-160-MLK', '600000', '41000')], invoices: [{ id: 'inv-0', number: 'INV-2026-0071', amount: '24600000', currency: 'EUR', issuedOn: addDays(t, -41), dueOn: addDays(t, -11), paidOn: addDays(t, -13) }] },
  ];
  // SO-26-0040 holds two rolls of lining and five of Powermesh already; SO-26-0039 shipped one roll from the warehouse.
  const halden = store.orders[1]!;
  halden.lines[0]!.allocations = Array.from({ length: 8 }, (_, index) => ({ id: `al-40-l-${index}`, lotNumber: 'LOT-26-0004', rollNumber: `LOT-26-0004-${String(index + 2).padStart(2, '0')}`, locationName: 'BASIS warehouse', quantity: '50000', shipped: false }));
  halden.lines[1]!.allocations = Array.from({ length: 5 }, (_, index) => ({ id: `al-40-p-${index}`, lotNumber: 'LOT-26-0003', rollNumber: `LOT-26-0003-${String(index + 3).padStart(2, '0')}`, locationName: 'BASIS warehouse', quantity: '50000', shipped: false }));
  const lorena = store.orders[2]!;
  lorena.lines[0]!.allocations = [{ id: 'al-39', lotNumber: 'LOT-26-0003', rollNumber: 'LOT-26-0003-02', locationName: 'BASIS warehouse', quantity: '50000', shipped: true }];
  (lorena as unknown as { shipmentNumber: string }).shipmentNumber = 'SHP-26-0012';
  const avelline = store.orders[3]!;
  avelline.lines[0]!.allocations = Array.from({ length: 12 }, (_, index) => ({ id: `al-38-${index}`, lotNumber: 'LOT-26-0005', rollNumber: `LOT-26-0005-${String(index + 1).padStart(2, '0')}`, locationName: 'BASIS warehouse', quantity: '50000', shipped: true }));
}
seed();

const shipmentsOf = new Map<string, string[]>([['SO-26-0039', ['SHP-26-0012']], ['SO-26-0038', ['SHP-26-0009']]]);

function quoteSummary(quote: QuoteRecord): QuoteSummary {
  return { ...quote, total: orderTotal(quote.lines), lineCount: quote.lines.length, products: [...new Set(quote.lines.map((line) => line.productName))], orderNumber: store.orders.find((order) => order.quoteNumber === quote.number)?.number ?? null };
}

function orderLines(order: OrderRecord): OrderLineView[] {
  return order.lines.map((line) => ({ ...line, allocated: line.allocations.filter((allocation) => !allocation.shipped).reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n).toString(), shipped: line.allocations.filter((allocation) => allocation.shipped).reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n).toString() }));
}

function orderSummary(order: OrderRecord): SalesOrderSummary {
  const lines = orderLines(order);
  const fulfilment = fulfilmentOf(lines, order.state === 'closed');
  return { id: order.id, number: order.number, state: order.state, stage: fulfilment.stage, progress: fulfilment.progress, customerId: order.customerId, customerName: order.customerName, currency: order.currency, requestedDelivery: order.requestedDelivery, total: orderTotal(order.lines), metres: order.lines.reduce((sum, line) => sum + BigInt(line.quantity), 0n).toString(), lineCount: order.lines.length, products: [...new Set(order.lines.map((line) => line.productName))], shipmentNumbers: shipmentsOf.get(order.number) ?? [], confirmedOn: order.confirmedOn, createdAt: order.createdAt };
}

function detail(order: OrderRecord): SalesOrderDetail {
  return { ...orderSummary(order), quoteNumber: order.quoteNumber, contactName: order.contactName, incoterm: order.incoterm, namedPlace: order.namedPlace, paymentTerms: order.paymentTerms, shipToName: order.shipToName, shipToAddress: order.shipToAddress, notes: order.notes, lines: orderLines(order), invoices: order.invoices };
}

function find(number: string): OrderRecord {
  const order = store.orders.find((candidate) => candidate.number === number);
  if (!order) throw new Error(`No sales order ${number}.`);
  return order;
}

async function stockFor(skuCode: string, exceptOrder?: string): Promise<StockForAllocation[]> {
  const { sampleInventory } = await import('./sample-inventory');
  const balances = (await sampleInventory.balances()).filter((balance) => balance.skuCode === skuCode && balance.locationKind === 'physical');
  const held = store.orders.filter((order) => order.number !== exceptOrder && order.state !== 'cancelled').flatMap((order) => order.lines.flatMap((line) => line.allocations.filter((allocation) => !allocation.shipped)));
  const out: StockForAllocation[] = [];
  for (const balance of balances) {
    const positions = await sampleInventory.rollPositions(balance.lotNumber);
    const heldHere = held.filter((allocation) => allocation.lotNumber === balance.lotNumber && allocation.locationName === balance.locationName);
    const heldRolls = new Set(heldHere.map((allocation) => allocation.rollNumber));
    const available = BigInt(balance.onHand) - heldHere.reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n);
    if (available <= 0n) continue;
    out.push({ lotNumber: balance.lotNumber, locationId: balance.locationId, locationName: balance.locationName, available: available.toString(), receivedAt: balance.lotNumber, rolls: positions.filter((roll) => roll.locationId === balance.locationId && !heldRolls.has(roll.number) && BigInt(roll.remainingLength ?? '0') > 0n).map((roll) => ({ number: roll.number, remaining: roll.remainingLength ?? '0' })) });
  }
  return out;
}

export const sampleCommercial = {
  async quotes(): Promise<QuoteSummary[]> {
    return structuredClone(store.quotes.map(quoteSummary));
  },
  async quote(number: string): Promise<QuoteDetail | null> {
    const quote = store.quotes.find((candidate) => candidate.number === number);
    return quote ? structuredClone({ ...quoteSummary(quote), contactName: quote.contactName, incoterm: quote.incoterm, namedPlace: quote.namedPlace, paymentTerms: quote.paymentTerms, notes: quote.notes, sentOn: quote.sentOn, lines: quote.lines }) : null;
  },
  async orders(): Promise<SalesOrderSummary[]> {
    return structuredClone(store.orders.map(orderSummary));
  },
  async order(number: string): Promise<SalesOrderDetail | null> {
    const order = store.orders.find((candidate) => candidate.number === number);
    return order ? structuredClone(detail(order)) : null;
  },
  async customer(customerId: string): Promise<{ orders: SalesOrderSummary[]; profile: CustomerProfileView | null }> {
    return structuredClone({ orders: store.orders.filter((order) => order.customerId === customerId).map(orderSummary), profile: store.profiles.get(customerId) ?? null });
  },
  stockFor,
  async upsertProfile(input: ProfileInput): Promise<{ companyId: string }> {
    store.profiles.set(input.companyId, { type: input.type ?? null, tier: input.tier, paymentTerms: input.paymentTerms ?? '', currency: input.currency ?? '', notes: input.notes ?? '' });
    return { companyId: input.companyId };
  },
  async saveQuote(input: QuoteInput): Promise<{ number: string; total: string }> {
    const lines = input.lines.map((entry, index) => ({ id: `ql-${Date.now()}-${index}`, lineNo: index + 1, skuCode: entry.skuCode, ...(SKUS[entry.skuCode] ?? { productName: entry.skuCode, shadeCode: '', shadeName: '', shadeHex: '#CCCCCC' }), quantity: entry.quantity, unitPrice: entry.unitPrice, leadTimeDays: entry.leadTimeDays ?? null, note: entry.note ?? '' }));
    if (input.number) {
      const quote = store.quotes.find((candidate) => candidate.number === input.number);
      if (!quote) throw new Error(`No quote ${input.number}.`);
      if (quote.state !== 'draft') throw new Error(`${quote.number} is ${quote.state}; only a draft changes.`);
      Object.assign(quote, { customerId: input.customerId, customerName: CUSTOMERS[input.customerId] ?? input.customerId, currency: input.currency, incoterm: input.incotermCode ?? '', namedPlace: input.namedPlace ?? '', paymentTerms: input.paymentTerms ?? '', validUntil: (input.validUntil ?? null) as LocalDate | null, notes: input.notes ?? '', lines });
      return { number: quote.number, total: orderTotal(lines) };
    }
    store.sequence.QUO += 1;
    const number = `QUO-26-${String(store.sequence.QUO).padStart(4, '0')}`;
    store.quotes.unshift({ id: `q-${number}`, number, state: 'draft', customerId: input.customerId, customerName: CUSTOMERS[input.customerId] ?? input.customerId, currency: input.currency, validUntil: (input.validUntil ?? null) as LocalDate | null, createdAt: new Date().toISOString(), contactName: '', incoterm: input.incotermCode ?? '', namedPlace: input.namedPlace ?? '', paymentTerms: input.paymentTerms ?? '', notes: input.notes ?? '', sentOn: null, lines });
    return { number, total: orderTotal(lines) };
  },
  async transitionQuote(input: QuoteTransition): Promise<{ number: string; state: string; orderNumber: string | null }> {
    const quote = store.quotes.find((candidate) => candidate.number === input.number);
    if (!quote) throw new Error(`No quote ${input.number}.`);
    const allowed: Record<string, string[]> = { sent: ['draft', 'sent'], accepted: ['sent', 'draft'], declined: ['sent', 'draft'] };
    if (!allowed[input.to]!.includes(quote.state)) throw new Error(`${quote.number} is ${quote.state}; it cannot be ${input.to}.`);
    quote.state = input.to;
    if (input.to === 'sent') quote.sentOn = today();
    let orderNumber: string | null = null;
    if (input.to === 'accepted') {
      store.sequence.SO += 1;
      orderNumber = `SO-26-${String(store.sequence.SO).padStart(4, '0')}`;
      store.orders.unshift({ id: `so-${orderNumber}`, number: orderNumber, state: 'confirmed', customerId: quote.customerId, customerName: quote.customerName, currency: quote.currency, requestedDelivery: (input.requestedDelivery ?? null) as LocalDate | null, confirmedOn: today(), createdAt: new Date().toISOString(), quoteNumber: quote.number, contactName: quote.contactName, incoterm: quote.incoterm, namedPlace: quote.namedPlace, paymentTerms: quote.paymentTerms, shipToName: '', shipToAddress: '', notes: quote.notes, lines: quote.lines.map((entry) => line(entry.lineNo, entry.skuCode, entry.quantity, entry.unitPrice)), invoices: [] });
    }
    return { number: quote.number, state: input.to, orderNumber };
  },
  async createOrder(input: OrderInput): Promise<{ number: string; total: string }> {
    store.sequence.SO += 1;
    const number = `SO-26-${String(store.sequence.SO).padStart(4, '0')}`;
    const lines = input.lines.map((entry, index) => line(index + 1, entry.skuCode, entry.quantity, entry.unitPrice));
    store.orders.unshift({ id: `so-${number}`, number, state: input.confirm === false ? 'draft' : 'confirmed', customerId: input.customerId, customerName: CUSTOMERS[input.customerId] ?? input.customerId, currency: input.currency, requestedDelivery: (input.requestedDelivery ?? null) as LocalDate | null, confirmedOn: input.confirm === false ? null : today(), createdAt: new Date().toISOString(), quoteNumber: null, contactName: '', incoterm: input.incotermCode ?? '', namedPlace: input.namedPlace ?? '', paymentTerms: input.paymentTerms ?? '', shipToName: input.shipToName ?? '', shipToAddress: input.shipToAddress ?? '', notes: input.notes ?? '', lines, invoices: [] });
    return { number, total: orderTotal(lines) };
  },
  async transitionOrder(input: OrderTransition): Promise<{ number: string; state: string }> {
    const order = find(input.number);
    const allowed: Record<string, string[]> = { confirmed: ['draft'], cancelled: ['draft', 'confirmed'], closed: ['shipped'] };
    if (!allowed[input.to]!.includes(order.state)) throw new Error(`${order.number} is ${order.state}; it cannot be ${input.to}.`);
    if (input.to === 'cancelled') for (const entry of order.lines) entry.allocations = entry.allocations.filter((allocation) => allocation.shipped);
    if (input.to === 'confirmed') order.confirmedOn = today();
    order.state = input.to;
    return { number: order.number, state: input.to };
  },
  async allocate(input: AllocateOrderInput): Promise<{ number: string; results: { lineId: string; skuCode: string; allocated: string; short: string }[] }> {
    const order = find(input.number);
    if (order.state !== 'confirmed') throw new Error(`${order.number} is ${order.state}; stock is held for a confirmed order.`);
    const results: { lineId: string; skuCode: string; allocated: string; short: string }[] = [];
    for (const entry of order.lines) {
      entry.allocations = entry.allocations.filter((allocation) => allocation.shipped);
      const shipped = entry.allocations.reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n);
      const need = BigInt(entry.quantity) - shipped;
      if (need <= 0n) {
        results.push({ lineId: entry.id, skuCode: entry.skuCode, allocated: '0', short: '0' });
        continue;
      }
      const stock = await stockFor(entry.skuCode, order.number);
      const given = input.allocations?.filter((allocation) => allocation.lineId === entry.id);
      const plan = given && given.length > 0 ? given.map((allocation) => ({ lotNumber: allocation.lotNumber, locationId: allocation.locationId, rollNumber: allocation.rollNumber ?? null, quantity: allocation.quantity })) : suggestAllocation(need.toString(), stock).plan;
      let allocated = 0n;
      for (const planned of plan) {
        const source = stock.find((candidate) => candidate.lotNumber === planned.lotNumber && candidate.locationId === planned.locationId);
        if (!source || BigInt(source.available) < BigInt(planned.quantity)) throw new Error(`Only ${Number(source?.available ?? 0) / 1000} m of ${planned.lotNumber} is free at that place.`);
        store.sequence.ALLOC += 1;
        entry.allocations.push({ id: `al-${store.sequence.ALLOC}`, lotNumber: planned.lotNumber, rollNumber: planned.rollNumber, locationName: source.locationName, quantity: planned.quantity, shipped: false });
        allocated += BigInt(planned.quantity);
      }
      results.push({ lineId: entry.id, skuCode: entry.skuCode, allocated: allocated.toString(), short: (need - allocated > 0n ? need - allocated : 0n).toString() });
    }
    return { number: order.number, results };
  },
  async ship(input: ShipInput): Promise<{ number: string; shipmentNumber: string; metres: string; complete: boolean }> {
    const order = find(input.number);
    if (order.state !== 'confirmed') throw new Error(`${order.number} is ${order.state}; a confirmed order ships.`);
    const open = order.lines.flatMap((entry) => entry.allocations.filter((allocation) => !allocation.shipped));
    if (open.length === 0) throw new Error('Nothing is allocated; hold the stock first.');
    const { sampleInventory } = await import('./sample-inventory');
    store.sequence.SHP += 1;
    const shipmentNumber = `SHP-26-${String(store.sequence.SHP).padStart(4, '0')}`;
    let metres = 0n;
    for (const entry of order.lines) {
      for (const allocation of entry.allocations) {
        if (allocation.shipped) continue;
        await sampleInventory.shipOut({ skuCode: entry.skuCode, lotNumber: allocation.lotNumber, rollNumber: allocation.rollNumber, quantity: allocation.quantity, locationName: allocation.locationName, orderNumber: order.number });
        allocation.shipped = true;
        metres += BigInt(allocation.quantity);
      }
    }
    shipmentsOf.set(order.number, [...(shipmentsOf.get(order.number) ?? []), shipmentNumber]);
    const complete = order.lines.every((entry) => entry.allocations.filter((allocation) => allocation.shipped).reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n) >= BigInt(entry.quantity));
    if (complete) order.state = 'shipped';
    return { number: order.number, shipmentNumber, metres: metres.toString(), complete };
  },
  async invoice(input: InvoiceInput): Promise<{ number: string; invoiceNumber: string }> {
    const order = find(input.number);
    const existing = order.invoices.find((invoice) => invoice.number === input.invoiceNumber);
    const next = { id: existing?.id ?? `inv-${input.invoiceNumber}`, number: input.invoiceNumber, amount: input.amount, currency: input.currency ?? order.currency, issuedOn: (input.issuedOn ?? null) as LocalDate | null, dueOn: (input.dueOn ?? null) as LocalDate | null, paidOn: (input.paidOn ?? null) as LocalDate | null };
    order.invoices = existing ? order.invoices.map((invoice) => (invoice.id === existing.id ? next : invoice)) : [...order.invoices, next];
    return { number: order.number, invoiceNumber: input.invoiceNumber };
  },
};

export { lineTotal };
