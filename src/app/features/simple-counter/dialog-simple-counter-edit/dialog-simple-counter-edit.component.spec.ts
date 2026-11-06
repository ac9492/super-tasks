/* eslint-disable @typescript-eslint/naming-convention */
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DateService } from 'src/app/core/date/date.service';
import { DateTimeFormatService } from 'src/app/core/date-time-format/date-time-format.service';
import { SimpleCounterService } from '../simple-counter.service';
import { EMPTY_SIMPLE_COUNTER } from '../simple-counter.const';
import { SimpleCounterCopy, SimpleCounterType } from '../simple-counter.model';
import { DialogSimpleCounterEditComponent } from './dialog-simple-counter-edit.component';

describe('DialogSimpleCounterEditComponent', () => {
  const label = (y: number, m: number, d: number): string =>
    new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
    });

  const createComponent = (
    simpleCounter: SimpleCounterCopy,
    selectedDate?: string,
  ): DialogSimpleCounterEditComponent => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { simpleCounter, selectedDate } },
        { provide: MatDialogRef, useValue: {} },
        { provide: MatDialog, useValue: {} },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) =>
              key === T.F.SIMPLE_COUNTER.D_EDIT.GOAL_MET ? 'Goal met' : 'Goal not met',
          },
        },
        { provide: SimpleCounterService, useValue: {} },
        { provide: DateService, useValue: { todayStr: () => '2026-01-07' } },
        {
          provide: DateTimeFormatService,
          useValue: { currentLocale: () => 'en-US' },
        },
      ],
    });
    return TestBed.runInInjectionContext(() => new DialogSimpleCounterEditComponent());
  };

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 0, 7, 12));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    TestBed.resetTestingModule();
  });

  // Date-only keys must be read as local days; parsing them as UTC midnight
  // shifts every label and weekday by one in timezones west of UTC.
  it('should label chart days and streak weekdays by their local date', () => {
    const component = createComponent({
      ...EMPTY_SIMPLE_COUNTER,
      type: SimpleCounterType.ClickCounter,
      countOnDay: { '2026-01-05': 3 },
      isTrackStreaks: true,
      streakMinValue: 1,
      // 2026-01-05 is Monday; Tuesday has no entry and misses its goal.
      streakWeekDays: { 1: true, 2: true },
    });

    const { labels, datasets } = component.chartData();

    expect(labels).toEqual([
      `${label(2026, 1, 5)}: Goal met`,
      `${label(2026, 1, 6)}: Goal not met`,
      label(2026, 1, 7),
    ]);
    expect(datasets[0].data).toEqual([3, 0, 0]);
  });

  it('should format the selected date as its local day', () => {
    const component = createComponent(
      { ...EMPTY_SIMPLE_COUNTER, countOnDay: {} },
      '2026-01-05',
    );

    expect(component.formatSelectedDate()).toBe(label(2026, 1, 5));
  });
});
