import { Section } from './section.model';

export interface TasksBySection<T extends { id: string }> {
  /** Tasks per section id, in the section's own order. */
  dict: Record<string, T[]>;
  /** Tasks that are in no section, in their original order. */
  noSection: T[];
}

/**
 * Splits a project's tasks into its sections. `section.taskIds` is authoritative
 * for the order inside a section (drag-drop reorders go through the
 * addTaskToSection reducer), so sections are walked first. Stale ids and tasks
 * that are in no section are tolerated. A task is in at most one section.
 */
export const groupTasksBySection = <T extends { id: string }>(
  tasks: readonly T[],
  sections: readonly Section[],
): TasksBySection<T> => {
  if (!sections.length) {
    return { dict: {}, noSection: [...tasks] };
  }
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const dict: Record<string, T[]> = {};
  const inSection = new Set<string>();
  for (const s of sections) {
    const list: T[] = [];
    for (const tId of s.taskIds ?? []) {
      const t = taskById.get(tId);
      if (t && !inSection.has(tId)) {
        list.push(t);
        inSection.add(tId);
      }
    }
    dict[s.id] = list;
  }
  return { dict, noSection: tasks.filter((t) => !inSection.has(t.id)) };
};
