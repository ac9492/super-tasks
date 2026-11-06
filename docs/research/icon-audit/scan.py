#!/usr/bin/env python3
"""Static Ultra Tasks icon inventory. No app mutation; regex extraction with explicit runtime gaps."""
import re,json,csv,subprocess,collections,sys
from pathlib import Path
ROOT=Path(sys.argv[1] if len(sys.argv)>1 else str(Path(__file__).resolve().parents[3]))
OUT=Path(sys.argv[2] if len(sys.argv)>2 else '/tmp')
CAT=ROOT/'src/app/ui/material-icons.const.ts'
catalog=set(re.findall(r"'([^']+)'",CAT.read_text()))
registry=(ROOT/'src/app/core/theme/built-in-svg-icons.const.ts').read_text()
svgmap=dict(re.findall(r"\['([^']+)',\s*'([^']+)'\]",registry))
rows={};dynamic={};candidates={}
def scope(p):
 s=str(p)
 if s.startswith('packages/plugin-dev/'):
  name=p.parts[2]
  return 'bundled-plugin-source' if (ROOT/'src/assets/bundled-plugins'/name).is_dir() else 'unbundled-plugin-source'
 if s.startswith('src/assets/bundled-plugins/'):return 'bundled-plugin'
 if s.startswith(('android/','ios/')):return 'native'
 if s.startswith('electron/'):return 'electron'
 return 'app'
def ctx(t,pos):
 ls=t.splitlines();n=t.count('\n',0,pos)
 return re.sub(r'\s+',' ',' '.join(ls[max(0,n-3):n+4])).strip()[:1100]
def add(p,t,pos,icon,reason,family='material',status='static-reference'):
 if not icon or icon in {'true','false','null','undefined'}:return
 # A manifest-relative "icon.svg" is a distinct asset for every plugin.
 # Resolve dev mirrors to the bundled canonical copy when that asset exists.
 if family=='svg' and icon.endswith('.svg') and not icon.startswith('assets/'):
  asset=p.parent/icon
  if not (ROOT/asset).is_file() and str(p).startswith('packages/plugin-dev/'):
   source_asset=Path(*p.parts[:3])/icon
   if (ROOT/source_asset).is_file():asset=source_asset
   elif (ROOT/p.parent/'assets'/icon).is_file():asset=p.parent/'assets'/icon
  if str(p).startswith('packages/plugin-dev/') and len(p.parts)>2:
   bundled=Path('src/assets/bundled-plugins')/p.parts[2]/Path(icon).name
   if (ROOT/bundled).is_file():asset=bundled
  icon=str(asset)
 line=t.count('\n',0,pos)+1;k=(str(p),line,icon,family)
 if k in rows:
  rows[k]['extraction']+='; '+reason if reason not in rows[k]['extraction'] else ''
 else:rows[k]=dict(icon=icon,family=family,path=str(p),line=line,scope=scope(p),status=status,extraction=reason,context=ctx(t,pos))
def dyn(p,t,pos,expr,reason):
 line=t.count('\n',0,pos)+1;key=(str(p),line,expr)
 dynamic[key]=dict(path=str(p),line=line,scope=scope(p),expression=re.sub(r'\s+',' ',expr).strip(),extraction=reason,context=ctx(t,pos))
def literals(s):return [(m.start(),m.group(2)) for m in re.finditer(r"(['\"])([^'\"\n]+)\1",s)]
files=[]
for base in ['src/app','src/styles','electron','android/app/src/main','ios/App','packages/plugin-dev','src/assets/bundled-plugins']:
 for p in (ROOT/base).rglob('*'):
  rel=p.relative_to(ROOT)
  if not p.is_file() or p.suffix not in {'.ts','.html','.scss','.css','.json','.kt','.java','.swift','.xml','.plist','.js'}:continue
  if any(x in p.parts for x in ['node_modules','dist','build','.angular','coverage']):continue
  if any(x in p.parts for x in ['test-fixtures','testing']):continue
  if any(x in p.name for x in ['.spec.','.test.','.d.ts','.min.']):continue
  if p==CAT or p.name in {'package-lock.json','package.json'}:continue
  if str(rel).startswith('src/assets/bundled-plugins/') and p.name!='manifest.json':continue # compiled source mirrors plugin-dev
  if str(rel).startswith('packages/plugin-dev/') and any(x in p.parts for x in ['docs','examples','fixtures']):continue
  files.append((p,rel))
for full,p in sorted(files):
 try:t=full.read_text()
 except UnicodeError:continue
 # HTML comments do not render; preserve offsets/lines.
 t=re.sub(r'<!--.*?-->',lambda m:re.sub(r'[^\n]',' ',m.group()),t,flags=re.S)
 if p.suffix in {'.ts','.js','.scss','.css','.java','.kt','.swift'}:
  t=re.sub(r'/\*.*?\*/',lambda m:re.sub(r'[^\n]',' ',m.group()),t,flags=re.S)
  t=re.sub(r'(?m)^\s*//[^\n]*',lambda m:re.sub(r'[^\n]',' ',m.group()),t)
 # All Angular Material icon elements, including inline TS templates.
 spans=[]
 for m in re.finditer(r'<mat-icon\b([^>]*?)(?:>(.*?)</mat-icon\s*>|/>)',t,re.S):
  spans.append((m.start(),m.end()));attrs=m.group(1);body=(m.group(2) or '').strip()
  for am in re.finditer(r'(\[?(?:svgIcon|fontIcon)\]?)\s*=\s*(["\'])(.*?)\2',attrs,re.S):
   attr,q,expr=am.groups();pos=m.start()+am.start()
   fam='svg' if 'svgIcon' in attr else 'material'
   if attr.startswith('['):
    dyn(p,t,pos,expr,attr+' binding')
    for off,val in literals(expr):
     if val in catalog or val in svgmap:add(p,t,pos,val,'literal in '+attr,fam)
   elif '{{' in expr:dyn(p,t,pos,expr,attr+' interpolation')
   else:add(p,t,pos,expr,attr+' attribute',fam)
  if body:
   if '{{' not in body and '<' not in body and re.fullmatch(r'[\w_-]+',body):add(p,t,m.start(),body,'mat-icon text')
   else:
    dyn(p,t,m.start(),body,'mat-icon body expression')
    for off,val in literals(body):
     if val in catalog or val in svgmap:add(p,t,m.start(),val,'literal in mat-icon expression','svg' if val in svgmap else 'material')
 # class-based Material fonts used by plugins and any app HTML.
 for m in re.finditer(r'<(?:span|i)\b[^>]*class\s*=\s*["\'][^"\']*(?:material-icons|material-symbols)[^"\']*["\'][^>]*>(.*?)</(?:span|i)\s*>',t,re.S):
  val=m.group(1).strip()
  if re.fullmatch(r'[\w_-]+',val):add(p,t,m.start(),val,'Material font class text')
  else:dyn(p,t,m.start(),val,'Material font class expression')
 # Static icon-related object properties / assignments.
 for m in re.finditer(r'\b((?:[A-Za-z_$][\w$]*[iI]con(?:Name|Off|On|Open|Closed|Path)?)|icon|ico|svgIco|svgIcon|fontIcon|titleIcon|iconName|iconPath)["\']?\s*[:=]\s*(["\'])(.*?)\2',t):
  key,q,val=m.groups()
  if key.startswith(('is','has')):continue
  fam='svg' if ('svg' in key.lower() or val in svgmap or val.endswith('.svg')) else ('image' if val.endswith(('.png','.ico','.icns')) else 'material')
  if val in catalog or val in svgmap or val.endswith(('.svg','.png','.ico','.icns')) or any(ord(c)>127 for c in val):
   add(p,t,m.start(),val,'icon property '+key,fam if not any(ord(c)>127 for c in val) else 'emoji')
 # HTML inputs forwarding icon values to wrappers.
 for m in re.finditer(r'(?<![\w])((?:\[)?(?:icon|titleIcon|svgIcon|fontIcon)(?:\])?)\s*=\s*(["\'])(.*?)\2',t,re.S):
  if any(a<=m.start()<b for a,b in spans):continue
  key,q,val=m.groups()
  if key.startswith('[') or '{{' in val:
   dyn(p,t,m.start(),val,'wrapper '+key+' binding')
   for off,v in literals(val):
    if v in catalog or v in svgmap:add(p,t,m.start(),v,'literal in wrapper '+key,'svg' if v in svgmap else 'material')
  elif val in catalog or val in svgmap:add(p,t,m.start(),val,'wrapper '+key+' attribute','svg' if val in svgmap else 'material')
 # Any dynamic icon property assignment not immediately a literal.
 for m in re.finditer(r'\b(icon|ico|svgIco|svgIcon|fontIcon|titleIcon|iconName)["\']?\s*:\s*([^\n,}]+)',t):
  expr=m.group(2).strip()
  if not re.match(r'''["']''',expr) and expr not in {'string','null','undefined','string | null','string | undefined'}:
   dyn(p,t,m.start(),expr,'dynamic property '+m.group(1))
   for off,val in literals(expr):
    if val in catalog or val in svgmap:add(p,t,m.start(),val,'literal in dynamic icon property','svg' if val in svgmap else 'material')
 # All literals in explicit icon constant files (NAV_SECTION_ICON etc.).
 if ('icon' in p.name.lower() and p.name.endswith('.const.ts')):
  for m in re.finditer(r"(['\"])([^'\"\n]+)\1",t):
   val=m.group(2)
   if val in catalog or val in svgmap:add(p,t,m.start(),val,'icon constant','svg' if val in svgmap else 'material','registered-asset' if p.name=='built-in-svg-icons.const.ts' else 'static-reference')
 # Named icon constants/maps in arbitrary source filenames.
 if p.suffix in {'.ts','.js'}:
  for m in re.finditer(r'\b([A-Z_]*(?:ICON|ICO)[A-Z_]*)\s*(?::[^=;]+)?=\s*',t):
   if m.group(1).endswith(('CONFIG','OPTIONS','NAMES')):continue
   start=m.end();tail=t[start:];end=re.search(r';',tail)
   expr=tail[:end.start() if end else 700]
   for off,val in literals(expr):
    if val in catalog or val in svgmap:add(p,t,start+off,val,'named icon constant/map','svg' if val in svgmap else 'material')
  for m in re.finditer(r'\b([A-Za-z_$][\w$]*[iI]con\w*)\s*\([^)]*\)\s*:\s*string(?:\s*\|\s*undefined)?\s*\{',t):
   start=m.end();depth=1;i=start
   while i<len(t) and depth:
    if t[i]=='{':depth+=1
    elif t[i]=='}':depth-=1
    i+=1
   for rm in re.finditer(r'''return\s+(['"])([^'"]+)\1''',t[start:i-1]):
    val=rm.group(2)
    if val in catalog or val in svgmap:add(p,t,start+rm.start(),val,'icon getter return','svg' if val in svgmap else 'material')
 # Doc Mode's offline inline SVG map/call sites use no font.
 if str(p)=='packages/plugin-dev/doc-mode/src/ui/icons.ts':
  for m in re.finditer(r'^\s{2}([a-z_]+):',t,re.M):
   add(p,t,m.start(),m.group(1),'Doc Mode inline SVG map','inline-svg','registered-asset')
 if str(p).startswith('packages/plugin-dev/doc-mode/'):
  for m in re.finditer(r'''iconSvg\(\s*(['"])([^'"]+)\1''',t):
   add(p,t,m.start(),m.group(2),'Doc Mode inline SVG call','inline-svg')
 # Inline geometry is part of the UI icon inventory too.
 if p.suffix in {'.html','.ts'}:
  for m in re.finditer(r'<svg\b',t):
   if 'sanitize-svg' not in str(p):add(p,t,m.start(),p.stem,'inline custom SVG element','custom-svg')
 # Explicit helper/enum paths missed by template matching.
 if str(p)=='src/app/core/drop-paste-input/drop-paste.model.ts':
  for m in re.finditer(r"=\s*'([^']+)'",t):
   if m.group(1) in catalog:add(p,t,m.start(),m.group(1),'DropPasteIcons enum')
 if str(p)=='src/app/features/onboarding/onboarding-hint-steps.const.ts':
  for m in re.finditer(r"icon\(\s*'([^']+)'",t):
   add(p,t,m.start(),m.group(1),'onboarding inline icon helper')
 # CSS ligatures including old info-panel encryption badge.
 if p.suffix in {'.scss','.css'}:
  for m in re.finditer(r'''(?:content\s*:|materialIcon\s*\()\s*(["'])([^"']+)\1''',t):
   if m.group(2) in catalog:add(p,t,m.start(),m.group(2),'CSS Material ligature')
 # Android references, exclude decorative backgrounds from functional icon count.
 if str(p).startswith('android/'):
  for m in re.finditer(r'(?:R\.drawable\.|@drawable/)([\w]+)',t):
   val=m.group(1)
   if val.startswith(('ic_','widget_project_dot')):add(p,t,m.start(),val,'Android drawable reference','android-drawable')
 # Native SF Symbol image names, if present.
 if p.suffix=='.swift':
  for m in re.finditer(r'''systemName:\s*["']([^"']+)["']''',t):add(p,t,m.start(),m.group(1),'SF Symbol image','sf-symbol')
 if p.suffix=='.plist':
  for m in re.finditer(r'<key>UIApplicationShortcutItemIconSymbolName</key>\s*<string>([^<]+)</string>',t):
   add(p,t,m.start(),m.group(1),'iOS shortcut SF Symbol','sf-symbol')
 # Wider candidate set catches getters, return values, and arrays for manual follow-up.
 if p.suffix in {'.ts','.html','.scss','.css','.swift','.kt','.java'}:
  for m in re.finditer(r"(['\"])([^'\"\n]+)\1",t):
   val=m.group(2);line=t.count('\n',0,m.start())+1
   if val not in catalog and val not in svgmap:continue
   if any(str(p)==r['path'] and line==r['line'] and val==r['icon'] for r in rows.values()):continue
   k=(str(p),line,val)
   candidates[k]=dict(icon=val,path=str(p),line=line,scope=scope(p),context=ctx(t,m.start()),status='unverified-literal-candidate')
# Asset registry retains all registered names even unused in template.
for name,asset in svgmap.items():
 m=re.search(r"\['"+re.escape(name)+r"'",registry)
 add(Path('src/app/core/theme/built-in-svg-icons.const.ts'),registry,m.start(),name,'MatIconRegistry asset registration','svg','registered-asset')
# Deterministically write outputs.
OUT.mkdir(parents=True,exist_ok=True)
def write(name,data,fields):
 with (OUT/name).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields,lineterminator="\n");w.writeheader();w.writerows(data)
rs=sorted(rows.values(),key=lambda x:(x['path'],x['line'],x['icon']))
ds=sorted(dynamic.values(),key=lambda x:(x['path'],x['line'],x['expression']))
cs=sorted(candidates.values(),key=lambda x:(x['icon'],x['path'],x['line']))
write('occurrences.csv',rs,['icon','family','path','line','scope','status','extraction','context'])
write('dynamic-bindings.csv',ds,['path','line','scope','expression','extraction','context'])
write('literal-candidates.csv',cs,['icon','path','line','scope','context','status'])
by=collections.defaultdict(list)
for r in rs:by[r['family']+':'+r['icon']].append(r)
summary={'repository':str(ROOT),'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'files_scanned':len(files),'picker_catalog_names':len(catalog),'static_occurrences':len(rs),'distinct_family_icon_pairs':len(by),'dynamic_bindings':len(ds),'unverified_literal_candidates':len(cs),'scope_counts':dict(collections.Counter(r['scope'] for r in rs)),'exclusions':['Tests, generated output, node_modules, catalog options as usages','Bundled JS mirrors: scan plugin-dev source and bundled manifests instead','Arbitrary user-selected symbols/emoji, custom themes, installed third-party plugins are runtime values','Regex-based extraction does not resolve full TypeScript data flow or prove reachability; unverified candidates separate'],'icons':[{'key':k,'icon':v[0]['icon'],'family':v[0]['family'],'count':len(v),'occurrences':v} for k,v in sorted(by.items())]}
(OUT/'inventory.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='icons'},indent=2))
