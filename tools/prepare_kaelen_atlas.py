"""Exact RGBA atlas extraction using Python standard library only."""
from pathlib import Path
import hashlib
import json
import struct
import zlib

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'img/kaelen-animation-source.png'
if not SOURCE.exists():
    SOURCE.write_bytes((ROOT / 'tmp/kaelen-resume-transfer/kaelen-source.png').read_bytes())
data = SOURCE.read_bytes()
assert data[:8] == b'\x89PNG\r\n\x1a\n'
position, compressed = 8, bytearray()
while position < len(data):
    length = struct.unpack_from('>I', data, position)[0]
    kind = data[position+4:position+8]
    payload = data[position+8:position+8+length]
    if kind == b'IHDR':
        width, height, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', payload)
    elif kind == b'IDAT':
        compressed.extend(payload)
    position += 12 + length
assert (width, height, depth, color, interlace) == (1374, 1145, 8, 6, 0)
raw = zlib.decompress(compressed)
stride = width * 4
rows, previous, offset = [], bytearray(stride), 0
for y in range(height):
    mode = raw[offset]
    current = bytearray(raw[offset+1:offset+1+stride])
    offset += stride + 1
    for x in range(stride):
        a = current[x-4] if x >= 4 else 0
        b = previous[x]
        c = previous[x-4] if x >= 4 else 0
        if mode == 1: value = a
        elif mode == 2: value = b
        elif mode == 3: value = (a+b)//2
        elif mode == 4:
            p = a+b-c
            pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
            value = a if pa <= pb and pa <= pc else b if pb <= pc else c
        elif mode == 0: value = 0
        else: raise ValueError('Unknown PNG filter')
        current[x] = (current[x] + value) & 255
    rows.append(current)
    previous = current

# Separate the actual connected sprite silhouettes. The image does not obey a grid.
# Bounds select/crop art only; placement uses explicit foot coordinates, never bbox centers.
from collections import deque
seen = bytearray(width*height)
components = []
for y in range(height):
    for x in range(width):
        initial = y*width+x
        if seen[initial] or rows[y][x*4+3] <= 24:
            continue
        seen[initial] = 1
        queue = deque([(x,y)])
        points = []
        left = right = x
        top = bottom = y
        while queue:
            px,py = queue.popleft()
            points.append((px,py))
            left,right,top,bottom = min(left,px),max(right,px),min(top,py),max(bottom,py)
            for dx,dy in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)):
                xx,yy = px+dx,py+dy
                if 0 <= xx < width and 0 <= yy < height:
                    index = yy*width+xx
                    if not seen[index] and rows[yy][xx*4+3] > 24:
                        seen[index] = 1
                        queue.append((xx,yy))
        if len(points) > 1000:
            components.append({'points':points,'bbox':(left,top,right+1,bottom+1)})
assert len(components) == 30, 'Review source: expected 30 separate character silhouettes'
source_rows = [sorted([c for c in components if low <= c['bbox'][1] < high],key=lambda c:c['bbox'][0])
               for low,high in ((0,240),(240,469),(469,690),(690,920),(920,1145))]
assert all(len(group)==6 for group in source_rows)
# Foot pivots were selected from the boot support in the supplied sheet.
# One Y plane per clip preserves authored bob/leg motion instead of normalizing each frame.
definitions = [
    ('idle',0,[0,1,3,4,5],[144,374,594,810,1032,1252],232,10),
    ('walk',1,[0,1,2,3,4,5],[134,361,586,811,1037,1261],464,5),
    ('attack',2,[1,2,3,4,5],[135,365,590,816,1039,1260],681,2),
    ('hurt',3,[0,1,2,3,4,5],[123,347,568,795,1021,1243],914,2),
]
atlas_width,atlas_height = 1536,1024
output = [bytearray(atlas_width*4) for _ in range(atlas_height)]
clips,diagnostics = {},[]
for output_row,(name,source_row,columns,foot_x,foot_y,ticks) in enumerate(definitions):
    frames = []
    for index,column in enumerate(columns):
        component = source_rows[source_row][column]
        left,top,right,bottom = component['bbox']
        left,top,right,bottom = max(0,left-2),max(0,top-2),min(width,right+2),min(height,bottom+2)
        mask = set(component['points'])
        # Preserve low-alpha antialias pixels immediately adjacent to the selected shape.
        for px,py in component['points']:
            for dx,dy in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)):
                xx,yy = px+dx,py+dy
                if 0<=xx<width and 0<=yy<height and 0<rows[yy][xx*4+3]<=24:
                    mask.add((xx,yy))
        frame_pixels = bytearray(256*256*4)
        for px,py in mask:
            target_x = 128+px-foot_x[column]
            target_y = 240+py-foot_y
            assert 0 <= target_x < 256 and 0 <= target_y < 256, (name,column,'clipped silhouette')
            rgba = rows[py][px*4:px*4+4]
            output[output_row*256+target_y][(index*256+target_x)*4:(index*256+target_x)*4+4] = rgba
            frame_pixels[(target_y*256+target_x)*4:(target_y*256+target_x)*4+4] = rgba
        frames.append({'x':index*256,'y':output_row*256,'width':256,'height':256,'sourceColumn':column,
            'sourceRect':{'x':left,'y':top,'width':right-left,'height':bottom-top},
            'sourcePivot':{'x':foot_x[column],'y':foot_y},'pixelSha256':hashlib.sha256(frame_pixels).hexdigest()})
        diagnostics.append({'clip':name,'sourceColumn':column,'selectedPixels':len(mask),'clippedPixels':0})
    clips[name] = {'frameTicks':ticks,'loop':name in ('idle','walk'),'frames':frames}

def chunk(kind, payload):
    return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff)
encoded = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',atlas_width,atlas_height,8,6,0,0,0))
encoded += chunk(b'IDAT',zlib.compress(b''.join(b'\0'+line for line in output),9))+chunk(b'IEND',b'')
folder = ROOT / 'public/art/kaelen'
folder.mkdir(parents=True,exist_ok=True)
(folder/'kaelen-se.png').write_bytes(encoded)
metadata = {
    'image':'kaelen-se.png','cell':{'width':256,'height':256},'pivot':{'x':128,'y':240},
    'bodyHeight':215,'direction':'SE','source':'img/kaelen-animation-source.png',
    'sourceSha256':hashlib.sha256(data).hexdigest(),
    'preparation':'Connected alpha silhouettes with original antialias fringe; disconnected source VFX/noise omitted. Explicit boot pivots, fixed Y plane per clip, one scale; no per-frame bounding-box centering.',
    'rejected':['idle source column 2: hair clipped by original image edge',
                'attack source column 0: impact crosses into next row','death: not integrated'],
    'limitations':['Single SE direction; no mirroring','Small pose/foot/proportion variation remains',
                   'Colored source edge halos remain; runtime visual review pending'],
    'clips':clips,'cropDiagnostics':diagnostics,
}
(folder/'atlas.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf8')
print(json.dumps({'frames':sum(len(c['frames']) for c in clips.values()),'size':[atlas_width,atlas_height],
                  'transparentPixels':sum(line[x]==0 for line in output for x in range(3,len(line),4)),
                  'clippedPixels':sum(d['clippedPixels'] for d in diagnostics)}))
