import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { T } from '../../../t.const';
import { TaskCopy } from '../../tasks/task.model';
import { TaskAddEvent } from '../../tasks/add-task-bar/add-task-bar.component';
import { PlannerTaskComponent } from '../../planner/planner-task/planner-task.component';
import { AddTaskInlineComponent } from '../../planner/add-task-inline/add-task-inline.component';
import { DialogPromptComponent } from '../../../ui/dialog-prompt/dialog-prompt.component';
import { dragDelayForTouch } from '../../../util/input-intent';
import { moveTaskInTodayList } from '../../work-context/store/work-context-meta.actions';
import { getAnchorFromDragDrop } from '../../work-context/store/work-context-meta.helper';
import { WorkContextType } from '../../work-context/work-context.model';
import { Section } from '../section.model';
import { SectionService } from '../section.service';
import { groupTasksBySection } from '../group-tasks-by-section.util';

/** `id` is null for the "no section" column. */
export interface SectionBoardColumn {
  id: string | null;
  title: string;
  tasks: TaskCopy[];
}

/**
 * A project's board layout: every section is a column, plus a column for tasks
 * that are in no section and one to add a section. Dragging a task to another
 * column moves it there; a task is in at most one section.
 */
@Component({
  selector: 'section-board',
  imports: [
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    PlannerTaskComponent,
    AddTaskInlineComponent,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
    TranslatePipe,
  ],
  templateUrl: './section-board.component.html',
  styleUrl: './section-board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionBoardComponent {
  private _sectionService = inject(SectionService);
  private _store = inject(Store);
  private _matDialog = inject(MatDialog);
  private _destroyRef = inject(DestroyRef);

  readonly T = T;
  readonly dragDelayForTouch = dragDelayForTouch;

  readonly projectId = input.required<string>();
  /** The project's undone tasks (the same list the project's List layout shows). */
  readonly tasks = input.required<readonly TaskCopy[]>();

  private readonly _sections = toSignal(
    toObservable(this.projectId).pipe(
      switchMap((id) =>
        id ? this._sectionService.getSectionsByContextId$(id) : of([] as Section[]),
      ),
    ),
    { initialValue: [] as readonly Section[] },
  );

  /** The no-section column comes first, then one column per section. */
  readonly columns = computed<SectionBoardColumn[]>(() => {
    const sections = this._sections();
    const { dict, noSection } = groupTasksBySection(this.tasks(), sections);
    return [
      { id: null, title: '', tasks: noSection },
      ...sections.map((s) => ({ id: s.id, title: s.title, tasks: dict[s.id] ?? [] })),
    ];
  });

  trackColumn = (_: number, col: SectionBoardColumn): string => col.id ?? 'no-section';

  dropListId(col: SectionBoardColumn): string {
    return `section-board-${col.id ?? 'none'}`;
  }

  drop(ev: CdkDragDrop<SectionBoardColumn, SectionBoardColumn, TaskCopy>): void {
    const taskId = ev.item.data.id;
    const source = ev.previousContainer.data;
    const target = ev.container.data;
    const isSameColumn = source.id === target.id;

    // The target column's order after the drop, to find the task it follows.
    const newOrderedIds = target.tasks.map((t) => t.id).filter((id) => id !== taskId);
    newOrderedIds.splice(ev.currentIndex, 0, taskId);
    const afterTaskId = getAnchorFromDragDrop(taskId, newOrderedIds);

    if (target.id) {
      // `source.id` is where the task is now (null: in no section), so replay
      // strips it from the explicit source.
      this._sectionService.addTaskToSection(target.id, taskId, afterTaskId, source.id);
    } else if (source.id) {
      // Back out of a section into the no-section column, in one op.
      this._sectionService.removeTaskFromSection(
        source.id,
        taskId,
        this.projectId(),
        WorkContextType.PROJECT,
        afterTaskId,
      );
    } else if (isSameColumn) {
      // Reordering the no-section column is the project list's own order.
      this._store.dispatch(
        moveTaskInTodayList({
          taskId,
          afterTaskId,
          src: 'UNDONE',
          target: 'UNDONE',
          workContextId: this.projectId(),
          workContextType: WorkContextType.PROJECT,
        }),
      );
    }
  }

  onTaskAdded(col: SectionBoardColumn, event: TaskAddEvent): void {
    if (!col.id) {
      return;
    }
    this._sectionService.addTaskToSection(
      col.id,
      event.taskId,
      event.isAddToBottom ? (col.tasks.at(-1)?.id ?? null) : null,
      null,
    );
  }

  addSection(): void {
    this._matDialog
      .open(DialogPromptComponent, {
        data: { message: T.MH.ADD_SECTION, placeholder: T.WW.ADD_SECTION_TITLE },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((title: string | undefined) => {
        if (title?.trim()) {
          this._sectionService.addSection(
            title,
            this.projectId(),
            WorkContextType.PROJECT,
          );
        }
      });
  }

  renameSection(col: SectionBoardColumn): void {
    if (!col.id) {
      return;
    }
    const id = col.id;
    this._matDialog
      .open(DialogPromptComponent, {
        data: { placeholder: T.WW.ADD_SECTION_TITLE, txtValue: col.title },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((newTitle: string | undefined) => {
        if (newTitle?.trim()) {
          this._sectionService.updateSection(id, { title: newTitle });
        }
      });
  }
}
