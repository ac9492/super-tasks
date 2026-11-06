import { groupTasksBySection } from './group-tasks-by-section.util';
import { Section } from './section.model';
import { WorkContextType } from '../work-context/work-context.model';

describe('groupTasksBySection', () => {
  const section = (id: string, taskIds: string[]): Section => ({
    id,
    contextId: 'P',
    contextType: WorkContextType.PROJECT,
    title: id,
    taskIds,
  });
  const t = (id: string): { id: string } => ({ id });

  it('puts every task into noSection when there are no sections', () => {
    const tasks = [t('a'), t('b')];
    const res = groupTasksBySection(tasks, []);
    expect(res.dict).toEqual({});
    expect(res.noSection).toEqual(tasks);
  });

  it('orders a section by its own taskIds, not by task order', () => {
    const res = groupTasksBySection(
      [t('a'), t('b'), t('c')],
      [section('s1', ['c', 'a'])],
    );
    expect(res.dict['s1'].map((x) => x.id)).toEqual(['c', 'a']);
    expect(res.noSection.map((x) => x.id)).toEqual(['b']);
  });

  it('ignores stale ids and keeps empty sections', () => {
    const res = groupTasksBySection(
      [t('a')],
      [section('s1', ['gone']), section('s2', [])],
    );
    expect(res.dict['s1']).toEqual([]);
    expect(res.dict['s2']).toEqual([]);
    expect(res.noSection.map((x) => x.id)).toEqual(['a']);
  });

  it('keeps a task in at most one section', () => {
    const res = groupTasksBySection(
      [t('a')],
      [section('s1', ['a']), section('s2', ['a'])],
    );
    expect(res.dict['s1'].length + res.dict['s2'].length).toBe(1);
  });
});
