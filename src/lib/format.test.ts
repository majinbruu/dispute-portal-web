import {
  formatDate,
  formatDateTime,
  formatDayBadge,
  formatMoney,
  formatOrdinal,
  formatTime,
  humanizeEnum,
  toNumber,
} from './format';

/** Intl uses non-breaking and narrow spaces; normalise them so assertions stay readable. */
const plain = (value: string) => value.replace(/\s/g, ' ');

describe('toNumber', () => {
  it('accepts numbers and numeric strings', () => {
    expect(toNumber(12.5)).toBe(12.5);
    expect(toNumber('12.50')).toBe(12.5);
  });

  it('returns NaN for missing or blank values', () => {
    expect(toNumber(null)).toBeNaN();
    expect(toNumber(undefined)).toBeNaN();
    expect(toNumber('  ')).toBeNaN();
  });
});

describe('formatMoney', () => {
  it('formats rand amounts for South Africa', () => {
    expect(plain(formatMoney(1234.5, 'ZAR'))).toBe('R 1 234,50');
  });

  it('accepts amounts serialised as strings', () => {
    expect(plain(formatMoney('899.99', 'ZAR'))).toBe('R 899,99');
  });

  it('defaults to rand', () => {
    expect(plain(formatMoney(10))).toBe('R 10,00');
  });

  it('uses the currency supplied by the API', () => {
    expect(plain(formatMoney(10, 'USD'))).toContain('10,00');
    expect(plain(formatMoney(10, 'USD'))).toContain('US$');
  });

  it('falls back to a dash for unparseable amounts', () => {
    expect(formatMoney('abc', 'ZAR')).toBe('—');
    expect(formatMoney(null, 'ZAR')).toBe('—');
  });

  it('does not throw on an invalid currency code', () => {
    expect(plain(formatMoney(5, 'not-a-code'))).toBe('not-a-code 5,00');
  });
});

describe('formatDate', () => {
  it('formats a calendar date', () => {
    expect(plain(formatDate('2026-03-01'))).toBe('01 Mar 2026');
  });

  it.each(['2026-01-01', '2026-12-31', '2024-02-29'])(
    'does not shift %s through time zones',
    (value) => {
      const day = value.slice(8, 10);
      expect(plain(formatDate(value)).startsWith(`${day} `)).toBe(true);
      expect(formatDate(value)).toContain(value.slice(0, 4));
    },
  );

  it('falls back to a dash for missing or invalid dates', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('2026-02-30')).toBe('—');
    expect(formatDate('2026-03-01T10:00:00Z')).toBe('—');
  });
});

describe('instants', () => {
  const instant = '2026-03-01T22:30:00Z';

  it('formats date and time in the requested zone', () => {
    expect(plain(formatDateTime(instant, 'Africa/Johannesburg'))).toBe('02 Mar 2026, 00:30');
    expect(plain(formatDateTime(instant, 'UTC'))).toBe('01 Mar 2026, 22:30');
  });

  it('formats the time of day', () => {
    expect(formatTime(instant, 'UTC')).toBe('22:30');
    expect(formatTime(instant, 'Africa/Johannesburg')).toBe('00:30');
  });

  it('builds a day badge', () => {
    expect(formatDayBadge(instant, 'UTC')).toEqual({ day: '01', month: 'Mar' });
    expect(formatDayBadge(instant, 'Africa/Johannesburg')).toEqual({ day: '02', month: 'Mar' });
  });

  it('handles missing or invalid instants', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatTime('nope')).toBe('—');
    expect(formatDayBadge(undefined)).toBeNull();
  });

  it('uses the viewer time zone by default', () => {
    expect(formatDateTime(instant)).not.toBe('—');
  });
});

describe('formatOrdinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [22, '22nd'],
    ['31', '31st'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatOrdinal(value)).toBe(expected);
  });

  it('falls back to a dash for non-integers', () => {
    expect(formatOrdinal('x')).toBe('—');
    expect(formatOrdinal(1.5)).toBe('—');
  });
});

describe('humanizeEnum', () => {
  it('splits PascalCase into a sentence', () => {
    expect(humanizeEnum('SentToScheme')).toBe('Sent to scheme');
    expect(humanizeEnum('Refunded')).toBe('Refunded');
    expect(humanizeEnum('OnceOff')).toBe('Once off');
  });
});
