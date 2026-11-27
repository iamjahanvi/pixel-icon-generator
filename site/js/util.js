import { N, svg } from "./core.js";

export const GRID_LINE = "#e6e8ec";

// Draw an icon onto a square canvas, with faint grid lines.
// `upto` limits how many filled pixels are drawn (reading order), for the draw-in animation.
export function drawIcon(canvas, d, { upto = Infinity, lines = true } = {}) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, c = W / N;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, W);
  if (d) {
    let n = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const k = d.grid[y][x];
        if (k === ".") continue;
        if (n++ >= upto) continue;
        ctx.fillStyle = d.palette[k];
        ctx.fillRect(x * c, y * c, c, c);
      }
    }
  }
  if (lines) drawLines(ctx, W, c);
}

export function drawLines(ctx, W, c) {
  ctx.fillStyle = GRID_LINE;
  for (let i = 1; i < N; i++) {
    ctx.fillRect(Math.round(i * c), 0, 1, W);
    ctx.fillRect(0, Math.round(i * c), W, 1);
  }
}

export function filledCount(d) {
  return d.grid.reduce((n, row) => n + [...row].filter((k) => k !== ".").length, 0);
}

export const iconSvg = (d, size) => svg(d, size);
// the same icon as one <img>: the browser lays out and paints a single element instead of hundreds of <rect>s,
// which keeps view switches smooth on pages that show dozens of icons at once
const imgCache = new Map();
export function iconImg(d, size, key, attrs = "") {
  const k = `${key}@${size}`;
  if (!imgCache.has(k)) imgCache.set(k, `data:image/svg+xml,${encodeURIComponent(svg(d, size))}`);
  return `<img class="ico" src="${imgCache.get(k)}" width="${size}" height="${size}" alt="" draggable="false"${attrs ? " " + attrs : ""}>`;
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById("toast");
  // an open pop-up sits in the browser's top layer, above the page; move the toast into it so it's never hidden behind
  const top = [...document.querySelectorAll("dialog[open]")].pop() || document.body;
  if (el.parentElement !== top) top.append(el);
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback for browsers that block the async clipboard
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export function download(name, text, type = "image/svg+xml") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const slugify = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-icon";

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// a plain .zip (stored, not compressed: PNGs are already compressed) from [{ name, data: Uint8Array }]
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function makeZip(files) {
  const enc = new TextEncoder(), now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
    const head = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0, 2], [8, 0, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, n, 4], [22, n, 4], [26, name.length, 2], [28, 0, 2]]
      .forEach(([o, v, w]) => (w === 4 ? head.setUint32(o, v, true) : head.setUint16(o, v, true)));
    parts.push(head, name, f.data);
    const dir = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0, 2], [10, 0, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, n, 4], [24, n, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]
      .forEach(([o, v, w]) => (w === 4 ? dir.setUint32(o, v, true) : dir.setUint16(o, v, true)));
    central.push(dir, name);
    offset += 30 + name.length + n;
  }
  const size = central.reduce((s, p) => s + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, files.length, 2], [10, files.length, 2], [12, size, 4], [16, offset, 4], [20, 0, 2]]
    .forEach(([o, v, w]) => (w === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true)));
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
