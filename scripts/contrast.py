"""Measure every room background the way room.module.css renders it.

Cover crop at 16:10, the grade, the three-layer scrim. Reports the contrast
of the ink under the title, and the share of the open canvas where bare ink
would fail 4.5:1. docs/CONTRAST.md explains the numbers.

    pip install pillow numpy
    python3 scripts/contrast.py
"""
import glob, os
import numpy as np
from PIL import Image, ImageEnhance

INK = np.array([242, 240, 234]) / 255
GROUND = np.array([6, 6, 10]) / 255
W, H = 1600, 1000  # 16:10 viewport, cover-cropped, centred

def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lum(rgb):  # rgb 0..1, shape (...,3)
    l = srgb_to_lin(rgb)
    return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]

def contrast(l1, l2):
    hi, lo = np.maximum(l1, l2), np.minimum(l1, l2)
    return (hi + 0.05) / (lo + 0.05)

def cover(im):
    iw, ih = im.size
    s = max(W / iw, H / ih)
    im = im.resize((round(iw * s), round(ih * s)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))

def grade(im):
    im = ImageEnhance.Color(im).enhance(0.9)
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im = ImageEnhance.Brightness(im).enhance(0.95)
    return im

def scrim_alpha():
    """Combined alpha of the three gradients, per pixel. Layers composite
    over each other so alphas combine as 1-(1-a)(1-b)(1-c)."""
    ys, xs = np.mgrid[0:H, 0:W]
    fx, fy = xs / W, ys / H
    # radial: ellipse 120% x 90% at 50% 45%; 0 until 52%, .34 at 100%
    r = np.sqrt(((fx - 0.5) / 1.2) ** 2 + ((fy - 0.45) / 0.9) ** 2) / 0.5
    a1 = np.clip((r - 0.52) / 0.48, 0, 1) * 0.34
    # bottom-up: .8 at 0%, .36 at 26%, 0 at 50% (from bottom)
    fb = 1 - fy
    a2 = np.where(fb < 0.26, 0.8 - (0.8 - 0.36) * fb / 0.26,
                  np.where(fb < 0.5, 0.36 * (1 - (fb - 0.26) / 0.24), 0))
    # left-right: .4 at 0%, 0 at 46%
    a3 = np.clip(0.4 * (1 - fx / 0.46), 0, 1)
    return 1 - (1 - a1) * (1 - a2) * (1 - a3)

A = scrim_alpha()

# Title card region: left clamp ~3rem→ x 3%..38%, bottom 5vh → y 74%..96%
TX0, TX1, TY0, TY1 = int(0.03 * W), int(0.38 * W), int(0.74 * H), int(0.96 * H)

rows = []
for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'public', 'journey', '*.webp'))):
    name = f.split('/')[-1][:-5]
    im = grade(cover(Image.open(f).convert('RGB')))
    rgb = np.asarray(im, dtype=float) / 255
    raw = rgb.copy()
    comp = rgb * (1 - A[..., None]) + GROUND * A[..., None]
    reg = (slice(TY0, TY1), slice(TX0, TX1))
    lraw, lcomp = lum(raw[reg]), lum(comp[reg])
    # worst = brightest 10% of the region (where thin strokes fail first)
    need = (lum(INK) + 0.05) / 4.5 - 0.05
    L = lum(comp)
    tiles = np.array([np.percentile(L[ty*H//4:(ty+1)*H//4, tx*W//4:(tx+1)*W//4], 90)
                      for ty in range(4) for tx in range(4)])
    rows.append(dict(
        canvas_fail=float((L > need).mean()),
        tile_max=float(tiles.max()),
        room=name,
        whole_mean=float(lum(raw).mean()),
        title_raw_mean=float(lraw.mean()),
        title_raw_p90=float(np.percentile(lraw, 90)),
        title_scrim_mean=float(lcomp.mean()),
        title_scrim_p90=float(np.percentile(lcomp, 90)),
        c_raw_p90=float(contrast(lum(INK), np.percentile(lraw, 90))),
        c_scrim_p90=float(contrast(lum(INK), np.percentile(lcomp, 90))),
        c_scrim_mean=float(contrast(lum(INK), lcomp.mean())),
    ))

rows.sort(key=lambda r: r['c_scrim_p90'])
print(f"{'room':26} {'title':>7} {'canvas fail':>12} {'tile max':>9}")
for r in rows:
    print(f"{r['room']:26} {r['c_scrim_p90']:6.1f}:1 {r['canvas_fail']*100:11.1f}% {r['tile_max']:9.2f}")
print(f"\nworst title {min(r['c_scrim_p90'] for r in rows):.1f}:1   "
      f"brightest card tile {max(r['tile_max'] for r in rows):.2f}   (doc assumes 0.60)")
