"""Validate delivered image dimensions, real ICO frames, SVG outlines and sRGB contrast."""
from pathlib import Path
import json
import math
import struct
import xml.etree.ElementTree as ET
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
errors, pngs, svgs = [], [], []
for path in sorted((root/'svg').glob('*.svg')):
    tree = ET.parse(path).getroot()
    tags = [node.tag.split('}')[-1] for node in tree.iter()]
    bad = sorted(set(tags) & {'text','image','filter','mask','clipPath'})
    vb = list(map(float, tree.get('viewBox').split()))
    item = {'file':str(path.relative_to(root)), 'viewBox':vb, 'forbidden_elements':bad}
    if bad:
        errors.append(f'{path.name}: unexpected elements {bad}')
    if tree.find('{http://www.w3.org/2000/svg}title') is None:
        errors.append(f'{path.name}: missing accessible title')
    allowed={'#151918','#000000','#ffffff'}
    paints={node.get('fill').lower() for node in tree.iter() if node.get('fill')}
    if paints-allowed:
        errors.append(f'{path.name}: non-monochrome paint {paints-allowed}')
    svgs.append(item)
for folder in ('png','icons'):
    for path in sorted((root/folder).rglob('*.png')):
        with Image.open(path) as im:
            im.load()
            alpha = im.getchannel('A').getextrema() if 'A' in im.getbands() else None
            # Ignore invisible RGB noise introduced by transparent-edge unpremultiplication.
            rgb=Image.new('RGBA',im.size,(255,255,255,255))
            rgb.alpha_composite(im.convert('RGBA'))
            rgb=rgb.convert('RGB')
            r,g,b=rgb.split()
            spread=max(ImageChops.difference(r,g).getextrema()[1],ImageChops.difference(r,b).getextrema()[1],ImageChops.difference(g,b).getextrema()[1])
            if spread>5:
                errors.append(f'{path.name}: unexpected colored pixels, channel difference {spread}')
            item = {'file':str(path.relative_to(root)), 'size':list(im.size), 'mode':im.mode, 'alpha_range':alpha, 'max_rgb_channel_difference':spread}
            if folder == 'png':
                expected_width = int(path.stem.rsplit('-',1)[1])
                master = root/'svg'/(path.stem.rsplit('-',1)[0]+'.svg')
                vb = list(map(float,ET.parse(master).getroot().get('viewBox').split()))
                expected = (expected_width,round(expected_width*vb[3]/vb[2]))
                if im.size != expected:
                    errors.append(f'{path.name}: incorrect dimensions {im.size} != {expected}')
                if alpha is None or alpha[0] != 0:
                    errors.append(f'{path.name}: transparent exterior missing')
            pngs.append(item)
icos=[]
for path in [root/'icons/sapere-app.ico',root/'icons/web/favicon.ico']:
    data=path.read_bytes()
    reserved,kind,count=struct.unpack_from('<HHH',data)
    frames=[]
    if reserved!=0 or kind!=1:
        errors.append(f'{path.name}: invalid ICO header')
    for i in range(count):
        w,h,_,_,planes,bpp,length,offset=struct.unpack_from('<BBBBHHII',data,6+16*i)
        w,h=w or 256,h or 256
        if offset+length>len(data):
            errors.append(f'{path.name}: invalid frame offset')
        frames.append([w,h])
    expected=[16,24,32,48,64,128,256] if path.name=='sapere-app.ico' else [16,32,48]
    if frames != [[s,s] for s in expected]:
        errors.append(f'{path.name}: unexpected frames {frames}')
    icos.append({'file':str(path.relative_to(root)),'frames':frames})

def luminance(color):
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    linear=[v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4 for v in rgb]
    return sum(a*b for a,b in zip(linear,[0.2126,0.7152,0.0722]))
def ratio(a,b):
    aa,bb=sorted([luminance(a),luminance(b)])
    return round((bb+0.05)/(aa+0.05),2)
pairs=[('#151918','#FFFFFF'),('#000000','#FFFFFF'),('#FFFFFF','#151918'),('#151918','#F5F5F5')]
contrast=[{'foreground':a,'background':b,'ratio':ratio(a,b)} for a,b in pairs]
for pair in contrast:
    if pair['ratio']<4.5:
        errors.append(f'Palette contrast too low: {pair}')
manifest=json.loads((root/'icons/web/site.webmanifest').read_text(encoding='utf-8'))
for icon in manifest['icons']:
    if not (root/'icons/web'/icon['src'].lstrip('/')).is_file():
        errors.append('Missing manifest icon '+icon['src'])
report={'passed':not errors,'errors':errors,'svg_masters':svgs,'png_files':pngs,'ico_files':icos,'contrast':contrast,'notes':['Structural checks do not prove trademark clearance.','Outlined Latin and Chinese glyphs retain their typeface geometry; SVG audit complexity and angle warnings are reviewed, not claimed as perfect scores.','Physical print and installed application integration are not tested.']}
(root/'validation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'passed':not errors,'svg_count':len(svgs),'png_count':len(pngs),'ico_files':icos,'contrast':contrast,'errors':errors},ensure_ascii=False,indent=2))
if errors:
    raise SystemExit(1)
