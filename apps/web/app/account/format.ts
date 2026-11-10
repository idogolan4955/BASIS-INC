import { formatMoney, formatQuantity, moneyFromStored, quantityFromStored, type Uom } from '@basis/shared';
import type { Locale } from './i18n';

// Amounts, quantities and dates for the portal. Amounts keep their ISO code
// (as on every BASIS document) and are computed by the shared value types.

export const money = (stored: string | null | undefined, currency: string) => (stored === null || stored === undefined ? '—' : formatMoney(moneyFromStored(stored, currency)));

export const qty = (stored: string | null | undefined, uom: string) => (stored === null || stored === undefined ? '—' : formatQuantity(quantityFromStored(stored, (uom || 'm') as Uom)));

export function date(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const parsed = value.length === 10 ? new Date(`${value}T12:00:00Z`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

export const today = () => new Date().toISOString().slice(0, 10);
