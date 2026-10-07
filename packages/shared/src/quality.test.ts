import { describe, expect, it } from 'vitest';
import { defectPointsPer100m, dispositionsFor, inspectionResult, lotStateFor, measurementOutcome, signOffAllowed, type CheckFacts } from './quality';

const check = (over: Partial<CheckFacts>): CheckFacts => ({ key: 'k', category: 'dimension', kind: 'pass_fail', isCritical: false, outcome: 'pass', measured: null, expected: null, toleranceMinus: null, tolerancePlus: null, ...over });
const thresholds = { maxDefectPointsPer100m: 20, maxDeltaE: 100 };

describe('checks', () => {
  it('judges a measurement by its tolerance', () => {
    expect(measurementOutcome({ measured: '158000', expected: '160000', toleranceMinus: '3000', tolerancePlus: '3000' })).toBe('pass');
    expect(measurementOutcome({ measured: '156000', expected: '160000', toleranceMinus: '3000', tolerancePlus: '3000' })).toBe('fail');
    expect(measurementOutcome({ measured: null, expected: '160000', toleranceMinus: '0', tolerancePlus: '0' })).toBe('pending');
  });
  it('scores defects per 100 m', () => {
    expect(defectPointsPer100m([{ points: 4, rollNumber: null }, { points: 2, rollNumber: null }], '300000')).toBe(2);
    expect(defectPointsPer100m([], '0')).toBeNull();
  });
});

describe('result', () => {
  it('stays open while a check is pending', () => {
    expect(inspectionResult([check({ outcome: 'pending' })], [], [], '300000', thresholds)).toBeNull();
  });
  it('fails on a critical check, a shade beyond threshold or too many points', () => {
    expect(inspectionResult([check({ outcome: 'fail', isCritical: true })], [], [], '300000', thresholds)).toBe('fail');
    expect(inspectionResult([check({})], [], [{ deltaE: 140 }], '300000', thresholds)).toBe('fail');
    expect(inspectionResult([check({})], [{ points: 4, rollNumber: null }, { points: 4, rollNumber: null }, { points: 4, rollNumber: null }, { points: 4, rollNumber: null }, { points: 4, rollNumber: null }, { points: 4, rollNumber: null }, { points: 4, rollNumber: null }], [], '100000', thresholds)).toBe('fail');
  });
  it('is conditional when only non-critical checks fail', () => {
    expect(inspectionResult([check({ outcome: 'fail' }), check({ key: 'b' })], [], [{ deltaE: 40 }], '300000', thresholds)).toBe('conditional_pass');
  });
  it('passes when everything holds', () => {
    expect(inspectionResult([check({})], [{ points: 2, rollNumber: null }], [{ deltaE: 40 }], '300000', thresholds)).toBe('pass');
  });
});

describe('sign-off', () => {
  it('limits dispositions by result and moves the lot', () => {
    expect(dispositionsFor('pass')).toEqual(['release']);
    expect(dispositionsFor('fail')).not.toContain('release');
    expect(lotStateFor('reject')).toBe('rejected');
    expect(lotStateFor('accept_with_concession')).toBe('released');
  });
  it('requires an action or a concession for a conditional release', () => {
    expect(signOffAllowed('conditional_pass', 'release', 0, '')).toMatch(/corrective action/);
    expect(signOffAllowed('conditional_pass', 'release', 1, '')).toBeNull();
    expect(signOffAllowed('fail', 'release', 0, '')).toMatch(/cannot/);
    expect(signOffAllowed('pass', 'release', 0, '')).toBeNull();
  });
});
