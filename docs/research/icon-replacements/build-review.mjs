import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { marked } from 'marked';
const out = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(out, 'candidates.json')));
const assets = JSON.parse(readFileSync(resolve(out, 'asset-map.json')));
const approval = existsSync(resolve(out, 'approval.json'))
  ? JSON.parse(readFileSync(resolve(out, 'approval.json')))
  : null;
const implementation = existsSync(resolve(out, 'implementation.json'))
  ? JSON.parse(readFileSync(resolve(out, 'implementation.json')))
  : null;
const implementedById = new Map((implementation?.candidates || []).map((c) => [c.id, c]));
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const clean = (s) =>
  String(s ?? '')
    .replace(/\*\*|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
let uid = 0;
const missing = new Set();
const svg = (key, cls = '') => {
  if (!assets[key]) {
    missing.add(key);
    return `<span class="missing">Missing ${esc(key)}</span>`;
  }
  let s = readFileSync(resolve(out, assets[key].file), 'utf8')
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '');
  const prefix = 'g' + ++uid + '_';
  const ids = [...s.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids)
    s = s
      .replaceAll('id="' + id + '"', 'id="' + prefix + id + '"')
      .replaceAll('url(#' + id + ')', 'url(#' + prefix + id + ')')
      .replaceAll('href="#' + id + '"', 'href="#' + prefix + id + '"');
  return s.replace(
    /<svg\b/,
    '<svg class="icon ' + cls + '" role="img" aria-label="' + esc(key) + '"',
  );
};
const isText = (s) => !s.includes(':') && !assets[s] && s.length < 5;
const render = (key, c, side) => {
  if (side === 'before' && c.after === 'layout:date-cell')
    return `<div class="date-cell old">${svg(key)}</div>`;
  if (key === 'none')
    return `<span class="text-only">${c.before === 'close' ? 'Discard' : 'Share target'}<small>No icon</small></span>`;
  if (key === 'layout:date-cell') return '<span class="date-cell current">5</span>';
  if (key === 'control:progress-spinner')
    return '<svg class="icon spinner" viewBox="0 0 24 24" role="img" aria-label="Loading"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  if (key === 'control:clear-time-button')
    return `<span class="time-control"><span>10:00</span><button type="button" class="demo-clear" aria-label="Clear time">${svg('close')}</button></span>`;
  if (isText(key))
    return `<span class="text-icon" aria-label="${esc(key)}">${esc(key)}</span>`;
  return svg(
    key,
    key.startsWith('native:') || key.startsWith('ic_shortcut') ? 'native-icon' : '',
  );
};
const note = (key) =>
  assets[key]?.kind === 'platform-equivalent'
    ? 'Native SF Symbol equivalent preview; exact Apple artwork is not shown.'
    : assets[key]?.kind === 'static-source-illustration'
      ? assets[key].notes
      : key.startsWith('provider:runtime') || key.startsWith('composite:provider')
        ? 'Real GitHub artwork shown as a concrete example; production keeps the configured provider.'
        : '';
const afterLink = (c) =>
  assets[c.after]
    ? `<a download="${esc(c.after.replaceAll(':', '-'))}.svg" href="data:image/svg+xml;base64,${readFileSync(resolve(out, assets[c.after].file)).toString('base64')}">Download SVG</a>`
    : '<span class="meta">Control/layout proposal</span>';
const keylabel = (key) =>
  key === 'none'
    ? 'Label only'
    : key.startsWith('doc:')
      ? 'Legacy Doc Mode ' + key.slice(4)
      : key.startsWith('src/')
        ? 'Current plugin SVG'
        : key
            .replace(/^custom:|^provider:|^native:|^control:|^layout:|^sf:/, '')
            .replaceAll('_', ' ');
const markdown = (s) => marked.parseInline(s ?? '');
const cards = data.candidates
  .map((c) => {
    const notes = [
      ...new Set(
        [note(c.before), note(c.after), ...c.items.map((i) => i.evidence)].filter(
          Boolean,
        ),
      ),
    ];
    const families = [...new Set(c.items.map((i) => i.area))];
    const title = clean(c.title).slice(0, 112);
    const rationale =
      c.items.find((i) => i.origin.startsWith('VI'))?.reason || c.items[0].reason;
    const shortWhy = clean(
      c.identicalArtwork
        ? 'These names resolve to identical artwork in the bundled font. Keep the current appearance; consolidate the code name only if useful during editing. This is optional cleanup, not a visual redesign.'
        : rationale,
    )
      .replace(/(?:src|packages|android|ios)\/.*$/, '')
      .slice(0, 260);
    const sourceRows = c.items
      .map(
        (i) =>
          `<li><strong>${esc(i.origin)} · ${esc(i.section)}</strong><p>${markdown(i.usage)}</p><p>${markdown(i.why)}</p>${i.reason !== i.why ? `<p class="meta">${markdown(i.reason)}</p>` : ''}</li>`,
      )
      .join('');
    return `<article class="card" id="${c.id}" data-id="${c.id}" data-category="${esc(c.category)}" data-active="${c.active}" data-origins="${esc(c.origins.join(' '))}"><header><span class="identifier">${c.id}</span>${implementedById.has(c.id) ? `<span class="badge" title="${esc(implementedById.get(c.id).note)}">${esc(implementedById.get(c.id).status.replaceAll('-', ' '))}</span>` : ''}<span class="badge">${esc(c.category)}</span>${!c.active ? '<span class="badge">Dormant source</span>' : ''}</header><h2>${esc(title)}</h2><div class="comparison"><div><div class="side-label">Before</div><div class="sample">${render(c.before, c, 'before')}</div><div class="key">${esc(keylabel(c.before))}</div></div><span class="arrow" aria-hidden="true">→</span><div><div class="side-label after-label">Recommended</div><div class="sample after">${render(c.after, c, 'after')}</div><div class="key">${esc(keylabel(c.after))}</div></div></div><p class="reason">${esc(shortWhy || clean(c.items[0].why))}</p>${notes.length ? `<p class="preview-note">${notes.map(esc).join(' ')}</p>` : ''}<div class="review-row"><label for="decision-${c.id}">Decision</label><select id="decision-${c.id}" data-decision="${c.id}"><option value="pending">Pending</option><option value="approve">Approve recommendation</option><option value="keep">Keep current</option><option value="revise">Needs revision</option></select></div><details><summary>Uses, source evidence &amp; review note (${c.items.length})</summary><p class="meta">${esc(families.join(' · '))}</p><ul>${sourceRows}</ul><p class="meta">Before: ${esc(c.before)}<br>After: ${esc(c.after)}<br>Provenance: ${esc(assets[c.after]?.origin || 'Source-code control/layout proposal')}<br>${esc(assets[c.after]?.license || 'Existing repository UI control')}</p><label class="note-label" for="note-${c.id}">Review note</label><textarea id="note-${c.id}" data-note="${c.id}" rows="2" placeholder="Optional feedback"></textarea></details><footer>${afterLink(c)}<span class="meta">${c.optional ? 'Optional refinement' : 'Context-specific replacement'}</span></footer></article>`;
  })
  .join('\n');
const initialHints = [
  'All current glyphs are taken from the bundled font or the actual source SVG; a few native/runtime examples are explicitly labeled.',
  'View at 16–24px before approving. Color is held constant for most comparisons; branded/native assets preserve their own colors.',
  'Review choices do not change Ultra Tasks. Export the decisions file when ready to share your approval.',
];
const html = `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ultra Tasks — Icon replacement review</title><style>
:root{color-scheme:light;--bg:#f5f7f5;--paper:#fff;--ink:#24362e;--muted:#5c6f63;--line:#dce5de;--accent:#16845b;--accent-soft:#edf6f0;--size:24px;--radius:14px}[data-theme=dark]{color-scheme:dark;--bg:#111815;--paper:#1a231e;--ink:#e5eee7;--muted:#a6b8ab;--line:#35443a;--accent:#8cbfa5;--accent-soft:#22392b}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--bg);font:14px/1.5 system-ui,-apple-system,sans-serif}button,input,select,textarea{font:inherit;color:inherit;background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:8px 10px}button{cursor:pointer}button:hover{border-color:var(--accent)}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px}a{color:var(--accent)}.top{padding:24px 28px 16px;max-width:1560px;margin:auto}.brandline{color:var(--accent);font-weight:650;letter-spacing:.05em;text-transform:uppercase;font-size:11px}h1{font-size:30px;line-height:1.2;margin:10px 0 12px}.lede{max-width:1040px;font-size:15px}.stats{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.stat{padding:10px 15px;border:1px solid var(--line);border-radius:10px;background:var(--paper)}.stat strong{font-size:20px;margin-right:6px}.baseline{border-left:3px solid var(--accent);padding:0 14px;max-width:1080px}.baseline p{margin:5px 0}.meta,.preview-note{font-size:11px;color:var(--muted)}.controls{position:sticky;top:0;z-index:5;background:var(--paper);border-block:1px solid var(--line);padding:12px 28px;display:flex;gap:9px;align-items:center;flex-wrap:wrap}.controls input{flex:1;min-width:230px}.controls label{font-size:12px;color:var(--muted)}.controls .theme{margin-left:auto}.utility{max-width:1560px;margin:auto;padding:12px 28px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}.utility #status{margin-right:auto;font-size:12px}.primary{background:var(--accent);color:var(--paper);border-color:var(--accent)}.grid{max-width:1560px;margin:auto;padding:8px 28px 28px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:16px}.card{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);padding:18px;min-width:0;overflow-wrap:anywhere;scroll-margin-top:170px}.card header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.identifier{font:11px ui-monospace,monospace;color:var(--muted)}.badge{font-size:10px;border:1px solid var(--line);border-radius:30px;padding:2px 7px;color:var(--muted)}.card h2{font-size:15px;line-height:1.45;margin:12px 0;min-height:44px}.comparison{display:grid;grid-template-columns:1fr 20px 1fr;align-items:center;gap:4px}.side-label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}.after-label{color:var(--accent)}.sample{height:75px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:10px;margin:7px 0;background:var(--bg);color:var(--ink)}.after{border-color:var(--accent)}.icon{width:var(--size)!important;height:var(--size)!important;max-width:100%;flex-shrink:0;vertical-align:middle}.native-icon{width:calc(var(--size)*1.65)!important;height:calc(var(--size)*1.65)!important}.text-icon{font-size:var(--size)}.key{font:10px/1.4 ui-monospace,monospace;color:var(--muted);min-height:28px}.arrow{text-align:center;color:var(--muted)}.reason{font-size:12px;min-height:56px;margin:14px 0}.preview-note{border-left:2px solid var(--line);padding-left:8px}.review-row{display:flex;gap:8px;align-items:center;border-top:1px solid var(--line);padding-top:12px}.review-row label{font-size:12px;color:var(--muted)}.review-row select{margin-left:auto;width:185px;max-width:75%;font-size:12px}.card[data-decision=approve]{box-shadow:inset 3px 0 var(--accent)}.card[data-decision=keep]{opacity:.78}.card[data-decision=revise]{box-shadow:inset 3px 0 #b98230}details{font-size:12px;margin-top:12px}details ul{padding-left:18px;max-height:380px;overflow:auto}details p{margin:7px 0}summary{cursor:pointer;color:var(--accent)}textarea{width:100%;resize:vertical}.note-label{display:block;margin-top:10px}footer{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:11px;border-top:1px solid var(--line);padding-top:12px;margin-top:14px}.text-only{font-size:14px}.text-only small{display:block;font-size:10px;color:var(--muted);text-align:center}.date-cell{height:32px;width:32px;display:flex;align-items:center;justify-content:center}.date-cell.current{border:1.5px solid var(--accent);border-radius:50%;font-weight:600}.time-control{display:flex;align-items:center;gap:8px;font-size:12px}.demo-clear{display:flex;padding:4px;background:transparent}.demo-clear .icon{width:18px!important;height:18px!important}.spinner{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.spinner{animation:none}}[hidden]{display:none!important}.exceptions{max-width:1504px;margin:0 auto 24px;padding:0 28px}.exceptions li{margin:5px 0}.missing{color:#b92020;font-size:11px}@media(max-width:600px){.top{padding:20px 16px 12px}.controls{padding:10px 16px;position:static}.utility{padding:12px 16px}.grid{padding:4px 16px 20px}.controls input{min-width:100%;width:100%}h1{font-size:25px}.controls .theme{margin-left:0}.stat{padding:8px 10px}.card h2{min-height:0}.reason{min-height:0}}@media print{.controls,.utility,.review-row,footer,.top details{display:none}.grid{display:block}.card{break-inside:avoid;margin:0 0 12px}.sample{height:60px}.card details{display:none}.card h2,.reason{min-height:0}.top{padding:0}body{background:white;color:black}.grid{padding:0}.exceptions{page-break-before:always}}
</style></head><body><header class="top"><div class="brandline">Ultra Tasks / icon review</div><h1>Before → after, approved and implemented</h1><p class="lede">Specific replacement artwork for every change in the first audit, plus a separate pass for icons that work but do not fit the current visual identity. Approved in full on 2026-11-05 and implemented. This board preserves the original comparison artwork; the implementation ledger records conditional and text-equivalent choices.</p><div class="stats"><div class="stat"><strong>${data.summary.reviewCards}</strong>comparison cards</div><div class="stat"><strong>${data.summary.originalFlaggedRows}/${data.summary.originalFlaggedRows}</strong>prior change rows covered</div><div class="stat"><strong>${data.summary.visualFindings}</strong>visual-fit findings</div></div><div class="baseline"><p><strong>Visual baseline:</strong> the existing Material Symbols Outlined family, FILL 0 / weight 400, quiet monochrome icons, rounded task checkboxes, and restrained emerald accents.</p><p class="meta">Reference: current styles, production brand SVG, and saved light/dark/detail screenshots. Provider logos, explicit user-selected emoji and deliberate state fills are preserved. Native SF previews are labeled equivalents.</p></div><details><summary>How to review / what changed since the first audit</summary><ul>${initialHints.map((s) => `<li>${esc(s)}</li>`).join('')}</ul><p>Refinements made while selecting actual artwork:</p><ul>${data.summary.refinements.map((s) => `<li>${esc(s)}</li>`).join('')}</ul><p>Three filled-SVG renderer risks are source findings, not reproduced screenshot defects. Native platform previews require device verification. Static illustration previews do not reproduce animation.</p></details><p><a href="icon-replacements/implementation.md">Implementation report</a> · <a href="icon-replacements.md">Original artwork report</a> · <a href="icon-replacements/coverage.csv">Coverage register</a> · <a href="icon-replacements/assets.zip">SVG asset pack</a></p></header><nav class="controls" aria-label="Review filters"><input id="search" type="search" placeholder="Find icon, use, screen, source, or review ID…" aria-label="Search replacement candidates"><select id="category" aria-label="Filter by issue type"><option value="all">All issues</option><option value="visual">Visual identity · all</option><option value="Visual style">Visual style only</option><option value="Meaning">Meaning only</option><option value="Meaning + visual style">Meaning + style</option><option value="Alias cleanup">Same artwork / aliases</option></select><select id="decisionFilter" aria-label="Filter by decision"><option value="all">All decisions</option><option value="pending">Pending</option><option value="approve">Approved</option><option value="keep">Keep current</option><option value="revise">Needs revision</option></select><label for="size">Preview</label><select id="size"><option value="16">16 px</option><option value="20">20 px</option><option value="24" selected>24 px</option><option value="32">32 px</option></select><button id="theme" class="theme" aria-pressed="false">Dark preview</button></nav><div class="utility"><span id="status" role="status"></span><button id="approveVisible">Approve visible</button><button id="resetVisible">Reset visible</button><button id="export" class="primary">Export decisions</button></div><main class="grid">${cards}</main><section class="exceptions"><details><summary>Intentional exceptions kept</summary><ul>${data.intentional_exceptions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details><p class="meta">Review record stays in this browser when local storage is available. Export decisions to download a shareable approval file. No approval applies changes to the app.</p></section><script>
const spec=${JSON.stringify(data.candidates.map((c) => ({ id: c.id, before: c.before, after: c.after, origins: c.origins, title: c.title }))).replaceAll('<', '\\u003c')};
const cards=[...document.querySelectorAll('.card')];const search=document.querySelector('#search'),category=document.querySelector('#category'),decisionFilter=document.querySelector('#decisionFilter'),status=document.querySelector('#status');const storageKey='ultra-tasks-icon-review-approved-2026-11-05-v1';let decisions=Object.fromEntries(spec.map(c=>[c.id,{decision:'approve',note:''}]));try{decisions={...decisions,...JSON.parse(localStorage.getItem(storageKey)||'{}')}}catch{}
const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(decisions))}catch{}};
for(const card of cards){const id=card.dataset.id,select=card.querySelector('[data-decision]'),note=card.querySelector('[data-note]');select.value=decisions[id]?.decision||'pending';note.value=decisions[id]?.note||'';card.dataset.decision=select.value;select.addEventListener('change',()=>{decisions[id]={decision:select.value,note:note.value};card.dataset.decision=select.value;save();filter()});note.addEventListener('input',()=>{decisions[id]={decision:select.value,note:note.value};save()})}
function filter(){const q=search.value.toLowerCase().trim(),cat=category.value,dec=decisionFilter.value;let visible=0;for(const c of cards){const cm=cat==='all'||(cat==='visual'?c.dataset.category.toLowerCase().includes('visual'):c.dataset.category===cat);c.hidden=!(cm&&(dec==='all'||c.dataset.decision===dec)&&(!q||c.textContent.toLowerCase().includes(q)));if(!c.hidden)visible++}const approved=cards.filter(c=>c.dataset.decision==='approve').length;status.textContent=visible+' / '+cards.length+' shown · '+approved+' approved · '+cards.filter(c=>c.dataset.decision==='pending').length+' pending'}
search.addEventListener('input',filter);category.addEventListener('change',filter);decisionFilter.addEventListener('change',filter);document.querySelector('#size').addEventListener('change',e=>document.documentElement.style.setProperty('--size',e.target.value+'px'));document.querySelector('#theme').addEventListener('click',e=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';e.currentTarget.setAttribute('aria-pressed',String(dark));e.currentTarget.textContent=dark?'Light preview':'Dark preview'});
function setVisible(value){for(const c of cards.filter(c=>!c.hidden)){const id=c.dataset.id;c.querySelector('[data-decision]').value=value;c.dataset.decision=value;decisions[id]={decision:value,note:c.querySelector('[data-note]').value}}save();filter()}
document.querySelector('#approveVisible').addEventListener('click',()=>setVisible('approve'));document.querySelector('#resetVisible').addEventListener('click',()=>setVisible('pending'));document.querySelector('#export').addEventListener('click',()=>{const result={review:'Ultra Tasks icon candidates',snapshot:'2026-11-05',exportedAt:new Date().toISOString(),applicationChanged:true,decisions:spec.map(c=>({...c,decision:decisions[c.id]?.decision||'pending',note:decisions[c.id]?.note||''}))};const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ultra-tasks-icon-decisions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});filter();
</script></body></html>`;
if (missing.size) throw Error('Missing artwork: ' + [...missing].join(', '));
// Self-contained artwork and review UI, compressed to fit repository doc limits.
const packed = gzipSync(Buffer.from(html)).toString('base64');
const chunks =
  '[' +
  packed
    .match(/.{1,12000}/g)
    .map((x) => JSON.stringify(x))
    .join(',\n') +
  "].join('')";
const portable = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ultra Tasks icon replacement review</title><p id="loading">Loading the before-and-after review… <a href="icon-replacements.md">Open written report</a></p><script>\n(async()=>{try{const data=Uint8Array.from(atob(${chunks}),c=>c.charCodeAt(0));const html=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).text();document.open();document.write(html);document.close()}catch(error){document.querySelector('#loading').prepend('Visual review could not load. ');console.error(error)}})();\n</script></html>`;
writeFileSync(resolve(out, '../icon-replacements.html'), portable);
const table = data.candidates
  .map(
    (c) =>
      `| ${c.id} | ${clean(c.title).replaceAll('|', '/')} | ${c.before} | ${c.after} | ${c.category} | ${c.origins.join(', ')} |`,
  )
  .join('\n');
const md = `# Ultra Tasks icon replacement approval report\n\nStatus: Approved in full and implemented. The artwork remains the original review snapshot from 2026-11-05. See the [implementation report](icon-replacements/implementation.md) for outcomes and validation.\n\n[Open the before-and-after approval board](icon-replacements.html) · [Download SVG pack](icon-replacements/assets.zip) · [Coverage register](icon-replacements/coverage.csv) · [Candidate data](icon-replacements/candidates.json)\n\n## What is ready to approve\n\nThe board contains **${data.summary.reviewCards} specific before/after comparisons**. It covers **all ${data.summary.originalFlaggedRows} replacement/refinement rows** from the original audit (${data.summary.originalCases} context-specific cases, including optional, conditional and dormant declarations), plus **${data.summary.visualFindings} visual-identity findings**. Repeated identical before/after pairs share a card with all affected uses listed. Control changes and icon removals show the resulting control or label-only design.\n\nUse the search and filters to review by screen, icon or issue type. Compare at 16, 20, 24 or 32px in light/dark mode. Each card has Approve recommendation, Keep current and Needs revision choices; Export decisions produces a file you can send back. The user approved all candidates; the board starts from that approval. Changing review choices does not itself change the application.\n\n## Visual identity pass\n\nThe first audit focused primarily on meaning. This pass explicitly flags purpose-correct style mismatches: OS-dependent colored emoji, typography totals, heavier legacy Doc Mode paths, filled/dense generic plugin art, native checkbox shape/weight, native shortcut shell colors, and the optional decorative rocket illustration. Name aliases that resolve to identical artwork are explicitly labeled as optional code cleanup rather than visual improvements.\n\nThe baseline is the current monochrome **Material Symbols Outlined at FILL 0 / weight 400**, compact 24dp geometry, rounded-square task controls, and emerald brand. Provider logos, explicit user-selected emoji, the brand tile, intentional selected-state fills and coordinated sync-ring icons remain valid exceptions. This is icon work; it does not redesign the whole Android theme or change notification behavior.\n\n${data.intentional_exceptions.map((s) => '- ' + s).join('\n')}\n\n## Specific candidate sources\n\n- Material candidates are exact standalone SVG paths extracted from the app's bundled font. The font SHA and axis settings are recorded in [material extraction metadata](icon-replacements/material-extraction.json); the asset pack includes its Apache license. No new runtime icon library is proposed.\n- Calendar minus, calendar back and document sync candidates combine that geometry with small same-weight badges. Their composition provenance is recorded in [custom provenance](icon-replacements/custom-provenance.json).\n- Google Calendar, Todoist and TickTick marks are sourced from Simple Icons, not vendor-hosted official downloads. Source URLs/blob hashes and the CC0 license are included; brand trademarks remain their owners'.\n- Actual existing SVG/native paths and old Doc Mode paths are preserved for Before. SF Symbol comparisons explicitly use platform-equivalent artwork; they are not exact Apple glyph renders. Native SF availability, Android export/masking and actual device sizes need verification during implementation.\n- Runtime-provider comparisons use actual GitHub artwork as a clearly labeled example; the implementation should retain the configured provider. Three plugin fill risks are source-derived and not claimed as reproduced screenshot defects.\n\n## Refinements from the earlier suggestions\n\n${data.summary.refinements.map((s) => '- ' + s).join('\n')}\n\n## Candidate register\n\nThe visual board contains actual artwork and download links. This register maps review IDs to the precise replacement and original audit rows. Sources, conditions and reasoning are expanded inside each card and retained in candidate JSON.\n\n| Review ID | Use | Before identifier | Specific candidate | Issue | Covers audit rows/findings |\n| --- | --- | --- | --- | --- | --- |\n${table}\n\n## Rebuild\n\nFrom the repository root, after editing the snapshot inputs:\n\n\`\`\`bash\nnode docs/research/icon-replacements/prepare.mjs\nnode docs/research/icon-replacements/build-review.mjs\n\`\`\`\n\nSVGs are supplied as review artifacts. To re-extract a Material glyph, use the included Python script with the existing fontTools environment and the repository's bundled font; it uses Node's Brotli decoder. Preserve the asset provenance/license files when exporting. Changes to the original audit need a fresh extraction and contextual review rather than assuming stable row numbers remain valid.\n`;
writeFileSync(resolve(out, '../icon-replacements.md'), md);
console.log(
  JSON.stringify(
    {
      cards: data.candidates.length,
      coverageGaps: data.summary.coverageGaps.length,
      htmlBytes: Buffer.byteLength(portable),
      svgBindings: Object.keys(assets).length,
    },
    null,
    2,
  ),
);
