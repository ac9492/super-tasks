import { DateTimeLocale } from '../locale.constants';
import { formatMonthDay } from '../../util/format-month-day.util';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { isDBDateStr } from '../../util/get-db-date-str';

export interface TaskDateDisplayOptions {
  dateStyle: 'numeric' | 'day-month' | 'month-day-ordinal';
  showWeekdays: boolean;
  locale: DateTimeLocale;
  textLocale: string;
}

const weekdays = new Map<string, Intl.DateTimeFormat>();
const months = new Map<string, Intl.DateTimeFormat>();
const englishMonth = new Intl.DateTimeFormat('en-US', { month: 'long' });
const ordinal = new Intl.PluralRules('en-US', { type: 'ordinal' });
const suffixes: Record<Intl.LDMLPluralRule, string> = {
  zero: 'th',
  one: 'st',
  two: 'nd',
  few: 'rd',
  many: 'th',
  other: 'th',
};

const calendarDay = (d: Date): number =>
  Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;

/** The seven-day window is calendar based, including across DST and year ends. */
export const formatTaskDateLabel = (
  date: Date,
  todayStr: string,
  options: TaskDateDisplayOptions,
): string => {
  if (!Number.isFinite(date.getTime())) return '';
  if (options.showWeekdays && isDBDateStr(todayStr)) {
    const diff = calendarDay(date) - calendarDay(dateStrToUtcDate(todayStr));
    if (diff >= 1 && diff <= 7) {
      let formatter = weekdays.get(options.textLocale);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(options.textLocale, { weekday: 'long' });
        weekdays.set(options.textLocale, formatter);
      }
      return formatter.format(date);
    }
  }
  const day = date.getDate();
  switch (options.dateStyle) {
    case 'day-month': {
      let formatter = months.get(options.textLocale);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(options.textLocale, { month: 'short' });
        months.set(options.textLocale, formatter);
      }
      return `${day}-${formatter.format(date)}`;
    }
    case 'month-day-ordinal':
      return `${englishMonth.format(date)} ${day}${suffixes[ordinal.select(day)]}`;
    default:
      return formatMonthDay(date, options.locale);
  }
};
