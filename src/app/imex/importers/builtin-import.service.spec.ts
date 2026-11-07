import { TestBed } from '@angular/core/testing';
import { BuiltinImportService } from './builtin-import.service';
import { PluginBridgeService } from '../../plugins/plugin-bridge.service';

describe('built-in file importers', () => {
  let service: BuiltinImportService;
  let writes: jasmine.SpyObj<PluginBridgeService>;
  beforeEach(() => {
    writes = jasmine.createSpyObj('writes', [
      'getAllTags',
      'addTag',
      'addProject',
      'batchUpdateForProject',
      'updateTask',
      'getTasks',
    ]);
    writes.getAllTags.and.resolveTo([]);
    writes.addTag.and.resolveTo('tag-1');
    writes.addProject.and.resolveTo('project-1');
    writes.getTasks.and.resolveTo([]);
    writes.batchUpdateForProject.and.resolveTo({
      success: true,
      createdTaskIds: { ['temp-0']: 'task-1', ['temp-1']: 'task-2' },
    });
    writes.updateTask.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [{ provide: PluginBridgeService, useValue: writes }],
    });
    service = TestBed.inject(BuiltinImportService);
  });

  it('previews Todoist CSV without writing, preserving notes, nesting, labels and dates', async () => {
    const preview = service.preview(
      'todoist',
      'TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,DATE,DURATION,DURATION_UNIT\n' +
        'task,Parent @home,"Line one\nLine two",1,1,2026-12-15,25,minute\n' +
        'task,Child,,4,2,every Monday,,\n' +
        'note,Comment,,,,,,',
      'Personal.csv',
    );
    expect(preview.taskCount).toBe(2);
    expect(preview.plan.projects[0].title).toBe('Personal');
    expect(writes.addProject).not.toHaveBeenCalled();
    const ops = preview.plan.projects[0].batchChunks[0];
    expect(ops[0]).toEqual(
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          title: 'Parent',
          notes: 'Line one\nLine two',
          timeEstimate: 1500000,
        }),
      }),
    );
    expect(ops[1]).toEqual(
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          parentId: 'temp-0',
          notes: 'DATE: every Monday\n\nComment',
        }),
      }),
    );
    expect(preview.plan.tagTitles).toEqual(['home', 'p1']);
    await service.run(preview);
    expect(writes.batchUpdateForProject).toHaveBeenCalled();
    expect(writes.updateTask).toHaveBeenCalledWith(
      'task-1',
      jasmine.objectContaining({ dueDay: '2026-12-15' }),
    );
  });

  it('previews TickTick backups and excludes closed tasks', () => {
    const preview = service.preview(
      'ticktick',
      'List Name,Title,Status,taskId,parentId,Is All Day,Due Date\nWork,Active,0,1,,true,2026-12-15\nWork,Closed,1,2,,,',
      'TickTick.csv',
    );
    expect(preview.taskCount).toBe(1);
    expect(preview.skippedCount).toBe(1);
    expect(writes.addProject).not.toHaveBeenCalled();
  });

  it('rejects a file from the wrong platform without writing anything', () => {
    expect(() =>
      service.preview('todoist', 'List Name,Title\nWork,Task', 'wrong.csv'),
    ).toThrow();
    expect(() => service.preview('ticktick', '{}', 'wrong.json')).toThrow();
    expect(writes.addProject).not.toHaveBeenCalled();
  });

  it('preserves invalid calendar dates in notes instead of scheduling a different day', () => {
    const preview = service.preview(
      'todoist',
      'TYPE,CONTENT,DATE\ntask,Invalid,2026-02-31\ntask,Leap day,2028-02-29',
      'Dates.csv',
    );
    expect(preview.plan.projects[0].followUps).toEqual([
      { tempId: 'temp-1', dueDay: '2028-02-29' },
    ]);
    expect(preview.plan.projects[0].batchChunks[0][0]).toEqual(
      jasmine.objectContaining({
        data: jasmine.objectContaining({ notes: 'DATE: 2026-02-31' }),
      }),
    );
  });

  it('discloses shortened TickTick values before importing', () => {
    const preview = service.preview(
      'ticktick',
      'List Name,Title,Status,taskId\nWork,' + 'x'.repeat(1001) + ',0,1',
      'Long.csv',
    );
    expect(preview.truncatedCount).toBe(1);
    expect(writes.addProject).not.toHaveBeenCalled();
  });

  it('reports a partial import instead of claiming success or automatically retrying', async () => {
    writes.batchUpdateForProject.and.rejectWith(new Error('write failed'));
    const preview = service.preview('todoist', 'TYPE,CONTENT\ntask,Task', 'Project.csv');
    const result = await service.run(preview);
    expect(result.failedProjectTitle).toBe('Project');
    expect(result.errorMessage).toBe('write failed');
    expect(writes.addProject).toHaveBeenCalledTimes(1);
  });
});
