import { iconSvg, toast, copyText, download, esc, slugify } from "./util.js";
import { makeIcon, MODELS, savedKey, rememberKey } from "./make.js";
import { buildPrompt } from "./prompt.js";
import { initEditor } from "./editor.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const lib = await fetch("data/icons.json").then((r) => r.json());
const bySlug = (s) => lib.find((ic) => ic.slug === s);
const asDoc = (ic) => ({ name: ic.slug, style: "color", ...ic.color });
const example = bySlug("lantern") || lib[0];
const editor = initEditor();
// a chunkier pencil drawn for the "Draw yourself" button, shown at 24px (3 device pixels per pixel on Retina)
const DRAW_ICON = { palette: {"K": "#000000", "p": "#f39bb0", "q": "#d06a86", "m": "#cfcfcf", "g": "#8e8e8e", "y": "#f7d84a", "s": "#d9a21f", "w": "#f3cf96"}, grid: ["................", "............KK..", "...........KppK.", "..........KppqK.", ".........KmmqK..", "........KymgK...", ".......KyysK....", "......KyysK.....", ".....KyysK......", "....KyysK.......", "...KyysK........", "..KwwwK.........", "..KwwK..........", ".KKwK...........", ".KKK............", "................"] };
$("#dock-draw-ic").innerHTML = iconSvg(DRAW_ICON, 24);

// Free route: open a new chat with the prompt filled in. The visitor reviews it and presses send.
const CHATS = {
  claude: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
  chatgpt: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
};
// Real links (not window.open), so they work in every browser and frame. Each link's href follows its word.
function setChatLinks(scope, word) {
  $$('a[data-chat]', scope).forEach((a) => {
    a.href = word ? CHATS[a.dataset.chat](buildPrompt(word, example)) : CHATS[a.dataset.chat]("").replace(/\?q=$/, "");
    a.dataset.word = word;
  });
}

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
const chatForm = $("#prompt-form");
$("#prompt-word").addEventListener("input", (e) => setChatLinks(chatForm, e.target.value.trim()));
chatForm.addEventListener("submit", (e) => { e.preventDefault(); $('a[data-chat="claude"]', chatForm).click(); });
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-chat]");
  if (a) {
    if (!a.dataset.word) { e.preventDefault(); toast("Type a word first."); return; }
    toast("When the icon comes back, paste the reply into the editor.");
  }
  const c = e.target.closest('button[data-chat="copy"]');
  if (c) {
    const w = c.closest("#lib-empty") ? search.value.trim() : $("#prompt-word").value.trim();
    if (!w) { toast("Type a word first."); return; }
    copyPrompt(w);
  }
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
    $$("#lib-empty .lib-empty-actions, #lib-empty .hint").forEach((el) => (el.hidden = !w));
    setChatLinks($("#lib-empty"), w);
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
    if (e.key === "Enter") { e.preventDefault(); if (tiles.length) tiles[0].click(); else if (search.value.trim()) $('#lib-empty a[data-chat="claude"]').click(); }
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
$("#dt-edit").addEventListener("click", () => openEditor([asDoc(current)], current.label));

// ---------- editor ----------
const edDlg = $("#editor");
// opened with an icon: edit just that icon. Opened without: your own drawing.
function openEditor(docs, title) {
  closeAll();
  if (docs) editor.open(docs, 0, title); else editor.openDraft();
  edDlg.showModal();
}

// ---------- make an icon (visitor's own API key) ----------
const mkDlg = $("#make");
let made = null, job = null;
$("#mk-model").innerHTML = MODELS.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join("");
function openMake(word) {
  closeAll();
  if (word) { $("#mk-word").value = word; mkView("form"); }
  const k = savedKey();
  if (k && !$("#mk-key").value) { $("#mk-key").value = k; $("#mk-remember").checked = true; }
  mkDlg.showModal();
  (!$("#mk-word").value ? $("#mk-word") : !$("#mk-key").value ? $("#mk-key") : $("#mk-go")).focus();
}
function mkView(state) {
  $("#mk-form").hidden = state !== "form";
  $("#mk-status").hidden = state !== "busy";
  $("#mk-result").hidden = state !== "done";
}
$("#mk-remember").addEventListener("change", (e) => rememberKey(e.target.checked ? $("#mk-key").value.trim() : ""));
$("#mk-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const word = $("#mk-word").value.trim(), key = $("#mk-key").value.trim();
  $("#mk-error").textContent = "";
  if (!word) { $("#mk-word").focus(); return; }
  if (!key.startsWith("sk-ant-")) { $("#mk-error").textContent = "That doesn't look like an Anthropic API key. Keys start with sk-ant-."; $("#mk-key").focus(); return; }
  if ($("#mk-remember").checked) rememberKey(key);
  job = new AbortController();
  mkView("busy");
  try {
    const r = await makeIcon({ word, key, model: $("#mk-model").value, example: bySlug("lantern") || lib[0], signal: job.signal, onStep: (t) => ($("#mk-step").textContent = t) });
    r.doc.name = slugify(word);
    made = { slug: r.doc.name, label: word, category: "Made by you", keywords: [], color: { palette: r.doc.palette, grid: r.doc.grid } };
    $("#mk-stage").innerHTML = iconSvg(r.doc, 128);
    $("#mk-idea").textContent = r.idea;
    $("#mk-note").textContent = r.errs.length
      ? `It still breaks ${r.errs.length === 1 ? "1 style rule" : `${r.errs.length} style rules`}. Try again, or touch it up in the editor.`
      : r.warns.length ? `Passes the style checks, with a note: ${r.warns[0]}.` : "Passes every style check.";
    mkView("done");
    $("#mk-svg").focus();
  } catch (err) {
    mkView("form");
    if (err.name !== "AbortError") $("#mk-error").textContent = err.message;
  } finally { job = null; }
});
$("#mk-cancel").addEventListener("click", () => job?.abort());
mkDlg.addEventListener("close", () => job?.abort());
$("#mk-svg").addEventListener("click", () => { download(`${made.slug}.svg`, iconSvg(asDoc(made))); toast(`Downloaded ${made.slug}.svg`); });
$("#mk-more").addEventListener("click", () => openDetail(made, false));
$("#mk-edit").addEventListener("click", () => openEditor([asDoc(made)], made.label));
$("#mk-again").addEventListener("click", () => { mkView("form"); $("#mk-word").select(); $("#mk-word").focus(); });
$("#lib-empty-make").addEventListener("click", (e) => { e.preventDefault(); openMake(search.value.trim()); });

// ---------- wiring ----------
function closeAll() { $$("dialog[open]").forEach((d) => d.close()); }
document.addEventListener("click", (e) => {
  const t = e.target;
  const o = t.closest("[data-open]");
  if (o) openDetail(bySlug(o.dataset.open), !!o.closest("#library"));
  if (t.closest("[data-open-library]")) { e.preventDefault(); openLibrary(); }
  if (t.closest("[data-open-draw]")) { e.preventDefault(); openEditor(); }
  if (t.closest("[data-open-paste]")) { e.preventDefault(); openEditor(); editor.openPaste(); }
  if (t.closest("[data-open-make]")) { e.preventDefault(); openMake($("#prompt-word").value.trim()); }
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
if (location.hash === "#editor" || location.hash === "#draw") openEditor();
if (location.hash === "#paste") { openEditor(); editor.openPaste(); }
if (location.hash === "#library") openLibrary();
if (location.hash === "#make") openMake();
