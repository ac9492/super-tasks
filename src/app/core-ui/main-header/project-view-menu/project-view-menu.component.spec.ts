import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ProjectViewMenuComponent } from './project-view-menu.component';
import { ProjectService } from '../../../features/project/project.service';
import { Project } from '../../../features/project/project.model';
import { ProjectLayoutService } from '../../../features/project/project-layout.service';
import { LS } from '../../../core/persistence/storage-keys.const';

describe('ProjectViewMenuComponent', () => {
  let fixture: ComponentFixture<ProjectViewMenuComponent>;
  let project$: BehaviorSubject<Project | null>;
  let navigation$: Subject<NavigationEnd>;

  beforeEach(async () => {
    project$ = new BehaviorSubject<Project | null>({ id: 'p1' } as Project);
    navigation$ = new Subject<NavigationEnd>();
    await TestBed.configureTestingModule({
      imports: [ProjectViewMenuComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ProjectService, useValue: { currentProject$: project$ } },
        {
          provide: Router,
          useValue: { url: '/project/p1/tasks', events: navigation$ },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectViewMenuComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    for (const id of ['p1', 'p2']) localStorage.removeItem(`${LS.PROJECT_LAYOUT}:${id}`);
  });

  it('offers a compact project control only on project task routes', () => {
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
    navigation$.next(new NavigationEnd(1, '/schedule', '/schedule'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    navigation$.next(new NavigationEnd(2, '/project/p1/tasks', '/project/p1/tasks'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
    project$.next(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('changes only the current project and keeps its calendar-event preference', () => {
    const component = fixture.componentInstance;
    component.setLayout('calendar');
    component.toggleCalendarEvents(new Event('click'));
    expect(component.prefs()).toEqual({ layout: 'calendar', isShowCalendarEvents: true });
    project$.next({ id: 'p2' } as Project);
    expect(component.layout()).toBe('list');
    component.setLayout('board');
    project$.next({ id: 'p1' } as Project);
    expect(component.prefs()).toEqual({ layout: 'calendar', isShowCalendarEvents: true });
    expect(TestBed.inject(ProjectLayoutService).prefsFor('p2').layout).toBe('board');
  });
});
