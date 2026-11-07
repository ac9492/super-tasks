import { inject, Injectable } from '@angular/core';
import { PluginBridgeService } from '../../plugins/plugin-bridge.service';
import {
  planImport as planTodoist,
  ImportPlan,
} from '../../../../packages/plugin-dev/todoist-import/src/map/plan-import';
import {
  runImport as runTodoist,
  ImportResult,
} from '../../../../packages/plugin-dev/todoist-import/src/map/run-import';
import { parseTickTickCsv } from '../../../../packages/plugin-dev/ticktick-import/src/parse/from-csv';
import { planImport as planTickTick } from '../../../../packages/plugin-dev/ticktick-import/src/map/plan-import';
import { runImport as runTickTick } from '../../../../packages/plugin-dev/ticktick-import/src/map/run-import';
import { parseTodoistCsv } from './todoist-csv';

export type BuiltinImportSource = 'todoist' | 'ticktick';
export interface BuiltinImportPreview {
  source: BuiltinImportSource;
  plan: ImportPlan;
  taskCount: number;
  skippedCount: number;
  truncatedCount: number;
}

/** Native Settings UI; reuses the tested parsers/planners without loading a plugin. */
@Injectable({ providedIn: 'root' })
export class BuiltinImportService {
  // This app facade already owns validated project/tag/task batch writes. No
  // plugin instance, sandbox, permissions, navigation or installation is needed.
  private readonly _writes = inject(PluginBridgeService);

  preview(
    source: BuiltinImportSource,
    text: string,
    fileName: string,
  ): BuiltinImportPreview {
    let plan: ImportPlan;
    let skippedCount = 0;
    let truncatedCount = 0;
    if (source === 'todoist') {
      const model = parseTodoistCsv(text, fileName.replace(/\.csv$/i, ''));
      plan = planTodoist(model, { priorityMapping: 'priorityTags' });
    } else {
      const model = parseTickTickCsv(text);
      if (!model) throw new Error('Invalid TickTick CSV');
      plan = planTickTick(model, { priorityMapping: 'priorityTags' });
      skippedCount = model.skippedClosedCount;
      truncatedCount = [...model.projects, ...model.tasks].reduce(
        (count, item) => count + (item.truncatedFieldCount ?? 0),
        0,
      );
    }
    return {
      source,
      plan,
      taskCount: plan.projects.reduce(
        (count, project) => count + project.taskCount + project.subTaskCount,
        0,
      ),
      skippedCount,
      truncatedCount,
    };
  }

  async run(preview: BuiltinImportPreview): Promise<ImportResult> {
    const run = preview.source === 'todoist' ? runTodoist : runTickTick;
    return run(this._writes, preview.plan, () => {});
  }
}
