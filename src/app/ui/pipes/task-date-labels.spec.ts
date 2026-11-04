import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { LocalDateStrPipe } from './local-date-str.pipe';
import { ShortPlannedAtPipe } from './short-planned-at.pipe';
import { ShortTimeHtmlPipe } from './short-time-html.pipe';
import { DateService } from '../../core/date/date.service';
import { DateTimeFormatService } from '../../core/date-time-format/date-time-format.service';
import { TaskDateDisplayOptions } from '../../core/date-time-format/task-date-display';
import { DateTimeLocales } from '../../core/locale.constants';

const defaults: TaskDateDisplayOptions = {
  dateStyle: 'day-month',
  showWeekdays: true,
  locale: DateTimeLocales.en_us,
  textLocale: 'en-US',
};
@Component({
  imports: [LocalDateStrPipe, ShortPlannedAtPipe],
  template: `<span id="day">{{ day | localDateStr: today() : options() }}</span>
    <span id="timed">{{ timed | shortPlannedAt: false : today() : options() }}</span>`,
})
class DateLabelHost {
  day = '2026-12-03';
  timed = new Date(2026, 11, 3, 14).getTime();
  today = signal('2026-11-04');
  options = signal(defaults);
}

describe('task date label pipes', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [DateLabelHost],
      providers: [
        DateService,
        { provide: DateTimeFormatService, useValue: { taskDateDisplay: () => defaults } },
        { provide: TranslateService, useValue: { instant: () => 'Today' } },
        { provide: ShortTimeHtmlPipe, useValue: { transform: () => '14:00' } },
      ],
    }),
  );
  it('updates both pure pipes immediately for format, weekday and logical-day changes', () => {
    const fixture = TestBed.createComponent(DateLabelHost);
    const host = fixture.componentInstance;
    const text = (id: string): string =>
      fixture.nativeElement.querySelector(id).textContent.trim();
    fixture.detectChanges();
    expect(text('#day')).toBe('3-Dec');
    expect(text('#timed')).toBe('3-Dec');
    host.options.set({ ...defaults, dateStyle: 'month-day-ordinal' });
    fixture.detectChanges();
    expect(text('#day')).toBe('December 3rd');
    expect(text('#timed')).toBe('December 3rd');
    host.today.set('2026-11-26');
    fixture.detectChanges();
    expect(text('#day')).toBe('Thursday');
    expect(text('#timed')).toBe('Thursday');
    host.options.set({ ...defaults, showWeekdays: false });
    fixture.detectChanges();
    expect(text('#day')).toBe('3-Dec');
    host.today.set('2026-12-03');
    fixture.detectChanges();
    expect(text('#day')).toBe('Today');
    expect(text('#timed')).toBe('14:00');
  });
  it('uses the configured logical-day boundary for timed tasks', () => {
    const fixture = TestBed.createComponent(DateLabelHost);
    TestBed.inject(DateService).setStartOfNextDayDiff('04:00');
    fixture.componentInstance.timed = new Date(2026, 11, 4, 2).getTime();
    fixture.componentInstance.today.set('2026-12-03');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#timed').textContent.trim()).toBe(
      '14:00',
    );
    fixture.componentInstance.today.set('2026-12-02');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#timed').textContent.trim()).toBe(
      'Thursday',
    );
  });
});
