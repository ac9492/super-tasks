import {
  TodoistImportModel,
  TodoistTask,
} from '../../../../packages/plugin-dev/todoist-import/src/parse/normalized-model';
import { parseCsv } from '../../../../packages/plugin-dev/ticktick-import/src/parse/parse-csv';

/** Todoist's project CSV, using the same normalized model as the existing importer. */
export const parseTodoistCsv = (
  csv: string,
  projectTitle: string,
): TodoistImportModel => {
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex(
    (row) => row.includes('TYPE') && row.includes('CONTENT'),
  );
  if (headerIndex < 0) throw new Error('Invalid Todoist CSV');
  const header = rows[headerIndex];
  const tasks: TodoistTask[] = [];
  const sections: TodoistImportModel['sections'] = [];
  let rootId: string | null = null;
  let section = '';
  for (const [index, row] of rows.slice(headerIndex + 1).entries()) {
    const get = (key: string): string => row[header.indexOf(key)]?.trim() ?? '';
    const content = get('CONTENT');
    if (get('TYPE') === 'section') {
      section = content;
      sections.push({ extId: String(index), projectExtId: 'csv', title: section });
      rootId = null;
      continue;
    }
    if (get('TYPE') === 'note' && tasks.length) {
      tasks[tasks.length - 1].notes += '\n\n' + content;
      continue;
    }
    if (get('TYPE') !== 'task' || !content) continue;
    const indent = Number(get('INDENT')) || 1;
    const id = String(index);
    const parentId = indent > 1 ? rootId : null;
    if (!parentId) rootId = id;
    const labels: string[] = [];
    const title = content
      .replace(/(?:^|\s)@([^\s@]+)/g, (_match, label: string) => {
        labels.push(label);
        return ' ';
      })
      .trim();
    const date = get('DATE');
    // Natural-language / timezone-dependent dates are retained verbatim rather
    // than guessed. The preview explains this before anything is written.
    const dueDay =
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date
        ? date
        : null;
    const notes = [
      get('DESCRIPTION'),
      section ? `## ${section}` : '',
      date && !dueDay ? `DATE: ${date}` : '',
      ...['TIMEZONE', 'DEADLINE', 'RESPONSIBLE'].map((key) =>
        get(key) ? `${key}: ${get(key)}` : '',
      ),
    ]
      .filter(Boolean)
      .join('\n\n');
    const duration = Number(get('DURATION'));
    const priority = Number(get('PRIORITY'));
    tasks.push({
      extId: id,
      projectExtId: 'csv',
      parentExtId: parentId,
      title: title || content,
      notes,
      labels,
      apiPriority: priority >= 1 && priority <= 4 ? 5 - priority : 1,
      dueDay,
      dueWithTime: null,
      timeEstimate:
        get('DURATION_UNIT') === 'minute' && duration > 0 ? duration * 60000 : null,
      isRecurring: !!date && !dueDay,
      wasDemoted: indent > 2,
      isDayDurationSkipped: false,
      hasAssignee: !!get('RESPONSIBLE'),
      attachmentCount: 0,
    });
  }
  return {
    projects: [
      {
        extId: 'csv',
        title: projectTitle,
        parentExtId: null,
        isInbox: false,
        childOrder: 0,
      },
    ],
    sections,
    tasks,
  };
};
