"""Copy the approved Sapere black/white kit into runtime and packaging asset paths.

Run with Python + Pillow after regenerating docs/brand/sapere-logo-kit.
All runtime brand image paths are synchronized; upstream attribution is documented separately.
"""
from pathlib import Path
import shutil
from PIL import Image

root = Path(__file__).resolve().parents[1]
kit = root / 'docs/brand/sapere-logo-kit'
brand = root / 'src/assets/brand'
brand.mkdir(exist_ok=True)
for name in ('sapere-symbol-small.svg', 'sapere-symbol-small-white.svg'):
    shutil.copyfile(kit/'svg'/name, brand/name)
for dest in ('build/icon.png', 'public/logo.png'):
    shutil.copyfile(kit/'png/sapere-app-icon-1024.png', root/dest)
for dest in ('build/icon.ico', 'public/logo.ico', 'public/logo-bg.ico'):
    shutil.copyfile(kit/'icons/sapere-app.ico', root/dest)
for kind, source in [('light', 'sapere-symbol-color-1024.png'), ('dark', 'sapere-symbol-white-1024.png')]:
    for folder in ('public', 'build/installer-assets', 'src/assets'):
        shutil.copyfile(kit/'png'/source, root/folder/f'logo-{kind}.png')
shutil.copyfile(kit/'icons/web/favicon.svg', root/'public/favicon.svg')
with Image.open(kit/'png/sapere-app-icon-1024.png') as image:
    image.resize((240, 240), Image.Resampling.LANCZOS).save(root/'public/logo_240x240.png')
print('Synced Sapere runtime, favicon, installer and packaging assets.')
