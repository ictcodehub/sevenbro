"""Generate Seven Bro! app icons — '7B' monogram on the NL Discovery forest palette.

Replaces the nl-starter placeholder PNGs in public/:
  icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png, brand-logo.png
"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public"))

FOREST = (20, 77, 54)     # #144d36  --color-forest
LIME = (163, 230, 53)     # #a3e635  --color-lime
WHITE = (248, 250, 248)   # #f8faf8  --primary-foreground


def load_font(px: int):
    for path in ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"):
        try:
            return ImageFont.truetype(path, px)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_text(img: Image.Image, text: str, size: int, fill, scale: float):
    d = ImageDraw.Draw(img)
    f = load_font(int(size * scale))
    b = d.textbbox((0, 0), text, font=f)
    w, h = b[2] - b[0], b[3] - b[1]
    d.text(((size - w) / 2 - b[0], (size - h) / 2 - b[1]), text, font=f, fill=fill)


def full_bleed(name: str, size: int, scale: float = 0.42):
    """Manifest / touch icon — full-bleed forest square, white 7B."""
    img = Image.new("RGB", (size, size), FOREST)
    draw_text(img, "7B", size, WHITE, scale)
    img.save(os.path.join(ROOT, name))


def maskable(name: str, size: int):
    """Maskable icon — content inside the 80% safe-zone circle (scale down)."""
    full_bleed(name, size, scale=0.30)


def brand_logo(name: str, size: int = 512):
    """Header logo — forest rounded square (transparent corners), lime 7B."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = int(size * 0.225)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=FOREST + (255,))
    draw_text(img, "7B", size, LIME, 0.42)
    img.save(os.path.join(ROOT, name))


if __name__ == "__main__":
    os.makedirs(ROOT, exist_ok=True)
    full_bleed("icon-192.png", 192)
    full_bleed("icon-512.png", 512)
    maskable("icon-maskable-512.png", 512)
    full_bleed("apple-touch-icon.png", 180)
    brand_logo("brand-logo.png")
    for f in ("icon-192.png", "icon-512.png", "icon-maskable-512.png",
              "apple-touch-icon.png", "brand-logo.png"):
        p = os.path.join(ROOT, f)
        print(f"{f}: {Image.open(p).size} {os.path.getsize(p)} bytes")
    print("icons generated ok")
