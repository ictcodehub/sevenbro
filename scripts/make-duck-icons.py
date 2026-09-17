from PIL import Image
from pathlib import Path

src = Path(r"C:\Users\HeyTAYO\Downloads\pixel-duck.png")
out = Path(r"D:\Workspace\sevenbro\public")

im = Image.open(src).convert("RGBA")

# Crop to content (transparent bounds) then pad square
bbox = im.getbbox()
if bbox:
    im = im.crop(bbox)

w, h = im.size
side = max(w, h)
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)

def resize(size: int, pad_ratio: float = 0.0, bg=None) -> Image.Image:
    """pad_ratio 0 = full bleed; 0.1 = 10% padding each side (safe zone)."""
    if bg is None:
        bg = (0, 0, 0, 0)
    if pad_ratio <= 0:
        return canvas.resize((size, size), Image.Resampling.LANCZOS)
    inner = int(size * (1 - 2 * pad_ratio))
    art = canvas.resize((inner, inner), Image.Resampling.LANCZOS)
    base = Image.new("RGBA", (size, size), bg)
    base.paste(art, ((size - inner) // 2, (size - inner) // 2), art)
    return base

# Homescreen / PWA icons — full art, slight pad so OS chrome doesn't clip
resize(192, pad_ratio=0.05).save(out / "icon-192.png", optimize=True)
resize(512, pad_ratio=0.05).save(out / "icon-512.png", optimize=True)

# Maskable: larger safe zone (Android adaptive)
mask = resize(512, pad_ratio=0.18, bg=(20, 77, 54, 255))  # forest #144D36
mask.save(out / "icon-maskable-512.png", optimize=True)

# Apple touch: opaque, no transparency
apple = resize(180, pad_ratio=0.08, bg=(255, 255, 255, 255))
apple.save(out / "apple-touch-icon.png", optimize=True)

# In-app brand logo (header) — keep transparent, moderate size
resize(256, pad_ratio=0.04).save(out / "brand-logo.png", optimize=True)

# Favicon 32 + 16 as png, also write ICO
resize(32, pad_ratio=0.02).save(out / "favicon-32.png", optimize=True)
ico = resize(32, pad_ratio=0.02)
ico.save(out / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

# Next.js app icon (auto favicon)
app_dir = Path(r"D:\Workspace\sevenbro\src\app")
resize(32, pad_ratio=0.02).save(app_dir / "icon.png", optimize=True)
resize(180, pad_ratio=0.08, bg=(255, 255, 255, 255)).save(app_dir / "apple-icon.png", optimize=True)

print("done")
for p in [
    out / "icon-192.png",
    out / "icon-512.png",
    out / "icon-maskable-512.png",
    out / "apple-touch-icon.png",
    out / "brand-logo.png",
    out / "favicon.ico",
    app_dir / "icon.png",
]:
    print(p.name, p.stat().st_size)
