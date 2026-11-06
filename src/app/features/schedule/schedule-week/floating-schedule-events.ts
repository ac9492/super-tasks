import { SCHEDULE_FLOW_TYPES, SVEType } from '../schedule.const';
import {
  isAllDayCalendarEvent,
  isScheduleCalendarEvent,
  ScheduleEvent,
} from '../schedule.model';

/** Presentation only: date-only work never acquires an implied start time. */
export const isFloatingScheduleEvent = (event: ScheduleEvent): boolean => {
  if (isScheduleCalendarEvent(event)) {
    return isAllDayCalendarEvent(event.data);
  }
  if (
    !SCHEDULE_FLOW_TYPES.includes(event.type) &&
    event.type !== SVEType.SplitTaskPlannedForDay
  ) {
    return false;
  }
  const data = event.data as { dueWithTime?: number; startTime?: string } | undefined;
  return !data?.dueWithTime && !data?.startTime;
};

export const floatingScheduleEventsByDay = (
  events: ScheduleEvent[],
  days: string[],
): Record<string, ScheduleEvent[]> => {
  const result: Record<string, ScheduleEvent[]> = Object.fromEntries(
    days.map((day) => [day, []]),
  );
  const seen = new Set<string>();
  for (const event of events) {
    if (!isFloatingScheduleEvent(event)) continue;
    const data = event.data as { dueDay?: string } | undefined;
    const plannedDay = event.sourceOccurrenceDate ?? event.plannedForDay ?? data?.dueDay;
    const day = plannedDay && result[plannedDay] ? plannedDay : event.displayDay;
    if (!day || !result[day]) continue;
    const isCalendar = isScheduleCalendarEvent(event);
    const isRepeat = event.type.startsWith('RepeatProjection');
    const key = isCalendar || isRepeat ? `${event.id}:${day}` : event.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result[day].push({
      ...event,
      // Show split work once, with its full title and normal card edges.
      type: isCalendar ? event.type : isRepeat ? SVEType.RepeatProjection : SVEType.Task,
      style: '',
      overlap: undefined,
    });
  }
  return result;
};
