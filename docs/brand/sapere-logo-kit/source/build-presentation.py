"""Create a neutral, monochrome presentation using logo-design's presentation tool."""
import argparse
from pathlib import Path
import re
import runpy
import sys
import tempfile
parser=argparse.ArgumentParser()
parser.add_argument('--skill-dir',required=True,type=Path)
a=parser.parse_args()
root=Path(__file__).resolve().parents[1]
sys.dont_write_bytecode=True
sys.path.insert(0,str(a.skill_dir/'scripts'))
import render_png
out=root/'presentation/mockups.html'
sys.argv=['presentation_board.py',str(root/'presentation/spec.json'),'-o',str(out)]
runpy.run_path(str(a.skill_dir/'scripts/presentation_board.py'),run_name='__main__')
raw=out.read_text(encoding='utf-8').replace('https://sapere.com','https://sapere.example').replace('@sapere ·','示例账号 ·')
raw=raw.replace('</style>','.mock{filter:grayscale(1)}</style>')
out.write_text(raw,encoding='utf-8')
css=re.search(r'<style>(.*?)</style>',raw,re.S).group(1)
slides=re.findall(r'<section class="slide">.*?</section>',raw,re.S)
for i,slide in enumerate(slides,1):
    with tempfile.NamedTemporaryFile(mode='w',suffix='.html',encoding='utf-8',delete=False) as f:
        f.write('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>'+css+'body{background:#fff}.slide{margin:0;box-shadow:none;min-height:800px}</style></head><body>'+slide+'</body></html>')
        tmp=Path(f.name)
    try:
        dst=root/'presentation/slides'/f'slide-{i:02}.png'
        dst.parent.mkdir(exist_ok=True)
        render_png.screenshot_html(str(tmp),str(dst),1280,800)
        print('Rendered',dst.name,flush=True)
    finally:
        tmp.unlink()
