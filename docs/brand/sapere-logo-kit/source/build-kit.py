"""Build Sapere identity SVG masters. Requires fontTools; see README in source/."""
from pathlib import Path
import argparse
import html
import json
import shutil
import sys
import re

parser = argparse.ArgumentParser()
parser.add_argument('--font-dir', type=Path, required=True)
parser.add_argument('--fonttools-dir', type=Path)
args = parser.parse_args()
if args.fonttools_dir:
    sys.path.insert(0, str(args.fonttools_dir))
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[1]
for directory in ('svg', 'png', 'icons', 'presentation', 'licenses'):
    (ROOT / directory).mkdir(exist_ok=True)
GREEN, INK, PAPER = '#151918', '#151918', '#FFFFFF'
REGULAR = 'M32 64C68 64 96 80 112 112V224C88 200 64 192 32 192ZM144 96C160 64 188 40 224 32V160C188 168 160 192 144 224Z'
SMALL = 'M32 64C68 64 94 80 108 112V220C86 200 62 192 32 192ZM148 96C164 64 190 40 224 32V160C190 168 164 192 148 220Z'
REVERSE = 'M34 66C68 66 94 82 110 113V220C87 199 63 191 34 190ZM146 97C162 66 189 43 222 35V159C188 168 162 191 146 220Z'

def mark(path=REGULAR, color=GREEN):
    return f'<path fill="{color}" d="{path}"/>'

def svg(name, body, width=256, height=256):
    title = 'Sapere · 致知 — ' + name
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-label="{html.escape(title)}"><title>{html.escape(title)}</title>{body}</svg>\n'

def save(name, body, width=256, height=256):
    (ROOT / 'svg' / (name + '.svg')).write_text(svg(name, body, width, height), encoding='utf-8')

latin = instantiateVariableFont(TTFont(args.font_dir / 'NotoSansSC.ttf'), {'wght': 600}, inplace=False)
chinese = instantiateVariableFont(TTFont(args.font_dir / 'NotoSansSC.ttf'), {'wght': 500}, inplace=False)

def outline(font, text, size, x, baseline, color, tracking=0):
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    factor = size / font['head'].unitsPerEm
    paths, cursor = [], x
    bounds = []
    for char in text:
        glyph = glyphs[cmap[ord(char)]]
        pen = SVGPathPen(glyphs)
        transform = (factor, 0, 0, -factor, cursor, baseline)
        glyph.draw(TransformPen(pen, transform))
        bp = BoundsPen(glyphs)
        glyph.draw(TransformPen(bp, transform))
        if bp.bounds:
            bounds.append(bp.bounds)
        commands = re.sub(r'-?\d+\.\d+', lambda m: format(float(m.group()), '.2f').rstrip('0').rstrip('.'), pen.getCommands())
        paths.append(f'<path fill="{color}" d="{commands}"/>')
        cursor += glyph.width * factor + tracking
    return ''.join(paths), cursor - x - tracking, bounds

# Measure and apply pair spacing only to the fixed brand spelling, preserving familiar letters.
def word(color, x=0, baseline=0, size=120):
    return outline(latin, 'Sapere', size, x, baseline, color, tracking=-0.7 * size / 120)[0]

for version, color in [('color', GREEN), ('black', '#000000'), ('white', '#FFFFFF'), ('ink', INK)]:
    path = REVERSE if version == 'white' else REGULAR
    save('sapere-symbol-' + version, mark(path, color))
    save('sapere-wordmark-' + version, word(color, 24, 169, 160), 600, 256)
    # English-only combination: symbol has ~1.7x cap height, plenty of text aperture.
    horizontal = f'<g transform="translate(8 0)">{mark(path, color)}</g>' + word(color, 288, 161, 128)
    save('sapere-horizontal-' + version, horizontal, 760, 256)
    bilingual = f'<g transform="translate(8 0)">{mark(path, color)}</g>' + word(color, 288, 135, 112)
    bilingual += outline(chinese, '致知', 36, 292, 198, color, tracking=10)[0]
    save('sapere-bilingual-' + version, bilingual, 720, 256)
    stacked = f'<g transform="translate(192 0)">{mark(path, color)}</g>' + word(color, 133, 363, 112)
    stacked += outline(chinese, '致知', 32, 278, 418, color, tracking=12)[0]
    save('sapere-stacked-' + version, stacked, 640, 480)
    chinese_only = mark(path, color) + outline(chinese, '致知', 116, 292, 169, color, tracking=16)[0]
    save('sapere-chinese-' + version, chinese_only, 580, 256)

save('sapere-symbol-small', mark(SMALL))
save('sapere-symbol-small-white', mark(SMALL, '#FFFFFF'))
# Container symbol uses the small cut; 65% tile footprint and optical nudge upward.
app = f'<rect x="8" y="8" width="240" height="240" rx="54" fill="{GREEN}"/>'
app += f'<g transform="translate(17 13) scale(0.87)">{mark(SMALL, PAPER)}</g>'
save('sapere-app-icon', app)
mask = f'<rect width="256" height="256" fill="{GREEN}"/><g transform="translate(43 40) scale(0.66)">{mark(SMALL, PAPER)}</g>'
save('sapere-maskable', mask)
for name in ('NotoSansSC-OFL.txt',):
    shutil.copyfile(args.font_dir / name, ROOT / 'licenses' / name)

palette = {'primary': GREEN, 'black': '#000000', 'white': '#FFFFFF', 'surface': '#F5F5F5'}
(ROOT / 'palette.json').write_text(json.dumps(palette, indent=2) + '\n', encoding='utf-8')

# A shareable identity board. Text here is explanatory, masters above contain only outlined glyphs.
parts = ['<rect width="1600" height="1120" fill="#F5F5F5"/>']
def text(x, y, value, size=22, color=INK, weight=400):
    return f'<text x="{x}" y="{y}" font-family="Segoe UI,Microsoft YaHei,sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}">{html.escape(value)}</text>'
parts += [text(64, 62, 'SAPERE AUDE · 敢于求知', 16), text(64, 113, 'Sapere · 致知 / 启页', 34, weight=600), text(64, 151, '黑白标志套件 · 01 / 2026.11', 18)]
parts += ['<rect x="64" y="190" width="942" height="360" rx="20" fill="#FFFFFF"/>']
parts += [f'<g transform="translate(110 235) scale(1.12)"><g transform="translate(8 0)">{mark()}</g>{word(GREEN,288,135,112)}{outline(chinese,"致知",36,292,198,GREEN,tracking=10)[0]}</g>']
parts += [f'<rect x="1030" y="190" width="506" height="360" rx="20" fill="{INK}"/>', f'<g transform="translate(1167 242) scale(0.92)">{mark(REVERSE,PAPER)}</g>', text(1060,520,'深色背景 · 反白版',16,PAPER)]
parts += [f'<rect x="64" y="574" width="456" height="340" rx="20" fill="{GREEN}"/>',f'<g transform="translate(172 602) scale(0.94)">{mark(SMALL,PAPER)}</g>',text(92,880,'应用图标 / 小尺寸专用图形',17,PAPER)]
parts += ['<rect x="544" y="574" width="462" height="340" rx="20" fill="#FFFFFF"/>',text(574,617,'真实尺寸 · 图形轮廓',19)]
for x, size in [(582,64),(702,32),(796,24),(878,16)]:
    parts += [f'<g transform="translate({x} {740-size}) scale({size/256})">{mark(SMALL)}</g>',text(x,777,str(size)+' px',15)]
parts += [text(574,861,'16–24 px 使用 small；图形中缝加宽。',17)]
parts += ['<rect x="1030" y="574" width="506" height="340" rx="20" fill="#FFFFFF"/>',text(1060,617,'品牌配色',19)]
for i,(label,color) in enumerate([('主黑',GREEN),('纯黑','#000000'),('白色',PAPER),('浅灰','#F5F5F5')]):
    xx=1060+i*115
    parts += [f'<rect x="{xx}" y="650" width="92" height="98" rx="9" fill="{color}"/>',text(xx,784,label,17),text(xx,814,color,14)]
parts += [text(64,977,'向未知，再翻一页。',32,weight=600),text(64,1020,'不等高的两页与向上展开的曲线，保留阅读的安静，也留下继续求知的空间。',21),text(64,1074,'矢量母版已转曲 · 横竖组合 / 中英组合 / 单色反白 / PNG / Windows ICO / Web 图标',17)]
(ROOT/'presentation'/'sapere-identity.svg').write_text(svg('品牌展示板',''.join(parts),1600,1120),encoding='utf-8')
print('Built SVG masters, palette, licenses and identity board:', ROOT)
