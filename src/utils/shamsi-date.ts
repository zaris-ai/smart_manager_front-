export const SHAMSI_LOCALE = 'fa-IR-u-ca-persian';
const SHAMSI_LATIN_LOCALE = 'fa-IR-u-ca-persian-nu-latn';

export type ShamsiDateParts = {
  year: number;
  month: number;
  day: number;
};

export const toSafeDate = (value?: Date | string | null): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const rawValue = String(value).trim();

  if (!rawValue) return null;

  /**
   * Backend date-only values are Gregorian ISO dates. Parse them as local dates
   * so they do not shift by timezone before being displayed as Shamsi.
   */
  const dateOnlyMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));

    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const parsedDate = new Date(rawValue);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatDateInputValue = (value?: Date | string | null): string => {
  const date = toSafeDate(value);

  if (!date) return '';

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const toGregorianDateKey = (value?: Date | string | null): string => {
  return formatDateInputValue(value);
};

export const compareDateValues = (
  first?: Date | string | null,
  second?: Date | string | null,
): number => {
  const firstDate = toSafeDate(first);
  const secondDate = toSafeDate(second);

  if (!firstDate && !secondDate) return 0;
  if (!firstDate) return 1;
  if (!secondDate) return -1;

  return firstDate.getTime() - secondDate.getTime();
};

export const isPastDate = (value?: Date | string | null): boolean => {
  const date = toSafeDate(value);

  if (!date) return false;

  const today = new Date();
  const targetDate = new Date(date);

  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate.getTime() < today.getTime();
};

export const formatShamsiDate = (
  value?: Date | string | null,
  fallback = '—',
): string => {
  const date = toSafeDate(value);

  if (!date) return fallback;

  return new Intl.DateTimeFormat(SHAMSI_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const formatShamsiDateLong = (
  value?: Date | string | null,
  fallback = '—',
): string => {
  const date = toSafeDate(value);

  if (!date) return fallback;

  return new Intl.DateTimeFormat(SHAMSI_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const formatShamsiFullDate = (
  value?: Date | string | null,
  fallback = '—',
): string => {
  const date = toSafeDate(value);

  if (!date) return fallback;

  return new Intl.DateTimeFormat(SHAMSI_LOCALE, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const formatShamsiDateTime = (
  value?: Date | string | null,
  fallback = '—',
): string => {
  const date = toSafeDate(value);

  if (!date) return fallback;

  return new Intl.DateTimeFormat(SHAMSI_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatShamsiShortDateTime = (
  value?: Date | string | null,
  fallback = '—',
): string => {
  const date = toSafeDate(value);

  if (!date) return fallback;

  return new Intl.DateTimeFormat(SHAMSI_LOCALE, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatShamsiMonthYear = (
  value?: Date | string | null,
  fallback = '—',
): string => {
  const date = toSafeDate(value);

  if (!date) return fallback;

  return new Intl.DateTimeFormat(SHAMSI_LOCALE, {
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const formatShamsiDayNumber = (
  value?: Date | string | null,
  fallback = '—',
): string => {
  const date = toSafeDate(value);

  if (!date) return fallback;

  return new Intl.DateTimeFormat(SHAMSI_LOCALE, {
    day: 'numeric',
  }).format(date);
};

export const getShamsiDateParts = (
  value?: Date | string | null,
): ShamsiDateParts | null => {
  const date = toSafeDate(value);

  if (!date) return null;

  const parts = new Intl.DateTimeFormat(SHAMSI_LATIN_LOCALE, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value || 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value || 0);
  const day = Number(parts.find((part) => part.type === 'day')?.value || 0);

  if (!year || !month || !day) return null;

  return { year, month, day };
};

export const getStartOfShamsiMonth = (value?: Date | string | null): Date => {
  const date = toSafeDate(value) || new Date();
  const parts = getShamsiDateParts(date);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  if (!parts) return start;

  start.setDate(start.getDate() - (parts.day - 1));

  return start;
};

export const getNextShamsiMonthStart = (value?: Date | string | null): Date => {
  const start = getStartOfShamsiMonth(value);
  const candidate = new Date(start);
  candidate.setDate(candidate.getDate() + 32);

  return getStartOfShamsiMonth(candidate);
};

export const getPreviousShamsiMonthStart = (
  value?: Date | string | null,
): Date => {
  const start = getStartOfShamsiMonth(value);
  const candidate = new Date(start);
  candidate.setDate(candidate.getDate() - 1);

  return getStartOfShamsiMonth(candidate);
};

const PERSIAN_DIGIT_MAP: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

export const normalizeDateDigits = (value?: string | null): string => {
  return String(value || '').replace(/[۰-۹٠-٩]/g, (digit) => {
    return PERSIAN_DIGIT_MAP[digit] || digit;
  });
};

export const parseShamsiDateInput = (
  value?: string | null,
): ShamsiDateParts | null => {
  const normalized = normalizeDateDigits(value)
    .trim()
    .replace(/[\s._\\-]+/g, '/')
    .replace(/\/+$/g, '');

  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (year < 1200 || year > 1600 || month < 1 || month > 12 || day < 1) {
    return null;
  }

  const maxDay = month <= 6 ? 31 : month <= 11 ? 30 : 29;

  if (day > maxDay + (month === 12 ? 1 : 0)) return null;

  return { year, month, day };
};

export const formatShamsiInputValue = (
  value?: Date | string | null,
  fallback = '',
): string => {
  const parts = getShamsiDateParts(value);

  if (!parts) return fallback;

  return `${parts.year}/${String(parts.month).padStart(2, '0')}/${String(
    parts.day,
  ).padStart(2, '0')}`;
};

export const shamsiPartsToGregorianDateKey = (
  parts?: ShamsiDateParts | null,
): string => {
  if (!parts) return '';

  /**
   * We deliberately keep this dependency-free. The search window starts around
   * Nowruz of the equivalent Gregorian year and compares Intl Persian-calendar
   * parts until the requested solar date is found.
   */
  const start = new Date(parts.year + 621, 2, 15);
  start.setHours(0, 0, 0, 0);

  for (let offset = -10; offset <= 380; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);

    const candidateParts = getShamsiDateParts(candidate);

    if (
      candidateParts?.year === parts.year &&
      candidateParts.month === parts.month &&
      candidateParts.day === parts.day
    ) {
      return formatDateInputValue(candidate);
    }
  }

  return '';
};

export const shamsiDateInputToGregorianDateKey = (
  value?: string | null,
): string => {
  return shamsiPartsToGregorianDateKey(parseShamsiDateInput(value));
};

export const isValidShamsiDateInput = (value?: string | null): boolean => {
  if (!String(value || '').trim()) return false;

  return Boolean(shamsiDateInputToGregorianDateKey(value));
};
