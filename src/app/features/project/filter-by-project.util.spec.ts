import {
  filterDeadlineTasksByDayByProject,
  filterPlannerDayMapByProject,
  filterRepeatCfgsByProject,
  filterTasksByProject,
} from './filter-by-project.util';
import { TaskCopy } from '../tasks/task.model';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';

describe('filter-by-project.util', () => {
  const t = (id: string, projectId: string): TaskCopy =>
    ({ id, projectId }) as unknown as TaskCopy;

  it('returns the input unchanged without a project id', () => {
    const tasks = [t('1', 'A')];
    expect(filterTasksByProject(tasks, null)).toBe(tasks);
    expect(filterTasksByProject(tasks, undefined)).toBe(tasks);
  });

  it('filters tasks by project', () => {
    expect(
      filterTasksByProject([t('1', 'A'), t('2', 'B')], 'B').map((x) => x.id),
    ).toEqual(['2']);
  });

  it('filters repeat configs by project', () => {
    const cfgs = [
      { id: 'r1', projectId: 'A' },
      { id: 'r2', projectId: null },
    ] as TaskRepeatCfg[];
    expect(filterRepeatCfgsByProject(cfgs, 'A').map((c) => c.id)).toEqual(['r1']);
  });

  it('filters every day of a day map and keeps empty days', () => {
    const result = filterPlannerDayMapByProject(
      { ['2026-01-01']: [t('1', 'A'), t('2', 'B')], ['2026-01-02']: [t('3', 'B')] },
      'A',
    );
    expect(result['2026-01-01'].map((x) => x.id)).toEqual(['1']);
    expect(result['2026-01-02']).toEqual([]);
  });

  it('filters deadline tasks per day', () => {
    const result = filterDeadlineTasksByDayByProject(
      { ['2026-01-01']: [t('1', 'A'), t('2', 'B')] },
      'B',
    );
    expect(result['2026-01-01'].map((x) => x.id)).toEqual(['2']);
  });
});
