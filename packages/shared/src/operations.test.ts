import { describe, expect, it } from 'vitest';
import { localDate } from './local-date';
import { calendarFrom, pipelineFrom, type OperationsRun } from './operations';

const run: OperationsRun = {
  number: 'RUN-26-0001',
  state: 'active',
  health: 'on_track',
  plannedEnd: localDate('2026-10-20'),
  forecastEnd: null,
  products: ['Powermesh, Skin 02'],
  supplierName: 'Jinyu',
  purchaseOrderNumber: 'PO-26-0001',
  requestedExFactory: localDate('2026-10-22'),
  plannedQuantity: '9400000',
  milestones: [
    { key: 'dye', name: 'Dyeing', state: 'in_progress', plannedEnd: localDate('2026-10-08'), forecastEnd: localDate('2026-10-12'), actualEnd: null },
    { key: 'pack', name: 'Packing', state: 'pending', plannedEnd: localDate('2026-10-18'), forecastEnd: null, actualEnd: null },
    { key: 'yarn', name: 'Yarn', state: 'done', plannedEnd: localDate('2026-10-01'), forecastEnd: null, actualEnd: localDate('2026-10-01') },
  ],
  lots: [
    { number: 'LOT-1', qualityState: 'released', measuredQuantity: '4500000', packedQuantity: '3600000', producedQuantity: '4500000' },
    { number: 'LOT-2', qualityState: 'pending', measuredQuantity: '4500000', packedQuantity: '0', producedQuantity: '4500000' },
  ],
  payments: [
    { label: 'Deposit 30%', dueOn: localDate('2026-09-20'), paidOn: localDate('2026-09-21') },
    { label: 'Balance 70%', dueOn: localDate('2026-10-25'), paidOn: null },
  ],
};

describe('pipeline', () => {
  it('places metres by what the facts say', () => {
    const cells = pipelineFrom([run]);
    expect(cells.find((cell) => cell.stage === 'in_production')).toMatchObject({ metres: '400000', records: 1 });
    expect(cells.find((cell) => cell.stage === 'in_qc')).toMatchObject({ metres: '4500000', records: 1 });
    expect(cells.find((cell) => cell.stage === 'ready_to_ship')).toMatchObject({ metres: '3600000', records: 1 });
    expect(cells.find((cell) => cell.stage === 'in_transit')).toMatchObject({ metres: '0', records: 0 });
    expect(cells.find((cell) => cell.stage === 'in_stock')?.pending).toBe(true);
    const moving = pipelineFrom([run], [
      { number: 'SHP-1', stage: 'in_transit', health: 'on_track', metres: '6300000', etd: null, eta: null, plannedEta: null, originName: 'Ningbo', destinationName: 'Rotterdam' },
      { number: 'SHP-2', stage: 'customs', health: 'at_risk', metres: '1200000', etd: null, eta: null, plannedEta: null, originName: 'Shanghai', destinationName: 'New York' },
      { number: 'SHP-3', stage: 'booked', health: 'on_track', metres: '900000', etd: null, eta: null, plannedEta: null, originName: 'Ningbo', destinationName: 'Tel Aviv' },
    ]);
    expect(moving.find((cell) => cell.stage === 'in_transit')).toMatchObject({ metres: '6300000', records: 1 });
    expect(moving.find((cell) => cell.stage === 'in_customs')).toMatchObject({ metres: '1200000', records: 1 });
    // What is loaded on a booked shipment is no longer waiting on the floor.
    expect(moving.find((cell) => cell.stage === 'ready_to_ship')).toMatchObject({ metres: '0', records: 0 });
    const partly = pipelineFrom([run], [{ number: 'SHP-4', stage: 'booked', health: 'on_track', metres: '600000', etd: null, eta: null, plannedEta: null, originName: 'Ningbo', destinationName: 'Tel Aviv' }]);
    expect(partly.find((cell) => cell.stage === 'ready_to_ship')).toMatchObject({ metres: '3000000', records: 1 });
  });
});

describe('calendar', () => {
  it('lists open dates in the horizon, soonest first, paid and done items left out', () => {
    const entries = calendarFrom([run], [{ id: 't1', title: 'Approve lab dip', dueOn: localDate('2026-10-05'), entityType: '', entityId: '', assigneeName: 'Dana' }], localDate('2026-10-10'));
    expect(entries.map((entry) => `${entry.date} ${entry.kind}`)).toEqual(['2026-10-05 task', '2026-10-12 milestone', '2026-10-18 milestone', '2026-10-22 ex_factory', '2026-10-25 payment']);
    expect(entries[0]?.overdue).toBe(true);
    expect(entries[1]?.moved).toBe(true);
  });
});
