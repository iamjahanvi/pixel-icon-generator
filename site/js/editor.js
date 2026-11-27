import { N, svg, check } from "./core.js";
import { toast, copyText, download, slugify, esc } from "./util.js";
import { glyph } from "./glyphs.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const STORE = "pixel-icons-draft-v1"; // your own drawing; icons you open are never saved over it
const KEYS = "abcdefghijmnopqrstuvwxyz";
const BW_PALETTE = { K: "#000000", w: "#ffffff" };

// new drawings are numbered: pixel-icon-1, pixel-icon-2, … (counted in this browser)
const COUNT = "pixel-icons-count";
function nextName() {
  let n = 1;
  try { n = (parseInt(localStorage.getItem(COUNT), 10) || 0) + 1; localStorage.setItem(COUNT, n); } catch { /* storage blocked */ }
  return `pixel-icon-${n}`;
}
const isDefaultName = (name) => /^pixel-icon-\d+$/.test(name) || name === "my-icon";

const blank = () => ({
  name: nextName(),
  style: "color",
  // everyday real-world colours to start from; add more with +
  palette: { K: "#000000", w: "#ffffff", g: "#8b8b8b", r: "#e33a2f", o: "#f2932b", y: "#f7d84a", n: "#5bbd3c", b: "#3577e0", t: "#8a5a32" }, // one row of swatches with the + button
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

// the editor's tool icons: Lucide (lucide.dev, ISC License), rounded line icons
const ico = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const LINE = {
  pencil: ico('<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>'),
  eraser: ico('<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>'),
  fill: ico('<path d="M4 7.5h16l-1.6 11.4A2.4 2.4 0 0 1 16 21H8a2.4 2.4 0 0 1-2.4-2.1L4 7.5Z"/><path d="M4 7.5a8 3.2 0 0 1 16 0"/><path d="M5.2 12.5c2.3 1.2 4.5 1.2 6.8 0s4.5-1.2 6.8 0"/>'), // a paint bucket, upright: clearer than a tipped one at this size
  pick: ico('<path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>'),
  fliph: ico('<path d="m3 7 5 5-5 5V7"/><path d="m21 7-5 5 5 5V7"/><path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/>'),
  flipv: ico('<path d="m17 3-5 5-5-5h10"/><path d="m17 21-5-5-5 5h10"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/>'),
  undo: ico('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>'),
  redo: ico('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/>'),
  clear: ico('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>'),
};

// a rough name for a colour, so the palette rows read as words ("Red #E33A2F")
function colourName(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d < 0.08) return l > 0.85 ? "White" : l < 0.15 ? "Black" : l > 0.6 ? "Light grey" : "Grey";
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
  const base = h < 15 ? "Red" : h < 40 ? (l < 0.45 ? "Brown" : "Orange") : h < 65 ? "Yellow" : h < 165 ? "Green" : h < 195 ? "Teal" : h < 255 ? "Blue" : h < 290 ? "Purple" : h < 340 ? "Pink" : "Red";
  return (l > 0.75 && base !== "Yellow" ? "Light " + base.toLowerCase() : l < 0.3 && base !== "Brown" ? "Dark " + base.toLowerCase() : base);
}

const TIPS = {
  pencil: "Pencil: click or drag to draw.",
  eraser: "Eraser: click or drag to clear pixels.",
  fill: "Fill: click to fill an area with the colour.",
  pick: "Pick: click a pixel to use its colour. Or hold Alt with any tool.",
};

export function initEditor() {
  const canvas = $("#ed-canvas"), ctx = canvas.getContext("2d");
  const W = canvas.width, C = W / N;
  let docs = [], active = 0, tool = "pencil", key = "K", mode = "draft", mirrorX = false, mirrorY = false;
  $$("#editor [data-glyph]").forEach((b) => (b.innerHTML = LINE[b.dataset.glyph] || glyph(b.dataset.glyph)));
  // undo/redo show the standard shortcut for this computer
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    $("#ed-undo").dataset.k = "Ctrl Z"; $("#ed-undo").title = "Undo (Ctrl+Z)";
    $("#ed-redo").dataset.k = "Ctrl Y"; $("#ed-redo").title = "Redo (Ctrl+Y or Ctrl+Shift+Z)";
  }
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
      if (d && Array.isArray(d.grid) && d.palette) {
        // drafts saved before the palette got shorter: drop the old light grey and purple if the drawing doesn't use them
        const inUse = d.grid.join("");
        for (const [k, v] of [["l", "#c9c9c9"], ["p", "#8a3fa0"]]) if (d.palette[k] === v && !inUse.includes(k)) delete d.palette[k];
        return toEdit(d);
      }
    } catch { /* ignore */ }
    return toEdit(blank());
  }

  // ---------- drawing ----------
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
    // dotted centre line for each mirror that's on
    ctx.fillStyle = "#3577e0";
    const half = (N / 2) * C;
    for (let p = 0; p < W; p += 12) {
      if (mirrorX) ctx.fillRect(half - 2, p, 4, 6);
      if (mirrorY) ctx.fillRect(p, half - 2, 6, 4);
    }
  }

  function renderPreview() {
    const d = toPlain(doc());
    $("#ed-preview").innerHTML = [16, 32, 64].map((s) => `<figure>${svg(d, s)}<figcaption>${s / 16}×</figcaption></figure>`).join("");
  }

  function renderPalette() {
    const d = doc();
    const pal = d.style === "bw" ? BW_PALETTE : d.palette;
    if (!(key in pal)) key = "K";
    // one row per colour: its hex and how many pixels use it, so unused ones are easy to spot
    const count = {}; d.grid.forEach((row) => row.forEach((c) => { if (c !== ".") count[c] = (count[c] || 0) + 1; }));
    $("#ed-swatches").innerHTML = Object.entries(pal).map(([k, v]) => {
      const n = count[k] || 0, name = k === "K" ? "Outline" : v.toLowerCase() === "#ffffff" ? "White" : colourName(v);
      return `<button type="button" class="swatch" data-key="${k}" style="background:${v}" aria-pressed="${k === key}" aria-label="${name} ${v}, ${n} pixels${k !== "K" && d.style !== "bw" ? ". Click again to change it" : ""}" title="${k === "K" ? "Black, for outlines" : `${v.toUpperCase()} · click again to change it`}"></button>`;
    }).join("");
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

  // the skill's own style rules, live, plus centring
  function renderChecks() {
    const d = toPlain(doc()), list = $("#ed-checks"), badge = $("#ed-check-n");
    if (d.grid.every((r) => /^\.+$/.test(r))) { list.innerHTML = '<li class="warn">Start drawing to see the checks.</li>'; badge.hidden = true; return; }
    const [errs, warns] = check(used(d));
    const rows = [], cols = [];
    d.grid.forEach((r, y) => [...r].forEach((c, x) => { if (c !== ".") { rows.push(y); cols.push(x); } }));
    const t = Math.min(...rows), b = N - 1 - Math.max(...rows), l = Math.min(...cols), r = N - 1 - Math.max(...cols);
    if (Math.abs(l - r) > 1) warns.push(`Off-centre by ${Math.floor(Math.abs(l - r) / 2)}px: move it ${l > r ? "left" : "right"}.`);
    if (Math.abs(t - b) > 1) warns.push(`Off-centre by ${Math.floor(Math.abs(t - b) / 2)}px: move it ${t > b ? "up" : "down"}.`);
    const nice = (m) => m.replace(/^outline gap: coloured pixel touches transparency\/edge at/, "Outline gap at").replace(/^stray pixel at/, "Stray pixel at").replace(/^unused palette keys: .*/, "Some colours aren't used.");
    list.innerHTML = [...errs.map((m) => `<li class="err">${esc(nice(m))}</li>`), ...warns.map((m) => `<li class="warn">${esc(nice(m))}</li>`)].join("")
      || '<li class="ok">Ready: closed outline, no stray pixels, centred.</li>';
    badge.hidden = !(errs.length || warns.length);
    badge.textContent = errs.length || warns.length;
    badge.classList.toggle("warn", !errs.length);
  }
  function refresh() {
    render(); renderPreview(); renderPalette(); renderDocs(); renderChecks(); save();
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
  // the cell plus its mirror images, for the mirrors that are on
  function mirrored(x, y) {
    const pts = [[x, y]];
    if (mirrorX) pts.push([N - 1 - x, y]);
    if (mirrorY) pts.push([x, N - 1 - y]);
    if (mirrorX && mirrorY) pts.push([N - 1 - x, N - 1 - y]);
    return pts;
  }
  function apply(x, y, e) {
    const g = doc().grid;
    const t = e && e.altKey ? "pick" : tool;
    if (t === "pick") { if (g[y][x] !== ".") { key = g[y][x]; setTool("pencil"); renderPalette(); } return; }
    for (const [a, b] of mirrored(x, y)) {
      if (t === "fill") fill(a, b, key);
      else g[b][a] = t === "eraser" ? "." : key;
    }
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
  // status line: the cell under the pointer and the colour you're drawing with
  canvas.addEventListener("pointermove", (e) => {
    const c = cellAt(e); if (!c) return;
    const v = (doc().style === "bw" ? BW_PALETTE : doc().palette)[key] || "#000000";
    $("#ed-pos").innerHTML = `x ${c[0]}, y ${c[1]} · <i style="background:${v}"></i>${key === "K" ? "Outline" : v.toUpperCase()}`;
  });
  canvas.addEventListener("pointerleave", () => { $("#ed-pos").textContent = "Hover the grid"; });
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  function refreshCanvasOnly() { render(); }

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
    canvas.dataset.tool = t;
    renderTip();
  }
  function renderTip() {
    const m = mirrorX && mirrorY ? " Mirroring into all four quarters." : mirrorX ? " Mirroring left to right." : mirrorY ? " Mirroring top to bottom." : "";
    $("#ed-tip").textContent = TIPS[tool] + m;
  }
  // mirrors: whatever you draw on one side is copied to the other, across the dotted line
  function setMirror(axis, on) {
    if (axis === "x") mirrorX = on; else mirrorY = on;
    $("#ed-mirror-x").setAttribute("aria-pressed", mirrorX);
    $("#ed-mirror-y").setAttribute("aria-pressed", mirrorY);
    renderTip(); render();
  }
  $("#ed-mirror-x").addEventListener("click", () => setMirror("x", !mirrorX));
  $("#ed-mirror-y").addEventListener("click", () => setMirror("y", !mirrorY));
  $$("#editor [data-tool]").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool)));
  $("#ed-undo").addEventListener("click", undo);
  $("#ed-redo").addEventListener("click", redo);
  $("#ed-clear").addEventListener("click", () => {
    pushUndo();
    doc().grid = Array.from({ length: N }, () => Array(N).fill("."));
    // a cleared drawing is a new icon, so it gets the next number
    if (mode === "draft" && isDefaultName(doc().name)) doc().name = nextName();
    refresh();
    toast("Cleared. Undo brings it back.");
  });
  document.addEventListener("keydown", (e) => {
    // shortcuts only while the editor window is open and you're not typing
    if (!$("#editor").open || $("#paste-dialog").open) return;
    if (e.target.closest("input, textarea, select")) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; } // Windows-style redo
    if (mod) return;
    if (e.key.toLowerCase() === "m") { setMirror("x", !mirrorX); return; }
    const t = { p: "pencil", e: "eraser", f: "fill", i: "pick" }[e.key.toLowerCase()];
    if (t) setTool(t);
  });

  // ---------- palette ----------
  // Our own small colour box, so the hex code is what people see first.
  // The swatch inside it opens the browser's visual picker.
  const pop = $("#hex-pop"), hexIn = $("#hex-in"), hexSw = $("#hex-swatch");
  let editing = null; // palette key being changed, or null when adding
  const normHex = (v) => {
    let h = v.trim().replace(/^#/, "").toLowerCase();
    if (/^[0-9a-f]{3}$/.test(h)) h = [...h].map((c) => c + c).join("");
    return /^[0-9a-f]{6}$/.test(h) ? `#${h}` : null;
  };
  function openPop(k) {
    editing = k;
    const start = k ? doc().palette[k] : "#3fae49";
    hexIn.value = start.toUpperCase(); hexSw.value = start;
    $("#hex-title").textContent = k ? "Change colour" : "Add a colour";
    $("#hex-ok").textContent = k ? "Done" : "Add";
    $("#hex-err").textContent = "";
    pop.hidden = false;
    hexIn.focus(); hexIn.select();
  }
  function closePop() { pop.hidden = true; editing = null; }
  function applyPop() {
    const v = normHex(hexIn.value);
    if (!v) { $("#hex-err").textContent = "Use a hex code like #3FAE49."; hexIn.focus(); return; }
    const d = doc();
    pushUndo();
    if (editing) d.palette[editing] = v;
    else {
      const free = [...KEYS].find((k) => !(k in d.palette));
      if (!free) { toast("The palette is full."); closePop(); return; }
      d.palette[free] = v; key = free;
      if (tool === "eraser" || tool === "pick") setTool("pencil");
    }
    closePop();
    refresh();
  }
  hexIn.addEventListener("input", () => { const v = normHex(hexIn.value); if (v) hexSw.value = v; $("#hex-err").textContent = ""; });
  hexSw.addEventListener("input", () => { hexIn.value = hexSw.value.toUpperCase(); });
  // the hex field stays the default; Pick opens the system colour picker for anyone who'd rather choose by eye
  $("#hex-pick").addEventListener("click", () => { try { hexSw.showPicker(); } catch { hexSw.click(); } });
  $("#hex-form").addEventListener("submit", (e) => { e.preventDefault(); applyPop(); });
  $("#hex-cancel").addEventListener("click", closePop);
  pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePop(); } });
  $("#ed-add-btn").addEventListener("click", () => (pop.hidden || editing ? openPop(null) : closePop()));
  $("#ed-swatches").addEventListener("click", (e) => {
    const b = e.target.closest(".swatch"); if (!b) return;
    const k = b.dataset.key;
    if (k === key && k !== "K" && doc().style !== "bw") { openPop(k); return; }
    key = k;
    if (tool === "eraser" || tool === "pick") setTool("pencil");
    renderPalette();
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

  // ---------- export: pick a format, then Copy or Download (same as the library's icon window) ----------
  let fmt = "svg";
  $$("#editor [data-efmt]").forEach((b) => b.addEventListener("click", () => {
    fmt = b.dataset.efmt;
    $$("#editor [data-efmt]").forEach((x) => x.setAttribute("aria-checked", x === b));
    $(".ed-ext").textContent = `.${fmt}`;
  }));
  const pngBlob = (d) => new Promise((res) => {
    const c = document.createElement("canvas"), s = 16; c.width = c.height = N * s; const x = c.getContext("2d");
    d.grid.forEach((row, y) => [...row].forEach((k, i) => { if (k !== ".") { x.fillStyle = d.palette[k]; x.fillRect(i * s, y * s, s, s); } }));
    c.toBlob(res, "image/png");
  });
  const jsonText = (d) => JSON.stringify(used(d), null, 1);
  $("#ed-download").addEventListener("click", async () => {
    const d = toPlain(doc()), name = slugify(d.name);
    if (fmt === "png") {
      const b = await pngBlob(d), a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = `${name}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (fmt === "json") download(`${name}.json`, jsonText(d), "application/json");
    else download(`${name}.svg`, svg(d));
    toast(`Downloaded ${name}.${fmt}`);
  });
  $("#ed-copy").addEventListener("click", async () => {
    const d = toPlain(doc());
    let ok = false;
    if (fmt === "png") {
      try { await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob(d) })]); ok = true; } catch { ok = false; }
    } else ok = await copyText(fmt === "json" ? jsonText(d) : svg(d));
    toast(ok ? `${fmt.toUpperCase()} copied.` : "Couldn't copy. Your browser blocked the clipboard.");
  });

  // inspector tabs
  $$("#editor [data-tab]").forEach((t) => t.addEventListener("click", () => {
    $$("#editor [data-tab]").forEach((b) => b.setAttribute("aria-selected", b === t));
    $$("#editor [data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== t.dataset.tab));
  }));

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
    $("#ed-title").textContent = "Draw it";
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
