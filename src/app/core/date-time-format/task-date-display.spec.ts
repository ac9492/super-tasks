import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { LocalizationConfig } from '../../features/config/global-config.model';
import { DateTimeFormatService } from './date-time-format.service';
import { formatTaskDateLabel, TaskDateDisplayOptions } from './task-date-display';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { DateTimeLocales } from '../locale.constants';

const options: TaskDateDisplayOptions = {
  dateStyle: 'day-month',
  showWeekdays: true,
  locale: DateTimeLocales.en_us,
  textLocale: 'en-US',
};
const label = (
  day: string,
  today: string,
  changes: Partial<TaskDateDisplayOptions> = {},
): string =>
  formatTaskDateLabel(dateStrToUtcDate(day), today, { ...options, ...changes });

describe('task date display', () => {
  it('labels tomorrow through the seventh day, and falls back on day eight', () => {
    const days = [
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
    ];
    days.forEach((weekday, index) => {
      expect(label(`2026-11-${String(5 + index).padStart(2, '0')}`, '2026-11-04')).toBe(
        weekday,
      );
    });
    expect(label('2026-11-12', '2026-11-04')).toBe('12-Nov');
    expect(label('2026-11-03', '2026-11-04')).toBe('3-Nov');
  });
  it('crosses month and year boundaries using calendar days', () => {
    expect(label('2027-01-01', '2026-12-30')).toBe('Friday');
    expect(label('2027-01-06', '2026-12-30')).toBe('Wednesday');
    expect(label('2027-01-07', '2026-12-30')).toBe('7-Jan');
  });
  it('handles spring-forward and fall-back calendar windows', () => {
    expect(label('2026-03-11', '2026-03-04')).toBe('Wednesday');
    expect(label('2026-11-04', '2026-10-28')).toBe('Wednesday');
  });
  it('can disable weekdays while retaining numeric locale order', () => {
    expect(
      label('2026-12-03', '2026-12-01', { showWeekdays: false, dateStyle: 'numeric' }),
    ).toBe('12/3');
    expect(
      label('2026-12-03', '2026-12-01', {
        showWeekdays: false,
        dateStyle: 'numeric',
        locale: DateTimeLocales.en_gb,
      }),
    ).toBe('03/12');
  });
  it('localizes weekday and abbreviated month names', () => {
    expect(label('2026-11-05', '2026-11-04', { textLocale: 'de-DE' })).toBe('Donnerstag');
    expect(label('2026-12-03', '2026-11-04', { textLocale: 'de-DE' })).toBe('3-Dez');
  });
  for (const [day, suffix] of [
    [1, 'st'],
    [2, 'nd'],
    [3, 'rd'],
    [4, 'th'],
    [11, 'th'],
    [12, 'th'],
    [13, 'th'],
    [21, 'st'],
    [22, 'nd'],
    [23, 'rd'],
    [31, 'st'],
  ] as const) {
    it(`uses the correct English ordinal for ${day}`, () => {
      expect(
        label(`2026-12-${String(day).padStart(2, '0')}`, '', {
          dateStyle: 'month-day-ordinal',
        }),
      ).toBe(`December ${day}${suffix}`);
    });
  }
  it('preserves numeric fallback for unknown future styles and invalid dates', () => {
    expect(formatTaskDateLabel(new Date(NaN), '', options)).toBe('');
    expect(
      label('2026-12-03', '', {
        dateStyle: 'future-style' as TaskDateDisplayOptions['dateStyle'],
      }),
    ).toBe('12/3');
  });
});

describe('task date preference compatibility', () => {
  const config = signal<LocalizationConfig>({});
  beforeEach(() => {
    config.set({});
    TestBed.configureTestingModule({
      providers: [
        DateTimeFormatService,
        { provide: GlobalConfigService, useValue: { localization: config } },
        { provide: TranslateService, useValue: { currentLang: 'en', defaultLang: 'en' } },
      ],
    });
  });
  it('provides runtime defaults for older saved configurations', () => {
    const service = TestBed.inject(DateTimeFormatService);
    expect(service.taskDateDisplay().dateStyle).toBe('day-month');
    expect(service.taskDateDisplay().showWeekdays).toBeTrue();
    config.set({ taskDateStyle: null, isShowWeekdayForNextWeek: null });
    expect(service.taskDateDisplay().dateStyle).toBe('day-month');
    expect(service.taskDateDisplay().showWeekdays).toBeTrue();
  });
  it('honors an explicit false and preserves date-entry order and clock format', () => {
    config.set({ dateTimeLocale: DateTimeLocales.en_us });
    const service = TestBed.inject(DateTimeFormatService);
    const inputOrder = service.dateInputLocale().isDayFirst;
    const dateFormat = service.dateFormat().raw;
    const clock = service.is24HourFormat();
    config.set({
      dateTimeLocale: DateTimeLocales.en_us,
      isShowWeekdayForNextWeek: false,
      taskDateStyle: 'month-day-ordinal',
    });
    expect(service.taskDateDisplay().showWeekdays).toBeFalse();
    expect(service.taskDateDisplay().dateStyle).toBe('month-day-ordinal');
    expect(service.dateInputLocale().isDayFirst).toBe(inputOrder);
    expect(service.dateFormat().raw).toBe(dateFormat);
    expect(service.is24HourFormat()).toBe(clock);
  });
});
