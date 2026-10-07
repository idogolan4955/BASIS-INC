import { describe, expect, it } from 'vitest';
import { balancesFrom, lowStock, receiptCheck, rollLocation, rollRemaining, stockValue, type MovementFacts } from './inventory';

const move = (over: Partial<MovementFacts> & { quantity: string }): MovementFacts => ({ skuCode: 'BTL-160-MLK', lotNumber: 'LOT-26-0012', rollNumber: null, fromLocationId: null, toLocationId: 'wh', ...over });

describe('balances', () => {
  it('sum what moved in minus what moved out, per lot and location', () => {
    const balances = balancesFrom([
      move({ quantity: '4500000' }),
      move({ quantity: '300000', fromLocationId: 'wh', toLocationId: 'showroom' }),
      move({ quantity: '12000', fromLocationId: 'wh', toLocationId: null }),
      move({ quantity: '1000000', lotNumber: 'LOT-26-0013' }),
      move({ quantity: '1000000', lotNumber: 'LOT-26-0013', fromLocationId: 'wh', toLocationId: 'customer' }),
    ]);
    expect(balances.find((b) => b.lotNumber === 'LOT-26-0012' && b.locationId === 'wh')?.onHand).toBe('4188000');
    expect(balances.find((b) => b.locationId === 'showroom')?.onHand).toBe('300000');
    // Fully moved out: no zero rows.
    expect(balances.find((b) => b.lotNumber === 'LOT-26-0013' && b.locationId === 'wh')).toBeUndefined();
    expect(balances.find((b) => b.lotNumber === 'LOT-26-0013' && b.locationId === 'customer')?.onHand).toBe('1000000');
  });
  it('places a roll by its last movement and keeps what is left on it', () => {
    const movements = [
      { ...move({ quantity: '50000', rollNumber: 'R1' }), occurredAt: '2026-10-01T10:00:00Z' },
      { ...move({ quantity: '50000', rollNumber: 'R1', fromLocationId: 'wh', toLocationId: 'showroom' }), occurredAt: '2026-10-03T10:00:00Z' },
      { ...move({ quantity: '2000', rollNumber: 'R1', fromLocationId: 'showroom', toLocationId: null }), occurredAt: '2026-10-04T10:00:00Z' },
    ];
    expect(rollLocation(movements, 'R1')).toBeNull();
    expect(rollLocation(movements.slice(0, 2), 'R1')).toBe('showroom');
    expect(rollRemaining('50000', [{ quantity: '2000' }, { quantity: '1500' }])).toBe('46500');
    expect(rollRemaining('50000', [{ quantity: '60000' }])).toBe('0');
  });
});

describe('receiving', () => {
  it('flags a line short or over beyond the tolerance', () => {
    const check = receiptCheck([
      { shipmentLineId: 'a', lotNumber: 'L1', expected: '6300000', received: '6300000' },
      { shipmentLineId: 'b', lotNumber: 'L2', expected: '2400000', received: '2350000' },
      { shipmentLineId: 'c', lotNumber: 'L3', expected: '1000000', received: '1030000' },
    ]);
    expect(check[0]).toMatchObject({ difference: '0', short: false, over: false });
    expect(check[1]).toMatchObject({ difference: '-50000', differencePercent: -2.08, short: true });
    expect(check[2]).toMatchObject({ over: true, differencePercent: 3 });
  });
});

describe('reorder and value', () => {
  it('lists SKUs below their reorder point across physical locations', () => {
    const low = lowStock(
      [
        { skuCode: 'A', lotNumber: 'L1', locationId: 'wh', onHand: '300000', physical: true },
        { skuCode: 'A', lotNumber: 'L2', locationId: 'transit', onHand: '900000', physical: false },
        { skuCode: 'B', lotNumber: 'L3', locationId: 'wh', onHand: '2000000', physical: true },
      ],
      [
        { skuCode: 'A', reorderPoint: '500000', targetLevel: '1500000' },
        { skuCode: 'B', reorderPoint: '500000', targetLevel: '1500000' },
        { skuCode: 'C', reorderPoint: '100000', targetLevel: '400000' },
      ],
    );
    expect(low.map((item) => `${item.skuCode} ${item.available} ${item.shortfall}`)).toEqual(['A 300000 1200000', 'C 0 400000']);
  });
  it('values stock lot by lot at landed cost and reports what has none', () => {
    const value = stockValue(
      [
        { skuCode: 'A', lotNumber: 'L1', locationId: 'wh', onHand: '4188000' },
        { skuCode: 'A', lotNumber: 'L9', locationId: 'wh', onHand: '100000' },
      ],
      new Map([['L1', '24577']]),
    );
    expect(value).toEqual({ value: '102928476', valuedMetres: '4188000', unvaluedMetres: '100000' });
  });
});
