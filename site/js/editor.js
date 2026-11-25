import { N, check, svg } from "./core.js";
import { toast, copyText, download, slugify, esc } from "./util.js";
import { glyph } from "./glyphs.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const STORE = "pixel-icons-draft-v1"; // your own drawing; icons you open are never saved over it
const KEYS = "abcdefghijmnopqrstuvwxyz";
const BW_PALETTE = { K: "#000000", w: "#ffffff" };

const blank = () => ({
  name: "my-icon",
  style: "color",
  // everyday real-world colours to start from; add more with +
  palette: { K: "#000000", w: "#ffffff", g: "#8b8b8b", l: "#c9c9c9", r: "#e33a2f", o: "#f2932b", y: "#f7d84a", n: "#5bbd3c", b: "#3577e0", p: "#8a3fa0", t: "#8a5a32" },
  grid: Array.from({ length: N }, () => ".".repeat(N)),
});

// keep only the colours the drawing uses
const used = (d) => {
  const keys = new Set(d.grid.join(""));
  return { ...d, palette: Object.fromEntries(Object.entries(d.palette).filter(([k]) => keys.has(k))) };
};

// grid rows as arrays while editing
const toEdit = (d) => ({ ...d, palette: { ...d.palette }, grid: d.grid.map((r) => [...r]) });
const toPlain = (d) => ({ name: d.name, style: d.style, palette: d.palette, grid: d.grid.map((r) => r.join("")) });

const TIPS = {
  pencil: "Pencil: click or drag to draw.",
  eraser: "Eraser: click or drag to clear pixels.",
  fill: "Fill: click to fill an area with the colour.",
  pick: "Pick: click a pixel to use its colour. Or hold Alt with any tool.",
};

export function initEditor() {
  const canvas = $("#ed-canvas"), ctx = canvas.getContext("2d");
  const W = canvas.width, C = W / N;
  let docs = [], active = 0, tool = "pencil", key = "K", mode = "draft";
  $$("#editor [data-glyph]").forEach((b) => (b.innerHTML = glyph(b.dataset.glyph)));
  const addWrap = $("#ed-add-wrap"); // lives at the end of the colour list, re-added after each redraw
  const history = new WeakMap(); // doc -> { undo: [], redo: [] }

  const doc = () => docs[active];
  const hist = () => { if (!history.has(doc())) history.set(doc(), { undo: [], redo: [] }); return history.get(doc()); };
  const snapshot = () => JSON.stringify({ palette: doc().palette, grid: doc().grid, style: doc().style });
  function pushUndo() {
    const h = hist();
    h.undo.push(snapshot());
    if (h.undo.length > 100) h.undo.shift();
    h.redo = [];
  }
  function restore(s) {
    const o = JSON.parse(s);
    Object.assign(doc(), o);
  }
  function undo() { const h = hist(); if (!h.undo.length) return; h.redo.push(snapshot()); restore(h.undo.pop()); refresh(); }
  function redo() { const h = hist(); if (!h.redo.length) return; h.undo.push(snapshot()); restore(h.redo.pop()); refresh(); }

  // ---------- persistence (this browser only) ----------
  function save() {
    if (mode !== "draft") return;
    try { localStorage.setItem(STORE, JSON.stringify(toPlain(doc()))); } catch { /* storage unavailable */ }
  }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE) || "null");
      if (d && Array.isArray(d.grid) && d.palette) return toEdit(d);
    } catch { /* ignore */ }
    return toEdit(blank());
  }

  // ---------- drawing ----------
  let problems = new Set();
  function render() {
    const d = doc();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = d.grid[y][x];
      // empty cells are a faint grey so white pixels still show
      ctx.fillStyle = k === "." ? "#f7f7f7" : (d.palette[k] || "#ff00ff");
      ctx.fillRect(x * C, y * C, C, C);
    }
    ctx.fillStyle = "#dedede";
    for (let i = 1; i < N; i++) { ctx.fillRect(i * C - 1, 0, 2, W); ctx.fillRect(0, i * C - 1, W, 2); }
    // mark pixels that break a rule
    ctx.strokeStyle = "#c8102e"; ctx.lineWidth = 3;
    for (const p of problems) {
      const [x, y] = p.split(",").map(Number);
      ctx.strokeRect(x * C + 4, y * C + 4, C - 8, C - 8);
    }
  }

  function renderChecks() {
    const d = toPlain(doc());
    const [errs, allWarns] = check(d);
    // the starting palette is a box of colours, so unused ones are expected here
    const warns = allWarns.filter((w) => !w.startsWith("unused palette keys"));
    problems = new Set();
    for (const m of errs) for (const [, x, y] of m.matchAll(/\((\d+),(\d+)\)/g)) problems.add(`${x},${y}`);
    const empty = d.grid.every((r) => /^\.+$/.test(r));
    const items = empty
      ? [`<li class="warn">The grid is empty. Pick a colour and start drawing.</li>`]
      : errs.length || warns.length
        ? [...errs.map((m) => `<li class="err">${esc(humanize(m))}</li>`), ...warns.map((m) => `<li class="warn">${esc(humanize(m))}</li>`)]
        : [`<li class="ok">Passes every ${d.style === "bw" ? "black & white" : "colour"} style check.</li>`];
    $("#ed-checks").innerHTML = items.join("");
  }

  // make the checker's messages friendlier without hiding the detail
  function humanize(m) {
    return m
      .replace(/^outline gap: coloured pixel touches transparency\/edge at .*/, "The outline has gaps: some coloured pixels touch the background. They're marked in red.")
      .replace(/^stray pixel at .*/, "Some pixels float on their own. They're marked in red.")
      .replace(/^outer outline thinner than 2px: .*/, "The outer outline is thinner than 2px in places. White pixels marked in red are too close to the edge.")
      .replace(/^no pure black .*/, "Add pure black (#000000): it draws the outline.")
      .replace(/^black & white icons use only #000000 and #ffffff, found (.*)/, "Black & white icons use only black and white. Found: $1.")
      .replace(/^unused palette keys: (.*)/, "Unused colours in the palette: $1.")
      .replace(/^(\d+) colours besides black.*/, "$1 colours besides black. Objects usually need 2–4.")
      .replace(/^subject is small.*/, "The drawing is small. Icons usually fill 14–16 pixels.");
  }

  function renderPreview() {
    const d = toPlain(doc());
    $("#ed-preview").innerHTML = [16, 32, 64].map((s) => `<figure>${svg(d, s)}<figcaption>${s / 16}×</figcaption></figure>`).join("");
  }

  function renderPalette() {
    const d = doc();
    const pal = d.style === "bw" ? BW_PALETTE : d.palette;
    if (!(key in pal)) key = "K";
    $("#ed-swatches").innerHTML = Object.entries(pal).map(([k, v]) =>
      `<button type="button" class="swatch" data-key="${k}" style="background:${v}" aria-pressed="${k === key}" aria-label="${k === "K" ? "Black (outline)" : v}${k !== "K" && d.style !== "bw" ? ". Click again to change it" : ""}" title="${k === "K" ? "Black, for outlines" : `${v}. Click again to change it`}"></button>`).join("");
    $("#ed-swatches").append(addWrap);
    addWrap.hidden = d.style === "bw";
    $$("#editor [data-style]").forEach((b) => b.setAttribute("aria-checked", b.dataset.style === d.style));
  }

  function renderDocs() {
    $("#ed-docs").innerHTML = docs.length > 1
      ? docs.map((d, i) => `<button type="button" data-doc="${i}" aria-current="${i === active}">${esc(d.name)}</button>`).join("")
      : "";
    $("#ed-name").value = doc().name;
  }

  function refresh() {
    renderChecks(); render(); renderPreview(); renderPalette(); renderDocs(); save();
  }

  // ---------- tools ----------
  function cellAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * N), y = Math.floor(((e.clientY - r.top) / r.height) * N);
    return x >= 0 && x < N && y >= 0 && y < N ? [x, y] : null;
  }
  function fill(x, y, to) {
    const g = doc().grid, from = g[y][x];
    if (from === to) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [a, b] = stack.pop();
      if (a < 0 || a >= N || b < 0 || b >= N || g[b][a] !== from) continue;
      g[b][a] = to;
      stack.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
    }
  }
  function apply(x, y, e) {
    const g = doc().grid;
    const t = e && e.altKey ? "pick" : tool;
    if (t === "pick") { if (g[y][x] !== ".") { key = g[y][x]; setTool("pencil"); renderPalette(); } return; }
    if (t === "fill") { fill(x, y, key); return; }
    g[y][x] = t === "eraser" ? "." : key;
  }

  let drawing = false, last = null;
  canvas.addEventListener("pointerdown", (e) => {
    const c = cellAt(e); if (!c) return;
    canvas.setPointerCapture(e.pointerId);
    pushUndo();
    drawing = tool === "pencil" || tool === "eraser";
    last = c.join();
    apply(...c, e);
    refreshCanvasOnly();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const c = cellAt(e); if (!c || c.join() === last) return;
    last = c.join();
    apply(...c, e);
    refreshCanvasOnly();
  });
  const end = () => { if (drawing || last) { drawing = false; last = null; refresh(); } };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  function refreshCanvasOnly() { renderChecks(); render(); }

  // keyboard drawing for people who can't use a pointer: arrows move, space paints
  let cursor = [0, 0];
  canvas.addEventListener("keydown", (e) => {
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (mv) {
      e.preventDefault();
      cursor = [Math.max(0, Math.min(N - 1, cursor[0] + mv[0])), Math.max(0, Math.min(N - 1, cursor[1] + mv[1]))];
      render(); drawCursor();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault(); pushUndo(); apply(...cursor); refresh(); drawCursor();
    }
  });
  canvas.addEventListener("focus", () => drawCursor());
  canvas.addEventListener("blur", () => render());
  function drawCursor() {
    if (document.activeElement !== canvas) return;
    ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
    ctx.strokeRect(cursor[0] * C + 1.5, cursor[1] * C + 1.5, C - 3, C - 3);
  }

  function setTool(t) {
    tool = t;
    $$("#editor [data-tool]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tool === t));
    $("#ed-tip").textContent = TIPS[t];
    canvas.dataset.tool = t;
  }
  function flip(fn) { pushUndo(); doc().grid = fn(doc().grid); refresh(); }
  $("#ed-flip-h").addEventListener("click", () => flip((g) => g.map((r) => [...r].reverse())));
  $("#ed-flip-v").addEventListener("click", () => flip((g) => [...g].reverse()));
  $$("#editor [data-tool]").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool)));
  $("#ed-undo").addEventListener("click", undo);
  $("#ed-redo").addEventListener("click", redo);
  $("#ed-clear").addEventListener("click", () => {
    pushUndo();
    doc().grid = Array.from({ length: N }, () => Array(N).fill("."));
    refresh();
    toast("Cleared. Undo brings it back.");
  });
  document.addEventListener("keydown", (e) => {
    // shortcuts only while the editor window is open and you're not typing
    if (!$("#editor").open || $("#paste-dialog").open) return;
    if (e.target.closest("input, textarea, select")) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod) return;
    const t = { p: "pencil", e: "eraser", f: "fill", i: "pick" }[e.key.toLowerCase()];
    if (t) setTool(t);
  });

  // ---------- palette ----------
  const picker = document.createElement("input");
  picker.type = "color";
  picker.style.cssText = "position:fixed;left:-100px;opacity:0";
  document.body.appendChild(picker);
  let editing = null;
  $("#ed-swatches").addEventListener("click", (e) => {
    const b = e.target.closest(".swatch"); if (!b) return;
    const k = b.dataset.key;
    if (k === key && k !== "K" && doc().style !== "bw") {
      editing = k; picker.value = doc().palette[k]; picker.click();
      return;
    }
    key = k;
    if (tool === "eraser" || tool === "pick") setTool("pencil");
    renderPalette();
  });
  picker.addEventListener("input", () => {
    if (!editing) return;
    doc().palette[editing] = picker.value;
    render(); renderPreview(); renderPalette();
  });
  picker.addEventListener("change", () => { if (editing) { editing = null; refresh(); } });
  $("#ed-add").addEventListener("change", (e) => {
    const d = doc();
    const free = [...KEYS].find((k) => !(k in d.palette));
    if (!free) { toast("The palette is full."); return; }
    pushUndo();
    d.palette[free] = e.target.value.toLowerCase();
    key = free;
    refresh();
  });

  // ---------- style ----------
  $$("#editor [data-style]").forEach((b) => b.addEventListener("click", () => {
    const d = doc(), to = b.dataset.style;
    if (d.style === to) return;
    pushUndo();
    if (to === "bw") {
      // keep black; dark colours become black and the rest white
      const map = {};
      for (const [k, v] of Object.entries(d.palette)) {
        const [r, g, bl] = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
        map[k] = v.toLowerCase() === "#000000" || 0.2126 * r + 0.7152 * g + 0.0722 * bl < 0.35 ? "K" : "w";
      }
      d.grid = d.grid.map((row) => row.map((c) => (c === "." ? "." : map[c] || "K")));
      d.palette = { ...BW_PALETTE };
      toast("Switched to black & white: dark colours became black, the rest white. Undo switches back.");
    } else {
      d.palette = { ...blank().palette, ...d.palette };
    }
    d.style = to;
    refresh();
  }));

  // ---------- documents ----------
  $("#ed-docs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-doc]"); if (!b) return;
    active = +b.dataset.doc;
    refresh();
  });
  $("#ed-name").addEventListener("input", (e) => { doc().name = e.target.value; renderDocs(); save(); });
  $("#ed-name").addEventListener("change", (e) => { doc().name = slugify(e.target.value); refresh(); });

  // ---------- export ----------
  $("#ed-download").addEventListener("click", () => {
    const d = toPlain(doc()), name = slugify(d.name);
    download(`${name}.svg`, svg(d));
    toast(`Downloaded ${name}.svg`);
  });
  $("#ed-copy-svg").addEventListener("click", async () => toast((await copyText(svg(toPlain(doc())))) ? "SVG copied." : "Couldn't copy. Your browser blocked the clipboard."));
  $("#ed-copy-json").addEventListener("click", async () => toast((await copyText(JSON.stringify(used(toPlain(doc())), null, 1))) ? "JSON copied." : "Couldn't copy. Your browser blocked the clipboard."));

  // ---------- paste from AI ----------
  const pasteDlg = $("#paste-dialog");
  $("#ed-paste").addEventListener("click", () => openPaste());
  $("#paste-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const res = parseIcons($("#paste-text").value);
    if (res.error) { $("#paste-error").textContent = res.error; return; }
    open(res.icons, 0, res.icons.length > 1 ? "Icons from your AI" : "Icon from your AI");
    pasteDlg.close();
    $("#paste-text").value = "";
    toast(`Opened ${res.icons.length === 1 ? "1 icon" : `${res.icons.length} icons`}.${res.fixed ? " Some rows weren't 16 long, so they were padded or cut." : ""}`);
  });

  // ---------- open icons from elsewhere ----------
  // An opened icon is edited on its own; your saved drawing stays as it was.
  function open(list, i = 0, title) {
    mode = "icon";
    docs = list.map((d) => toEdit({ ...d, palette: { ...d.palette } }));
    active = Math.min(i, docs.length - 1);
    $("#ed-title").textContent = title || (docs.length > 1 ? "Edit icons" : "Edit icon");
    setTool("pencil");
    refresh();
  }
  // "Draw yourself": your own drawing, blank the first time
  function openDraft() {
    mode = "draft";
    docs = [loadDraft()]; active = 0;
    $("#ed-title").textContent = "Draw yourself";
    refresh();
  }
  function openPaste() { $("#paste-error").textContent = ""; pasteDlg.showModal(); $("#paste-text").focus(); }

  docs = [loadDraft()];
  setTool("pencil");
  refresh();
  return { open, openDraft, openPaste };
}

// Find icon JSON in a chat reply: a code block, a bare array or a single object.
export function parseIcons(text) {
  const tries = [];
  for (const m of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) tries.push(m[1]);
  const a = text.indexOf("["), b = text.lastIndexOf("]");
  if (a >= 0 && b > a) tries.push(text.slice(a, b + 1));
  const c = text.indexOf("{"), d = text.lastIndexOf("}");
  if (c >= 0 && d > c) tries.push(`[${text.slice(c, d + 1)}]`, text.slice(c, d + 1));
  let found = null;
  for (const t of tries) {
    try {
      let v = JSON.parse(t.trim());
      if (v && !Array.isArray(v)) v = Array.isArray(v.icons) ? v.icons : [v];
      const ok = v.filter((x) => x && Array.isArray(x.grid) && x.palette && typeof x.palette === "object");
      if (ok.length) { found = ok; break; }
    } catch { /* try the next candidate */ }
  }
  if (!found) return { error: "Couldn't find any icons in that text. Paste the whole reply, including the code block." };
  let fixed = false;
  const icons = found.slice(0, 6).map((x, i) => {
    let grid = x.grid.map((r) => String(r));
    if (grid.length !== N || grid.some((r) => r.length !== N)) fixed = true;
    grid = Array.from({ length: N }, (_, y) => (grid[y] || "").slice(0, N).padEnd(N, "."));
    const palette = {};
    for (const [k, v] of Object.entries(x.palette)) if (k.length === 1 && /^#[0-9a-f]{6}$/i.test(v)) palette[k] = v.toLowerCase();
    const bwOnly = Object.values(palette).every((v) => v === "#000000" || v === "#ffffff");
    const style = x.style === "bw" || x.style === "color" ? x.style : bwOnly ? "bw" : "color";
    return { name: slugify(x.name || `icon-${i + 1}`), style, palette, grid };
  });
  return { icons, fixed };
}
