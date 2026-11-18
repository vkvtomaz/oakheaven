#!/usr/bin/env python3
"""Inventaria imagens do projeto sem alterar originais. Contact sheets: Pillow opcional."""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import struct
from pathlib import Path

EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'}
SKIP = {'node_modules', '.git', '.venv', 'dist', 'build', '.next', 'coverage'}


def basic_png_size(path: Path):
    try:
        with path.open('rb') as file:
            header = file.read(24)
        if header[:8] == b'\x89PNG\r\n\x1a\n' and header[12:16] == b'IHDR':
            return struct.unpack('>II', header[16:24])
    except Exception:
        pass
    return None, None


def find_image_directories(root: Path):
    """Walk sem entrar em node_modules, .git e diretórios de build."""
    directories = []
    for folder, subfolders, _files in os.walk(root):
        subfolders[:] = [name for name in subfolders if name.lower() not in SKIP]
        current = Path(folder)
        if current != root and current.name.lower() in (
            'img', 'images', 'image', 'sprites', 'assets', 'textures'
        ):
            directories.append(current)
            # Uma pasta img já será analisada em profundidade mais tarde.
            subfolders[:] = []
    directories.sort(key=lambda p: (len(p.parts), str(p).lower()))
    return directories


def collect(root: Path):
    dirs = find_image_directories(root)
    if not dirs:
        print('Nenhuma pasta img/images/assets encontrada. Procure manualmente no projeto.')
        return []
    seen = set()
    files = []
    for directory in dirs:
        for file in directory.rglob('*'):
            if not file.is_file() or file.suffix.lower() not in EXTENSIONS:
                continue
            relative = file.relative_to(root)
            if any(part.lower() in SKIP for part in relative.parts):
                continue
            if relative in seen:
                continue
            seen.add(relative)
            files.append(file)
    return sorted(files, key=lambda p: str(p.relative_to(root)).casefold())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--output', type=Path, default=Path('docs/visual'))
    parser.add_argument('--max-sheets', type=int, default=12,
                        help='Limita número de folhas para não sobrecarregar.')
    args = parser.parse_args()
    root = args.root.resolve()
    out = args.output if args.output.is_absolute() else root / args.output
    out.mkdir(parents=True, exist_ok=True)

    try:
        from PIL import Image, ImageOps, ImageDraw, ImageFont
    except ImportError:
        Image = None

    images = collect(root)
    entries = []
    for file in images:
        width, height, mode = None, None, ''
        if Image is not None and file.suffix.lower() != '.svg':
            try:
                with Image.open(file) as im:
                    width, height, mode = im.width, im.height, im.mode
            except Exception:
                pass
        elif file.suffix.lower() == '.png':
            width, height = basic_png_size(file)
        entries.append({
            'path': file.relative_to(root).as_posix(),
            'extension': file.suffix.lower(),
            'width': width or '',
            'height': height or '',
            'mode': mode,
            'bytes': file.stat().st_size,
            'assessment': 'NEEDS_VISUAL_REVIEW',
            'intended_use': '',
        })

    (out / 'asset-inventory.json').write_text(
        json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
    with (out / 'asset-inventory.csv').open('w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=list(entries[0].keys()) if entries else
                                ['path', 'extension', 'width', 'height', 'mode', 'bytes',
                                 'assessment', 'intended_use'])
        writer.writeheader()
        writer.writerows(entries)
    print(f'Inventariadas {len(entries)} imagens. Arquivos: {out / "asset-inventory.csv"}')

    if Image is None:
        print('Pillow ausente: não foram criadas contact sheets. CSV/JSON estão completos.')
        return
    per_sheet, cols, tw, th = 20, 4, 240, 190
    maximum = max(0, args.max_sheets) * per_sheet
    count = 0
    for first in range(0, min(len(images), maximum), per_sheet):
        subset = images[first:first + per_sheet]
        sheet = Image.new('RGB', (cols * tw, math.ceil(len(subset) / cols) * th), '#e8e8e8')
        draw = ImageDraw.Draw(sheet)
        for ix, file in enumerate(subset):
            x = (ix % cols) * tw
            y = (ix // cols) * th
            draw.rectangle((x + 5, y + 5, x + tw - 5, y + th - 38), fill='#f9f9f9')
            try:
                if file.suffix.lower() == '.svg':
                    raise ValueError('SVG não renderizado no contact sheet')
                with Image.open(file) as img:
                    img = ImageOps.exif_transpose(img).convert('RGBA')
                    img.thumbnail((tw - 18, th - 50))
                    px = x + (tw - img.width) // 2
                    py = y + (th - 42 - img.height) // 2
                    sheet.paste(img, (px, py), img)
            except Exception:
                draw.text((x + 12, y + 55), 'Sem preview', fill='#444444')
            label = file.relative_to(root).as_posix()
            # Não confundir caption truncada com nome real: CSV tem o caminho integral.
            if len(label) > 36:
                label = '...' + label[-33:]
            draw.text((x + 9, y + th - 30), label, fill='#222222')
        count += 1
        target = out / f'contact-sheet-{count:02d}.jpg'
        sheet.save(target, quality=85)
    print(f'Contact sheets: {count}. Veja também as imagens originais em tamanho completo.')


if __name__ == '__main__':
    main()
