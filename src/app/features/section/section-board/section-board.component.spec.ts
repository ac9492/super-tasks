import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import { SectionBoardColumn, SectionBoardComponent } from './section-board.component';
import { SectionService } from '../section.service';
import { Section } from '../section.model';
import { WorkContextType } from '../../work-context/work-context.model';
import { TaskCopy } from '../../tasks/task.model';
import { PlannerTaskComponent } from '../../planner/planner-task/planner-task.component';
import { AddTaskInlineComponent } from '../../planner/add-task-inline/add-task-inline.component';
import { moveTaskInTodayList } from '../../work-context/store/work-context-meta.actions';

@Component({ selector: 'planner-task', template: '' })
class StubPlannerTaskComponent {
  task = input<TaskCopy>();
}

@Component({ selector: 'add-task-inline', template: '' })
class StubAddTaskInlineComponent {
  isNoDefaults = input<boolean>();
}

describe('SectionBoardComponent', () => {
  const task = (id: string): TaskCopy => ({ id, title: id }) as unknown as TaskCopy;
  const section = (id: string, title: string, taskIds: string[]): Section => ({
    id,
    contextId: 'P1',
    contextType: WorkContextType.PROJECT,
    title,
    taskIds,
  });

  let fixture: ComponentFixture<SectionBoardComponent>;
  let component: SectionBoardComponent;
  let sections$: BehaviorSubject<Section[]>;
  let sectionService: jasmine.SpyObj<SectionService>;
  let store: MockStore;
  let dialogResult: string | undefined;

  const setup = (tasks: TaskCopy[], sections: Section[]): void => {
    sections$.next(sections);
    fixture.componentRef.setInput('projectId', 'P1');
    fixture.componentRef.setInput('tasks', tasks);
    fixture.detectChanges();
  };

  const dropEvent = (
    taskId: string,
    source: SectionBoardColumn,
    target: SectionBoardColumn,
    currentIndex: number,
  ): CdkDragDrop<SectionBoardColumn, SectionBoardColumn, TaskCopy> =>
    ({
      item: { data: task(taskId) },
      previousContainer: { data: source },
      container: { data: target },
      currentIndex,
    }) as unknown as CdkDragDrop<SectionBoardColumn, SectionBoardColumn, TaskCopy>;

  beforeEach(async () => {
    sections$ = new BehaviorSubject<Section[]>([]);
    dialogResult = undefined;
    sectionService = jasmine.createSpyObj<SectionService>('SectionService', [
      'getSectionsByContextId$',
      'addSection',
      'updateSection',
      'addTaskToSection',
      'removeTaskFromSection',
    ]);
    sectionService.getSectionsByContextId$.and.returnValue(sections$);

    await TestBed.configureTestingModule({
      imports: [SectionBoardComponent, TranslateModule.forRoot()],
      providers: [
        provideMockStore({}),
        { provide: SectionService, useValue: sectionService },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(dialogResult) }) },
        },
      ],
    })
      .overrideComponent(SectionBoardComponent, {
        remove: { imports: [PlannerTaskComponent, AddTaskInlineComponent] },
        add: { imports: [StubPlannerTaskComponent, StubAddTaskInlineComponent] },
      })
      .compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(SectionBoardComponent);
    component = fixture.componentInstance;
  });

  const columnEls = (): HTMLElement[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('section.column'));

  it('renders a no-section column, one column per section and an add-section column', () => {
    setup(
      [task('a'), task('b'), task('c')],
      [section('s1', 'Doing', ['b']), section('s2', 'Done', [])],
    );

    expect(columnEls().map((el) => el.dataset['sectionId'])).toEqual([
      'none',
      's1',
      's2',
    ]);
    expect(columnEls()[1].querySelector('.title')!.textContent).toContain('Doing');
    expect(columnEls()[1].querySelector('.task-count')!.textContent).toContain('1');
    expect(columnEls()[0].querySelectorAll('planner-task').length).toBe(2);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.add-section-btn'),
    ).toBeTruthy();
  });

  it('offers rename on section columns only', () => {
    setup([task('a')], [section('s1', 'Doing', [])]);

    expect(columnEls()[0].querySelector('.rename-section-btn')).toBeNull();
    expect(columnEls()[1].querySelector('.rename-section-btn')).toBeTruthy();
  });

  describe('dragging between columns', () => {
    let none: SectionBoardColumn;
    let s1: SectionBoardColumn;

    beforeEach(() => {
      setup(
        [task('a'), task('b'), task('c')],
        [section('s1', 'Doing', ['b', 'c']), section('s2', 'Done', [])],
      );
      [none, s1] = component.columns();
    });

    it('moves a task from no section into a section after the task above it', () => {
      component.drop(dropEvent('a', none, s1, 1));

      expect(sectionService.addTaskToSection).toHaveBeenCalledWith('s1', 'a', 'b', null);
    });

    it('moves a task to the top of a section', () => {
      component.drop(dropEvent('a', none, s1, 0));

      expect(sectionService.addTaskToSection).toHaveBeenCalledWith('s1', 'a', null, null);
    });

    it('moves a task between two sections naming its source section', () => {
      const s2 = component.columns()[2];
      component.drop(dropEvent('b', s1, s2, 0));

      expect(sectionService.addTaskToSection).toHaveBeenCalledWith('s2', 'b', null, 's1');
    });

    it('reorders inside a section', () => {
      component.drop(dropEvent('b', s1, s1, 1));

      expect(sectionService.addTaskToSection).toHaveBeenCalledWith('s1', 'b', 'c', 's1');
    });

    it('moves a task out of a section into no section in a single op', () => {
      component.drop(dropEvent('b', s1, none, 1));

      expect(sectionService.removeTaskFromSection).toHaveBeenCalledWith(
        's1',
        'b',
        'P1',
        WorkContextType.PROJECT,
        'a',
      );
      expect(sectionService.addTaskToSection).not.toHaveBeenCalled();
    });

    it('reorders no-section tasks through the project list order', () => {
      const dispatch = spyOn(store, 'dispatch');
      component.drop(dropEvent('a', none, none, 0));

      expect(dispatch).toHaveBeenCalledWith(
        moveTaskInTodayList({
          taskId: 'a',
          afterTaskId: null,
          src: 'UNDONE',
          target: 'UNDONE',
          workContextId: 'P1',
          workContextType: WorkContextType.PROJECT,
        }),
      );
    });
  });

  it('adds a section from the prompt title, ignoring an empty one', () => {
    setup([], []);

    dialogResult = '  ';
    component.addSection();
    expect(sectionService.addSection).not.toHaveBeenCalled();

    dialogResult = 'Review';
    component.addSection();
    expect(sectionService.addSection).toHaveBeenCalledWith(
      'Review',
      'P1',
      WorkContextType.PROJECT,
    );
  });

  it('renames a section from the prompt', () => {
    setup([], [section('s1', 'Doing', [])]);

    dialogResult = 'In progress';
    component.renameSection(component.columns()[1]);

    expect(sectionService.updateSection).toHaveBeenCalledWith('s1', {
      title: 'In progress',
    });
  });

  it('puts a task added to a section column at the section end when added to the bottom', () => {
    setup([task('b')], [section('s1', 'Doing', ['b'])]);

    component.onTaskAdded(component.columns()[1], {
      taskId: 'new',
      isAddToBottom: true,
      isNewTask: true,
    });

    expect(sectionService.addTaskToSection).toHaveBeenCalledWith('s1', 'new', 'b', null);
  });
});
