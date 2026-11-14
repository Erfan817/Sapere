"""Export kit PNGs and a Windows multi-resolution ICO using the installed logo-design skill."""
import argparse
from pathlib import Path
import sys
parser = argparse.ArgumentParser()
parser.add_argument('--skill-dir', required=True, type=Path)
args = parser.parse_args()
sys.dont_write_bytecode = True
sys.path.insert(0, str(args.skill_dir / 'scripts'))
import render_png
root = Path(__file__).resolve().parents[1]
jobs = []
for name, sizes in {
    'sapere-symbol-color': [512, 1024, 2048],
    'sapere-symbol-white': [512, 1024],
    'sapere-horizontal-color': [1600],
    'sapere-bilingual-color': [1600],
    'sapere-stacked-color': [1024],
    'sapere-wordmark-color': [1200],
    'sapere-chinese-color': [1200],
    'sapere-bilingual-white': [1600],
    'sapere-app-icon': [256, 512, 1024],
}.items():
    import xml.etree.ElementTree as ET
    src = root / 'svg' / (name + '.svg')
    vb = list(map(float, ET.parse(src).getroot().get('viewBox').split()))
    for size in sizes:
        dst = root / 'png' / f'{name}-{size}.png'
        jobs.append((src, dst, size, round(size * vb[3] / vb[2])))
for size in [16, 24, 32, 48, 64, 128, 256]:
    jobs.append((root/'svg/sapere-app-icon.svg',root/'icons'/f'sapere-app-{size}.png',size,size))
for src, dst, w, h in jobs:
    if not render_png.render(str(src),str(dst),w,h):
        raise RuntimeError(f'Render failed: {dst}')
    print('Rendered',dst.name,flush=True)
render_png.write_ico([str(root/'icons'/f'sapere-app-{size}.png') for size in [16,24,32,48,64,128,256]], str(root/'icons/sapere-app.ico'))
print('Created Windows ICO: 16/24/32/48/64/128/256 px',flush=True)
