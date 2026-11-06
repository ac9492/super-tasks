import { computed, Signal, signal } from '@angular/core';
import {
  getScheduledDateColor,
  readClockUntilDue,
  ScheduledDateColor,
} from './get-scheduled-date-color';

describe('getScheduledDateColor', () => {
  const today = '2026-10-03';
  const now = new Date(2026, 9, 3, 12).getTime();
  const color = (dueDay: string): ScheduledDateColor =>
    getScheduledDateColor({ dueDay, isDone: false }, today, 0, now);

  it('colors today, tomorrow and the original upcoming window', () => {
    expect(color('2026-10-02')).toBe('overdue');
    expect(color(today)).toBe('today');
    expect(color('2026-10-04')).toBe('tomorrow');
    expect(color('2026-10-05')).toBe('upcoming');
    expect(color('2026-10-10')).toBe('upcoming');
    expect(color('2026-10-11')).toBe('upcoming');
    expect(color('2026-10-12')).toBe('');
  });

  it('keeps completed, unscheduled and invalid dates at their default color', () => {
    expect(
      getScheduledDateColor({ dueDay: '2026-10-02', isDone: true }, today, 0, now),
    ).toBe('');
    expect(getScheduledDateColor({ isDone: false }, today, 0, now)).toBe('');
    expect(color('invalid')).toBe('');
    expect(color('2026-02-30')).toBe('');
  });

  it('turns red at the scheduled time without waiting for a day change', () => {
    const task = { isDone: false, dueWithTime: now };
    expect(getScheduledDateColor(task, today, 0, now - 1)).toBe('today');
    expect(getScheduledDateColor(task, today, 0, now)).toBe('overdue');
    expect(getScheduledDateColor(task, today, 0, now + 1)).toBe('overdue');
  });

  it('uses the configured logical day for timestamps and prefers time over dueDay', () => {
    // 01:00 on Oct 3 belongs to Oct 2 when the day starts at 04:00.
    const earlyToday = new Date(2026, 9, 3, 1).getTime();
    const task = { isDone: false, dueDay: '2026-10-12', dueWithTime: earlyToday };
    const startOfNextDayDiffMs = 4 * 60 * 60 * 1000;
    expect(getScheduledDateColor(task, today, startOfNextDayDiffMs, 0)).toBe('overdue');
    expect(getScheduledDateColor(task, today, 0, 0)).toBe('today');
  });
  it('counts calendar days across year and daylight-saving boundaries', () => {
    const classify = (dueDay: string, day: string): ScheduledDateColor =>
      getScheduledDateColor({ dueDay, isDone: false }, day, 0, 0);
    expect(classify('2027-01-01', '2026-12-31')).toBe('tomorrow');
    expect(classify('2027-01-07', '2026-12-30')).toBe('upcoming');
    expect(classify('2027-01-08', '2026-12-30')).toBe('');
    expect(classify('2026-03-09', '2026-03-07')).toBe('upcoming');
    expect(classify('2026-11-02', '2026-10-31')).toBe('upcoming');
  });
});

describe('readClockUntilDue', () => {
  const MINUTE = 60 * 1000;
  const due = new Date(2026, 9, 3, 12).getTime();
  const dueMinute = due / MINUTE;
  const trackColor = (
    clock: Signal<number>,
    clockMinute: Signal<number>,
  ): { color: Signal<ScheduledDateColor>; runs: () => number } => {
    let runs = 0;
    const color = computed(() => {
      runs++;
      return getScheduledDateColor(
        { isDone: false, dueWithTime: due },
        '2026-10-03',
        0,
        readClockUntilDue(clock, clockMinute, due),
      );
    });
    return { color, runs: () => runs };
  };

  it('stops re-running a color once the task is due', () => {
    const clock = signal(due - 2000);
    const clockMinute = signal(dueMinute - 1);
    const { color, runs } = trackColor(clock, clockMinute);

    expect(color()).toBe('today');
    clock.set(due - 1000);
    expect(color()).toBe('today');
    clock.set(due);
    expect(color()).toBe('overdue');
    expect(runs()).toBe(3);

    clock.set(due + 1000);
    clockMinute.set(dueMinute);
    expect(color()).toBe('overdue');
    expect(runs()).toBe(3);
  });

  it('re-runs a color once a minute until the last two minutes before it is due', () => {
    const clockMinute = signal(dueMinute - 10);
    const clock = signal(clockMinute() * MINUTE);
    const { color, runs } = trackColor(clock, clockMinute);

    expect(color()).toBe('today');
    clock.set(clock() + 1000);
    clock.set(clock() + 29000);
    expect(color()).toBe('today');
    expect(runs()).toBe(1);

    for (let minutesLeft = 9; minutesLeft >= 2; minutesLeft--) {
      clockMinute.set(dueMinute - minutesLeft);
      clock.set(clockMinute() * MINUTE);
      expect(color()).toBe('today');
    }
    expect(runs()).toBe(9);

    // Two minutes before it is due, the color follows the second clock.
    clock.set(due - 1000);
    expect(color()).toBe('today');
    clock.set(due);
    expect(color()).toBe('overdue');
    expect(runs()).toBe(11);
  });
});
