from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
from pathlib import Path
import random, math

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / "store"
STORE.mkdir(exist_ok=True)
(STORE / "screenshots").mkdir(exist_ok=True)

BONE = (234, 223, 200)
BONE_DIM = (193, 178, 151)
GOLD = (216, 166, 91)
THREAD = (184, 64, 47)
SOOT = (11, 9, 8)

IM = str(ROOT / "tools" / "imfell.ttf")
AL = str(ROOT / "tools" / "alegreya.ttf")


def font(path, size):
    return ImageFont.truetype(path, size)


def vertical_gradient(size, stops):
    """stops: list of (y_fraction, (r,g,b,a)); returns RGBA strip."""
    w, h = size
    img = Image.new("RGBA", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        # find surrounding stops
        lo = stops[0]
        hi = stops[-1]
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                lo, hi = stops[i], stops[i + 1]
                break
        span = max(1e-6, hi[0] - lo[0])
        k = max(0.0, min(1.0, (t - lo[0]) / span))
        c = tuple(int(lo[1][j] + (hi[1][j] - lo[1][j]) * k) for j in range(4))
        for x in range(w):
            px[x, y] = c
    return img


def horizontal_gradient(size, stops):
    w, h = size
    img = Image.new("RGBA", size)
    px = img.load()
    for x in range(w):
        t = x / max(1, w - 1)
        lo, hi = stops[0], stops[-1]
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                lo, hi = stops[i], stops[i + 1]
                break
        span = max(1e-6, hi[0] - lo[0])
        k = max(0.0, min(1.0, (t - lo[0]) / span))
        c = tuple(int(lo[1][j] + (hi[1][j] - lo[1][j]) * k) for j in range(4))
        for y in range(h):
            px[x, y] = c
    return img


def vignette(img, strength=120):
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((-w * 0.15, -h * 0.2, w * 1.15, h * 1.2), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(max(w, h) * 0.18))
    dark = Image.new("RGBA", (w, h), (5, 4, 3, strength))
    dark.putalpha(mask.point(lambda p: int((255 - p) * strength / 255)))
    img.alpha_composite(dark)


def grain(img, amount=7):
    w, h = img.size
    noise = Image.effect_noise((w, h), amount).convert("L")
    layer = Image.new("RGBA", (w, h), (255, 244, 220, 0))
    layer.putalpha(noise.point(lambda p: int(p * 0.12)))
    img.alpha_composite(layer)


def fit(path, size, centering=(0.5, 0.5), blur=0):
    im = Image.open(path).convert("RGB")
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return ImageOps.fit(im, size, method=Image.Resampling.LANCZOS, centering=centering).convert("RGBA")


def text(draw, xy, s, f, fill=BONE, anchor="la", stroke=0, stroke_fill=(0, 0, 0, 0), spacing=4):
    draw.multiline_text(xy, s, font=f, fill=fill, anchor=anchor, spacing=spacing, stroke_width=stroke, stroke_fill=stroke_fill)


def spaced(draw, xy, s, f, fill, spacing=3, anchor="la"):
    """Tiny manual letterspacing for small caps labels."""
    x, y = xy
    if anchor.startswith("m"):
        total = sum(draw.textlength(ch, font=f) + spacing for ch in s) - spacing
        x -= total / 2
    for ch in s:
        draw.text((x, y), ch, font=f, fill=fill, anchor="l" + anchor[1] if anchor[0] == "l" else "l" + anchor[1])
        x += draw.textlength(ch, font=f) + spacing


def thread_line(draw, points, fill=THREAD, width=3, alpha=220):
    # soft glow pass then core
    for w, a in ((width * 5, 22), (width * 2, 55), (width, alpha)):
        draw.line(points, fill=fill + (a,), width=max(1, int(w)), joint="curve")


def stitched_ring(draw, cx, cy, r, color=THREAD, segments=28, gap=0.35, width=3):
    for i in range(segments):
        a0 = 2 * math.pi * i / segments
        a1 = a0 + (2 * math.pi / segments) * (1 - gap)
        box = (cx - r, cy - r, cx + r, cy + r)
        draw.arc(box, math.degrees(a0), math.degrees(a1), fill=color + (210,), width=width)


# ---------------------------------------------------------------- icon
wren = ROOT / "src" / "assets" / "portraits" / "wren.jpg"
icon = fit(wren, (800, 800), centering=(0.5, 0.46))
vignette(icon, 150)
icon.alpha_composite(vertical_gradient((800, 800), [(0.0, (8, 6, 5, 0)), (0.64, (8, 6, 5, 0)), (1.0, (8, 6, 5, 205))]))
d = ImageDraw.Draw(icon)
stitched_ring(d, 400, 400, 358, THREAD, segments=34, gap=0.32, width=2)
# tiny lantern spark
d.ellipse((545, 570, 560, 585), fill=(240, 196, 120, 120))
icon.alpha_composite(vertical_gradient((800, 800), [(0.0, (0, 0, 0, 40)), (0.18, (0, 0, 0, 0)), (1.0, (0, 0, 0, 70))]))
grain(icon, 7)
icon.convert("RGB").save(STORE / "icon-800.png", optimize=True)
icon.convert("RGB").save(STORE / "icon-800.jpg", quality=94, optimize=True)

# ---------------------------------------------------------------- square cover (title art crop)
title = ROOT / "src" / "assets" / "title-key.jpg"
sq = fit(title, (800, 800), centering=(0.79, 0.5))
vignette(sq, 135)
sq.alpha_composite(horizontal_gradient((800, 800), [(0.0, (8, 6, 5, 240)), (0.42, (8, 6, 5, 175)), (0.75, (8, 6, 5, 20)), (1.0, (8, 6, 5, 55))]))
sq.alpha_composite(vertical_gradient((800, 800), [(0.0, (8, 6, 5, 70)), (0.35, (8, 6, 5, 0)), (1.0, (8, 6, 5, 180))]))
d = ImageDraw.Draw(sq)
spaced(d, (62, 70), "A HAND-INKED ROGUELIKE", font(AL, 15), GOLD, 3)
text(d, (58, 112), "BOUND", font(IM, 112), BONE, spacing=0)
text(d, (58, 220), "BELOW", font(IM, 112), BONE, spacing=0)
d.line((64, 352, 300, 352), fill=THREAD + (210,), width=3)
text(d, (64, 382), "Five chapters.\nOne red thread.", font(AL, 25), BONE_DIM, spacing=8)
text(d, (64, 690), "60 RELICS  ·  5 KEEPERS  ·  4 CHILDREN", font(AL, 14), BONE_DIM)
d.rectangle((0, 0, 799, 799), outline=(216, 166, 91, 90), width=2)
grain(sq, 6)
sq.convert("RGB").save(STORE / "cover-square-800.jpg", quality=93, optimize=True)

# ---------------------------------------------------------------- landscape cover
land = fit(title, (1920, 1080), centering=(0.5, 0.5))
vignette(land, 150)
land.alpha_composite(horizontal_gradient((1920, 1080), [(0.0, (8, 6, 5, 245)), (0.38, (8, 6, 5, 210)), (0.62, (8, 6, 5, 45)), (1.0, (8, 6, 5, 30))]))
land.alpha_composite(vertical_gradient((1920, 1080), [(0.0, (8, 6, 5, 65)), (0.45, (8, 6, 5, 0)), (1.0, (8, 6, 5, 160))]))
d = ImageDraw.Draw(land)
spaced(d, (122, 110), "A HAND-INKED ROGUELIKE DESCENT", font(AL, 20), GOLD, 5)
text(d, (112, 188), "BOUND", font(IM, 190), BONE)
text(d, (112, 368), "BELOW", font(IM, 190), BONE)
d.line((124, 590, 610, 590), fill=THREAD + (220,), width=4)
text(d, (124, 628), "Five chapters. One red thread.\nThe house remembers every descent.", font(AL, 34), BONE_DIM, spacing=12)
spaced(d, (124, 790), "60 RELICS   ·   5 KEEPERS   ·   4 CHILDREN   ·   30 MARKS", font(AL, 17), BONE_DIM, 3)
spaced(d, (124, 980), "FULLY VOICED  ·  PLAYABLE IN YOUR BROWSER", font(AL, 14), (174, 154, 124), 3)
grain(land, 7)
land.convert("RGB").save(STORE / "cover-landscape-1920x1080.jpg", quality=93, optimize=True)

# ---------------------------------------------------------------- portrait cover
port = Image.new("RGBA", (1080, 1920), SOOT + (255,))
hero = fit(wren, (1080, 1440), centering=(0.5, 0.4))
port.alpha_composite(hero, (0, 0))
# darkness at the bottom into the logo area
port.alpha_composite(vertical_gradient((1080, 1920), [(0.0, (8, 6, 5, 0)), (0.62, (8, 6, 5, 10)), (0.76, (8, 6, 5, 215)), (1.0, (8, 6, 5, 255))]))
vignette(port, 130)
d = ImageDraw.Draw(port)
spaced(d, (540, 1390), "A HAND-INKED ROGUELIKE DESCENT", font(AL, 17), GOLD, 4, "ma")
text(d, (540, 1430), "BOUND", font(IM, 126), BONE, anchor="ma")
text(d, (540, 1542), "BELOW", font(IM, 126), BONE, anchor="ma")
d.line((360, 1700, 720, 1700), fill=THREAD + (210,), width=3)
text(d, (540, 1728), "Five chapters. One red thread.", font(AL, 26), BONE_DIM, anchor="ma")
spaced(d, (540, 1790), "60 RELICS  ·  5 KEEPERS  ·  4 CHILDREN", font(AL, 13), BONE_DIM, 2, "ma")
d.rectangle((0, 0, 1079, 1919), outline=(216, 166, 91, 70), width=2)
grain(port, 7)
port.convert("RGB").save(STORE / "cover-portrait-1080x1920.jpg", quality=93, optimize=True)

shots = [
    ("01-boss.jpg", "THE HEART STOPS", "FIVE KEEPERS. FIVE CHAPTERS."),
    ("02-library.jpg", "EVERY ROOM HAS A PRICE", "10 ROOM TYPES. 3 CURSES."),
    ("03-transform.jpg", "BECOME SOMETHING ELSE", "60 RELICS. 4 TRANSFORMATIONS."),
    ("04-curator.jpg", "EVERY LOCK HAS A NAME", "10 ROOM TYPES. 30 MARKS."),
]
for filename, caption, sub in shots:
    src = Image.open(STORE / "raw" / filename).convert("RGB")
    scale = 1001 / 650
    game_w = 960 * scale
    left = (1904 - game_w) / 2
    crop = src.crop((round(left), 0, round(left + game_w), 1001))
    crop = crop.resize((1595, 1080), Image.Resampling.LANCZOS).convert("RGBA")
    out = Image.new("RGBA", (1920, 1080), (9, 7, 6, 255))
    out.alpha_composite(crop, (0, 0))
    rail = Image.new("RGBA", (325, 1080), (10, 8, 7, 255))
    rn = Image.effect_noise((325, 1080), 8).convert("L")
    noise = Image.new("RGBA", (325, 1080), (255, 244, 220, 0))
    noise.putalpha(rn.point(lambda p: int(p * 0.06)))
    rail.alpha_composite(noise)
    rail.alpha_composite(vertical_gradient((325, 1080), [(0.0, (216, 166, 91, 20)), (0.25, (8, 6, 5, 0)), (0.8, (8, 6, 5, 0)), (1.0, (184, 64, 47, 26))]))
    out.alpha_composite(rail, (1595, 0))
    d = ImageDraw.Draw(out)
    d.rectangle((0, 0, 1594, 1079), outline=(216, 166, 91, 100), width=2)
    d.line((1594, 0, 1594, 1080), fill=(184, 64, 47, 160), width=2)
    d.line((1625, 70, 1625, 1010), fill=(184, 64, 47, 85), width=1)
    spaced(d, (1635, 86), "BOUND BELOW", font(AL, 16), GOLD, 4)
    capf = font(IM, 30)
    words = caption.split()
    lines = []
    line = ""
    for word in words:
        trial = (line + " " + word).strip()
        if line and d.textlength(trial, font=capf) > 255:
            lines.append(line)
            line = word
        else:
            line = trial
    if line:
        lines.append(line)
    for index, line in enumerate(lines):
        text(d, (1629, 132 + index * 36), line, capf, BONE, spacing=0)
    d.line((1633, 330, 1820, 330), fill=THREAD + (200,), width=2)
    text(d, (1631, 354), sub, font(AL, 15), BONE_DIM)
    spaced(d, (1635, 930), "A HAND-INKED DESCENT", font(AL, 12), (166, 146, 118), 2)
    spaced(d, (1635, 1002), "FIVE CHAPTERS  ·  ONE THREAD", font(AL, 11), (166, 146, 118), 1)
    out.convert("RGB").save(STORE / "screenshots" / filename.replace(".jpg", "-1920x1080.jpg"), quality=94, optimize=True)

print("store assets written")
