// Rebuild the review artifacts without changing application code.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { marked } from 'marked';
import { gzipSync } from 'node:zlib';

const out = dirname(fileURLToPath(import.meta.url));
const root = resolve(out, '../../..');
const report = readFileSync(resolve(out, '../icon-audit.md'), 'utf8');
const inventory = JSON.parse(readFileSync(resolve(out, 'inventory.json'), 'utf8'));
const font = readFileSync(
  resolve(root, 'src/assets/fonts/material-symbols-outlined.woff2'),
).toString('base64');
const codeNames = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const text = (s) =>
  String(s)
    .replace(/\*\*|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const tokens = marked.lexer(report);
const semanticRows = [];
let section = '';
for (const token of tokens) {
  if (token.type === 'heading') section = token.text;
  if (token.type !== 'table') continue;
  const headers = token.header.map((c) => c.text);
  if (!/^Current|^Asset/.test(headers[0])) continue;
  const rec = headers.findIndex((h) => /recommendation|edit recommendation/i.test(h));
  if (rec < 0) continue;
  for (const row of token.rows)
    semanticRows.push({
      section,
      current: row[0].text,
      usage: row[1]?.text ?? '',
      recommendation: row[rec].text,
      all: row.map((c) => c.text).join(' | '),
    });
}
const selectable = new Set(
  [
    ...readFileSync(resolve(root, 'src/app/ui/material-icons.const.ts'), 'utf8').matchAll(
      /'([^']+)'/g,
    ),
  ].map((m) => m[1]),
);
const glyphs = new Set(
  inventory.icons.filter((i) => i.family === 'material').map((i) => i.icon),
);
// Include proposals for actual before/after previews. These are checked against
// the bundled font during the audit; identifiers with paths are not font names.
for (const row of semanticRows)
  for (const name of codeNames(row.recommendation))
    if (selectable.has(name)) glyphs.add(name);
const svgRegistry = new Map(
  [
    ...readFileSync(
      resolve(root, 'src/app/core/theme/built-in-svg-icons.const.ts'),
      'utf8',
    ).matchAll(/\['([^']+)',\s*'([^']+)'\]/g),
  ].map((m) => [m[1], `src/${m[2]}`]),
);
const snapshotMapPath = resolve(root, 'docs/research/icon-replacements/asset-map.json');
const snapshotMap = existsSync(snapshotMapPath)
  ? JSON.parse(readFileSync(snapshotMapPath, 'utf8'))
  : {};
const dataImage = (path) => {
  const canonicalPath = path.startsWith('assets/') ? `src/${path}` : path;
  const snapshot =
    snapshotMap[canonicalPath] ||
    Object.values(snapshotMap).find((item) => item.origin === canonicalPath);
  const full = snapshot
    ? resolve(root, 'docs/research/icon-replacements', snapshot.file)
    : resolve(root, canonicalPath);
  if (!existsSync(full)) return '';
  const mime = path.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  return `data:${mime};base64,${readFileSync(full).toString('base64')}`;
};
const sourceLink = (path, line) =>
  `<a href="../../${escape(path)}#L${line}">${escape(path)}:${line}</a>`;
const preview = (icon, family = 'material') => {
  if (family === 'material' && glyphs.has(icon))
    return `<span class="glyph" aria-hidden="true">${escape(icon)}</span>`;
  const path =
    svgRegistry.get(icon) || (icon.endsWith('.svg') || icon.endsWith('.png') ? icon : '');
  if (path) {
    const uri = dataImage(path);
    if (uri) return `<img class="asset" src="${uri}" alt="" />`;
  }
  return `<span class="native" aria-hidden="true">${family === 'sf-symbol' ? 'iOS' : family === 'android-drawable' ? 'Android' : 'SVG'}</span>`;
};
const catalog = inventory.icons.map((icon) => {
  let matches = semanticRows.filter(
    (row) =>
      codeNames(row.current).includes(icon.icon) ||
      (icon.icon.includes('/') && row.all.includes(icon.icon)),
  );
  if (!matches.length && icon.icon.startsWith('src/assets/bundled-plugins/')) {
    const slug = icon.icon.split('/')[3];
    matches = semanticRows.filter((row) => row.all.includes(`bundled-plugins/${slug}/`));
  }
  const fallback = icon.occurrences.every((r) => r.scope === 'unbundled-plugin-source')
    ? 'Source-only optional/development plugin: preserve a truthful labeled identity; review before promoting it into the bundled UI.'
    : icon.family === 'custom-svg'
      ? 'Custom SVG graphic/control: retain its conventional shape; inspect the linked implementation and keep accessible text/state. Component grouping is not a count of individual paths.'
      : 'Keep this provider/app identity with its visible name; definition or registration alone does not prove that it is displayed. Review the exact caller before changing it.';
  return {
    ...icon,
    matches,
    decision: matches.length
      ? matches
          .map((r) => `${r.usage}: ${r.recommendation}`)
          .map(text)
          .join('\n')
      : fallback,
    scopes: [...new Set(icon.occurrences.map((o) => o.scope))].join(', '),
  };
});
const csv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const csvRows = [
  [
    'icon',
    'family',
    'static_reference_count',
    'scopes',
    'usage_specific_recommendations',
    'all_source_locations',
  ],
  ...catalog.map((i) => [
    i.icon,
    i.family,
    i.count,
    i.scopes,
    i.decision,
    i.occurrences.map((o) => `${o.path}:${o.line}`).join('\n'),
  ]),
];
writeFileSync(
  resolve(out, 'catalog.csv'),
  csvRows.map((r) => r.map(csv).join(',')).join('\n') + '\n',
);
const gallery = catalog
  .map(
    (i) =>
      `<article class="icon-card" data-family="${escape(i.family)}">${preview(i.icon, i.family)}<h3>${escape(i.icon)}</h3><p class="meta">${escape(i.family)} · ${i.count} references · ${escape(i.scopes)}</p><details><summary>Uses and edit recommendations</summary>${i.matches.length ? i.matches.map((r) => `<p><strong>${escape(r.section)}</strong><br>${marked.parseInline(r.usage)}<br>${marked.parseInline(r.recommendation)}</p>`).join('') : `<p>${escape(i.decision)}</p>`}<ul>${i.occurrences.map((o) => `<li>${sourceLink(o.path, o.line)} <span class="meta">${escape(o.status)} · ${escape(o.scope)}</span><p class="context">${escape(o.context)}</p></li>`).join('')}</ul></details></article>`,
  )
  .join('\n');
let reportHtml = marked.parse(report);
reportHtml = reportHtml.replace(/<code>([a-z_]+)<\/code>/g, (whole, name) =>
  glyphs.has(name) ? `${preview(name)}${whole}` : whole,
);
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ultra Tasks · Icon audit</title>
<style>
@font-face{font-family:AuditSymbols;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:400;font-style:normal}
:root{color-scheme:light dark;--bg:#f6f7fa;--surface:white;--ink:#192434;--muted:#526175;--border:#d9dfeb;--accent:#2448a9}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,sans-serif}a{color:var(--accent)}h1{font-size:32px;line-height:1.2}h2{font-size:24px;margin:48px 0 16px}h3{font-size:18px}.toolbar{position:sticky;top:0;z-index:2;background:var(--surface);border-bottom:1px solid var(--border);padding:14px max(24px,calc((100vw - 1440px)/2));display:flex;flex-wrap:wrap;align-items:center;gap:12px}.toolbar strong{margin-right:10px}.toolbar input{flex:1;min-width:210px}input,select,button{padding:9px 12px;font:inherit;color:inherit;background:var(--surface);border:1px solid var(--border);border-radius:8px}button{cursor:pointer}main{max-width:1488px;margin:auto;padding:24px}.intro{max-width:950px}.meta{font-size:12px;color:var(--muted)}.glyph{font-family:AuditSymbols!important;font-weight:400;font-style:normal;font-size:28px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;font-feature-settings:'liga';white-space:nowrap;vertical-align:middle;margin:3px 6px 3px 0;font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}.asset{width:38px;height:38px;object-fit:contain;vertical-align:middle}.native{font-size:11px;display:inline-block;padding:8px;border:1px solid var(--border);border-radius:6px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:14px}.icon-card{background:var(--surface);padding:18px;border:1px solid var(--border);border-radius:12px;min-width:0;overflow-wrap:anywhere}.icon-card>.glyph{font-size:36px}.icon-card h3{margin:8px 0;font-size:15px}.icon-card p{margin:10px 0}.icon-card details{font-size:13px}.icon-card ul{padding-left:18px;max-height:480px;overflow:auto}.context{font:11px/1.4 ui-monospace,monospace;color:var(--muted)}summary{cursor:pointer;color:var(--accent)}.table-wrap{overflow-x:auto;margin:20px 0}table{width:100%;border-collapse:collapse;background:var(--surface);font-size:13px}th,td{text-align:left;vertical-align:top;padding:12px;border:1px solid var(--border);min-width:140px}th{background:var(--bg)}td:last-child{min-width:240px;overflow-wrap:anywhere}code{font:12px ui-monospace,monospace;background:var(--bg);border-radius:4px;padding:2px 4px;overflow-wrap:anywhere}pre{white-space:pre-wrap;padding:14px;background:var(--surface)}pre code{background:none}#status{font-size:12px;min-width:180px}[hidden]{display:none!important}.view-toggle[aria-pressed=true]{background:var(--accent);color:white}.section-note{border-left:4px solid var(--accent);padding-left:14px;max-width:950px}@media(prefers-color-scheme:dark){:root{--bg:#141a24;--surface:#1c2533;--ink:#e0e7f5;--muted:#a9b7ca;--border:#39465a;--accent:#a4bcff}}@media print{.toolbar{position:static}.gallery{display:block}.icon-card{break-inside:avoid}.context{display:none}}
</style></head><body><nav class="toolbar" aria-label="Audit controls"><strong>Ultra Tasks · Icon audit</strong><button class="view-toggle" id="reportButton" aria-pressed="true">Recommendations</button><button class="view-toggle" id="galleryButton" aria-pressed="false">All ${catalog.length} identifiers</button><input id="search" type="search" placeholder="Search icon, meaning, screen or file…" aria-label="Search audit"><select id="family" aria-label="Icon family"><option value="">All families</option>${[...new Set(catalog.map((i) => i.family))].map((f) => `<option>${f}</option>`).join('')}</select><span id="status" role="status"></span></nav><main><div id="report">${reportHtml}</div><section id="galleryView" hidden><h1>All icon identifiers and assets</h1><p class="section-note">323 static identifiers/assets; 1,170 source references. Expand any card for every source location and context-specific edit decisions. Native/custom component groups are labeled placeholders; they are not rendered using a different font. Branded SVGs and Material symbols show their actual bundled assets. Development-only and registered assets remain labeled. Search also matches collapsed details.</p><div class="gallery">${gallery}</div></section></main><script>
const search=document.querySelector('#search'),family=document.querySelector('#family');const cards=[...document.querySelectorAll('.icon-card')];const reportRows=[...document.querySelectorAll('#report tbody tr')];let galleryMode=false;const status=document.querySelector('#status');
for(const table of document.querySelectorAll('#report table')){const wrap=document.createElement('div');wrap.className='table-wrap';table.replaceWith(wrap);wrap.append(table)}
function filter(){const q=search.value.toLowerCase().trim();let count=0;for(const card of cards){card.hidden=!!((family.value&&card.dataset.family!==family.value)||(q&&!card.textContent.toLowerCase().includes(q)));if(!card.hidden)count++}let rows=0;for(const row of reportRows){row.hidden=!!(q&&!row.textContent.toLowerCase().includes(q));if(!row.hidden)rows++}status.textContent=galleryMode?count+' / '+cards.length+' identifiers':rows+' / '+reportRows.length+' table rows';family.disabled=!galleryMode}
function view(on){galleryMode=on;document.querySelector('#report').hidden=on;document.querySelector('#galleryView').hidden=!on;document.querySelector('#reportButton').setAttribute('aria-pressed',String(!on));document.querySelector('#galleryButton').setAttribute('aria-pressed',String(on));filter()}
search.addEventListener('input',filter);family.addEventListener('change',filter);document.querySelector('#reportButton').addEventListener('click',()=>view(false));document.querySelector('#galleryButton').addEventListener('click',()=>view(true));filter();
</script></body></html>`;
// Keep the self-contained report below the repository's 1 MiB document limit.
// The browser's standard gzip decoder restores the full embedded document;
// no external scripts, fonts or network requests are needed.
const packed = gzipSync(Buffer.from(html)).toString('base64');
const packedChunks =
  '[' +
  packed
    .match(/.{1,12000}/g)
    .map((chunk) => JSON.stringify(chunk))
    .join(',\n') +
  "].join('')";
const portableHtml = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ultra Tasks · Icon audit</title><p id="loading">Loading the icon audit… <a href="icon-audit.md">Read the text report</a></p><script>
(async()=>{try{const data=Uint8Array.from(atob(${packedChunks}),c=>c.charCodeAt(0));const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'));const html=await new Response(stream).text();document.open();document.write(html);document.close()}catch(error){document.querySelector('#loading').prepend('This browser could not load the visual audit. ');console.error(error)}})();
</script></html>`;
writeFileSync(resolve(out, '../icon-audit.html'), portableHtml);
const unmatched = catalog.filter((i) => !i.matches.length);
console.log(
  JSON.stringify(
    {
      reportRows: semanticRows.length,
      catalogIcons: catalog.length,
      fallbackIdentities: unmatched.map((i) => i.key),
      htmlBytes: Buffer.byteLength(portableHtml),
    },
    null,
    2,
  ),
);
