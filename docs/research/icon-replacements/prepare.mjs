import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const out = dirname(fileURLToPath(import.meta.url));
const rows = JSON.parse(readFileSync(resolve(out, 'original-change-rows.json')));
const visuals = JSON.parse(readFileSync(resolve(out, 'visual-findings.json')));
const flat = [];
const refine = (c, r) => {
  const x = { ...c };
  if (
    r.section.startsWith('Doc Mode') &&
    ['title', 'text_fields', 'short_text', 'check_circle_outline'].includes(x.before)
  )
    x.before = 'doc:' + x.before;
  if (r.id === 'R109' && x.before === '🔥') x.after = 'calendar_month';
  if (x.after === 'custom:voice-reminder') x.after = 'volume_up';
  if (r.id === 'R419') x.label = 'Completed focus session banner';
  if (r.id === 'R152') x.label = 'Finish task and select next · optional alias cleanup';
  return x;
};
for (const row of rows)
  for (const raw of row.candidates) {
    const c = refine(raw, row);
    const sources =
      row.id === 'R419'
        ? row.sources.filter((s) => !s.includes('simple-counter'))
        : row.id === 'R152'
          ? [
              'src/app/features/focus-mode/focus-mode-task-row/focus-mode-task-row.component.ts:72',
            ]
          : row.sources;
    const usage =
      row.id === 'R419'
        ? 'Completed focus session banner'
        : row.id === 'R152'
          ? 'Finish task and select next in the focus task row; other task controls already use check/undo and stay as they are.'
          : row.narrowed_usage || row.usage;
    const reason =
      row.id === 'R419'
        ? 'The active focus-session-completed banner uses celebration. Prefer a calm confirmed-outcome check. The previously cited counter celebration is commented and excluded.'
        : row.id === 'R152'
          ? 'The live done glyph is in the focus task row. This is optional alias consolidation; regular task controls already use check.'
          : row.reason;
    flat.push({
      ...c,
      origin: row.id,
      area: row.major,
      section: row.section,
      why: row.recommendation,
      reason,
      usage,
      sources,
      auditLine: row.audit_line,
      optional: row.optional,
      active: row.active_usage !== false,
      category: 'Meaning',
      originalCase: raw.id,
    });
  }
const visualPairs = (v) => {
  if (v.id === 'VI-22')
    return v.before_after_map.map((p) => ({
      before: 'doc:' + p.before_name,
      after: p.after_name,
      label: 'Doc Mode · ' + p.before_name,
    }));
  const originals = [...v.current_symbols, ...v.current_text, ...v.current_assets];
  switch (v.id) {
    case 'VI-12':
      return [{ before: originals[0], after: 'volume_up', label: v.purpose }];
    case 'VI-13':
      return [{ before: originals[0], after: 'custom:document-sync', label: v.purpose }];
    case 'VI-16':
      return [{ before: originals[0], after: 'custom:calendar-back', label: v.purpose }];
    case 'VI-19':
      return originals.map((b, i) => ({
        before: b,
        after: i ? 'provider:ticktick' : 'provider:todoist',
        label: (i ? 'TickTick' : 'Todoist') + ' importer',
      }));
    case 'VI-20':
      return ['ic_widget_check_outline', 'ic_widget_check_done'].map((b, i) => ({
        before: b,
        after: i ? 'custom:rounded-checkbox-done' : 'custom:rounded-checkbox-open',
        label: 'Android task checkbox · ' + (i ? 'complete' : 'incomplete'),
      }));
    default:
      return originals.map((b, i) => ({
        before: b,
        after: v.after_symbols[Math.min(i, v.after_symbols.length - 1)],
        label: v.purpose,
      }));
  }
};
for (const v of visuals.findings)
  for (const [i, pair] of visualPairs(v).entries())
    flat.push({
      ...pair,
      id: v.id + '-' + (i + 1),
      origin: v.id,
      area: v.scope === 'bundled-plugin' ? 'Plugins' : 'Visual identity',
      section: v.purpose,
      mode: 'glyph',
      why: v.candidate_strategy,
      reason: v.visual_mismatch,
      usage: v.purpose,
      sources: v.sources,
      optional: true,
      active: true,
      category:
        v.kind === 'visual-only' ||
        (v.id === 'VI-22' && pair.before.slice(4) === pair.after)
          ? 'Visual style'
          : 'Meaning + visual style',
      originalCase: v.id + '-' + (i + 1),
      evidence:
        v.id === 'VI-17' || v.id === 'VI-18' || v.id === 'VI-19'
          ? 'Source-derived renderer risk; before shows the original source asset. No reproduced defect screenshot is claimed.'
          : v.id === 'VI-21'
            ? 'Static original illustration source; proposed simplification is optional.'
            : '',
    });
const groups = new Map();
for (const item of flat) {
  const key = item.before + '→' + item.after;
  if (!groups.has(key))
    groups.set(key, {
      id: 'IC' + String(groups.size + 1).padStart(3, '0'),
      before: item.before,
      after: item.after,
      title: item.label,
      items: [],
      categories: [],
      optional: true,
    });
  const g = groups.get(key);
  g.items.push(item);
  g.optional &&= item.optional;
  if (!g.categories.includes(item.category)) g.categories.push(item.category);
}
const candidates = [...groups.values()];
for (const c of candidates) {
  c.sources = [...new Set(c.items.flatMap((i) => i.sources))];
  c.origins = [...new Set(c.items.map((i) => i.origin))];
  c.active = c.items.some((i) => i.active);
  c.category = c.categories.some((x) => x.includes('Visual') || x.includes('visual'))
    ? c.categories.includes('Meaning')
      ? 'Meaning + visual style'
      : c.categories.includes('Visual style') && c.categories.length === 1
        ? 'Visual style'
        : 'Meaning + visual style'
    : 'Meaning';
}
const assetMap = JSON.parse(readFileSync(resolve(out, 'asset-map.json')));
for (const c of candidates) {
  const a = assetMap[c.before],
    b = assetMap[c.after];
  if (
    a &&
    b &&
    readFileSync(resolve(out, a.file), 'utf8') ===
      readFileSync(resolve(out, b.file), 'utf8')
  ) {
    c.identicalArtwork = true;
    c.category = 'Alias cleanup';
    c.optional = true;
  }
}
const csv = (x) => '"' + String(x ?? '').replaceAll('"', '""') + '"';
const coverage = rows.map((r) => ({
  row: r.id,
  line: r.audit_line,
  usage: r.usage,
  cases: r.candidates.map((c) => c.id),
  replacement_ids: candidates.filter((c) => c.origins.includes(r.id)).map((c) => c.id),
  status:
    r.active_usage === false
      ? 'Dormant declarations; future candidate only'
      : 'Specific candidate supplied',
}));
const summary = {
  snapshot: '2026-11-05',
  originalFlaggedRows: rows.length,
  originalCases: rows.reduce((n, r) => n + r.candidates.length, 0),
  visualFindings: visuals.findings.length,
  reviewCards: candidates.length,
  coverageGaps: coverage.filter((r) => !r.replacement_ids.length),
  byCategory: candidates.reduce(
    (a, c) => ((a[c.category] = (a[c.category] || 0) + 1), a),
    {},
  ),
  aliasOnlyCount: candidates.filter((c) => c.identicalArtwork).length,
  refinements: [
    'Finish task alias normalization is narrowed to the actual focus-row done glyph; regular task controls are already consistent.',
    'Standing counter: man (stationary person), replacing the earlier accessibility_new suggestion.',
    'Stretching counter: accessibility_new (outstretched arms), replacing meditation/self_improvement.',
    'Headings: exact format_h1 / format_h2 / format_h3 glyphs are available.',
    'Automatic placement: calendar_clock, avoiding the earlier sparkle alternative.',
    'Streak durations: calendar_month with explicit day count, unifying earlier event_available/emoji suggestions.',
    'Voice Reminder: simple volume_up, avoiding a dense custom speaker/bell compound.',
    'Focus completion banner: retain actual active celebration use; the simple-counter celebration occurrence cited earlier is commented and excluded.',
  ],
};
writeFileSync(
  resolve(out, 'candidates.json'),
  JSON.stringify(
    {
      summary,
      baseline: visuals.baseline,
      intentional_exceptions: visuals.intentional_exceptions,
      candidates,
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(
  resolve(out, 'coverage.csv'),
  [
    ['audit_row', 'audit_line', 'use', 'candidate_ids', 'status'],
    ...coverage.map((r) => [
      r.row,
      r.line,
      r.usage,
      r.replacement_ids.join(' '),
      r.status,
    ]),
  ]
    .map((r) => r.map(csv).join(','))
    .join('\n') + '\n',
);
writeFileSync(resolve(out, 'coverage.json'), JSON.stringify(coverage, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
