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

let toastTimer;
export function toast(msg) {
  const el = document.getElementById("toast");
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
