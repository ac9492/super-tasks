import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { WorkViewComponent } from '../../features/work-view/work-view.component';
import { ProjectService } from '../../features/project/project.service';
import { PlainspaceClaimPoolService } from '../../features/plainspace/plainspace-claim-pool.service';
import { PlainspaceSharedTask } from '../../features/plainspace/plainspace-shared-task.model';
import { T } from '../../t.const';
import {
  SegmentedButtonGroupComponent,
  SegmentedButtonOption,
} from '../../ui/segmented-button-group/segmented-button-group.component';
import {
  PROJECT_LAYOUTS,
  ProjectLayout,
  ProjectLayoutService,
} from '../../features/project/project-layout.service';
import { ProjectScope } from '../../features/project/filter-by-project.util';
import { ScheduleComponent } from '../../features/schedule/schedule/schedule.component';
import { PlannerComponent } from '../../features/planner/planner.component';
import { SectionBoardComponent } from '../../features/section/section-board/section-board.component';

@Component({
  selector: 'work-view-page',
  templateUrl: './project-task-page.component.html',
  styleUrls: ['./project-task-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatSlideToggle,
    TranslatePipe,
    WorkViewComponent,
    SegmentedButtonGroupComponent,
    ScheduleComponent,
    PlannerComponent,
    SectionBoardComponent,
  ],
})
export class ProjectTaskPageComponent {
  workContextService = inject(WorkContextService);
  private readonly _projectService = inject(ProjectService);
  private readonly _plainspaceClaimPoolService = inject(PlainspaceClaimPoolService);
  private readonly _projectLayoutService = inject(ProjectLayoutService);

  readonly T = T;

  // Unclaimed Plainspace tasks (only for projects shared on Plainspace); fed
  // into the work view's read-only "claim pool" panel. `currentProject$` re-emits
  // on every task add/complete/reorder (the project entity carries taskIds), so
  // distinct on the id first — otherwise the pool re-fetches `/claimable-tasks`
  // on every task change.
  readonly unclaimedTasks = toSignal(
    this._projectService.currentProject$.pipe(
      map((project) => project?.id ?? null),
      distinctUntilChanged(),
      switchMap((projectId) =>
        projectId
          ? this._plainspaceClaimPoolService.unclaimedTasksForProject$(projectId)
          : of([] as PlainspaceSharedTask[]),
      ),
    ),
    { initialValue: [] as PlainspaceSharedTask[] },
  );

  isShowBacklog = toSignal(
    this.workContextService.activeWorkContext$.pipe(
      map((workContext) => !!workContext.isEnableBacklog),
    ),
    { initialValue: false },
  );

  backlogTasks = toSignal(this.workContextService.backlogTasks$, { initialValue: [] });
  doneTasks = toSignal(this.workContextService.doneTasks$, { initialValue: [] });
  undoneTasks = toSignal(this.workContextService.undoneTasks$, { initialValue: [] });

  readonly currentProject = toSignal(this._projectService.currentProject$, {
    initialValue: null,
  });

  readonly layoutOptions: readonly SegmentedButtonOption[] = [
    { id: 'list', labelKey: T.F.PROJECT.LAYOUT.LIST, hintKey: T.F.PROJECT.LAYOUT.LIST },
    {
      id: 'board',
      labelKey: T.F.PROJECT.LAYOUT.BOARD,
      hintKey: T.F.PROJECT.LAYOUT.BOARD,
    },
    {
      id: 'calendar',
      labelKey: T.F.PROJECT.LAYOUT.CALENDAR,
      hintKey: T.F.PROJECT.LAYOUT.CALENDAR,
    },
    {
      id: 'upcoming',
      labelKey: T.F.PROJECT.LAYOUT.UPCOMING,
      hintKey: T.F.PROJECT.LAYOUT.UPCOMING,
    },
  ];

  // Device-local presentation preference per project, see ProjectLayoutService.
  private readonly _layoutPrefs = computed(() => {
    const projectId = this.currentProject()?.id;
    return projectId ? this._projectLayoutService.prefsFor(projectId) : null;
  });
  readonly layout = computed<ProjectLayout>(() => this._layoutPrefs()?.layout ?? 'list');
  readonly projectId = computed(() => this.currentProject()?.id ?? null);
  readonly isShowCalendarEvents = computed(
    () => this._layoutPrefs()?.isShowCalendarEvents ?? false,
  );
  // Fed to the global Calendar / Upcoming components to narrow them to this
  // project. New tasks default to it because the active work context is the project.
  readonly scope = computed<ProjectScope | null>(() => {
    const projectId = this.currentProject()?.id;
    return projectId
      ? { projectId, isIncludeCalendarEvents: this.isShowCalendarEvents() }
      : null;
  });

  setLayout(layout: string | number): void {
    const projectId = this.currentProject()?.id;
    if (projectId && PROJECT_LAYOUTS.includes(layout as ProjectLayout)) {
      this._projectLayoutService.setLayout(projectId, layout as ProjectLayout);
    }
  }

  setShowCalendarEvents(isShow: boolean): void {
    const projectId = this.currentProject()?.id;
    if (projectId) {
      this._projectLayoutService.setShowCalendarEvents(projectId, isShow);
    }
  }

  restoreProject(): void {
    const project = this.currentProject();
    if (project) {
      if (project.isDone) {
        this._projectService.reopen(project.id, project);
      } else {
        this._projectService.unarchive(project.id);
      }
    }
  }
}
