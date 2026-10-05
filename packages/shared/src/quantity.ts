import { divRound, formatFixed, groupThousands, parseFixed } from './fixed-point';

/** Quantities are stored in thousandths of the unit. */
export const QUANTITY_DECIMALS = 3;
export const QUANTITY_SCALE = 10n ** BigInt(QUANTITY_DECIMALS);

export const UOMS = ['m', 'yd', 'kg', 'pcs', 'roll'] as const;
export type Uom = (typeof UOMS)[number];

export interface Quantity {
  readonly value: bigint;
  readonly uom: Uom;
}

export function quantity(value: bigint, uom: Uom): Quantity {
  return { value, uom };
}

export function parseQuantity(input: string, uom: Uom): Quantity {
  return quantity(parseFixed(input, QUANTITY_DECIMALS), uom);
}

export function quantityFromStored(stored: string | number | bigint, uom: Uom): Quantity {
  return quantity(BigInt(stored), uom);
}

export function quantityToStored(value: Quantity): string {
  return value.value.toString();
}

function assertSameUom(a: Quantity, b: Quantity): void {
  if (a.uom !== b.uom) throw new RangeError(`Unit mismatch: ${a.uom} and ${b.uom}`);
}

export function addQuantity(a: Quantity, b: Quantity): Quantity {
  assertSameUom(a, b);
  return quantity(a.value + b.value, a.uom);
}

export function subtractQuantity(a: Quantity, b: Quantity): Quantity {
  assertSameUom(a, b);
  return quantity(a.value - b.value, a.uom);
}

export function compareQuantity(a: Quantity, b: Quantity): -1 | 0 | 1 {
  assertSameUom(a, b);
  return a.value === b.value ? 0 : a.value < b.value ? -1 : 1;
}

// One yard is exactly 0.9144 metres.
const YARD_IN_TEN_THOUSANDTHS_OF_METRE = 9144n;

/** Fabric length is canonical in metres; suppliers sometimes quote in yards. */
export function toMetres(value: Quantity): Quantity {
  if (value.uom === 'm') return value;
  if (value.uom === 'yd') {
    return quantity(divRound(value.value * YARD_IN_TEN_THOUSANDTHS_OF_METRE, 10_000n), 'm');
  }
  throw new RangeError(`${value.uom} is not a length`);
}

export function toYards(value: Quantity): Quantity {
  if (value.uom === 'yd') return value;
  if (value.uom === 'm') {
    return quantity(divRound(value.value * 10_000n, YARD_IN_TEN_THOUSANDTHS_OF_METRE), 'yd');
  }
  throw new RangeError(`${value.uom} is not a length`);
}

/** Largest quantity allowed on a line given an over-delivery tolerance in percent. */
export function withTolerance(ordered: Quantity, tolerancePercent: number): Quantity {
  const basisPoints = BigInt(Math.round(tolerancePercent * 100));
  return quantity(ordered.value + divRound(ordered.value * basisPoints, 10_000n), ordered.uom);
}

/** "1,240.5 m" — trailing zeros dropped down to `minDigits`. */
export function formatQuantity(value: Quantity, minDigits = 0): string {
  let text = formatFixed(value.value, QUANTITY_DECIMALS);
  if (text.includes('.')) {
    const [whole = '', fraction = ''] = text.split('.');
    const trimmed = fraction.replace(/0+$/, '').padEnd(minDigits, '0');
    text = trimmed ? `${whole}.${trimmed}` : whole;
  }
  return `${groupThousands(text)} ${value.uom}`;
}
