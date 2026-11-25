import { iconSvg, toast, copyText, download, esc } from "./util.js";
import { buildPrompt } from "./prompt.js";
import { initEditor } from "./editor.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const lib = await fetch("data/icons.json").then((r) => r.json());
const bySlug = (s) => lib.find((ic) => ic.slug === s);
const asDoc = (ic) => ({ name: ic.slug, style: "color", ...ic.color });
const example = bySlug("lantern") || lib[0];
const editor = initEditor(() => [asDoc(bySlug("cat") || lib[0])]);

async function copyPrompt(word) {
  const ok = await copyText(buildPrompt(word, example));
  toast(ok ? "Prompt copied. Paste it into any AI chat." : "Couldn't copy. Your browser blocked the clipboard.");
}

// ---------- scattered icons around the headline ----------
// [slug, left %, top %]; every icon is the same size (a whole multiple of 16). Phones get a smaller set along the top.
const SCATTER_SIZE = { wide: 64, narrow: 48 };
const WIDE = [
  ["cherry", 8, 14], ["lantern", 22, 9], ["cat", 13, 40], ["pizza", 4, 64],
  ["mushroom", 19, 72], ["tulip", 9, 86], ["rocket", 80, 13], ["heart", 91, 30],
  ["moon", 84, 47], ["fish", 76, 68], ["camera", 90, 80], ["donut", 68, 8],
  ["house", 30, 86], ["umbrella", 66, 86], ["ice-cream", 26, 30], ["bird", 72, 33],
];
const NARROW = [
  ["cherry", 12, 9], ["lantern", 30, 15], ["cat", 50, 8], ["rocket", 70, 15], ["mushroom", 88, 9],
];
function renderScatter() {
  const narrow = matchMedia("(max-width: 720px)").matches;
  $("#scatter").innerHTML = (narrow ? NARROW : WIDE).map(([slug, x, y]) => {
    const s = narrow ? SCATTER_SIZE.narrow : SCATTER_SIZE.wide;
    const ic = bySlug(slug);
    if (!ic) return "";
    const top = narrow ? `calc(${y}vh + 24px)` : `${y}vh`;
    return `<button class="sc" type="button" data-open="${slug}" aria-label="${esc(ic.label)}"
      style="left:calc(${x}% - ${s / 2}px);top:calc(${top} - ${s / 2}px);width:${s}px;height:${s}px">${iconSvg(asDoc(ic), s)}</button>`;
  }).join("");
}
renderScatter();
matchMedia("(max-width: 720px)").addEventListener("change", renderScatter);

// ---------- install box ----------
const tabs = $$('.install-tabs [role="tab"]');
function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  });
  if (focus) tab.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t));
  t.addEventListener("keydown", (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
  });
});
$$(".line .copy").forEach((b) => b.addEventListener("click", async () => {
  const code = b.previousElementSibling.cloneNode(true);
  code.querySelectorAll(".prompt").forEach((p) => p.remove());
  const ok = await copyText(code.textContent.trim());
  b.textContent = ok ? "Copied" : "Couldn't copy";
  setTimeout(() => (b.textContent = "Copy"), 1500);
}));
$("#prompt-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const w = $("#prompt-word").value.trim();
  if (!w) { toast("Type a word first."); $("#prompt-word").focus(); return; }
  copyPrompt(w);
});

// ---------- library palette ----------
const libDlg = $("#library"), search = $("#lib-search"), grid = $("#lib-grid");
let cat = "All";
const cats = ["All", ...new Set(lib.map((ic) => ic.category))];
const count = (c) => (c === "All" ? lib.length : lib.filter((ic) => ic.category === c).length);
$("#lib-cats").innerHTML = cats.map((c) => `<button type="button" aria-pressed="${c === cat}" data-cat="${esc(c)}">${esc(c)} <span class="n">${count(c)}</span></button>`).join("");
$$("#lib-cats button").forEach((b) => b.addEventListener("click", () => {
  cat = b.dataset.cat;
  $$("#lib-cats button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  renderLib();
}));
search.addEventListener("input", renderLib);

function renderLib() {
  const q = search.value.toLowerCase().trim();
  const items = lib.filter((ic) =>
    (cat === "All" || ic.category === cat) &&
    (!q || ic.label.toLowerCase().includes(q) || ic.category.toLowerCase().includes(q) || ic.keywords.some((k) => k.includes(q))));
  grid.innerHTML = items.map((ic) => `<li><button class="tile" type="button" data-open="${ic.slug}">
      ${iconSvg(asDoc(ic), 48)}<span>${esc(ic.label)}</span></button></li>`).join("");
  grid.hidden = !items.length;
  $("#lib-empty").hidden = items.length > 0;
  if (!items.length) {
    const w = search.value.trim();
    $("#lib-empty-text").textContent = w ? `No icon for “${w}” yet. Your AI tool can draw it.` : "No icons in this category yet.";
    $("#lib-empty-prompt").textContent = w ? `Copy prompt for “${w}”` : "Copy prompt";
    $("#lib-empty-prompt").dataset.prompt = w;
    $("#lib-empty-prompt").hidden = !w;
  }
}
renderLib();

function openLibrary() {
  closeAll();
  libDlg.showModal();
  search.focus();
  search.select();
}

// arrow keys move between tiles; down from the search box enters the grid
libDlg.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { e.preventDefault(); libDlg.close(); return; }
  const tiles = $$(".tile", grid);
  if (e.target === search) {
    if (e.key === "ArrowDown" && tiles.length) { e.preventDefault(); tiles[0].focus(); }
    if (e.key === "Enter") { e.preventDefault(); if (tiles.length) tiles[0].click(); else if (search.value.trim()) copyPrompt(search.value.trim()); }
    return;
  }
  const i = tiles.indexOf(e.target);
  if (i < 0) return;
  const cols = Math.max(1, tiles.filter((t) => t.offsetTop === tiles[0].offsetTop).length);
  const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
  if (step === undefined) return;
  e.preventDefault();
  const j = i + step;
  if (j < 0) search.focus(); else if (j < tiles.length) tiles[j].focus();
});

// ---------- one icon ----------
const dtDlg = $("#detail");
const SIZES = [16, 32, 48, 64, 96, 128];
let current = null, size = 64, fmt = "svg", cameFromLibrary = false;
$("#dt-sizes").innerHTML = SIZES.map((s) => `<button type="button" role="radio" data-size="${s}" aria-checked="${s === size}">${s}</button>`).join("");
$$("#dt-sizes button").forEach((b) => b.addEventListener("click", () => { size = +b.dataset.size; renderDetail(); }));
$$(".code-tabs [role='tab']").forEach((b) => b.addEventListener("click", () => { fmt = b.dataset.fmt; renderDetail(); }));

const pascal = (s) => s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
function paths(d) {
  // one <path> per colour, built from horizontal runs: compact enough to paste into code
  const by = {};
  d.grid.forEach((row, y) => {
    for (let x = 0; x < 16;) {
      const k = row[x];
      if (k === ".") { x++; continue; }
      let n = 1;
      while (x + n < 16 && row[x + n] === k) n++;
      (by[k] ||= []).push(`M${x} ${y}h${n}v1h-${n}z`);
      x += n;
    }
  });
  return Object.entries(by).map(([k, p]) => [d.palette[k], p.join("")]);
}
function codeFor(ic) {
  const d = asDoc(ic);
  if (fmt === "svg") return iconSvg(d, size);
  if (fmt === "html") return `<img src="${ic.slug}.svg" width="${size}" height="${size}" alt="${ic.label}" style="image-rendering: pixelated">`;
  const body = paths(d).map(([c, p]) => `      <path fill="${c}" d="${p}" />`).join("\n");
  return `export function ${pascal(ic.slug)}Icon({ size = ${size}, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" shapeRendering="crispEdges" {...props}>
${body}
    </svg>
  );
}`;
}
function renderDetail() {
  if (!current) return;
  $("#dt-title").textContent = current.label;
  $("#dt-stage").innerHTML = iconSvg(asDoc(current), size);
  $$("#dt-sizes button").forEach((b) => b.setAttribute("aria-checked", +b.dataset.size === size));
  $$(".code-tabs [role='tab']").forEach((b) => { const on = b.dataset.fmt === fmt; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
  $("#dt-code").textContent = codeFor(current);
}
function openDetail(ic, fromLibrary) {
  if (!ic) return;
  current = ic;
  cameFromLibrary = fromLibrary;
  $("#dt-back").hidden = !fromLibrary;
  closeAll();
  renderDetail();
  dtDlg.showModal();
}
$("#dt-back").addEventListener("click", openLibrary);
$("#dt-copy").addEventListener("click", async () => toast((await copyText($("#dt-code").textContent)) ? "Copied." : "Couldn't copy. Your browser blocked the clipboard."));
$("#dt-svg").addEventListener("click", () => { download(`${current.slug}.svg`, iconSvg(asDoc(current))); toast(`Downloaded ${current.slug}.svg`); });
$("#dt-png").addEventListener("click", () => {
  const d = asDoc(current), c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d"), k = size / 16;
  d.grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") { ctx.fillStyle = d.palette[ch]; ctx.fillRect(x * k, y * k, k, k); } }));
  c.toBlob((blob) => {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `${current.slug}-${size}.png`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Downloaded ${current.slug}-${size}.png`);
  });
});
$("#dt-edit").addEventListener("click", () => openEditor([asDoc(current)]));

// ---------- editor ----------
const edDlg = $("#editor");
function openEditor(docs) {
  closeAll();
  if (docs) editor.open(docs, 0);
  edDlg.showModal();
}

// ---------- wiring ----------
function closeAll() { $$("dialog[open]").forEach((d) => d.close()); }
document.addEventListener("click", (e) => {
  const t = e.target;
  const p = t.closest("[data-prompt]");
  if (p && p.dataset.prompt) copyPrompt(p.dataset.prompt);
  const o = t.closest("[data-open]");
  if (o) openDetail(bySlug(o.dataset.open), !!o.closest("#library"));
  if (t.closest("[data-open-library]")) { e.preventDefault(); openLibrary(); }
  if (t.closest("[data-open-editor]")) { e.preventDefault(); openEditor(); }
  const c = t.closest("[data-close]");
  if (c) c.closest("dialog").close();
});
// click on the backdrop closes a sheet
$$("dialog.sheet").forEach((d) => d.addEventListener("click", (e) => {
  if (e.target !== d) return;
  const r = d.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
}));
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    libDlg.open ? libDlg.close() : openLibrary();
  } else if (e.key === "/" && !e.target.closest("input, textarea, dialog[open]")) {
    e.preventDefault();
    openLibrary();
  }
});
if (location.hash === "#editor") openEditor();
if (location.hash === "#library") openLibrary();
