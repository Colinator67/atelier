"""Crée les versions WebP des photos du portfolio (à lancer après avoir ajouté des JPG).

Usage : pip install Pillow ; python tools/images.py
Pour chaque public/portfolio/img/nom.jpg : nom.webp (1400 px) et nom-800.webp (vignette).
"""
from pathlib import Path
from PIL import Image, ImageOps

DIR = Path(__file__).resolve().parent.parent / "public" / "portfolio" / "img"
for jpg in sorted(DIR.glob("*.jpg")):
    full, thumb = jpg.with_suffix(".webp"), jpg.with_name(jpg.stem + "-800.webp")
    if full.exists() and thumb.exists() and full.stat().st_mtime >= jpg.stat().st_mtime:
        continue
    im = ImageOps.exif_transpose(Image.open(jpg)).convert("RGB")
    a = im.copy(); a.thumbnail((1400, 1400)); a.save(full, "WEBP", quality=80, method=6)
    b = im.copy(); b.thumbnail((800, 800)); b.save(thumb, "WEBP", quality=78, method=6)
    print("ok", jpg.name)
