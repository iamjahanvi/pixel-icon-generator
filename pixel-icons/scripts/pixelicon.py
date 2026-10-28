#!/usr/bin/env python3
"""pixelicon.py - tools for 16x16 pixel icons stored as JSON grids.

Icon JSON:
  {"name": "apple",
   "palette": {"K": "#000000", "a": "#f7203c"},
   "grid": ["................", ... 16 rows of 16 chars ...]}
'.' is a transparent pixel; every other char must be a key in palette.

Commands:
  check   ICON.json [...]               validate grid + style rules
  svg     ICON.json [...] [--out DIR]    write NAME.svg (one <rect> per pixel)
  png     ICON.json [...] [--scale 16] [--out DIR]   enlarged PNG on a checkerboard, for looking at your own work
  preview OUT.html ICON.json [...] [--title T]   side-by-side preview page
  import  IMAGE.svg|IMAGE.png NAME [--out DIR]   convert an existing pixel icon to a grid
"""
import json, os, sys, html

N = 16
OUTLINE = "#000000"


def load(path):
    with open(path) as f:
        d = json.load(f)
    d.setdefault("name", os.path.splitext(os.path.basename(path))[0])
    return d


def check(d):
    """Return (errors, warnings)."""
    errs, warns = [], []
    g, pal = d.get("grid", []), d.get("palette", {})
    if len(g) != N:
        errs.append(f"grid has {len(g)} rows, needs {N}")
    for y, row in enumerate(g):
        if len(row) != N:
            errs.append(f"row {y} has {len(row)} chars, needs {N}")
        for x, c in enumerate(row):
            if c != "." and c not in pal:
                errs.append(f"({x},{y}) uses '{c}', which is not in palette")
    if errs:
        return errs, warns
    outline_keys = {k for k, v in pal.items() if v.lower() == OUTLINE}
    if not outline_keys:
        errs.append("no pure black (#000000) outline colour in palette")
    filled = lambda x, y: 0 <= x < N and 0 <= y < N and g[y][x] != "."
    gaps, strays, used = [], [], set()
    for y in range(N):
        for x in range(N):
            c = g[y][x]
            if c == ".":
                continue
            used.add(c)
            # outline rule: a coloured pixel may never touch transparency or the canvas edge
            if c not in outline_keys and any(not filled(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                gaps.append((x, y))
            # stray rule: no pixel floating on its own (8-neighbourhood)
            if not any(filled(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy):
                strays.append((x, y))
    if gaps:
        errs.append("outline gap: coloured pixel touches transparency/edge at " + ", ".join(f"({x},{y})" for x, y in gaps))
    if strays:
        errs.append("stray pixel at " + ", ".join(f"({x},{y})" for x, y in strays))
    unused = set(pal) - used
    if unused:
        warns.append("unused palette keys: " + ", ".join(sorted(unused)))
    ncol = len(used - outline_keys)
    if ncol > 6:
        warns.append(f"{ncol} colours besides black; objects usually need 2-4")
    rows = [y for y in range(N) if any(filled(x, y) for x in range(N))]
    cols = [x for x in range(N) if any(filled(x, y) for y in range(N))]
    if rows and max(max(rows) - min(rows), max(cols) - min(cols)) + 1 < 12:
        warns.append("subject is small; icons usually span 14-16px")
    return errs, warns


def svg(d, size=None):
    """Same shape as a Figma export: one 1x1 <rect> per pixel, fill="none" root."""
    pal, g = d["palette"], d["grid"]
    size = size or N
    rects = []
    for y, row in enumerate(g):
        for x, c in enumerate(row):
            if c != ".":
                rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{pal[c]}"/>')
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {N} {N}" fill="none" '
            f'shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">\n'
            + "\n".join(rects) + "\n</svg>\n")


def grid_svg(d, cell=16):
    """Enlarged view with pixel grid lines for the preview page."""
    s = N * cell
    lines = "".join(f'<line x1="{i*cell}" y1="0" x2="{i*cell}" y2="{s}"/><line x1="0" y1="{i*cell}" x2="{s}" y2="{i*cell}"/>' for i in range(N + 1))
    inner = svg(d).split(">\n", 1)[1].rsplit("</svg>", 1)[0]
    return (f'<svg class="big" viewBox="0 0 {s} {s}" width="{s}" height="{s}" shape-rendering="crispEdges">'
            f'<g transform="scale({cell})">{inner}</g><g class="gl">{lines}</g></svg>')


def preview(out, icons, title):
    cards = []
    for i, d in enumerate(icons):
        errs, warns = check(d)
        status = "".join(f'<li class="e">{html.escape(m)}</li>' for m in errs) + "".join(f'<li class="w">{html.escape(m)}</li>' for m in warns)
        sw = "".join(f'<span class="sw" style="background:{v}" title="{k} {v}"></span>' for k, v in d["palette"].items())
        cards.append(f'''<figure>
  <figcaption><b>{i+1}</b> {html.escape(d.get("label", d["name"]))}</figcaption>
  <div class="checker">{grid_svg(d)}</div>
  <div class="sizes"><div>{svg(d, 16)}<small>1x</small></div><div>{svg(d, 32)}<small>2x</small></div><div>{svg(d, 64)}<small>4x</small></div></div>
  <div class="pal">{sw}</div>
  {"<ul>"+status+"</ul>" if status else '<p class="ok">passes checks</p>'}
</figure>''')
    page = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><style>
:root{{--bg:#f6f3ec;--card:#fffdf8;--ink:#1d1b18;--mute:#7a746a;--line:#e4ddd0}}
@media (prefers-color-scheme:dark){{:root{{--bg:#191816;--card:#22201d;--ink:#f1ece2;--mute:#9b948a;--line:#34312c}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.4 ui-monospace,Menlo,monospace;padding:24px 16px}}
h1{{font-size:18px;margin:0 0 20px}}
.row{{display:flex;flex-wrap:wrap;gap:20px}}
figure{{margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;width:286px;max-width:100%;box-sizing:border-box}}
figcaption{{margin-bottom:10px}} figcaption b{{display:inline-block;min-width:20px}}
.checker{{background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px;line-height:0;width:256px;max-width:100%}}
.big{{width:100%;height:auto;display:block}} .gl line{{stroke:rgba(0,0,0,.12);stroke-width:1}}
.sizes{{display:flex;gap:16px;align-items:flex-end;margin:12px 0}} .sizes div{{display:flex;flex-direction:column;align-items:center;gap:4px}}
.sizes svg{{image-rendering:pixelated}} small{{color:var(--mute)}}
.pal{{display:flex;gap:4px}} .sw{{width:18px;height:18px;border-radius:3px;border:1px solid var(--line)}}
ul{{margin:10px 0 0;padding-left:16px;font-size:12px}} .e{{color:#c2372b}} .w{{color:var(--mute)}} .ok{{color:var(--mute);font-size:12px;margin:10px 0 0}}
</style></head><body><h1>{html.escape(title)}</h1><div class="row">{"".join(cards)}</div></body></html>'''
    with open(out, "w") as f:
        f.write(page)


NAMED = {"black": "#000000", "white": "#ffffff", "red": "#ff0000"}


def import_svg(path, name):
    """Read a Figma-style SVG made of 1x1 <rect>s (half-pixel offsets are snapped)."""
    import re, math
    src = open(path).read()
    src = re.sub(r"<defs>.*?</defs>", "", src, flags=re.S)
    cells = [[None] * N for _ in range(N)]
    xs = []
    for m in re.finditer(r"<rect\b([^>]*)/?>", src):
        at = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(1)))
        fill = at.get("fill", "").lower()
        if not fill or fill == "none" or fill.startswith("url"):
            continue
        x, y = float(at.get("x", 0)), float(at.get("y", 0))
        w, h = float(at.get("width", 1)), float(at.get("height", 1))
        xs.append((x, y))
        fill = NAMED.get(fill, fill)
        if len(fill) == 4:
            fill = "#" + "".join(ch * 2 for ch in fill[1:])
        for j in range(int(round(h))):
            for i in range(int(round(w))):
                X, Y = math.floor(x) + i, math.floor(y) + j
                if 0 <= X < N and 0 <= Y < N:
                    cells[Y][X] = fill
    return cells_to_icon(cells, name)


def cells_to_icon(cells, name):
    count = {}
    for row in cells:
        for c in row:
            if c:
                count[c] = count.get(c, 0) + 1
    keys, pool = {}, iter("abcdefghijmnopqrstuvwxyz")
    for hx, _ in sorted(count.items(), key=lambda t: -t[1]):
        keys[hx] = "K" if hx == OUTLINE else next(pool)
    return {"name": name, "palette": {v: k for k, v in keys.items()},
            "grid": ["".join("." if c is None else keys[c] for c in row) for row in cells]}


def import_png(path, name):
    from PIL import Image
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    best = None
    for scale in (1, 2, 3, 4, 8, 16, 32):
        if w < N * scale or h < N * scale:
            continue
        for ox in range(min(scale, w - N * scale + 1)):
            for oy in range(min(scale, h - N * scale + 1)):
                bad = 0
                for y in range(N):
                    for x in range(N):
                        b = {px[min(ox + x * scale + i, w - 1), min(oy + y * scale + j, h - 1)] for i in range(scale) for j in range(scale)}
                        bad += len(b) > 1
                if best is None or bad < best[0]:
                    best = (bad, scale, ox, oy)
    _, scale, ox, oy = best
    cells = []
    for y in range(N):
        row = []
        for x in range(N):
            c = px[min(ox + x * scale, w - 1), min(oy + y * scale, h - 1)]
            row.append(None if c[3] < 128 else "#%02x%02x%02x" % c[:3])
        cells.append(row)
    return cells_to_icon(cells, name)


def main(a):
    if not a:
        sys.exit(__doc__)
    cmd, rest = a[0], a[1:]
    opt = lambda flag, default=None: rest[rest.index(flag) + 1] if flag in rest else default
    files = [p for i, p in enumerate(rest) if not p.startswith("--") and (i == 0 or not rest[i - 1].startswith("--"))]
    if cmd == "check":
        bad = False
        for p in files:
            errs, warns = check(load(p))
            bad |= bool(errs)
            print(f"{p}: {'FAIL' if errs else 'ok'}")
            for m in errs: print("  error:", m)
            for m in warns: print("  warn: ", m)
        sys.exit(1 if bad else 0)
    if cmd == "svg":
        out = opt("--out", ".")
        os.makedirs(out, exist_ok=True)
        for p in files:
            d = load(p)
            dest = os.path.join(out, d["name"] + ".svg")
            open(dest, "w").write(svg(d))
            print(dest)
    elif cmd == "png":
        from PIL import Image
        scale, out = int(opt("--scale", "16")), opt("--out", ".")
        os.makedirs(out, exist_ok=True)
        for p in files:
            d = load(p)
            im = Image.new("RGBA", (N * scale, N * scale), (255, 255, 255, 255))
            for y in range(N * scale):  # light checkerboard so transparency is visible
                for x in range(N * scale):
                    if ((x // scale) + (y // scale)) % 2:
                        im.putpixel((x, y), (232, 232, 232, 255))
            for y, row in enumerate(d["grid"]):
                for x, c in enumerate(row):
                    if c != ".":
                        h = d["palette"][c].lstrip("#")
                        im.paste(tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,), (x * scale, y * scale, (x + 1) * scale, (y + 1) * scale))
            dest = os.path.join(out, d["name"] + ".png")
            im.save(dest)
            print(dest)
    elif cmd == "preview":
        preview(files[0], [load(p) for p in files[1:]], opt("--title", "Pixel icons"))
        print(files[0])
    elif cmd == "import":
        d = (import_svg if files[0].lower().endswith(".svg") else import_png)(files[0], files[1])
        out = opt("--out", ".")
        os.makedirs(out, exist_ok=True)
        dest = os.path.join(out, d["name"] + ".json")
        json.dump(d, open(dest, "w"), indent=1)
        print(dest)
        print("\n".join(d["grid"]))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])