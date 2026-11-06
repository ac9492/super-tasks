import { TaskCopy } from '../tasks/task.model';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
import { PlannerDayMap } from '../planner/planner.model';

// Pure helpers that narrow the global Calendar / Upcoming data to one project.
// A `null` / `undefined` projectId means "no scope": the input is returned as is.

export const filterTasksByProject = <T extends { projectId?: string | null }>(
  tasks: T[],
  projectId: string | null | undefined,
): T[] => (projectId ? tasks.filter((t) => t.projectId === projectId) : tasks);

export const filterRepeatCfgsByProject = (
  cfgs: TaskRepeatCfg[],
  projectId: string | null | undefined,
): TaskRepeatCfg[] => (projectId ? cfgs.filter((c) => c.projectId === projectId) : cfgs);

export const filterPlannerDayMapByProject = (
  dayMap: PlannerDayMap,
  projectId: string | null | undefined,
): PlannerDayMap => {
  if (!projectId) {
    return dayMap;
  }
  const result: PlannerDayMap = {};
  for (const [day, tasks] of Object.entries(dayMap)) {
    result[day] = tasks.filter((t) => t.projectId === projectId);
  }
  return result;
};

export const filterDeadlineTasksByDayByProject = (
  byDay: Record<string, TaskCopy[]>,
  projectId: string | null | undefined,
): Record<string, TaskCopy[]> => filterPlannerDayMapByProject(byDay, projectId);

/**
 * Narrows the global Upcoming / Calendar data to one project. Calendar-provider
 * (iCal) events have no project, so they only show when explicitly asked for.
 */
export interface ProjectScope {
  projectId: string;
  isIncludeCalendarEvents: boolean;
}
