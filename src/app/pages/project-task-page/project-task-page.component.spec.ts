import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import { ProjectTaskPageComponent } from './project-task-page.component';
import { WorkContextService } from '../../features/work-context/work-context.service';
import { ProjectService } from '../../features/project/project.service';
import { PlainspaceClaimPoolService } from '../../features/plainspace/plainspace-claim-pool.service';
import { WorkViewComponent } from '../../features/work-view/work-view.component';
import { ScheduleComponent } from '../../features/schedule/schedule/schedule.component';
import { PlannerComponent } from '../../features/planner/planner.component';
import { SectionBoardComponent } from '../../features/section/section-board/section-board.component';
import { ProjectScope } from '../../features/project/filter-by-project.util';
import { LS } from '../../core/persistence/storage-keys.const';
import { Project } from '../../features/project/project.model';
import {
  PROJECT_LAYOUTS,
  ProjectLayoutService,
} from '../../features/project/project-layout.service';

@Component({ selector: 'work-view', template: '<i class="stub-work"></i>' })
class StubWorkViewComponent {
  unclaimedTasks = input<unknown>();
  backlogTasks = input<unknown>();
  doneTasks = input<unknown>();
  isShowBacklog = input<unknown>();
  undoneTasks = input<unknown>();
}

@Component({ selector: 'schedule', template: '<i class="stub-schedule"></i>' })
class StubScheduleComponent {
  scope = input<ProjectScope | null>(null);
}

@Component({ selector: 'section-board', template: '<i class="stub-board"></i>' })
class StubSectionBoardComponent {
  projectId = input<string>();
  tasks = input<unknown>();
}

@Component({ selector: 'planner', template: '<i class="stub-planner"></i>' })
class StubPlannerComponent {
  scope = input<ProjectScope | null>(null);
}

describe('ProjectTaskPageComponent layout switch', () => {
  const key = (id: string): string => `${LS.PROJECT_LAYOUT}:${id}`;
  let fixture: ComponentFixture<ProjectTaskPageComponent>;
  let currentProject$: BehaviorSubject<Project | null>;

  const q = (sel: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(sel);
  const selectLayout = (index: number): void => {
    TestBed.inject(ProjectLayoutService).setLayout('p1', PROJECT_LAYOUTS[index]);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    localStorage.removeItem(key('p1'));
    localStorage.removeItem(key('p2'));
    currentProject$ = new BehaviorSubject<Project | null>({
      id: 'p1',
      isArchived: false,
    } as unknown as Project);

    await TestBed.configureTestingModule({
      imports: [ProjectTaskPageComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: WorkContextService,
          useValue: {
            activeWorkContext$: of({ isEnableBacklog: false }),
            backlogTasks$: of([]),
            doneTasks$: of([]),
            undoneTasks$: of([]),
          },
        },
        { provide: ProjectService, useValue: { currentProject$ } },
        {
          provide: PlainspaceClaimPoolService,
          useValue: { unclaimedTasksForProject$: () => of([]) },
        },
      ],
    })
      .overrideComponent(ProjectTaskPageComponent, {
        remove: {
          imports: [
            WorkViewComponent,
            ScheduleComponent,
            PlannerComponent,
            SectionBoardComponent,
          ],
        },
        add: {
          imports: [
            StubWorkViewComponent,
            StubScheduleComponent,
            StubPlannerComponent,
            StubSectionBoardComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProjectTaskPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(key('p1'));
    localStorage.removeItem(key('p2'));
  });

  it('shows the list (work view) by default', () => {
    expect(q('.stub-work')).toBeTruthy();
    expect(q('.stub-schedule')).toBeNull();
    expect(q('.calendar-events-toggle')).toBeNull();
  });

  it('switches to the calendar layout and remembers it for this project only', () => {
    selectLayout(2);

    expect(q('.stub-schedule')).toBeTruthy();
    expect(q('.stub-work')).toBeNull();
    expect(JSON.parse(localStorage.getItem(key('p1'))!).layout).toBe('calendar');

    currentProject$.next({ id: 'p2', isArchived: false } as unknown as Project);
    fixture.detectChanges();

    expect(q('.stub-work')).toBeTruthy();
    expect(localStorage.getItem(key('p2'))).toBeNull();
  });

  it('switches to the board layout without the calendar events toggle', () => {
    selectLayout(1);

    expect(q('.stub-board')).toBeTruthy();
    expect(q('.stub-work')).toBeNull();
    expect(q('.calendar-events-toggle')).toBeNull();
  });

  it('switches to the upcoming layout', () => {
    selectLayout(3);

    expect(q('.stub-planner')).toBeTruthy();
  });

  it('scopes the calendar to the project and hides calendar events until toggled', () => {
    selectLayout(2);
    const schedule = fixture.debugElement.query((d) => d.name === 'schedule');
    expect(schedule.componentInstance.scope()).toEqual({
      projectId: 'p1',
      isIncludeCalendarEvents: false,
    });

    TestBed.inject(ProjectLayoutService).setShowCalendarEvents('p1', true);
    fixture.detectChanges();

    expect(schedule.componentInstance.scope()).toEqual({
      projectId: 'p1',
      isIncludeCalendarEvents: true,
    });
  });
});
