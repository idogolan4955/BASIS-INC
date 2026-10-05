import { allocate, divRound, formatFixed, groupThousands, parseFixed } from './fixed-point';
import { QUANTITY_SCALE, type Quantity } from './quantity';

/** Money is stored in ten-thousandths of the currency unit. */
export const MONEY_DECIMALS = 4;
export const MONEY_SCALE = 10n ** BigInt(MONEY_DECIMALS);

/** ISO 4217 code. */
export type CurrencyCode = string;

export interface Money {
  readonly amount: bigint;
  readonly currency: CurrencyCode;
}

export function money(amount: bigint, currency: CurrencyCode): Money {
  if (!/^[A-Z]{3}$/.test(currency)) throw new RangeError(`Not an ISO 4217 code: "${currency}"`);
  return { amount, currency };
}

export function parseMoney(input: string, currency: CurrencyCode): Money {
  return money(parseFixed(input, MONEY_DECIMALS), currency);
}

/** Reads the value stored in the database (Int64 arrives as a string). */
export function moneyFromStored(stored: string | number | bigint, currency: CurrencyCode): Money {
  return money(BigInt(stored), currency);
}

export function moneyToStored(value: Money): string {
  return value.amount.toString();
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new RangeError(`Currency mismatch: ${a.currency} and ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function sumMoney(values: readonly Money[], currency: CurrencyCode): Money {
  return values.reduce((total, value) => addMoney(total, value), money(0n, currency));
}

/** Line total: a unit price multiplied by a quantity. */
export function multiplyByQuantity(unitPrice: Money, quantity: Quantity): Money {
  return money(divRound(unitPrice.amount * quantity.value, QUANTITY_SCALE), unitPrice.currency);
}

/** Converts with a rate expressed as a decimal string, e.g. "0.1389". */
export function convertMoney(value: Money, rate: string, to: CurrencyCode): Money {
  const RATE_DECIMALS = 8;
  const scaledRate = parseFixed(rate, RATE_DECIMALS);
  return money(divRound(value.amount * scaledRate, 10n ** BigInt(RATE_DECIMALS)), to);
}

/** Splits an amount across weights; the parts always sum to the amount. */
export function allocateMoney(value: Money, weights: readonly bigint[]): Money[] {
  return allocate(value.amount, weights).map((part) => money(part, value.currency));
}

/** "1,240.50 USD" — the currency code always shown, never a symbol. */
export function formatMoney(value: Money, digits = 2): string {
  return `${groupThousands(formatFixed(value.amount, MONEY_DECIMALS, digits))} ${value.currency}`;
}
