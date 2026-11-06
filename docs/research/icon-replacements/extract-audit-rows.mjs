import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
const out = dirname(fileURLToPath(import.meta.url));
const path = resolve(out, '../icon-audit.md');
const source = readFileSync(path, 'utf8');
const code = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
let section = '',
  major = '',
  total = 0;
const rows = [];
const all = [];
for (const token of marked.lexer(source)) {
  if (token.type === 'heading') {
    section = token.text;
    if (token.depth === 2) major = section;
  }
  if (token.type !== 'table') continue;
  const heads = token.header.map((h) => h.text);
  if (!/^Current|^Asset/.test(heads[0])) continue;
  const rec = heads.findIndex((h) => /recommendation|edit recommendation/i.test(h));
  if (rec < 0) continue;
  for (const row of token.rows) {
    total++;
    const cells = row.map((c) => c.text);
    const r = {
      id: `R${String(total).padStart(3, '0')}`,
      section,
      major,
      current: cells[0],
      usage: cells[1] || '',
      recommendation: cells[rec],
      reason: cells.filter((_, i) => i > 1 && i !== rec).join(' | '),
      source_row: row.map((c) => c.text).join(' | '),
    };
    const rowPrefix = '| ' + r.current + ' | ' + r.usage + ' |';
    const at = source.indexOf(rowPrefix);
    r.audit_line = at < 0 ? null : source.slice(0, at).split('\n').length;
    r.before_names = code(r.current);
    r.after_names = code(r.recommendation).filter((s) => /^[a-z][a-z_0-9.]+$/.test(s));
    r.sources = [
      ...r.source_row.matchAll(/`((?:src|packages|android|ios|electron)\/[^`]+)`/g),
    ].map((m) => m[1]);
    const stripped = r.recommendation.replace(/\*\*|`/g, '');
    r.flagged =
      ['R056', 'R092', 'R109', 'R122', 'R275', 'R320', 'R368'].includes(r.id) ||
      /change|redraw|replace|standardiz|normaliz|prefer|remove|drop|consider|use .* rather|use .* instead|match canonical|follow canonical/i.test(
        stripped,
      );
    r.non_icon_only =
      r.flagged &&
      !r.after_names.length &&
      /accessible|label|keyboard|control to labeled button|tooltip|aria-|expose state|button behavior|pressed|disclosure/i.test(
        stripped,
      ) &&
      !/^remove|redraw|change.*(?:icon|glyph)|remove.*(?:icon|glyph)|keep file\/image; change/i.test(
        stripped,
      );
    r.optional = /prefer|consider|optional|if |when normalizing|only if|P2/i.test(
      stripped,
    );
    r.removal =
      /remove (?:icon|these redundant icons)|drop generic|remove redundant|remove.*close|restore day number|no icon|label-only|remove.*decoration/i.test(
        stripped,
      );
    r.implementation_type = r.after_names.length
      ? 'material-symbol'
      : r.removal
        ? 'remove-icon'
        : 'unresolved';
    all.push(r);
    if (r.flagged) rows.push(r);
  }
}
writeFileSync(resolve(out, 'all-audit-rows.json'), JSON.stringify(all, null, 2) + '\n');
writeFileSync(
  resolve(out, 'original-change-rows.json'),
  JSON.stringify(rows, null, 2) + '\n',
);

// Normalize contextual changes so retained icons in a grouped row are not
// accidentally presented as replacements. These mappings are approval candidates.
const exclude = new Set(['R124', 'R141', 'R161', 'R318', 'R337', 'R410', 'R439']);
const maps = {
  R056: [
    [
      'delete_forever',
      'delete',
      'Only if project deletion is recoverable; permanent deletion retains current icon',
    ],
  ],
  R092: [
    [
      'subdirectory_arrow_right',
      'account_tree',
      'Optional subtask hierarchy icon consolidation',
    ],
  ],
  R109: [
    ['adjust', 'numbers', 'Counter count summary'],
    ['🔥', 'event_available', 'Consecutive-days summary, retain explicit text'],
  ],
  R122: [
    [
      'today',
      'calendar_month',
      'Non-Today date-only task badge; actual Today and time-of-day clock unchanged',
    ],
  ],
  R135: [
    ['chat', 'description', 'Notes present'],
    ['chat_bubble_outline', 'description', 'Notes empty'],
  ],
  R153: [['checklist_rtl', 'select_check_box', 'Select tasks']],
  R274: [['bookmark', 'link', 'Pasted URL attachment; file and image icons unchanged']],
  R275: [
    ['laptop_windows', 'terminal', 'Dormant command-type declaration only'],
    ['note', 'description', 'Dormant note-type declaration only'],
  ],
  R298: [['delete_forever', 'delete', 'Remove repeatable config entry']],
  R320: [
    [
      'cloud_off',
      'sync_problem',
      'Synchronization paused for safety; offline state keeps cloud_off',
    ],
  ],
  R368: [
    [
      'arrow_forward',
      'settings',
      'Optional Setup category identity; navigational arrow may remain',
    ],
  ],
  R021: [
    [
      'volunteer_activism',
      'code',
      'Contribute code only; broad contribution scope may retain current',
    ],
  ],
  R037: [
    ['wifi_off', 'cloud_off', 'Sync offline only; keep the shared custom sync states'],
  ],
  R050: [['link', 'content_copy', 'Copy project invite URL']],
  R059: [['emoji_events', 'check_circle', 'Archived completed-project badge']],
  R067: [['alarm', 'schedule', 'Timed event without a reminder']],
  R087: [
    [
      'wb_sunny',
      'calendar_clock',
      'Automatically placed schedule task; chosen instead of sparkles',
    ],
  ],
  R093: [
    [
      'list',
      'list_alt',
      'Project search result default; preserve custom project identity',
    ],
  ],
  R099: [
    ['help_outline', 'label_off', 'Unavailable tag'],
    ['help_outline', 'folder_off', 'Unavailable project'],
  ],
  R120: [
    ['today', 'calendar_month', 'Choose arbitrary date'],
    ['today', 'event_upcoming', 'Postpone reminder to tomorrow'],
  ],
  R121: [
    ['alarm', 'calendar_month', 'Unscheduled date field'],
    ['today', 'calendar_month', 'Date-only field on a non-Today date'],
  ],
  R123: [['event', 'calendar_month', 'Date-only task chip']],
  R127: [
    ['event_busy', 'flag', 'Remove deadline, retaining Remove deadline text'],
    ['event_available', 'flag', 'Set deadline, retaining Set deadline text'],
  ],
  R131: [['timer', 'hourglass_empty', 'Pure estimate chip']],
  R133: [['priority_high', 'warning', 'Time conflict only']],
  R137: [['update', 'sync', 'Issue-updated indicator; panel and close remain']],
  R138: [['list', 'account_tree', 'Subtask panel identity']],
  R139: [
    ['subdirectory_arrow_left', 'format_indent_decrease', 'Promote subtask to main task'],
  ],
  R142: [
    ['arrow_upward', 'vertical_align_top', 'Move to top'],
    ['arrow_downward', 'vertical_align_bottom', 'Move to bottom'],
  ],
  R144: [
    ['send', 'add', 'Create task in add-task bar'],
    ['send', 'add_task', 'Create-and-select in focus chooser'],
  ],
  R146: [['new_releases', 'new_label', 'Newly composed tag']],
  R147: [
    ['track_changes', 'checklist', 'Choose existing task'],
    ['track_changes', 'more_time', 'Record time confirmation'],
  ],
  R148: [
    ['library_books', 'checklist', 'Existing task result'],
    ['library_books', 'list_alt', 'Missing-project fallback'],
  ],
  R151: [['close', 'block', 'Won’t-do summary status']],
  R152: [['done', 'check', 'Task completion alias consolidation']],
  R153: [['checklist_rtl', 'select_check_box', 'Select tasks']],
  R155: [['group', 'person_remove', 'Release Plainspace assignment']],
  R157: [['attachment', 'attach_file', 'Attachment identity consolidation']],
  R158: [['bookmark', 'link', 'Web-link attachment']],
  R159: [['search', 'zoom_in', 'Preview attached image']],
  R160: [['delete_forever', 'delete', 'Remove attachment']],
  R163: [['calendar_today', 'calendar_month', 'Choose arbitrary recurrence start date']],
  R164: [
    ['today', 'calendar_today', 'Daily cadence'],
    ['work', 'date_range', 'Monday–Friday cadence'],
    ['cake', 'event_repeat', 'Yearly cadence'],
  ],
  R168: [['auto_awesome', 'all_inclusive', 'Flowtime mode']],
  R171: [['arrow_forward', 'play_arrow', 'Start next focus session']],
  R173: [['add_task', 'checklist', 'Choose an existing task']],
  R174: [
    ['track_changes', 'checklist', 'Idle duration assigned to task'],
    ['track_changes', 'more_time', 'Confirm recorded elapsed time'],
  ],
  R179: [['file_download', 'download', 'Download alias consolidation']],
  R181: [
    ['list', 'checklist', 'Worklog task-count identity'],
    ['list', 'expand_more', 'Collapsed worklog disclosure'],
    ['timer', 'expand_less', 'Expanded worklog disclosure'],
  ],
  R187: [
    [
      'directions_walk',
      'man',
      'Standing desk counter; stationary person rather than the prior accessibility_new suggestion',
    ],
  ],
  R189: [
    [
      'fitness_center',
      'accessibility_new',
      'Stretching counter; outstretched arms rather than the prior self_improvement meditation suggestion',
    ],
  ],
  R183: [['hourglass_empty', 'control:progress-spinner', 'Preparing chart share']],
  R188: [['free_breakfast', 'coffee', 'Coffee counter style consolidation']],
  R191: [
    ['playlist_add', 'add', 'Add habit'],
    ['visibility', 'toggle_on', 'Re-enable habit'],
  ],
  R197: [['wb_sunny', 'layout:date-cell', 'Restore day number with today outline']],
  R200: [
    [
      'close',
      'control:clear-time-button',
      'Same X glyph in a native keyboard-operable labeled button',
    ],
  ],
  R209: [['close', 'none', 'Discard note button retains text, removes redundant X']],
  R227: [['remove_today', 'custom:calendar-minus', 'Unpin note from Today']],
  R230: [
    ['lock', 'visibility', 'Show formatted note'],
    ['lock_open', 'code', 'Show plain text'],
  ],
  R236: [['library_books', 'drag_handle', 'Resize work-view split']],
  R241: [['playlist_add', 'add_task', 'Add more tasks']],
  R250: [
    ['list', 'expand_more', 'Show day details'],
    ['close', 'expand_less', 'Hide day details'],
  ],
  R251: [['delete_outline', 'delete', 'Trash-entry alias consolidation']],
  R255: [['note', 'description', 'Notes cleared compression-preview identity']],
  R258: [
    ['grid_view', 'view_kanban', 'Boards onboarding teaser'],
    ['heart_check', 'event_repeat', 'Habits onboarding teaser'],
    ['schedule', 'calendar_view_week', 'Schedule onboarding teaser'],
  ],
  R261: [['wb_sunny', 'today', 'Today in onboarding hints']],
  R269: [['update', 'system_update_alt', 'Upgrade old Plainspace server']],
  R273: [
    [
      'link',
      'none',
      'Labeled social targets: remove indistinguishable generic link glyphs',
    ],
    ['chat', 'none', 'WhatsApp label only'],
    ['send', 'none', 'Telegram label only'],
  ],
  R297: [
    ['arrow_back', 'arrow_upward', 'Move entry up'],
    ['arrow_forward', 'arrow_downward', 'Move entry down'],
  ],
  R304: [['image_not_supported', 'photo_library', 'No clipboard images yet']],
  R311: [
    [
      'move_to_inbox',
      'upload_file',
      'Import from Todoist; optional provider mark alternative',
    ],
  ],
  R312: [
    [
      'move_to_inbox',
      'upload_file',
      'Import from TickTick; optional provider mark alternative',
    ],
  ],
  R314: [['folder', 'description', 'Single backup-file kind']],
  R317: [
    ['file_download', 'cloud_download', 'Replace local with remote'],
    ['file_upload', 'cloud_upload', 'Replace remote with local'],
  ],
  R330: [['enhanced_encryption', 'lock', 'Encryption category']],
  R340: [
    [
      'extension',
      'provider:runtime-svg',
      'Use actual selected provider SVG, not generic puzzle piece',
    ],
  ],
  R341: [
    [
      'update',
      'composite:provider-sync-badge',
      'Keep provider identity and add small sync status badge',
    ],
  ],
  R346: [['check', 'check_circle', 'Static connection success']],
  R347: [['sync', 'control:progress-spinner', 'Loading provider options']],
  R352: [
    [
      'delete_forever',
      'delete',
      'Remove provider configuration; confirm actual lifecycle before implementation',
    ],
  ],
  R358: [['info', 'unarchive', 'Restored issue task result']],
  R364: [['autorenew', 'control:progress-spinner', 'Plugin action loading']],
  R366: [['error_outline', 'error', 'Error-state alias consolidation']],
  R367: [['desktop_windows', 'computer', 'Desktop-required state']],
  R385: [
    [
      'src/assets/bundled-plugins/google-calendar-provider/icon.svg',
      'provider:google-calendar',
      'Google Calendar provider identity',
    ],
  ],
  R387: [
    [
      'src/assets/bundled-plugins/procrastination-buster/icon.svg',
      'psychology',
      'Guided reflection plugin identity',
    ],
  ],
  R388: [
    [
      'src/assets/bundled-plugins/sync-md/icon.svg',
      'custom:document-sync',
      'sync.md document synchronization identity',
    ],
  ],
  R389: [
    [
      'src/assets/bundled-plugins/todoist-import/icon.svg',
      'provider:todoist',
      'Todoist importer identity',
    ],
  ],
  R390: [
    [
      'src/assets/bundled-plugins/ticktick-import/icon.svg',
      'provider:ticktick',
      'TickTick importer identity',
    ],
  ],
  R391: [
    [
      'src/assets/bundled-plugins/voice-reminder/icon.svg',
      'custom:voice-reminder',
      'Optional outline bell+sound candidate; compare at16px before replacing speaker',
    ],
  ],
  R392: [
    [
      'src/assets/bundled-plugins/yesterday-tasks-plugin/icon.svg',
      'custom:calendar-back',
      'Yesterday’s Tasks identity',
    ],
  ],
  R395: [
    ['title', 'format_h1', 'Heading1'],
    ['text_fields', 'format_h2', 'Heading2'],
    ['short_text', 'format_h3', 'Heading3'],
  ],
  R398: [
    ['check_circle_outline', 'add_task', 'Insert task block'],
    ['check_circle_outline', 'custom:rounded-checkbox', 'Existing task block type'],
  ],
  R412: [
    [
      'ic_widget_check_outline',
      'custom:rounded-checkbox-open',
      'Android incomplete widget task',
    ],
    [
      'ic_widget_check_done',
      'custom:rounded-checkbox-done',
      'Android completed widget task',
    ],
  ],
  R418: [
    [
      'drive_file_move',
      'list_alt',
      'New task capture destination default, preserve selected project identity',
    ],
  ],
  R426: [
    [
      'ic_shortcut_today',
      'native:android-today-calendar',
      'Android launcher standard Today',
    ],
    [
      'ic_shortcut_today_foreground',
      'native:android-today-calendar-adaptive',
      'Android adaptive Today foreground',
    ],
  ],
  R429: [['sun.max', 'sf:calendar', 'Native iOS Today shortcut']],
  R432: [
    [
      'ic_widget_check_outline',
      'custom:rounded-checkbox-open',
      'Android widget harmonization, duplicate of R412',
    ],
    [
      'ic_widget_check_done',
      'custom:rounded-checkbox-done',
      'Android widget harmonization, duplicate of R412',
    ],
  ],
};
const candidateType = (a) =>
  a === 'none'
    ? 'removal'
    : a.startsWith('layout:')
      ? 'layout'
      : a.startsWith('control:')
        ? 'control'
        : a.startsWith('custom:') || a.startsWith('composite:')
          ? 'custom'
          : a.startsWith('native:') || a.startsWith('sf:')
            ? 'native'
            : a.startsWith('provider:')
              ? 'provider'
              : 'glyph';
const normalized = rows
  .filter((r) => !exclude.has(r.id))
  .map((r) => {
    const triples =
      maps[r.id] ||
      r.after_names.map((a) => [r.before_names[0] || r.current, a, r.usage]);
    r.candidates = triples.map(([before, after, label], i) => ({
      id: `${r.id}-${i + 1}`,
      before,
      after,
      label,
      mode: candidateType(after),
    }));
    r.before_names = [...new Set(r.candidates.map((c) => c.before))];
    r.after_names = [...new Set(r.candidates.map((c) => c.after))];
    r.mode = [...new Set(r.candidates.map((c) => c.mode))].join(',');
    r.implementation_type = r.mode;
    r.non_icon_only = r.mode === 'control' && r.id === 'R200';
    r.active_usage = r.id !== 'R275';
    if (r.id === 'R121')
      r.narrowed_usage =
        'Unscheduled date field alarm fallback becomes calendar_month. Actual Today stays today; schedule/repeat/alarm only appear for their configured time/recurrence/reminder states.';
    if (r.id === 'R358')
      r.narrowed_usage =
        'Only the restored-task snack changes info to unarchive; already-exists information snacks retain info.';
    if (r.id === 'R298')
      r.narrowed_usage =
        'Only replacement is delete_forever to delete for repeatable configuration removal; permanent-delete identity remains for genuine permanent deletion.';
    r.removal = r.candidates.some((c) => c.mode === 'removal');
    return r;
  });
writeFileSync(
  resolve(out, 'original-change-rows.json'),
  JSON.stringify(normalized, null, 2) + '\n',
);
for (const r of all)
  if (exclude.has(r.id)) {
    r.flagged = false;
    r.excluded_reason =
      'Keep instruction or negative replacement language, not a recommended replacement';
  }
writeFileSync(resolve(out, 'all-audit-rows.json'), JSON.stringify(all, null, 2) + '\n');
writeFileSync(
  resolve(out, 'excluded-rows.json'),
  JSON.stringify(
    all.filter((r) => exclude.has(r.id)),
    null,
    2,
  ) + '\n',
);
const summary = {
  sourceRows: all.length,
  flaggedRows: normalized.length,
  candidates: normalized.reduce((n, r) => n + r.candidates.length, 0),
  excludedNegativeKeeps: [...exclude],
  unresolved: normalized.filter((r) => !r.candidates.length).map((r) => r.id),
  modes: normalized.reduce((a, r) => {
    for (const c of r.candidates) a[c.mode] = (a[c.mode] || 0) + 1;
    return a;
  }, {}),
};
writeFileSync(
  resolve(out, 'extraction-summary.json'),
  JSON.stringify(summary, null, 2) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
