// Money and quantities are stored as fixed-point integers so that sums and
// allocations are exact. All arithmetic on stored values goes through here.

/** Integer division rounding half away from zero. */
export function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new RangeError('Division by zero');
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = (n * 2n + d) / (d * 2n);
  return negative ? -quotient : quotient;
}

/** Parses a decimal string ("1240.5", "-0.25") into a fixed-point integer. */
export function parseFixed(input: string, decimals: number): bigint {
  const text = input.trim().replace(/,/g, '');
  const match = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || (match[2] === '' && (match[3] ?? '') === '')) {
    throw new SyntaxError(`Not a decimal number: "${input}"`);
  }
  const whole = match[2] || '0';
  const fraction = match[3] ?? '';
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) {
    throw new RangeError(`"${input}" has more than ${decimals} decimal places`);
  }
  const scaled = BigInt(whole + fraction.slice(0, decimals).padEnd(decimals, '0'));
  return match[1] === '-' ? -scaled : scaled;
}

/** Renders a fixed-point integer as a plain decimal string with `digits` places. */
export function formatFixed(value: bigint, decimals: number, digits = decimals): string {
  const rounded = digits >= decimals ? value : divRound(value, 10n ** BigInt(decimals - digits));
  const places = Math.min(digits, decimals);
  const negative = rounded < 0n;
  const abs = (negative ? -rounded : rounded).toString().padStart(places + 1, '0');
  const whole = places === 0 ? abs : abs.slice(0, -places);
  const fraction = places === 0 ? '' : abs.slice(-places).padEnd(digits, '0');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** Inserts thousands separators into the whole part of a plain decimal string. */
export function groupThousands(decimal: string): string {
  const [whole = '', fraction] = decimal.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/**
 * Splits `total` across `weights` so the parts sum to `total` exactly.
 * Remainder units go to the largest fractional remainders (largest-remainder method).
 */
export function allocate(total: bigint, weights: readonly bigint[]): bigint[] {
  if (weights.length === 0) throw new RangeError('Nothing to allocate to');
  if (weights.some((w) => w < 0n)) throw new RangeError('Weights must not be negative');
  const weightSum = weights.reduce((sum, w) => sum + w, 0n);
  if (weightSum === 0n) throw new RangeError('Weights sum to zero');

  const sign = total < 0n ? -1n : 1n;
  const magnitude = total * sign;
  const parts = weights.map((w) => (magnitude * w) / weightSum);
  const remainders = weights.map((w, index) => ({ index, remainder: (magnitude * w) % weightSum }));
  let left = magnitude - parts.reduce((sum, p) => sum + p, 0n);

  remainders.sort((a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1));
  for (const { index } of remainders) {
    if (left === 0n) break;
    parts[index] = (parts[index] ?? 0n) + 1n;
    left -= 1n;
  }
  return parts.map((p) => p * sign);
}
