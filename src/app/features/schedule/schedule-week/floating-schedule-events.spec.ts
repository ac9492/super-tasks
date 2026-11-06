import { SVEType } from '../schedule.const';
import { ScheduleEvent } from '../schedule.model';
import {
  floatingScheduleEventsByDay,
  isFloatingScheduleEvent,
} from './floating-schedule-events';

const event = (overrides: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id: 'task',
  type: SVEType.TaskPlannedForDay,
  displayDay: '2026-11-06',
  plannedForDay: '2026-11-06',
  style: 'grid-column: 2; grid-row: 1 / span 12',
  startHours: 0,
  timeLeftInHours: 1,
  data: { id: 'task', dueDay: '2026-11-06' } as ScheduleEvent['data'],
  ...overrides,
});

describe('floating schedule events', () => {
  it('keeps timed midnight work in the time grid', () => {
    expect(isFloatingScheduleEvent(event({ type: SVEType.ScheduledTask }))).toBeFalse();
    expect(
      isFloatingScheduleEvent(
        event({
          type: SVEType.SplitTaskContinued,
          data: { dueWithTime: 1793923200000 } as ScheduleEvent['data'],
        }),
      ),
    ).toBeFalse();
  });

  it('places date-only work once on its planned day, including hidden overflow', () => {
    const head = event({ type: SVEType.SplitTaskPlannedForDay });
    const continuation = event({
      type: SVEType.SplitTaskContinued,
      displayDay: '2026-11-07',
    });
    const overflow = event({ id: 'overflow', isBeyondBudget: true });
    const result = floatingScheduleEventsByDay(
      [head, continuation, overflow],
      ['2026-11-06', '2026-11-07'],
    );
    expect(result['2026-11-06'].map((entry) => entry.id)).toEqual(['task', 'overflow']);
    expect(result['2026-11-07']).toEqual([]);
    expect(result['2026-11-06'][0].style).toBe('');
    expect(head.style).toContain('grid-row');
  });

  it('retains separate untimed repeat occurrences', () => {
    const first = event({
      type: SVEType.RepeatProjection,
      sourceOccurrenceDate: '2026-11-06',
    });
    const second = event({
      type: SVEType.RepeatProjection,
      sourceOccurrenceDate: '2026-11-07',
    });
    const result = floatingScheduleEventsByDay(
      [first, second],
      ['2026-11-06', '2026-11-07'],
    );
    expect(result['2026-11-06'].length).toBe(1);
    expect(result['2026-11-07'].length).toBe(1);
  });

  it('shows an all-day calendar event outside the grid', () => {
    const calendar = event({
      type: SVEType.CalendarEvent,
      data: {
        issueProviderKey: 'ICAL',
        isAllDay: true,
        duration: 86400000,
      } as ScheduleEvent['data'],
    });
    expect(isFloatingScheduleEvent(calendar)).toBeTrue();
  });
});
