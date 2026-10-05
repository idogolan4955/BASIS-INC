// Logistics dates (ETD, ETA, ex-factory) are calendar dates at a place, not instants.
// They are carried as "YYYY-MM-DD" strings and never converted through a time zone.

export type LocalDate = string & { readonly __brand: 'LocalDate' };

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDate(value: string): value is LocalDate {
  const match = PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function localDate(value: string): LocalDate {
  if (!isLocalDate(value)) throw new RangeError(`Not a calendar date: "${value}"`);
  return value;
}

function toUtc(value: LocalDate): Date {
  return new Date(`${value}T00:00:00Z`);
}

function fromUtc(date: Date): LocalDate {
  return date.toISOString().slice(0, 10) as LocalDate;
}

/** Today's calendar date in a given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return localDate(parts.format(now));
}

export function addDays(value: LocalDate, days: number): LocalDate {
  const date = toUtc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** Whole days from `from` to `to`; positive when `to` is later. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** "06 Oct 2026" — the one date format used across the platform. */
export function formatLocalDate(value: LocalDate): string {
  const [year = '', month = '', day = ''] = value.split('-');
  return `${day} ${MONTHS[Number(month) - 1] ?? ''} ${year}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function weekdayOf(value: LocalDate): string {
  return WEEKDAYS[toUtc(value).getUTCDay()] ?? '';
}

/** ISO 8601 week number: weeks start on Monday, week 1 holds the first Thursday. */
export function isoWeekOf(value: LocalDate): number {
  const date = toUtc(value);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
}
