import { describe, expect, it } from 'vitest';
import {
  MODULES,
  MODULE_ACCESS,
  ROLES,
  addDays,
  addMoney,
  allocate,
  allocateMoney,
  authExpression,
  canManageUsers,
  canOpenModule,
  canViewCosts,
  convertMoney,
  daysBetween,
  divRound,
  fail,
  formatBusinessNumber,
  formatFixed,
  formatLocalDate,
  formatMoney,
  formatQuantity,
  isDomainError,
  isLocalDate,
  isoWeekOf,
  localDate,
  modulesFor,
  money,
  multiplyByQuantity,
  ok,
  parseBusinessNumber,
  parseFixed,
  parseMoney,
  parseQuantity,
  quantity,
  toMetres,
  toYards,
  todayIn,
  weekdayOf,
  withTolerance,
} from './index';

describe('fixed point', () => {
  it('rounds half away from zero', () => {
    expect(divRound(5n, 10n)).toBe(1n);
    expect(divRound(4n, 10n)).toBe(0n);
    expect(divRound(-5n, 10n)).toBe(-1n);
    expect(divRound(-4n, 10n)).toBe(0n);
    expect(divRound(15n, -10n)).toBe(-2n);
  });

  it('parses decimals exactly', () => {
    expect(parseFixed('1240.5', 3)).toBe(1_240_500n);
    expect(parseFixed('-0.25', 4)).toBe(-2500n);
    expect(parseFixed('1,240', 3)).toBe(1_240_000n);
    expect(parseFixed('.5', 3)).toBe(500n);
    expect(parseFixed('12.', 2)).toBe(1200n);
    expect(parseFixed('1.2300', 2)).toBe(123n);
  });

  it('rejects what it cannot represent', () => {
    expect(() => parseFixed('abc', 2)).toThrow(SyntaxError);
    expect(() => parseFixed('', 2)).toThrow(SyntaxError);
    expect(() => parseFixed('.', 2)).toThrow(SyntaxError);
    expect(() => parseFixed('1.234', 2)).toThrow(RangeError);
  });

  it('formats with rounding and padding', () => {
    expect(formatFixed(12_405_000n, 4, 2)).toBe('1240.50');
    expect(formatFixed(-2500n, 4, 2)).toBe('-0.25');
    expect(formatFixed(-1n, 4, 2)).toBe('0.00');
    expect(formatFixed(12_345n, 4)).toBe('1.2345');
    expect(formatFixed(12_345n, 4, 0)).toBe('1');
    expect(formatFixed(15n, 1, 3)).toBe('1.500');
  });

  it('allocates without losing a unit', () => {
    expect(allocate(100n, [1n, 1n, 1n])).toEqual([34n, 33n, 33n]);
    expect(allocate(-100n, [1n, 1n, 1n])).toEqual([-34n, -33n, -33n]);
    expect(allocate(10n, [0n, 5n, 5n])).toEqual([0n, 5n, 5n]);
    const parts = allocate(1_000_003n, [317n, 1n, 4099n, 12n]);
    expect(parts.reduce((sum, part) => sum + part, 0n)).toBe(1_000_003n);
  });

  it('refuses to allocate to nothing', () => {
    expect(() => allocate(1n, [])).toThrow(RangeError);
    expect(() => allocate(1n, [0n, 0n])).toThrow(RangeError);
    expect(() => allocate(1n, [1n, -1n])).toThrow(RangeError);
  });
});

describe('money', () => {
  it('prices a line: unit price times quantity', () => {
    const unitPrice = parseMoney('1.2345', 'USD');
    const metres = parseQuantity('1240.5', 'm');
    // 1.2345 × 1240.5 = 1531.39725 → the half ten-thousandth rounds away from zero.
    expect(multiplyByQuantity(unitPrice, metres)).toEqual(money(15_313_973n, 'USD'));
    expect(formatMoney(multiplyByQuantity(unitPrice, metres))).toBe('1,531.40 USD');
  });

  it('never mixes currencies', () => {
    expect(() => addMoney(parseMoney('1', 'USD'), parseMoney('1', 'CNY'))).toThrow(RangeError);
    expect(() => money(1n, 'usd')).toThrow(RangeError);
  });

  it('converts with a rate', () => {
    expect(convertMoney(parseMoney('7200', 'CNY'), '0.1389', 'USD')).toEqual(parseMoney('1000.08', 'USD'));
  });

  it('allocates a freight invoice across lines to the last unit', () => {
    const freight = parseMoney('1850.00', 'USD');
    const parts = allocateMoney(freight, [4_200n, 1_150n, 650n]);
    expect(parts.reduce((sum, part) => sum + part.amount, 0n)).toBe(freight.amount);
    expect(parts.map((part) => formatMoney(part))).toEqual(['1,295.00 USD', '354.58 USD', '200.42 USD']);
  });
});

describe('quantity', () => {
  it('converts yards to metres and back', () => {
    expect(toMetres(parseQuantity('100', 'yd'))).toEqual(parseQuantity('91.44', 'm'));
    expect(toYards(parseQuantity('91.44', 'm'))).toEqual(parseQuantity('100', 'yd'));
    expect(() => toMetres(quantity(1000n, 'kg'))).toThrow(RangeError);
  });

  it('applies an over-delivery tolerance', () => {
    expect(withTolerance(parseQuantity('1000', 'm'), 5)).toEqual(parseQuantity('1050', 'm'));
    expect(withTolerance(parseQuantity('1000', 'm'), 2.5)).toEqual(parseQuantity('1025', 'm'));
  });

  it('formats without trailing zeros', () => {
    expect(formatQuantity(parseQuantity('1240.5', 'm'))).toBe('1,240.5 m');
    expect(formatQuantity(parseQuantity('48', 'roll'))).toBe('48 roll');
    expect(formatQuantity(parseQuantity('3', 'm'), 2)).toBe('3.00 m');
  });
});

describe('local dates', () => {
  it('accepts real calendar dates only', () => {
    expect(isLocalDate('2026-10-06')).toBe(true);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('06/10/2026')).toBe(false);
    expect(() => localDate('2026-13-01')).toThrow(RangeError);
  });

  it('does date arithmetic without time zones', () => {
    expect(addDays(localDate('2026-12-30'), 5)).toBe('2027-01-04');
    expect(daysBetween(localDate('2026-10-06'), localDate('2026-11-05'))).toBe(30);
    expect(daysBetween(localDate('2026-11-05'), localDate('2026-10-06'))).toBe(-30);
  });

  it('knows the date at a place', () => {
    const instant = new Date('2026-10-06T20:30:00Z');
    expect(todayIn('Asia/Shanghai', instant)).toBe('2026-10-07');
    expect(todayIn('America/New_York', instant)).toBe('2026-10-06');
  });

  it('formats one way', () => {
    expect(formatLocalDate(localDate('2026-10-06'))).toBe('06 Oct 2026');
  });

  it('names the weekday and the ISO week', () => {
    expect(weekdayOf(localDate('2026-10-06'))).toBe('Tue');
    expect(isoWeekOf(localDate('2026-10-06'))).toBe(41);
    expect(isoWeekOf(localDate('2026-01-01'))).toBe(1);
    expect(isoWeekOf(localDate('2027-01-01'))).toBe(53);
  });
});

describe('business numbers', () => {
  it('formats and parses', () => {
    expect(formatBusinessNumber({ prefix: 'PO', year: 2026, sequence: 41 })).toBe('PO-26-0041');
    expect(formatBusinessNumber({ prefix: 'SHP', year: 2026, sequence: 12_345 })).toBe('SHP-26-12345');
    expect(parseBusinessNumber('po-26-0041')).toEqual({ prefix: 'PO', year: 2026, sequence: 41 });
    expect(parseBusinessNumber('PWM-02-150-C014')).toBeNull();
  });

  it('rejects invalid input', () => {
    expect(() => formatBusinessNumber({ prefix: 'po', year: 2026, sequence: 1 })).toThrow(RangeError);
    expect(() => formatBusinessNumber({ prefix: 'PO', year: 2026, sequence: 0 })).toThrow(RangeError);
  });
});

describe('access', () => {
  it('defines every module for every role', () => {
    expect(MODULES).toHaveLength(15);
    expect(MODULES.map((definition) => definition.number)).toEqual(
      Array.from({ length: 15 }, (_, index) => String(index + 1).padStart(2, '0')),
    );
    for (const definition of MODULES) {
      for (const role of ROLES) expect(MODULE_ACCESS[definition.key][role]).toBeDefined();
    }
  });

  it('gives the owner everything', () => {
    expect(modulesFor('owner')).toHaveLength(15);
    expect(canManageUsers('owner')).toBe(true);
  });

  it('keeps costs, suppliers and customers apart', () => {
    expect(canViewCosts('sales')).toBe(false);
    expect(canViewCosts('qc')).toBe(false);
    expect(canViewCosts('marketing')).toBe(false);
    expect(canViewCosts('viewer')).toBe(false);
    expect(canOpenModule('sales', 'suppliers')).toBe(false);
    expect(canOpenModule('sales', 'costing')).toBe(false);
    expect(canOpenModule('qc', 'customers')).toBe(false);
    expect(canOpenModule('purchasing', 'customers')).toBe(false);
    expect(canManageUsers('operations')).toBe(false);
  });

  it('writes auth expressions', () => {
    expect(authExpression(['owner', 'finance'])).toBe("auth.token.role == 'owner' || auth.token.role == 'finance'");
  });
});

describe('results', () => {
  it('carries success or a typed failure', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    const failure = fail('forbidden', 'Owner only');
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(isDomainError(failure.error)).toBe(true);
    expect(isDomainError({ code: 'nope', message: 'x' })).toBe(false);
  });
});
