import { Injectable, signal } from '@angular/core';
import { loadFromRealLs, saveToRealLs } from '../../core/persistence/local-storage';
import { LS } from '../../core/persistence/storage-keys.const';

export type ProjectLayout = 'list' | 'calendar' | 'upcoming';

export const PROJECT_LAYOUTS: readonly ProjectLayout[] = [
  'list',
  'calendar',
  'upcoming',
] as const;

export interface ProjectLayoutPrefs {
  layout: ProjectLayout;
  // Whether iCal / calendar-provider events show in the project's calendar and
  // upcoming layouts. Off by default: a project view is about the project's tasks.
  isShowCalendarEvents: boolean;
}

const DEFAULT_PREFS: ProjectLayoutPrefs = {
  layout: 'list',
  isShowCalendarEvents: false,
};

/**
 * How each project is presented (list, calendar, ...). This is a per-device
 * presentation preference: it lives in localStorage keyed by project id and is
 * never part of the synced project model.
 */
@Injectable({ providedIn: 'root' })
export class ProjectLayoutService {
  private readonly _prefsByProjectId = signal<Record<string, ProjectLayoutPrefs>>({});

  prefsFor(projectId: string): ProjectLayoutPrefs {
    const cached = this._prefsByProjectId()[projectId];
    if (cached) {
      return cached;
    }
    // Read-through on first access. Not cached into the signal here so a
    // computed can call this without writing a signal.
    return this._load(projectId);
  }

  setLayout(projectId: string, layout: ProjectLayout): void {
    this._update(projectId, { layout });
  }

  setShowCalendarEvents(projectId: string, isShowCalendarEvents: boolean): void {
    this._update(projectId, { isShowCalendarEvents });
  }

  private _update(projectId: string, partial: Partial<ProjectLayoutPrefs>): void {
    const next = { ...this.prefsFor(projectId), ...partial };
    this._prefsByProjectId.update((all) => ({ ...all, [projectId]: next }));
    try {
      saveToRealLs(this._key(projectId), next as unknown as Record<string, unknown>);
    } catch {
      // storage unavailable or full: the choice then only lasts for this session
    }
  }

  private _load(projectId: string): ProjectLayoutPrefs {
    try {
      const stored = loadFromRealLs(this._key(projectId)) as
        | Partial<ProjectLayoutPrefs>
        | undefined;
      return {
        layout: PROJECT_LAYOUTS.includes(stored?.layout as ProjectLayout)
          ? (stored!.layout as ProjectLayout)
          : DEFAULT_PREFS.layout,
        isShowCalendarEvents: stored?.isShowCalendarEvents === true,
      };
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }

  private _key(projectId: string): string {
    return `${LS.PROJECT_LAYOUT}:${projectId}`;
  }
}
