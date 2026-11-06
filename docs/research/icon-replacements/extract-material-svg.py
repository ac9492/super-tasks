#!/usr/bin/env python3
"""Extract the bundled Material Symbols Outlined (FILL=0) to exact SVG candidates.

Usage: python extract-material-svg.py [repo] [output] [symbol ...]
No downloads or root dependencies; requires existing fontTools. The Node Brotli
adapter avoids installing a Python Brotli package in this managed environment.
"""
from pathlib import Path
import sys,json,subprocess,types,hashlib
from fontTools.ttLib import TTFont,woff2
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
repo=Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/ultra-tasks').resolve()
out=Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/icon-material-svg').resolve()
out.mkdir(parents=True,exist_ok=True)
woff2.haveBrotli=True
woff2.brotli=types.SimpleNamespace(decompress=lambda b:subprocess.run(['node','-e',"let b=[];process.stdin.on('data',x=>b.push(x));process.stdin.on('end',()=>process.stdout.write(require('zlib').brotliDecompressSync(Buffer.concat(b))));"],input=b,stdout=subprocess.PIPE,check=True).stdout)
font_path=repo/'src/assets/fonts/material-symbols-outlined.woff2'
f=TTFont(font_path)
reverse={glyph:chr(cp) for cp,glyph in f.getBestCmap().items() if cp<128}
ligatures={}
for lookup in f['GSUB'].table.LookupList.Lookup:
 for st in lookup.SubTable:
  if hasattr(st,'ExtSubTable'):st=st.ExtSubTable
  for first,ls in getattr(st,'ligatures',{}).items():
   for lig in ls:
    parts=[first]+lig.Component
    if all(p in reverse for p in parts):ligatures[''.join(reverse[p] for p in parts)]=lig.LigGlyph
requested=sys.argv[3:] or sorted(ligatures)
axes={'FILL':0,'wght':400,'GRAD':0,'opsz':24}
active_axes={a.axisTag:axes.get(a.axisTag,a.defaultValue) for a in f['fvar'].axes} if 'fvar' in f else {}
# This bundled font has only a FILL axis; fixed weight/grade/optical geometry
# comes from the font-400 outlined artifact already used by the application.
glyphs=f.getGlyphSet(location=active_axes)
upm=f['head'].unitsPerEm
scale=24/upm
items=[]
for name in requested:
 if name not in ligatures:raise SystemExit('Unsupported symbol: '+name)
 glyph=ligatures[name]
 pen=SVGPathPen(glyphs)
 glyphs[glyph].draw(TransformPen(pen,(scale,0,0,-scale,0,24)))
 path=pen.getCommands()
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="{path}"/></svg>\n'
 target=out/(name+'.svg');target.write_text(svg)
 items.append({'name':name,'glyph':glyph,'path':str(target),'family':'Material Symbols Outlined','FILL':0,'weight':400,'source':'src/assets/fonts/material-symbols-outlined.woff2','license':'Apache-2.0'})
manifest={'source_sha256':hashlib.sha256(font_path.read_bytes()).hexdigest(),'units_per_em':upm,'requested_axes':axes,'font_variable_axes':active_axes,'fixed_geometry':'weight 400 outlined font artifact; GRAD=0 / opsz=24 UI default','count':len(items),'symbols':items}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(out/'LICENSE.material-symbols.txt').write_text((repo/'node_modules/@material-symbols/font-400/LICENSE').read_text())
print(json.dumps({'count':len(items),'output':str(out),'active_axes':active_axes,'source_sha256':manifest['source_sha256']}))
