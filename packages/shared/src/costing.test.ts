import { describe, expect, it } from 'vitest';
import { allocateShipmentCosts, costsForRun, defaultAllocationRules, landedUnitCost, lineValue, toBase, upliftBasisPoints, type CostFacts, type LineFacts } from './costing';

const cost = (id: string, category: CostFacts['category'], amountBase: string, kind: CostFacts['kind'] = 'actual', isRecoverable = false): CostFacts => ({ id, category, kind, amountBase, isRecoverable });
const lines: LineFacts[] = [
  { id: 'a', lotNumber: 'LOT-1', quantity: '6300000', valueBase: '179550000', grossWeightG: 554400, cbmMilli: 3549 },
  { id: 'b', lotNumber: 'LOT-2', quantity: '2400000', valueBase: '74880000', grossWeightG: 211200, cbmMilli: 1352 },
];

describe('rules', () => {
  it('spreads freight by volume at sea and by weight in the air', () => {
    expect(defaultAllocationRules('sea').freight).toBe('cbm');
    expect(defaultAllocationRules('air').freight).toBe('gross_weight');
    expect(defaultAllocationRules('sea').duty).toBe('value');
  });
  it('takes actuals over estimates and refuses a final run while a category is still estimated', () => {
    const costs = [cost('f1', 'freight', '12000000', 'estimate'), cost('f2', 'freight', '12800000', 'actual'), cost('d1', 'duty', '9000000', 'estimate'), cost('v1', 'tax', '3000000', 'actual', true)];
    const estimate = costsForRun(costs, 'estimate');
    expect(estimate.taken.map((c) => c.id)).toEqual(['f2', 'd1']);
    expect(estimate.stillEstimated).toEqual(['duty']);
    const final = costsForRun(costs, 'final');
    expect(final.taken.map((c) => c.id)).toEqual(['f2']);
    expect(final.stillEstimated).toEqual(['duty']);
  });
});

describe('allocation', () => {
  it('is exhaustive to the smallest unit and follows each basis', () => {
    const result = allocateShipmentCosts([cost('f', 'freight', '12800001'), cost('d', 'duty', '9000000')], lines, defaultAllocationRules('sea'));
    for (const entry of result.byCost) {
      expect(entry.parts.reduce((sum, part) => sum + BigInt(part.amountBase), 0n).toString()).toBe(entry.costId === 'f' ? '12800001' : '9000000');
    }
    // Duty by value: 179550000 / (179550000 + 74880000) of 9000000.
    expect(result.byLine[0]?.byCategory.duty).toBe('6351256');
    expect(result.byLine[1]?.byCategory.duty).toBe('2648744');
    expect(result.totalBase).toBe('21800001');
    expect(BigInt(result.byLine[0]!.allocatedBase) + BigInt(result.byLine[1]!.allocatedBase)).toBe(21800001n);
  });
  it('falls back to metres when the basis was never recorded', () => {
    const bare = lines.map((line) => ({ ...line, cbmMilli: 0, grossWeightG: 0 }));
    const result = allocateShipmentCosts([cost('f', 'freight', '8700000')], bare, defaultAllocationRules('sea'));
    expect(result.byLine.map((line) => line.allocatedBase)).toEqual(['6300000', '2400000']);
  });
});

describe('landed cost', () => {
  it('adds what landed per metre to the purchase price', () => {
    expect(lineValue('28500', '6300000')).toBe('179550000');
    expect(landedUnitCost('28500', '6300000', '6300000')).toBe('29500');
    expect(landedUnitCost('28500', '0', '0')).toBe('28500');
    expect(toBase('28500', '1')).toBe('28500');
    expect(toBase('100000', '0.1389')).toBe('13890');
    expect(upliftBasisPoints('28500', '29500')).toBe(351);
    expect(upliftBasisPoints('0', '1')).toBeNull();
  });
});
