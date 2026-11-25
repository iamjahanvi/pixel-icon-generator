#!/usr/bin/env node
// pixelicon.mjs - tools for 16x16 pixel icons stored as JSON grids.
// Zero dependencies: needs only Node 18+.
//
// Icon JSON:
//   {"name": "apple", "style": "color",
//    "palette": {"K": "#000000", "a": "#f7203c"},
//    "grid": ["................", ... 16 rows of 16 chars ...]}
// '.' is a transparent pixel; every other char must be a key in palette.
// "style" is "color" (Pixtober 2024, the default) or "bw" (Pixtober 2025 black & white).
//
// Commands:
//   check   ICON.json [...]                         validate grid + style rules
//   svg     ICON.json [...] [--out DIR]             write NAME.svg (one <rect> per pixel)
//   png     ICON.json [...] [--scale 16] [--out DIR] enlarged PNG on a checkerboard, for looking at your own work
//   preview OUT.html ICON.json [...] [--title T]    side-by-side preview page
//   import  IMAGE.svg|IMAGE.png NAME [--out DIR]    convert an existing pixel icon to a grid

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const N = 16;
const OUTLINE = "#000000";
const USAGE = `pixelicon.mjs - tools for 16x16 pixel icons stored as JSON grids.

Commands:
  check   ICON.json [...]                          validate grid + style rules
  svg     ICON.json [...] [--out DIR]              write NAME.svg (one <rect> per pixel)
  png     ICON.json [...] [--scale 16] [--out DIR] enlarged PNG on a checkerboard
  preview OUT.html ICON.json [...] [--title T]     side-by-side preview page
  import  IMAGE.svg|IMAGE.png NAME [--out DIR]     convert an existing pixel icon to a grid`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

function load(p) {
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!("name" in d)) d.name = path.basename(p, path.extname(p));
  return d;
}

export function check(d) {
  const errs = [], warns = [];
  const g = d.grid || [], pal = d.palette || {};
  if (g.length !== N) errs.push(`grid has ${g.length} rows, needs ${N}`);
  g.forEach((row, y) => {
    if (row.length !== N) errs.push(`row ${y} has ${row.length} chars, needs ${N}`);
    [...row].forEach((c, x) => {
      if (c !== "." && !(c in pal)) errs.push(`(${x},${y}) uses '${c}', which is not in palette`);
    });
  });
  if (errs.length) return [errs, warns];
  const outlineKeys = new Set(Object.keys(pal).filter((k) => pal[k].toLowerCase() === OUTLINE));
  if (!outlineKeys.size) errs.push("no pure black (#000000) outline colour in palette");
  const filled = (x, y) => x >= 0 && x < N && y >= 0 && y < N && g[y][x] !== ".";
  const gaps = [], strays = [], used = new Set();
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const c = g[y][x];
      if (c === ".") continue;
      used.add(c);
      // outline rule: a coloured pixel may never touch transparency or the canvas edge
      if (!outlineKeys.has(c) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !filled(x + dx, y + dy))) gaps.push([x, y]);
      // stray rule: no pixel floating on its own (8-neighbourhood)
      let touch = false;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && filled(x + dx, y + dy)) touch = true;
      if (!touch) strays.push([x, y]);
    }
  }
  const fmt = (pts) => pts.map(([x, y]) => `(${x},${y})`).join(", ");
  if (gaps.length) errs.push("outline gap: coloured pixel touches transparency/edge at " + fmt(gaps));
  if (strays.length) errs.push("stray pixel at " + fmt(strays));
  const unused = Object.keys(pal).filter((k) => !used.has(k)).sort();
  if (unused.length) warns.push("unused palette keys: " + unused.join(", "));
  if (d.style === "bw") {
    // black & white (Pixtober 2025): only pure black and white, and a 2px outer outline
    const off = Object.entries(pal).filter(([, v]) => !["#000000", "#ffffff"].includes(v.toLowerCase())).map(([k, v]) => `${k} ${v}`);
    if (off.length) errs.push("black & white icons use only #000000 and #ffffff, found " + off.join(", "));
    const thin = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (g[y][x] === "." || outlineKeys.has(g[y][x])) continue;
      // every white pixel needs 2px of black between it and the outside (5x5 minus the far corners)
      let near = false;
      for (let dx = -2; dx <= 2 && !near; dx++) for (let dy = -2; dy <= 2; dy++) {
        if ((dx || dy) && !(Math.abs(dx) === 2 && Math.abs(dy) === 2) && !filled(x + dx, y + dy)) { near = true; break; }
      }
      if (near) thin.push([x, y]);
    }
    if (thin.length) errs.push("outer outline thinner than 2px: white pixel too close to the outside at " + fmt(thin));
  } else {
    const ncol = [...used].filter((k) => !outlineKeys.has(k)).length;
    if (ncol > 6) warns.push(`${ncol} colours besides black; objects usually need 2-4`);
  }
  const rows = [], cols = [];
  for (let i = 0; i < N; i++) {
    if ([...Array(N).keys()].some((x) => filled(x, i))) rows.push(i);
    if ([...Array(N).keys()].some((y) => filled(i, y))) cols.push(i);
  }
  if (rows.length && Math.max(rows.at(-1) - rows[0], cols.at(-1) - cols[0]) + 1 < 12) warns.push("subject is small; icons usually span 14-16px");
  return [errs, warns];
}

// Same shape as a Figma export: one 1x1 <rect> per pixel, fill="none" root.
export function svg(d, size = N) {
  const rects = [];
  d.grid.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== ".") rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${d.palette[c]}"/>`);
  }));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${N} ${N}" fill="none" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">\n` + rects.join("\n") + "\n</svg>\n";
}

function gridSvg(d, cell = 16) {
  const s = N * cell;
  let lines = "";
  for (let i = 0; i <= N; i++) lines += `<line x1="${i * cell}" y1="0" x2="${i * cell}" y2="${s}"/><line x1="0" y1="${i * cell}" x2="${s}" y2="${i * cell}"/>`;
  const full = svg(d);
  const inner = full.slice(full.indexOf(">\n") + 2, full.lastIndexOf("</svg>"));
  return `<svg class="big" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" shape-rendering="crispEdges"><g transform="scale(${cell})">${inner}</g><g class="gl">${lines}</g></svg>`;
}

function preview(out, icons, title) {
  const cards = icons.map((d, i) => {
    const [errs, warns] = check(d);
    const status = errs.map((m) => `<li class="e">${esc(m)}</li>`).join("") + warns.map((m) => `<li class="w">${esc(m)}</li>`).join("");
    const sw = Object.entries(d.palette).map(([k, v]) => `<span class="sw" style="background:${v}" title="${k} ${v}"></span>`).join("");
    return `<figure>
  <figcaption><b>${i + 1}</b> ${esc(d.label ?? d.name)}</figcaption>
  <div class="checker">${gridSvg(d)}</div>
  <div class="sizes"><div>${svg(d, 16)}<small>1x</small></div><div>${svg(d, 32)}<small>2x</small></div><div>${svg(d, 64)}<small>4x</small></div></div>
  <div class="pal">${sw}</div>
  ${status ? "<ul>" + status + "</ul>" : '<p class="ok">passes checks</p>'}
</figure>`;
  });
  const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
:root{--bg:#f6f3ec;--card:#fffdf8;--ink:#1d1b18;--mute:#7a746a;--line:#e4ddd0}
@media (prefers-color-scheme:dark){:root{--bg:#191816;--card:#22201d;--ink:#f1ece2;--mute:#9b948a;--line:#34312c}}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.4 ui-monospace,Menlo,monospace;padding:24px 16px}
h1{font-size:18px;margin:0 0 20px}
.row{display:flex;flex-wrap:wrap;gap:20px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;width:286px;max-width:100%;box-sizing:border-box}
figcaption{margin-bottom:10px} figcaption b{display:inline-block;min-width:20px}
.checker{background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px;line-height:0;width:256px;max-width:100%}
.big{width:100%;height:auto;display:block} .gl line{stroke:rgba(0,0,0,.12);stroke-width:1}
.sizes{display:flex;gap:16px;align-items:flex-end;margin:12px 0} .sizes div{display:flex;flex-direction:column;align-items:center;gap:4px}
.sizes svg{image-rendering:pixelated} small{color:var(--mute)}
.pal{display:flex;gap:4px} .sw{width:18px;height:18px;border-radius:3px;border:1px solid var(--line)}
ul{margin:10px 0 0;padding-left:16px;font-size:12px} .e{color:#c2372b} .w{color:var(--mute)} .ok{color:var(--mute);font-size:12px;margin:10px 0 0}
</style></head><body><h1>${esc(title)}</h1><div class="row">${cards.join("")}</div></body></html>`;
  fs.writeFileSync(out, page);
}

// ---------- PNG encode / decode (8-bit, non-interlaced) ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function decodePng(buf) {
  let pos = 8, w, h, depth, ctype, interlace, plte = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === "PLTE") plte = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error("only 8-bit, non-interlaced PNGs are supported");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  const stride = w * ch, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? px[y * stride + i - ch] : 0, b = y ? px[(y - 1) * stride + i] : 0, c = i >= ch && y ? px[(y - 1) * stride + i - ch] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + i] = v & 0xff;
    }
  }
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let r, g, b, al = 255;
    if (ctype === 6) [r, g, b, al] = px.subarray(i * 4, i * 4 + 4);
    else if (ctype === 2) [r, g, b] = px.subarray(i * 3, i * 3 + 3);
    else if (ctype === 0) r = g = b = px[i];
    else if (ctype === 4) { r = g = b = px[i * 2]; al = px[i * 2 + 1]; }
    else { const k = px[i]; [r, g, b] = plte.subarray(k * 3, k * 3 + 3); al = trns && k < trns.length ? trns[k] : 255; }
    out.set([r, g, b, al], i * 4);
  }
  return { w, h, px: out };
}

// ---------- import ----------

const hex2 = (n) => n.toString(16).padStart(2, "0");
const NAMED = { black: "#000000", white: "#ffffff", red: "#ff0000" };

function cellsToIcon(cells, name) {
  const count = new Map();
  for (const row of cells) for (const c of row) if (c) count.set(c, (count.get(c) || 0) + 1);
  // most-used colour first; ties keep first-seen order (matches the Python version)
  const order = [...count.entries()].sort((p, q) => q[1] - p[1]);
  const pool = [..."abcdefghijmnopqrstuvwxyz"], keys = new Map();
  for (const [hx] of order) keys.set(hx, hx === OUTLINE ? "K" : pool.shift());
  const palette = {};
  for (const [hx, k] of keys) palette[k] = hx;
  // only black and white means the Pixtober 2025 black & white style
  const style = [...keys.keys()].every((hx) => hx === "#000000" || hx === "#ffffff") ? "bw" : "color";
  return { name, style, palette, grid: cells.map((row) => row.map((c) => (c ? keys.get(c) : ".")).join("")) };
}

function importSvg(p, name) {
  const src = fs.readFileSync(p, "utf8").replace(/<defs>[\s\S]*?<\/defs>/g, "");
  const cells = Array.from({ length: N }, () => Array(N).fill(null));
  for (const m of src.matchAll(/<rect\b([^>]*)\/?>/g)) {
    const at = Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    let fill = (at.fill || "").toLowerCase();
    if (!fill || fill === "none" || fill.startsWith("url")) continue;
    const x = parseFloat(at.x || 0), y = parseFloat(at.y || 0), w = parseFloat(at.width || 1), h = parseFloat(at.height || 1);
    fill = NAMED[fill] || fill;
    if (fill.length === 4) fill = "#" + [...fill.slice(1)].map((ch) => ch + ch).join("");
    for (let j = 0; j < Math.round(h); j++) for (let i = 0; i < Math.round(w); i++) {
      const X = Math.floor(x) + i, Y = Math.floor(y) + j;
      if (X >= 0 && X < N && Y >= 0 && Y < N) cells[Y][X] = fill;
    }
  }
  return cellsToIcon(cells, name);
}

function importPng(p, name) {
  const { w, h, px } = decodePng(fs.readFileSync(p));
  const at = (x, y) => { const i = (Math.min(y, h - 1) * w + Math.min(x, w - 1)) * 4; return px.subarray(i, i + 4).join(","); };
  let best = null;
  for (const scale of [1, 2, 3, 4, 8, 16, 32]) {
    if (w < N * scale || h < N * scale) continue;
    // art may sit off-grid by up to scale-1 px; reads are clamped
    for (let ox = 0; ox < scale; ox++) for (let oy = 0; oy < scale; oy++) {
      let bad = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const b = new Set();
        for (let i = 0; i < scale; i++) for (let j = 0; j < scale; j++) b.add(at(ox + x * scale + i, oy + y * scale + j));
        if (b.size > 1) bad++;
      }
      // a 1x read is always "clean", so on a tie prefer the larger scale
      if (!best || bad < best[0] || (bad === best[0] && scale > best[1])) best = [bad, scale, ox, oy];
    }
  }
  const [, scale, ox, oy] = best;
  const cells = [];
  for (let y = 0; y < N; y++) {
    const row = [];
    for (let x = 0; x < N; x++) {
      const [r, g, b, a] = at(ox + x * scale, oy + y * scale).split(",").map(Number);
      row.push(a < 128 ? null : "#" + hex2(r) + hex2(g) + hex2(b));
    }
    cells.push(row);
  }
  return cellsToIcon(cells, name);
}

// ---------- png render for self-review ----------

function renderPng(d, scale) {
  const S = N * scale, buf = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = ((Math.floor(x / scale) + Math.floor(y / scale)) % 2) ? 232 : 255;
    buf.set([v, v, v, 255], (y * S + x) * 4);
  }
  d.grid.forEach((row, gy) => [...row].forEach((c, gx) => {
    if (c === ".") return;
    const h = d.palette[c].replace("#", "");
    const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    for (let y = gy * scale; y < (gy + 1) * scale; y++) for (let x = gx * scale; x < (gx + 1) * scale; x++) buf.set([...rgb, 255], (y * S + x) * 4);
  }));
  return encodePng(S, S, buf);
}

// ---------- cli ----------

function main(argv) {
  if (!argv.length) { console.error(USAGE); process.exit(1); }
  const [cmd, ...rest] = argv;
  const opt = (flag, def) => (rest.includes(flag) ? rest[rest.indexOf(flag) + 1] : def);
  const files = rest.filter((p, i) => !p.startsWith("--") && (i === 0 || !rest[i - 1].startsWith("--")));
  const mk = (dir) => fs.mkdirSync(dir, { recursive: true });
  if (cmd === "check") {
    let bad = false;
    for (const p of files) {
      const [errs, warns] = check(load(p));
      if (errs.length) bad = true;
      console.log(`${p}: ${errs.length ? "FAIL" : "ok"}`);
      errs.forEach((m) => console.log("  error:", m));
      warns.forEach((m) => console.log("  warn: ", m));
    }
    process.exit(bad ? 1 : 0);
  } else if (cmd === "svg") {
    const out = opt("--out", "."); mk(out);
    for (const p of files) { const d = load(p), dest = path.join(out, d.name + ".svg"); fs.writeFileSync(dest, svg(d)); console.log(dest); }
  } else if (cmd === "png") {
    const scale = parseInt(opt("--scale", "16"), 10), out = opt("--out", "."); mk(out);
    for (const p of files) { const d = load(p), dest = path.join(out, d.name + ".png"); fs.writeFileSync(dest, renderPng(d, scale)); console.log(dest); }
  } else if (cmd === "preview") {
    preview(files[0], files.slice(1).map(load), opt("--title", "Pixel icons"));
    console.log(files[0]);
  } else if (cmd === "import") {
    const d = (files[0].toLowerCase().endsWith(".svg") ? importSvg : importPng)(files[0], files[1]);
    const out = opt("--out", "."); mk(out);
    const dest = path.join(out, d.name + ".json");
    fs.writeFileSync(dest, JSON.stringify(d, null, 1));
    console.log(dest);
    console.log(d.grid.join("\n"));
  } else { console.error(USAGE); process.exit(1); }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("pixelicon.mjs")) main(process.argv.slice(2));
