import { getDbDateStr, isValidDBDateStr } from '../../../util/get-db-date-str';
import { Task } from '../task.model';

export type ScheduledDateColor = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | '';

/** Relative calendar-day colors, independent of label formatting and DST hours. */
export const getScheduledDateColor = (
  task: Pick<Task, 'dueDay' | 'dueWithTime' | 'isDone'>,
  today: string,
  startOfNextDayDiffMs: number,
  now: number,
): ScheduledDateColor => {
  if (task.isDone) return '';
  const dueDate = task.dueWithTime
    ? getDbDateStr(new Date(task.dueWithTime - startOfNextDayDiffMs))
    : task.dueDay;
  if (!dueDate || !isValidDBDateStr(dueDate)) return '';
  if (dueDate < today || (task.dueWithTime && task.dueWithTime <= now)) {
    return 'overdue';
  }
  if (dueDate === today) return 'today';
  // These ISO day strings represent calendar dates, not elapsed local hours.
  const days = (Date.parse(dueDate) - Date.parse(today)) / 86400000;
  if (days === 1) return 'tomorrow';
  return days >= 2 && days <= 8 ? 'upcoming' : '';
};
