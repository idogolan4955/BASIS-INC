import { describe, expect, it } from 'vitest';
import type { LocalDate } from './local-date';
import { defaultLegs, documentsCheck, forecastLegs, legStatus, overShipment, placeCode, shipmentDates, shipmentHealth, shipmentProgress, shipmentStage, shipmentTotals, type LegFacts } from './logistics';

const d = (value: string) => value as LocalDate;
const leg = (type: LegFacts['type'], sequence: number, over: Partial<LegFacts> = {}): LegFacts => ({ type, sequence, plannedEtd: null, plannedEta: null, etd: null, eta: null, atd: null, ata: null, ...over });

const seaRoute = (over: Record<number, Partial<LegFacts>> = {}): LegFacts[] => [
  leg('pickup', 1, { plannedEtd: d('2026-10-01'), plannedEta: d('2026-10-02'), ...over[1] }),
  leg('export_handling', 2, { plannedEtd: d('2026-10-02'), plannedEta: d('2026-10-06'), ...over[2] }),
  leg('main_carriage', 3, { plannedEtd: d('2026-10-06'), plannedEta: d('2026-11-05'), ...over[3] }),
  leg('customs', 4, { plannedEtd: d('2026-11-05'), plannedEta: d('2026-11-08'), ...over[4] }),
  leg('local_delivery', 5, { plannedEtd: d('2026-11-08'), plannedEta: d('2026-11-10'), ...over[5] }),
];

describe('legs', () => {
  it('reads a leg from its actual dates', () => {
    expect(legStatus(leg('pickup', 1))).toBe('pending');
    expect(legStatus(leg('pickup', 1, { atd: d('2026-10-01') }))).toBe('underway');
    expect(legStatus(leg('pickup', 1, { atd: d('2026-10-01'), ata: d('2026-10-02') }))).toBe('arrived');
  });
  it('takes departure from the main carriage and arrival from the last leg', () => {
    const dates = shipmentDates(seaRoute({ 5: { eta: d('2026-11-12') } }));
    expect(dates.etd).toBe('2026-10-06');
    expect(shipmentDates([leg('pickup', 1, { plannedEtd: d('2026-10-01'), plannedEta: d('2026-10-02') })]).etd).toBe('2026-10-01');
    expect(dates.eta).toBe('2026-11-12');
    expect(dates.plannedEta).toBe('2026-11-10');
  });
  it('carries a delay forward into the legs that follow', () => {
    const a = d('2026-10-01');
    const legs = forecastLegs(seaRoute({ 1: { atd: a, ata: a }, 2: { atd: a, ata: a }, 3: { atd: d('2026-10-06'), eta: d('2026-11-09') } }));
    expect(legs[3]).toMatchObject({ etd: '2026-11-09', eta: '2026-11-12' });
    expect(legs[4]).toMatchObject({ etd: '2026-11-12', eta: '2026-11-14' });
    expect(shipmentDates(legs).eta).toBe('2026-11-14');
    // A leg with its own expectation keeps it.
    expect(forecastLegs(seaRoute({ 3: { eta: d('2026-11-09') }, 5: { eta: d('2026-11-20') } }))[4]).toMatchObject({ eta: '2026-11-20' });
    // An arrival later than planned moves what follows as well.
    expect(forecastLegs(seaRoute({ 1: { atd: a, ata: d('2026-10-04') } }))[1]).toMatchObject({ etd: '2026-10-04', eta: '2026-10-08' });
  });
  it('lays out the usual legs for a mode', () => {
    const legs = defaultLegs('sea', d('2026-10-06'));
    expect(legs.map((candidate) => candidate.type)).toEqual(['pickup', 'export_handling', 'main_carriage', 'customs', 'local_delivery']);
    expect(legs[2]).toEqual({ type: 'main_carriage', plannedEtd: '2026-10-06', plannedEta: '2026-11-05' });
    expect(defaultLegs('air', d('2026-10-06'))).toHaveLength(4);
  });
});

describe('stage', () => {
  it('is booked until something moves', () => {
    expect(shipmentStage('draft', seaRoute())).toBe('draft');
    expect(shipmentStage('booked', seaRoute())).toBe('booked');
    expect(shipmentStage('booked', [])).toBe('booked');
  });
  it('is in transit while a leg is underway, then in customs, arrived and delivered', () => {
    const a = d('2026-10-01');
    expect(shipmentStage('booked', seaRoute({ 1: { atd: a } }))).toBe('in_transit');
    expect(shipmentStage('booked', seaRoute({ 1: { atd: a, ata: a }, 2: { atd: a, ata: a }, 3: { atd: a } }))).toBe('in_transit');
    expect(shipmentStage('booked', seaRoute({ 1: { atd: a, ata: a }, 2: { atd: a, ata: a }, 3: { atd: a, ata: a } }))).toBe('customs');
    expect(shipmentStage('booked', seaRoute({ 1: { atd: a, ata: a }, 2: { atd: a, ata: a }, 3: { atd: a, ata: a }, 4: { atd: a, ata: a } }))).toBe('arrived');
    expect(shipmentStage('booked', seaRoute({ 1: { atd: a, ata: a }, 2: { atd: a, ata: a }, 3: { atd: a, ata: a }, 4: { atd: a, ata: a }, 5: { atd: a, ata: a } }))).toBe('delivered');
    expect(shipmentStage('cancelled', seaRoute())).toBe('cancelled');
  });
});

describe('progress', () => {
  it('counts finished legs whole and the leg underway by time elapsed', () => {
    const a = d('2026-10-01');
    expect(shipmentProgress(seaRoute(), d('2026-10-01'))).toBe(0);
    // Two legs done, the main carriage half way through its thirty days.
    const half = shipmentProgress(seaRoute({ 1: { atd: a, ata: a }, 2: { atd: a, ata: a }, 3: { atd: d('2026-10-06') } }), d('2026-10-21'));
    expect(half).toBeCloseTo((2 + 0.5) / 5, 3);
    expect(shipmentProgress(seaRoute({ 1: { atd: a, ata: a }, 2: { atd: a, ata: a }, 3: { atd: a, ata: a }, 4: { atd: a, ata: a }, 5: { atd: a, ata: a } }), a)).toBe(1);
  });
});

describe('health', () => {
  it('is on track while the plan holds', () => {
    expect(shipmentHealth('booked', seaRoute(), d('2026-09-28'))).toBe('on_track');
    expect(shipmentHealth('draft', seaRoute(), d('2026-12-01'))).toBe('on_track');
  });
  it('slips with the final arrival', () => {
    expect(shipmentHealth('booked', seaRoute({ 5: { eta: d('2026-11-11') } }), d('2026-09-28'))).toBe('at_risk');
    expect(shipmentHealth('booked', seaRoute({ 5: { eta: d('2026-11-14') } }), d('2026-09-28'))).toBe('delayed');
  });
  it('turns on a departure that did not happen or an arrival that is overdue', () => {
    expect(shipmentHealth('booked', seaRoute(), d('2026-10-02'))).toBe('at_risk');
    expect(shipmentHealth('booked', seaRoute(), d('2026-10-05'))).toBe('delayed');
    const a = d('2026-10-01');
    expect(shipmentHealth('booked', seaRoute({ 1: { atd: a, ata: a }, 2: { atd: a, ata: a }, 3: { atd: d('2026-10-06') } }), d('2026-11-07'))).toBe('delayed');
  });
});

describe('contents', () => {
  const unit = (kind: 'carton' | 'pallet', rolls: number, quantity: string, parentNumber: string | null = null) => ({
    kind,
    contents: Array.from({ length: rolls }, (_, index) => ({ rollNumber: `R${index}`, lotNumber: 'LOT', skuCode: 'SKU', quantity: '50000' })),
    quantity,
    cbmMilli: 169,
    grossWeightG: 26400,
    netWeightG: 25200,
    parentNumber,
  });
  it('totals the packages, counting volume for the outermost ones only', () => {
    const totals = shipmentTotals([unit('carton', 6, '300000', 'PLT-1'), unit('carton', 6, '300000', 'PLT-1'), { ...unit('pallet', 0, '0'), cbmMilli: 1200, grossWeightG: 60000, netWeightG: null }]);
    expect(totals).toEqual({ cartons: 2, pallets: 1, rolls: 12, metres: '600000', cbmMilli: 1200, grossWeightG: 60000, netWeightG: 50400 });
  });
  it('refuses more than the line and its tolerance allow', () => {
    expect(overShipment('6400000', 5, '6000000', '700000')).toBe('0');
    expect(overShipment('6400000', 5, '6000000', '800000')).toBe('80000');
    expect(overShipment('6400000', null, '6400000', '1')).toBe('1');
  });
});

describe('documents', () => {
  const rules = [
    { mode: 'sea' as const, flow: null, destinationCountry: null, documentKind: 'bill_of_lading', daysBeforeEtd: 0 },
    { mode: null, flow: null, destinationCountry: null, documentKind: 'commercial_invoice', daysBeforeEtd: 3 },
    { mode: 'air' as const, flow: null, destinationCountry: null, documentKind: 'air_waybill', daysBeforeEtd: 0 },
    { mode: null, flow: null, destinationCountry: 'IL', documentKind: 'certificate_of_origin', daysBeforeEtd: 5 },
  ];
  it('lists what a shipment must carry and what is missing', () => {
    const check = documentsCheck(rules, { mode: 'sea', flow: 'inbound', destinationCountry: 'IL', etd: d('2026-10-06') }, ['commercial_invoice'], d('2026-10-02'));
    expect(check.map((item) => item.documentKind)).toEqual(['bill_of_lading', 'commercial_invoice', 'certificate_of_origin']);
    expect(check.find((item) => item.documentKind === 'commercial_invoice')).toMatchObject({ filed: true, overdue: false, dueOn: '2026-10-03' });
    expect(check.find((item) => item.documentKind === 'certificate_of_origin')).toMatchObject({ filed: false, overdue: true, dueOn: '2026-10-01' });
    expect(check.find((item) => item.documentKind === 'bill_of_lading')).toMatchObject({ filed: false, overdue: false });
  });
  it('makes a code for a place without one', () => {
    expect(placeCode({ locationCode: 'CNNGB', name: 'Port of Ningbo' })).toBe('CNNGB');
    expect(placeCode({ locationCode: '', name: 'BASIS warehouse', city: 'Tel Aviv' })).toBe('TELAV');
  });
});
