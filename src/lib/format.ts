const LOCALE = 'en-ZA';
const FALLBACK = '—';

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The API serialises some numbers as strings; this accepts both. Returns NaN when unparseable. */
export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

/** Formats an amount as currency, e.g. `R 1 234,50` for ZAR. */
export function formatMoney(amount: number | string | null | undefined, currency = 'ZAR'): string {
  const value = toNumber(amount);
  if (!Number.isFinite(value)) return FALLBACK;
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(value);
  } catch {
    // An unknown currency code must not break the screen.
    return `${currency} ${new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  }
}

/**
 * Parses a calendar date (`YYYY-MM-DD`) to a Date at UTC midnight. Calendar dates have no time
 * zone, so they are always formatted in UTC to stop them shifting a day in either direction.
 */
function parseCalendarDate(value: string): Date | undefined {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate ? date : undefined;
}

function formatCalendar(value: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  const date = value ? parseCalendarDate(value) : undefined;
  if (!date) return FALLBACK;
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: 'UTC' }).format(date);
}

/** Formats a calendar date such as an action date: `2026-03-01` becomes `01 Mar 2026`. */
export function formatDate(value: string | null | undefined): string {
  return formatCalendar(value, { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseInstant(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatInstant(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  timeZone?: string,
): string {
  const date = parseInstant(value);
  if (!date) return FALLBACK;
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone }).format(date);
}

/** Formats an instant (ISO 8601 date-time) as a date and time in the viewer's time zone. */
export function formatDateTime(value: string | null | undefined, timeZone?: string): string {
  return formatInstant(
    value,
    { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    timeZone,
  );
}

/** Formats the time of day of an instant, e.g. `14:05`. */
export function formatTime(value: string | null | undefined, timeZone?: string): string {
  return formatInstant(value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, timeZone);
}

export interface DayBadge {
  day: string;
  month: string;
}

/** Splits an instant into the day and short month shown on a timeline date badge. */
export function formatDayBadge(
  value: string | null | undefined,
  timeZone?: string,
): DayBadge | null {
  const date = parseInstant(value);
  if (!date) return null;
  return {
    day: new Intl.DateTimeFormat(LOCALE, { day: '2-digit', timeZone }).format(date),
    month: new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone }).format(date),
  };
}

const ORDINAL_RULES = new Intl.PluralRules('en', { type: 'ordinal' });
const ORDINAL_SUFFIX: Record<Intl.LDMLPluralRule, string> = {
  zero: 'th',
  one: 'st',
  two: 'nd',
  few: 'rd',
  many: 'th',
  other: 'th',
};

/** `1` becomes `1st`, `22` becomes `22nd`; used for a mandate's collection day. */
export function formatOrdinal(value: number | string | null | undefined): string {
  const number = toNumber(value);
  if (!Number.isInteger(number)) return FALLBACK;
  return `${number}${ORDINAL_SUFFIX[ORDINAL_RULES.select(number)]}`;
}

/** Splits a PascalCase enum value into words: `SentToScheme` becomes `Sent to scheme`. */
export function humanizeEnum(value: string): string {
  const words = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
