import { describe, expect, it } from 'vitest';
import { fulfilmentOf, lineTotal, orderMargin, orderTotal, suggestAllocation } from './commercial';

describe('totals and margin', () => {
  it('values lines and the order in fixed point', () => {
    expect(lineTotal({ quantity: '1200000', unitPrice: '68000' })).toBe('81600000');
    expect(orderTotal([{ quantity: '1200000', unitPrice: '68000' }, { quantity: '300000', unitPrice: '52500' }])).toBe('97350000');
  });
  it('earns over landed cost allocation by allocation and reports what is not costed', () => {
    const margin = orderMargin(
      [{ id: 'a', skuCode: 'PWM', quantity: '1200000', unitPrice: '68000' }],
      [
        { lineId: 'a', lotNumber: 'L1', quantity: '1000000' },
        { lineId: 'a', lotNumber: 'L9', quantity: '200000' },
      ],
      new Map([['L1', '33685']]),
    );
    expect(margin).toEqual({ revenue: '68000000', cost: '33685000', margin: '34315000', marginBasisPoints: 5046, uncostedMetres: '200000' });
    expect(orderMargin([], [], new Map()).marginBasisPoints).toBeNull();
  });
});

describe('allocation', () => {
  const stock = [
    { lotNumber: 'L2', locationId: 'wh', locationName: 'Warehouse', available: '150000', receivedAt: '2026-09-20', rolls: [{ number: 'L2-01', remaining: '50000' }, { number: 'L2-02', remaining: '50000' }, { number: 'L2-03', remaining: '50000' }] },
    { lotNumber: 'L1', locationId: 'wh', locationName: 'Warehouse', available: '120000', receivedAt: '2026-08-27', rolls: [{ number: 'L1-01', remaining: '47000' }, { number: 'L1-02', remaining: '50000' }, { number: 'L1-03', remaining: '23000' }] },
    { lotNumber: 'L3', locationId: 'wh', locationName: 'Warehouse', available: '12000', receivedAt: '2026-10-06', rolls: [] },
  ];
  it('takes the oldest lot first, whole rolls, and cuts the last one', () => {
    const { plan, short } = suggestAllocation('130000', stock);
    expect(plan.map((entry) => `${entry.rollNumber} ${entry.quantity}`)).toEqual(['L1-01 47000', 'L1-02 50000', 'L1-03 23000', 'L2-01 10000']);
    expect(short).toBe('0');
  });
  it('orders rolls by their number, not their spelling', () => {
    const { plan } = suggestAllocation('150000', [{ lotNumber: 'L', locationId: 'wh', locationName: 'W', available: '150000', receivedAt: '2026-01-01', rolls: [{ number: 'L-100', remaining: '50000' }, { number: 'L-9', remaining: '50000' }, { number: 'L-10', remaining: '50000' }] }]);
    expect(plan.map((entry) => entry.rollNumber)).toEqual(['L-9', 'L-10', 'L-100']);
  });
  it('reports what it cannot cover and uses metres where rolls are not tracked', () => {
    const { plan, short } = suggestAllocation('300000', stock);
    expect(plan[plan.length - 1]).toEqual({ lotNumber: 'L3', locationId: 'wh', rollNumber: null, quantity: '12000' });
    expect(short).toBe('18000');
  });
  it('reads fulfilment from what is allocated and shipped', () => {
    expect(fulfilmentOf([{ quantity: '100', allocated: '0', shipped: '0' }], false).stage).toBe('awaiting_stock');
    expect(fulfilmentOf([{ quantity: '100', allocated: '40', shipped: '0' }], false)).toEqual({ stage: 'partly_allocated', progress: 0.2 });
    expect(fulfilmentOf([{ quantity: '100', allocated: '100', shipped: '0' }], false)).toEqual({ stage: 'allocated', progress: 0.5 });
    expect(fulfilmentOf([{ quantity: '100', allocated: '100', shipped: '100' }], false)).toEqual({ stage: 'shipped', progress: 1 });
    expect(fulfilmentOf([{ quantity: '100', allocated: '100', shipped: '100' }], true).stage).toBe('delivered');
  });
});
