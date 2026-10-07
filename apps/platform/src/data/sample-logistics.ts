import { addDays, defaultLegs, legStatus, shipmentHealth, todayIn, type HandlingUnitView, type LegType, type LocalDate, type PlaceOption, type ReferenceType, type ShipmentDetail, type ShipmentState, type ShipmentSummary, type TransportMode } from '@basis/shared';
import type { LegUpdateInput, NewShipmentInput, RequirementView, ShipmentDetailsInput, ShippableUnit, UnitsInput } from './logistics';
import { detailOf, summaryOf } from './logistics';

// SAMPLE DATA for `--mode sample`: four shipments on the water, in the air
// and delivered, and one draft being loaded with the cartons the tulle run
// packed. The same derivation code runs here as in the functions.

const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
const day = (offset: number) => addDays(today(), offset);

type Place = { id: string; type: string; name: string; city: string; locationCode: string; country: { code: string; name: string } };
const PLACES: Place[] = [
  { id: 'pl-ngb', type: 'port', name: 'Port of Ningbo', city: 'Ningbo', locationCode: 'CNNGB', country: { code: 'CN', name: 'China' } },
  { id: 'pl-sha', type: 'port', name: 'Port of Shanghai', city: 'Shanghai', locationCode: 'CNSHA', country: { code: 'CN', name: 'China' } },
  { id: 'pl-pvg', type: 'airport', name: 'Shanghai Pudong', city: 'Shanghai', locationCode: 'PVG', country: { code: 'CN', name: 'China' } },
  { id: 'pl-cfs', type: 'consolidation_hub', name: 'Marlin Ningbo CFS', city: 'Ningbo', locationCode: '', country: { code: 'CN', name: 'China' } },
  { id: 'pl-ash', type: 'port', name: 'Port of Ashdod', city: 'Ashdod', locationCode: 'ILASH', country: { code: 'IL', name: 'Israel' } },
  { id: 'pl-tlv', type: 'airport', name: 'Ben Gurion', city: 'Tel Aviv', locationCode: 'TLV', country: { code: 'IL', name: 'Israel' } },
  { id: 'pl-rtm', type: 'port', name: 'Port of Rotterdam', city: 'Rotterdam', locationCode: 'NLRTM', country: { code: 'NL', name: 'Netherlands' } },
  { id: 'pl-goa', type: 'port', name: 'Port of Genoa', city: 'Genoa', locationCode: 'ITGOA', country: { code: 'IT', name: 'Italy' } },
  { id: 'pl-jfk', type: 'airport', name: 'JFK', city: 'New York', locationCode: 'JFK', country: { code: 'US', name: 'United States' } },
  { id: 'pl-lhr', type: 'airport', name: 'Heathrow', city: 'London', locationCode: 'LHR', country: { code: 'GB', name: 'United Kingdom' } },
  { id: 'pl-wh', type: 'warehouse', name: 'BASIS warehouse', city: 'Tel Aviv', locationCode: '', country: { code: 'IL', name: 'Israel' } },
  { id: 'pl-avelline', type: 'customer_site', name: 'Maison Avelline atelier', city: 'Paris', locationCode: '', country: { code: 'FR', name: 'France' } },
];
const placeOf = (id: string) => PLACES.find((candidate) => candidate.id === id)!;

interface LegRecord {
  id: string;
  type: LegType;
  sequence: number;
  mode: TransportMode;
  vessel: string | null;
  voyage: string | null;
  plannedEtd: string | null;
  plannedEta: string | null;
  etd: string | null;
  eta: string | null;
  atd: string | null;
  ata: string | null;
  note: string | null;
  fromLocation: Place | null;
  toLocation: Place | null;
  provider: { legalName: string; tradingName: string } | null;
}

interface LineRecord {
  id: string;
  quantity: string;
  uom: string;
  purchaseOrderLine: { lineNo: number; purchaseOrder: { number: string }; sku: { code: string; product: { name: string }; shade: { code: string; name: string; hex: string } } };
  lot: { number: string };
}

interface ShipmentRecord {
  id: string;
  number: string;
  flow: 'inbound' | 'outbound' | 'direct' | 'transfer';
  mode: TransportMode;
  loadType: 'fcl' | 'lcl' | 'none';
  state: ShipmentState;
  health: 'on_track' | 'at_risk' | 'delayed' | 'blocked';
  namedPlace: string;
  consigneeName: string;
  notes: string;
  bookedOn: string | null;
  createdAt: string;
  incoterm: { code: string } | null;
  origin: Place;
  destination: Place;
  forwarder: { id: string; legalName: string; tradingName: string } | null;
  consignee: null;
  shipmentLegs_on_shipment: LegRecord[];
  shipmentLines_on_shipment: LineRecord[];
  /** Package numbers; the packages themselves live with their run or in `fictionalUnits`. */
  unitNumbers: string[];
  shipmentReferences_on_shipment: { id: string; type: ReferenceType; value: string }[];
}

const MARLIN = { id: 'co-marlin', legalName: 'Marlin Global Logistics Co., Ltd.', tradingName: 'Marlin Logistics' };

function legs(shipment: string, mode: TransportMode, departure: LocalDate, origin: Place, destination: Place, actuals: Record<number, Partial<LegRecord>> = {}): LegRecord[] {
  return defaultLegs(mode, departure).map((plan, index, all) => ({
    id: `${shipment}-leg-${index + 1}`,
    type: plan.type,
    sequence: index + 1,
    mode: plan.type === 'main_carriage' || plan.type === 'customs' ? mode : 'road',
    vessel: null,
    voyage: null,
    plannedEtd: plan.plannedEtd,
    plannedEta: plan.plannedEta,
    etd: null,
    eta: null,
    atd: null,
    ata: null,
    note: null,
    fromLocation: index === 0 || plan.type === 'main_carriage' ? origin : null,
    toLocation: index === all.length - 1 ? destination : null,
    provider: plan.type === 'main_carriage' ? MARLIN : null,
    ...actuals[index + 1],
  }));
}

const sku = (code: string, product: string, shade: { code: string; name: string; hex: string }) => ({ code, product: { name: product }, shade });
const MILK = { code: 'MLK', name: 'Milk', hex: '#F3EEE4' };
const SKIN02 = { code: 'SK02', name: 'Skin 02', hex: '#D9B59A' };
const BONE = { code: 'BNE', name: 'Bone', hex: '#E8DFD0' };

const line = (id: string, po: string, lineNo: number, lot: string, code: string, product: string, shade: typeof MILK, quantity: string): LineRecord => ({ id, quantity, uom: 'm', purchaseOrderLine: { lineNo, purchaseOrder: { number: po }, sku: sku(code, product, shade) }, lot: { number: lot } });

/** Packages of shipments whose runs are not in the manufacturing sample. */
function fictionalUnits(prefix: string, count: number, lot: string, code: string, from: number): (HandlingUnitView & { runNumber: string })[] {
  return Array.from({ length: count }, (_, index) => {
    const number = `${prefix}-26-${String(from + index).padStart(4, '0')}`;
    const contents = Array.from({ length: 6 }, (_, roll) => ({ rollNumber: `${lot}-${String(index * 6 + roll + 1).padStart(2, '0')}`, lotNumber: lot, skuCode: code, quantity: '50000' }));
    return { id: number, number, kind: 'carton' as const, marks: `BASIS / ${code} / ${index + 1} of ${count}`, parentNumber: null, lengthCm: 165, widthCm: 32, heightCm: 32, grossWeightG: 26400, netWeightG: 25200, packedOn: day(-30), contents, quantity: '300000', cbmMilli: 169, runNumber: '' };
  });
}

const store = {
  shipments: [] as ShipmentRecord[],
  units: new Map<string, HandlingUnitView & { runNumber: string }>(),
  sequence: 17,
};

function seed() {
  const t = today();
  const a = (offset: number) => day(offset);
  store.shipments = [
    {
      id: 'shp-14', number: 'SHP-26-0014', flow: 'inbound', mode: 'sea', loadType: 'lcl', state: 'booked', health: 'on_track', namedPlace: 'Ningbo', consigneeName: 'BASIS INC.', notes: '', bookedOn: a(-26), createdAt: new Date().toISOString(),
      incoterm: { code: 'FOB' }, origin: placeOf('pl-ngb'), destination: placeOf('pl-rtm'), forwarder: MARLIN, consignee: null,
      shipmentLegs_on_shipment: legs('SHP-26-0014', 'sea', a(-18), placeOf('pl-ngb'), placeOf('pl-rtm'), { 1: { atd: a(-23), ata: a(-22) }, 2: { atd: a(-22), ata: a(-19) }, 3: { atd: a(-18), vessel: 'MSC Aurora', voyage: '042W' } }),
      shipmentLines_on_shipment: [line('l-14-1', 'PO-26-0038', 1, 'LOT-26-0009', 'PWM-160-SK02', 'Powermesh', SKIN02, '6300000'), line('l-14-2', 'PO-26-0038', 2, 'LOT-26-0010', 'SHL-150-BNE', 'Shanel Lining', BONE, '2400000')],
      unitNumbers: [],
      shipmentReferences_on_shipment: [{ id: 'r-14-1', type: 'booking', value: 'NGB-44712' }, { id: 'r-14-2', type: 'hbl', value: 'MRL-HBL-260914' }, { id: 'r-14-3', type: 'container', value: 'MSCU 731 8842-1' }],
    },
    {
      id: 'shp-15', number: 'SHP-26-0015', flow: 'direct', mode: 'air', loadType: 'none', state: 'booked', health: 'at_risk', namedPlace: 'Shanghai', consigneeName: 'Atelier Rowan, New York', notes: 'Customer order AW26 capsule, cleared by the customer\'s broker.', bookedOn: a(-7), createdAt: new Date().toISOString(),
      incoterm: { code: 'DAP' }, origin: placeOf('pl-pvg'), destination: placeOf('pl-jfk'), forwarder: MARLIN, consignee: null,
      shipmentLegs_on_shipment: legs('SHP-26-0015', 'air', a(-4), placeOf('pl-pvg'), placeOf('pl-jfk'), { 1: { atd: a(-6), ata: a(-5) }, 2: { atd: a(-4), ata: a(-2), vessel: 'CX 0840' }, 3: { atd: a(-2), eta: a(1), note: 'Held for a textile declaration query' } }),
      shipmentLines_on_shipment: [line('l-15-1', 'PO-26-0037', 1, 'LOT-26-0008', 'ISM-160-SK02', 'Illusion Stretch Mesh', SKIN02, '1200000')],
      unitNumbers: [],
      shipmentReferences_on_shipment: [{ id: 'r-15-1', type: 'awb', value: '160-4471 9920' }],
    },
    {
      id: 'shp-16', number: 'SHP-26-0016', flow: 'inbound', mode: 'sea', loadType: 'fcl', state: 'booked', health: 'delayed', namedPlace: 'Ningbo', consigneeName: 'BASIS INC.', notes: '', bookedOn: a(-20), createdAt: new Date().toISOString(),
      incoterm: { code: 'FOB' }, origin: placeOf('pl-ngb'), destination: placeOf('pl-goa'), forwarder: MARLIN, consignee: null,
      shipmentLegs_on_shipment: legs('SHP-26-0016', 'sea', a(-9), placeOf('pl-ngb'), placeOf('pl-goa'), { 1: { atd: a(-14), ata: a(-13) }, 2: { atd: a(-13), ata: a(-10) }, 3: { atd: a(-9), eta: a(27), vessel: 'CMA CGM Tage', voyage: '0MV3', note: 'Transshipment at Singapore missed the connection; next sailing six days later' } }),
      shipmentLines_on_shipment: [line('l-16-1', 'PO-26-0036', 1, 'LOT-26-0006', 'BTL-160-MLK', 'Bridal Tulle', MILK, '9000000'), line('l-16-2', 'PO-26-0036', 2, 'LOT-26-0007', 'BTL-160-PUR', 'Bridal Tulle', { code: 'PUR', name: 'Pure', hex: '#FBF9F4' }, '4000000')],
      unitNumbers: [],
      shipmentReferences_on_shipment: [{ id: 'r-16-1', type: 'booking', value: 'NGB-44650' }, { id: 'r-16-2', type: 'mbl', value: 'CMAU 9918 2201' }, { id: 'r-16-3', type: 'container', value: 'CMAU 221 0914-7' }, { id: 'r-16-4', type: 'seal', value: 'SL 0921144' }],
    },
    {
      id: 'shp-13', number: 'SHP-26-0013', flow: 'direct', mode: 'courier', loadType: 'none', state: 'booked', health: 'on_track', namedPlace: '', consigneeName: 'Harrow & Vane, London', notes: 'Sample kit for the spring collection.', bookedOn: a(-8), createdAt: new Date().toISOString(),
      incoterm: { code: 'DDP' }, origin: placeOf('pl-pvg'), destination: placeOf('pl-lhr'), forwarder: null, consignee: null,
      shipmentLegs_on_shipment: legs('SHP-26-0013', 'courier', a(-7), placeOf('pl-pvg'), placeOf('pl-lhr'), { 1: { atd: a(-7), ata: a(-7) }, 2: { atd: a(-7), ata: a(-4), vessel: 'DHL Express' }, 3: { atd: a(-4), ata: a(-3) } }),
      shipmentLines_on_shipment: [line('l-13-1', 'PO-26-0038', 1, 'LOT-26-0009', 'PWM-160-SK02', 'Powermesh', SKIN02, '12000')],
      unitNumbers: ['CTN-26-0091'],
      shipmentReferences_on_shipment: [{ id: 'r-13-1', type: 'tracking', value: '7731 0092 4410' }],
    },
    {
      id: 'shp-17', number: 'SHP-26-0017', flow: 'inbound', mode: 'sea', loadType: 'lcl', state: 'draft', health: 'on_track', namedPlace: 'Ningbo', consigneeName: 'BASIS INC.', notes: 'First half of PO-26-0040; the rest follows once LOT-26-0013 is released.', bookedOn: null, createdAt: new Date().toISOString(),
      incoterm: { code: 'FOB' }, origin: placeOf('pl-ngb'), destination: placeOf('pl-wh'), forwarder: MARLIN, consignee: null,
      shipmentLegs_on_shipment: legs('SHP-26-0017', 'sea', a(9), placeOf('pl-ngb'), placeOf('pl-wh')),
      shipmentLines_on_shipment: [],
      unitNumbers: ['CTN-26-0001', 'CTN-26-0002', 'CTN-26-0003', 'CTN-26-0004', 'CTN-26-0005', 'CTN-26-0006'],
      shipmentReferences_on_shipment: [],
    },
  ];
  for (const unit of [...fictionalUnits('CTN', 21, 'LOT-26-0009', 'PWM-160-SK02', 40), ...fictionalUnits('CTN', 8, 'LOT-26-0010', 'SHL-150-BNE', 61)]) store.units.set(unit.number, unit);
  store.shipments[0]!.unitNumbers = [...store.units.keys()];
  for (const unit of fictionalUnits('CTN', 4, 'LOT-26-0008', 'ISM-160-SK02', 70)) store.units.set(unit.number, unit);
  store.shipments[1]!.unitNumbers = ['CTN-26-0070', 'CTN-26-0071', 'CTN-26-0072', 'CTN-26-0073'];
  for (const unit of [...fictionalUnits('CTN', 30, 'LOT-26-0006', 'BTL-160-MLK', 100), ...fictionalUnits('CTN', 14, 'LOT-26-0007', 'BTL-160-PUR', 130)]) store.units.set(unit.number, unit);
  store.shipments[2]!.unitNumbers = [...Array.from({ length: 30 }, (_, i) => `CTN-26-${String(100 + i).padStart(4, '0')}`), ...Array.from({ length: 14 }, (_, i) => `CTN-26-${String(130 + i).padStart(4, '0')}`)];
  const kit: HandlingUnitView & { runNumber: string } = { id: 'CTN-26-0091', number: 'CTN-26-0091', kind: 'carton', marks: 'BASIS / sample kit / Harrow & Vane', parentNumber: null, lengthCm: 40, widthCm: 30, heightCm: 12, grossWeightG: 2100, netWeightG: 1800, packedOn: a(-8), contents: [{ rollNumber: null, lotNumber: 'LOT-26-0009', skuCode: 'PWM-160-SK02', quantity: '12000' }], quantity: '12000', cbmMilli: 14, runNumber: '' };
  store.units.set(kit.number, kit);
  void t;
}
seed();

/** The packages of a shipment: fictional ones from this store, real ones from the manufacturing sample. */
async function unitsOf(shipment: ShipmentRecord): Promise<(HandlingUnitView & { runNumber: string })[]> {
  const { sampleManufacturing } = await import('./sample-manufacturing');
  const out: (HandlingUnitView & { runNumber: string })[] = [];
  for (const number of shipment.unitNumbers) {
    const fictional = store.units.get(number);
    if (fictional) {
      out.push(fictional);
      continue;
    }
    const unit = await sampleManufacturing.unit(number);
    if (unit) out.push(unit);
  }
  return out;
}

function rowOf(shipment: ShipmentRecord, units: (HandlingUnitView & { runNumber: string })[]) {
  return {
    ...shipment,
    handlingUnits_on_shipment: units.map((unit) => ({
      id: unit.id, number: unit.number, kind: unit.kind, marks: unit.marks, lengthCm: unit.lengthCm, widthCm: unit.widthCm, heightCm: unit.heightCm, grossWeightG: unit.grossWeightG, netWeightG: unit.netWeightG, packedOn: unit.packedOn, parent: unit.parentNumber ? { number: unit.parentNumber } : null, run: unit.runNumber ? { number: unit.runNumber } : null,
      handlingUnitContents_on_handlingUnit: unit.contents.map((content) => (content.rollNumber ? { roll: { number: content.rollNumber, measuredLength: content.quantity, lot: { number: content.lotNumber, sku: { code: content.skuCode } } } } : { quantity: content.quantity, lot: { number: content.lotNumber, sku: { code: content.skuCode } } })),
    })),
  };
}

/** Lines follow from the real packages: grouped by lot, against the run's purchase-order line. */
async function rebuildLines(shipment: ShipmentRecord): Promise<void> {
  if (shipment.shipmentLines_on_shipment.some((candidate) => candidate.id.startsWith('l-'))) return;
  const { sampleManufacturing } = await import('./sample-manufacturing');
  const totals = new Map<string, { lot: string; sku: string; quantity: bigint }>();
  for (const unit of await unitsOf(shipment)) {
    for (const content of unit.contents) {
      const current = totals.get(content.lotNumber) ?? { lot: content.lotNumber, sku: content.skuCode, quantity: 0n };
      current.quantity += BigInt(content.quantity);
      totals.set(content.lotNumber, current);
    }
  }
  const lines: LineRecord[] = [];
  for (const total of totals.values()) {
    const lot = await sampleManufacturing.lot(total.lot);
    const po = lot ? await sampleManufacturing.purchaseOrder(lot.purchaseOrderNumber) : null;
    const poLine = po?.lines.find((candidate) => candidate.skuCode === total.sku);
    if (!lot || !po || !poLine) continue;
    lines.push({ id: `line-${shipment.number}-${total.lot}`, quantity: total.quantity.toString(), uom: 'm', purchaseOrderLine: { lineNo: poLine.lineNo, purchaseOrder: { number: po.number }, sku: sku(total.sku, lot.productName, { code: lot.shadeCode, name: lot.shadeName, hex: lot.shadeHex }) }, lot: { number: total.lot } });
  }
  shipment.shipmentLines_on_shipment = lines;
}

function find(number: string): ShipmentRecord {
  const shipment = store.shipments.find((candidate) => candidate.number === number);
  if (!shipment) throw new Error(`No shipment ${number}.`);
  return shipment;
}

const departed = (shipment: ShipmentRecord) => shipment.shipmentLegs_on_shipment.some((leg) => legStatus(leg as never) !== 'pending');

function derive(shipment: ShipmentRecord): void {
  shipment.health = shipmentHealth(shipment.state, shipment.shipmentLegs_on_shipment as never, today());
}

export const sampleLogistics = {
  async shipments(): Promise<ShipmentSummary[]> {
    const out: ShipmentSummary[] = [];
    for (const shipment of store.shipments) {
      await rebuildLines(shipment);
      out.push(summaryOf(rowOf(shipment, await unitsOf(shipment)), today()));
    }
    return structuredClone(out);
  },
  async shipment(number: string): Promise<ShipmentDetail | null> {
    const shipment = store.shipments.find((candidate) => candidate.number === number);
    if (!shipment) return null;
    await rebuildLines(shipment);
    return structuredClone(detailOf(rowOf(shipment, await unitsOf(shipment)), today()));
  },
  async shippableUnits(): Promise<ShippableUnit[]> {
    const { sampleManufacturing } = await import('./sample-manufacturing');
    const assigned = new Set(store.shipments.filter((shipment) => shipment.state !== 'cancelled').flatMap((shipment) => shipment.unitNumbers));
    const out: ShippableUnit[] = [];
    for (const run of await sampleManufacturing.runs()) {
      const detail = await sampleManufacturing.run(run.number);
      if (!detail) continue;
      for (const unit of detail.handlingUnits) {
        if (assigned.has(unit.number) || (unit.kind !== 'carton' && unit.kind !== 'pallet')) continue;
        const lots = [...new Set(unit.contents.map((content) => content.lotNumber))].map((number) => detail.lots.find((lot) => lot.number === number)).filter((lot): lot is NonNullable<typeof lot> => Boolean(lot));
        out.push({ ...unit, runNumber: run.number, purchaseOrderNumber: run.purchaseOrderNumber, supplierName: run.supplierName, products: [...new Set(lots.map((lot) => `${lot.productName}, ${lot.shadeName}`))], lots: lots.map((lot) => lot.number), released: lots.length > 0 && lots.every((lot) => lot.qualityState === 'released') });
      }
    }
    return structuredClone(out);
  },
  async places(): Promise<PlaceOption[]> {
    return PLACES.map((place) => ({ id: place.id, type: place.type, name: place.name, city: place.city, countryCode: place.country.code, countryName: place.country.name, locationCode: place.locationCode, companyName: place.id === 'pl-cfs' ? 'Marlin Logistics' : '' }));
  },
  async requirements(): Promise<RequirementView[]> {
    return [
      { id: 'req-1', mode: null, flow: 'inbound', destinationCountry: null, destinationCountryName: '', documentKind: 'commercial_invoice', daysBeforeEtd: 2, note: '' },
      { id: 'req-2', mode: null, flow: 'inbound', destinationCountry: null, destinationCountryName: '', documentKind: 'packing_list', daysBeforeEtd: 2, note: '' },
      { id: 'req-3', mode: 'sea', flow: null, destinationCountry: null, destinationCountryName: '', documentKind: 'bill_of_lading', daysBeforeEtd: 0, note: 'Telex release accepted' },
      { id: 'req-4', mode: 'air', flow: null, destinationCountry: null, destinationCountryName: '', documentKind: 'air_waybill', daysBeforeEtd: 0, note: '' },
      { id: 'req-5', mode: null, flow: null, destinationCountry: 'IL', destinationCountryName: 'Israel', documentKind: 'certificate_of_origin', daysBeforeEtd: 3, note: 'Chamber-stamped original' },
    ];
  },
  async createShipment(input: NewShipmentInput): Promise<{ number: string }> {
    store.sequence += 1;
    const number = `SHP-26-${String(store.sequence).padStart(4, '0')}`;
    const origin = placeOf(input.originId);
    const destination = placeOf(input.destinationId);
    const planned = input.legs && input.legs.length > 0 ? input.legs : null;
    const record: ShipmentRecord = {
      id: `shp-${number}`, number, flow: input.flow, mode: input.mode, loadType: input.loadType, state: 'draft', health: 'on_track', namedPlace: input.namedPlace ?? '', consigneeName: input.consigneeName ?? '', notes: input.notes ?? '', bookedOn: null, createdAt: new Date().toISOString(),
      incoterm: input.incotermCode ? { code: input.incotermCode } : null, origin, destination, forwarder: input.forwarderId === 'co-marlin' ? MARLIN : null, consignee: null,
      shipmentLegs_on_shipment: planned
        ? planned.map((leg, index) => ({ id: `${number}-leg-${index + 1}`, type: leg.type, sequence: index + 1, mode: leg.type === 'main_carriage' || leg.type === 'customs' ? input.mode : 'road', vessel: null, voyage: null, plannedEtd: leg.plannedEtd, plannedEta: leg.plannedEta, etd: null, eta: null, atd: null, ata: null, note: null, fromLocation: index === 0 || leg.type === 'main_carriage' ? origin : null, toLocation: index === planned.length - 1 ? destination : null, provider: null }))
        : input.departure
          ? legs(number, input.mode, input.departure as LocalDate, origin, destination)
          : [],
      shipmentLines_on_shipment: [],
      unitNumbers: [],
      shipmentReferences_on_shipment: [],
    };
    store.shipments.unshift(record);
    return { number };
  },
  async updateShipment(input: ShipmentDetailsInput): Promise<{ number: string }> {
    const shipment = find(input.number);
    if (input.incotermCode !== undefined) shipment.incoterm = input.incotermCode ? { code: input.incotermCode } : null;
    if (input.namedPlace !== undefined) shipment.namedPlace = input.namedPlace ?? '';
    if (input.consigneeName !== undefined) shipment.consigneeName = input.consigneeName ?? '';
    if (input.notes !== undefined) shipment.notes = input.notes ?? '';
    if (input.forwarderId !== undefined) shipment.forwarder = input.forwarderId === 'co-marlin' ? MARLIN : null;
    if (input.references) shipment.shipmentReferences_on_shipment = input.references.map((reference, index) => ({ id: `${input.number}-ref-${index}`, type: reference.type, value: reference.value }));
    return { number: input.number };
  },
  async assignUnits(input: UnitsInput): Promise<{ number: string; assigned: number }> {
    const shipment = find(input.number);
    if (departed(shipment)) throw new Error(`${input.number} has left; its contents are fixed.`);
    const shippable = await this.shippableUnits();
    let assigned = 0;
    for (const number of input.unitNumbers) {
      if (shipment.unitNumbers.includes(number)) continue;
      const unit = shippable.find((candidate) => candidate.number === number);
      if (!unit) throw new Error(`${number} is not available.`);
      if (!unit.released) throw new Error(`${unit.lots.join(', ')} in ${number} is not released; only released lots ship.`);
      shipment.unitNumbers.push(number);
      assigned += 1;
    }
    shipment.shipmentLines_on_shipment = [];
    await rebuildLines(shipment);
    return { number: input.number, assigned };
  },
  async removeUnits(input: UnitsInput): Promise<{ number: string; removed: number }> {
    const shipment = find(input.number);
    if (departed(shipment)) throw new Error(`${input.number} has left; its contents are fixed.`);
    const before = shipment.unitNumbers.length;
    shipment.unitNumbers = shipment.unitNumbers.filter((number) => !input.unitNumbers.includes(number));
    shipment.shipmentLines_on_shipment = [];
    await rebuildLines(shipment);
    return { number: input.number, removed: before - shipment.unitNumbers.length };
  },
  async book(number: string): Promise<{ number: string; state: string }> {
    const shipment = find(number);
    if (shipment.state !== 'draft') throw new Error(`${number} is ${shipment.state}; only a draft is booked.`);
    if (shipment.unitNumbers.length === 0) throw new Error('Nothing is loaded. Assign the packages before booking.');
    shipment.state = 'booked';
    shipment.bookedOn = today();
    derive(shipment);
    return { number, state: 'booked' };
  },
  async cancel(number: string): Promise<{ number: string; state: string }> {
    const shipment = find(number);
    if (departed(shipment)) throw new Error(`${number} has left; it cannot be cancelled.`);
    shipment.state = 'cancelled';
    shipment.unitNumbers = [];
    shipment.shipmentLines_on_shipment = [];
    return { number, state: 'cancelled' };
  },
  async updateLeg(input: LegUpdateInput): Promise<{ number: string; health: ShipmentRecord['health']; stage: string }> {
    const shipment = find(input.number);
    if (shipment.state !== 'booked') throw new Error(`${input.number} is ${shipment.state}; legs move on a booked shipment.`);
    const leg = shipment.shipmentLegs_on_shipment.find((candidate) => candidate.id === input.legId);
    if (!leg) throw new Error('That leg is not on this shipment.');
    const next = { ...leg, etd: input.etd === undefined ? leg.etd : input.etd, eta: input.eta === undefined ? leg.eta : input.eta, atd: input.atd === undefined ? leg.atd : input.atd, ata: input.ata === undefined ? leg.ata : input.ata };
    if (next.ata && !next.atd) throw new Error('A leg arrives only after it departs.');
    if (next.ata && next.atd && next.ata < next.atd) throw new Error('Arrival is before departure.');
    const before = shipment.shipmentLegs_on_shipment.filter((candidate) => candidate.sequence < leg.sequence);
    if (next.atd && before.some((candidate) => !candidate.ata)) throw new Error('This leg cannot depart before the leg before it arrives.');
    Object.assign(leg, next, input.vessel !== undefined ? { vessel: input.vessel } : {}, input.voyage !== undefined ? { voyage: input.voyage } : {}, input.note !== undefined ? { note: input.note } : {});
    derive(shipment);
    return { number: input.number, health: shipment.health, stage: '' };
  },
};
