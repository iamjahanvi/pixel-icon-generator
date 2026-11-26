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

// ---------- the word wall ----------
// [slug, word, colour, weight]: each word takes its icon's colour; weights alternate like a checkerboard.
const WALL = [
  [["heart", "Heart", "#e8243c", 600], ["fish", "Goldfish", "#f5861f", 300], ["tree", "Tree", "#3fae49", 600], ["donut", "Donut", "#ec6f9e", 300]],
  [["rain", "Rain", "#3a8ee6", 300], ["key", "Key", "#d9a21a", 600], ["mushroom", "Mushroom", "#e5322d", 300], ["lantern", "Lantern", "#d4a52a", 600]],
  [["pizza", "Pizza", "#e2a04a", 300], ["house", "House", "#d9483b", 600], ["camera", "Camera", "#4a4f57", 300], ["tulip", "Tulip", "#3a9a3e", 600]],
  [["sunset", "Sunset", "#2a6f9e", 600], ["pencil", "Pencil", "#e09a12", 300], ["clock", "Clock", "#e23b3b", 600], ["ice-cream", "Ice cream", "#e0679b", 300]],
];
const LEAD = ["coffee", "Coffee", "#6b3b1f", 600];
const TRAIL = ["book", "Book", "#d93a3a", 300];
const wordBtn = ([slug, word, color, weight]) => {
  const ic = bySlug(slug);
  return ic ? `<button class="w w-btn" type="button" data-open="${slug}" style="color:${color};font-weight:${weight}" aria-label="${esc(ic.label)}">${esc(word)}${iconSvg(asDoc(ic), 64)}</button>` : "";
};
// the three word rows scroll as marquees: one group of words repeated twice, the copy hidden from screen readers and Tab
$$(".wall-row[data-row]").forEach((row) => {
  const words = WALL[+row.dataset.row].map(wordBtn).join("");
  const copy = words.replace(/<button /g, '<button tabindex="-1" ');
  row.classList.add("marquee");
  row.innerHTML = `<div class="marquee-track"><div class="marquee-group">${words}${copy}</div><div class="marquee-group" aria-hidden="true">${copy}${copy}</div></div>`;
});
$("[data-lead]").outerHTML = wordBtn(LEAD).replace('class="w w-btn"', 'class="w w-btn lead"');
$("[data-trail]").outerHTML = wordBtn(TRAIL).replace('class="w w-btn"', 'class="w w-btn trail"');

// typing a word: the chat links follow it, and if the library already has that icon it drops into the slot
const wordIn = $("#word"), slot = $("#slot");
const findIcon = (w) => {
  const q = w.toLowerCase();
  return q && lib.find((ic) => ic.slug === q || ic.label.toLowerCase() === q || ic.keywords.includes(q));
};
function onWord() {
  const w = wordIn.value.trim();
  setChatLinks($("#pill-cta"), w);
  // the Claude and ChatGPT buttons pop up inside the field once there's a word
  $(".pill-in").classList.toggle("has-word", !!w);
  $$("#pill-cta a").forEach((a) => (a.tabIndex = w ? 0 : -1));
  setChatLinks($("#any-chat"), w || "lantern");
  $("#chat-word").textContent = w || "lantern";
  showSlot(findIcon(w));
}

// the slot beside the field: an icon poofs in when a word matches, and poofs out when it stops matching
let slotSlug = null, slotJob = 0;
const calm = matchMedia("(prefers-reduced-motion: reduce)");
// pixel smoke: little 16-bit puffs, drawn on the same pixel grid as the icons, that pop out from the edges and shrink away in steps
const PX = 0.93 / 16; // one icon pixel, in em
const cloud = (rows) => {
  const h = rows.length, w = rows[0].length;
  let r = "";
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${ch === "o" ? "#b9b9b9" : "#ececec"}"/>`; }));
  return `<svg viewBox="0 0 ${w} ${h}" style="width:${w * PX}em;height:${h * PX}em" shape-rendering="crispEdges">${r}</svg>`;
};
const BIG = cloud(["..oo...", ".owwoo.", "owwwwwo", "owwwwwo", ".ooooo."]);
const MID = cloud([".ooo.", "owwwo", "owwwo", ".ooo."]);
const SMALL = cloud([".o.", "owo", ".o."]);
const PUFFS = [[-0.52, 0.38, 2], [0.54, 0.36, 2], [-0.62, -0.04, 1], [0.64, 0.02, 1], [-0.4, -0.5, 2], [0.42, -0.52, 1], [0, 0.6, 0], [0.04, -0.66, 2], [-0.68, 0.5, 0], [0.7, -0.4, 0]];
function puff() {
  if (calm.matches) return;
  const box = document.createElement("span");
  box.className = "puff";
  box.setAttribute("aria-hidden", "true");
  PUFFS.forEach(([x, y, big], i) => {
    const c = document.createElement("span");
    c.className = "smoke";
    c.innerHTML = [SMALL, MID, BIG][big];
    box.append(c);
    const dx = x * 0.28, dy = y * 0.28 - 0.08;
    c.animate([
      { transform: `translate(calc(-50% + ${x * 0.7}em), calc(-50% + ${y * 0.7}em)) scale(0.5)`, opacity: 1 },
      { transform: `translate(calc(-50% + ${x}em), calc(-50% + ${y}em)) scale(1)`, opacity: 1, offset: 0.3 },
      { transform: `translate(calc(-50% + ${x + dx}em), calc(-50% + ${y + dy}em)) scale(0.25)`, opacity: 0 },
    ], { duration: 600, delay: (i % 3) * 35, easing: "steps(7, end)", fill: "both" });
  });
  slot.append(box);
  setTimeout(() => box.remove(), 700);
}
const tint = (ic) => Object.values(ic.color.palette).filter((c) => c !== "#000000" && c !== "#ffffff").slice(0, 3).concat("#000000");
async function showSlot(ic) {
  const slug = ic ? ic.slug : null;
  if (slug === slotSlug) return;
  const job = ++slotJob, was = slotSlug && bySlug(slotSlug), old = $("svg", slot);
  slotSlug = slug;
  if (old && was && !calm.matches) {
    puff();
    await old.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.4)", opacity: 0 }],
      { duration: 240, easing: "steps(4, end)", fill: "forwards" }).finished;
    if (job !== slotJob) return;
  }
  slot.classList.toggle("found", !!ic);
  slot.disabled = !ic;
  slot.innerHTML = ic ? iconSvg(asDoc(ic), 64) : '<span class="q" aria-hidden="true">?</span>';
  slot.setAttribute("aria-label", ic ? `${ic.label}: already in the library` : "Your icon will appear here");
  if (ic) slot.dataset.open = ic.slug; else delete slot.dataset.open;
  if (calm.matches) return;
  if (ic) {
    puff();
    $("svg", slot).animate([{ transform: "scale(0.5)", opacity: 0 }, { transform: "scale(1.08)", opacity: 1, offset: 0.7 }, { transform: "scale(1)", opacity: 1 }],
      { duration: 360, delay: 70, easing: "steps(6, end)", fill: "backwards" });
  } else {
    $(".q", slot).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
  }
}
wordIn.addEventListener("input", onWord);

// demo typing: while the field is empty and not focused, words type themselves out and get erased
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // all from the library, so each one has an icon to poof into the slot
  const WORDS = ["rocket", "umbrella", "cat", "lightning", "snail", "lightbulb", "cherry", "envelope", "moon", "bird"];
  const pill = $(".pill-in"), demo = $("#type-demo"), out = $("#type-demo-text");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const live = () => !wordIn.value && document.activeElement !== wordIn;
  const sync = () => pill.classList.toggle("demo", live());
  ["focus", "blur", "input"].forEach((ev) => wordIn.addEventListener(ev, sync));
  sync();
  (async () => {
    for (let i = 0; ; i = (i + 1) % WORDS.length) {
      if (!live()) { out.textContent = ""; onWord(); while (!live()) await wait(400); }
      const w = WORDS[i];
      demo.classList.add("busy");
      for (let n = 1; n <= w.length; n++) { out.textContent = w.slice(0, n); await wait(90 + Math.random() * 70); }
      demo.classList.remove("busy");
      if (live()) showSlot(bySlug(w));
      await wait(1600);
      if (live()) showSlot(null);
      demo.classList.add("busy");
      for (let n = w.length - 1; n >= 0; n--) { out.textContent = w.slice(0, n); await wait(45); }
      demo.classList.remove("busy");
      await wait(450);
    }
  })();
})();
onWord();
$("#word-form").addEventListener("submit", (e) => { e.preventDefault(); $('#pill-cta a[data-chat="claude"]').click(); });
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-chat]");
  if (a) {
    if (!a.dataset.word) { e.preventDefault(); toast("Type a word first."); (a.closest("#pill-cta") ? wordIn : search).focus(); return; }
    toast("When the icon comes back, paste the reply into the editor.");
  }
  const c = e.target.closest('button[data-chat="copy"]');
  if (c) {
    const w = c.closest("#lib-empty") ? search.value.trim() : wordIn.value.trim() || "lantern";
    if (!w) { toast("Type a word first."); return; }
    copyPrompt(w);
  }
});

// ---------- how it works: the rocket, as a word, a plan and an SVG ----------
const rocket = bySlug("rocket");
if (rocket) {
  $("#rocket-grid").textContent = rocket.color.grid.join("\n");
  $("#rocket-icon").innerHTML = iconSvg(asDoc(rocket), 160);
}

// ---------- icon table: pick a cell and it expands in place, its neighbours reflow around it ----------
const TABLE = ["cherry", "lantern", "rocket", "cat", "mushroom", "heart", "fish", "donut", "coffee", "pizza", "tree", "camera", "house"];
let featured = "cat", featCol = 4, featRow = 1;
const vtName = (slug) => `pi-${slug}`;
function renderTable() {
  const feature = (f) => `<div class="feature" aria-live="polite" style="--fc:${featCol};--fr:${featRow};view-transition-name:${vtName(f.slug)}">${iconSvg(asDoc(f), 160)}<strong>${esc(f.label)}</strong>
      <span class="acts"><button class="solid" type="button" data-f="svg">SVG</button><button class="ghost" type="button" data-f="png">PNG</button><button class="ghost" type="button" data-f="code">Code</button><button class="ghost" type="button" data-f="edit">Edit</button></span></div>`;
  $("#table").innerHTML = TABLE.map((s) => bySlug(s)).filter(Boolean).map((ic) => ic.slug === featured ? feature(ic)
    : `<button class="cell" type="button" data-pick="${ic.slug}" style="view-transition-name:${vtName(ic.slug)}">${iconSvg(asDoc(ic), 56)}${esc(ic.slug === "fish" ? "goldfish" : ic.slug)}</button>`).join("");
}
renderTable();
$("#table").addEventListener("click", (e) => {
  const p = e.target.closest("[data-pick]");
  if (p) {
    // which column was it in? the big tile opens there (pulled in one if it was in the last column)
    const cols = getComputedStyle($("#table")).gridTemplateColumns.split(" ").length;
    const col = Math.round(p.offsetLeft / p.offsetWidth) + 1, row = Math.round(p.offsetTop / p.offsetHeight) + 1;
    const rows = Math.ceil((TABLE.length + 3) / cols);
    const swap = () => { featured = p.dataset.pick; featCol = Math.min(col, cols - 1); featRow = Math.min(row, rows - 1); renderTable(); };
    if (document.startViewTransition && !calm.matches) document.startViewTransition(swap).finished.then(() => $('.feature [data-f="svg"]').focus({ preventScroll: true }));
    else { swap(); $('.feature [data-f="svg"]').focus({ preventScroll: true }); }
    return;
  }
  const f = e.target.closest("[data-f]")?.dataset.f, ic = bySlug(featured);
  if (f === "svg") { download(`${ic.slug}.svg`, iconSvg(asDoc(ic))); toast(`Downloaded ${ic.slug}.svg`); }
  if (f === "png") savePng(ic, 256);
  if (f === "code") openDetail(ic, false);
  if (f === "edit") openEditor([asDoc(ic)], ic.label);
});

// ---------- install rows ----------
$$("[data-copy-btn]").forEach((b) => b.addEventListener("click", async () => {
  const cmd = $(".cmd", b.closest(".row"));
  const ok = await copyText(cmd.dataset.copy || cmd.textContent.trim());
  const label = b.textContent;
  b.textContent = ok ? "Copied" : "Couldn't copy";
  setTimeout(() => (b.textContent = label), 1500);
}));

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
function savePng(ic, px) {
  const d = asDoc(ic), c = document.createElement("canvas");
  c.width = c.height = px;
  const ctx = c.getContext("2d"), k = px / 16;
  d.grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") { ctx.fillStyle = d.palette[ch]; ctx.fillRect(x * k, y * k, k, k); } }));
  c.toBlob((blob) => {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `${ic.slug}-${px}.png`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Downloaded ${ic.slug}-${px}.png`);
  });
}
$("#dt-png").addEventListener("click", () => savePng(current, size));
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

// ---------- views: the pills at the bottom swap the hero for another view ----------
const VIEWS = ["icons", "install", "how"];
let view = null;
function showView(name, { focus = true } = {}) {
  view = VIEWS.includes(name) ? name : null;
  $("#view-home").hidden = !!view;
  VIEWS.forEach((v) => ($("#" + v).hidden = v !== view));
  $$(".pill-btn[data-view]").forEach((b) => {
    const on = b.dataset.view === view;
    b.setAttribute("aria-pressed", on);
    const label = $(".pl", b).textContent;
    b.setAttribute("aria-label", on ? `Close ${label.toLowerCase()}` : label);
  });
  try { history.replaceState(null, "", view ? `#${view}` : location.pathname + location.search); } catch { /* sandboxed */ }
  if (focus) (view ? $("#" + view) : wordIn).focus({ preventScroll: true });
}
$$(".pill-btn[data-view]").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view === view ? null : b.dataset.view)));
$("[data-home]").addEventListener("click", (e) => { e.preventDefault(); showView(null); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && view && !document.querySelector("dialog[open]")) showView(null);
});
if (VIEWS.includes(location.hash.slice(1))) showView(location.hash.slice(1), { focus: false });

// ---------- wiring ----------
function closeAll() { $$("dialog[open]").forEach((d) => d.close()); }
document.addEventListener("click", (e) => {
  const t = e.target;
  const o = t.closest("[data-open]");
  if (o) openDetail(bySlug(o.dataset.open), !!o.closest("#library"));
  if (t.closest("[data-open-library]")) { e.preventDefault(); openLibrary(); }
  if (t.closest("[data-open-draw]")) { e.preventDefault(); openEditor(); }
  if (t.closest("[data-open-paste]")) { e.preventDefault(); openEditor(); editor.openPaste(); }
  if (t.closest("[data-open-make]")) { e.preventDefault(); openMake(wordIn.value.trim()); }
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

// show the shortcut the visitor actually has
if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) $("#kbd-k").textContent = "Ctrl K";

// ---------- switch: stop the marquees (remembered on this device) ----------
(() => {
  const root = document.documentElement;
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };
  const motion = $("#tog-motion");
  const setStill = (on) => {
    root.classList.toggle("still", on);
    motion.setAttribute("aria-pressed", on);
    motion.setAttribute("aria-label", on ? "Start the moving rows" : "Stop the moving rows");
    motion.title = motion.getAttribute("aria-label");
  };
  setStill(get("pi-still") === "1");
  motion.addEventListener("click", () => { const on = !root.classList.contains("still"); setStill(on); put("pi-still", on ? "1" : "0"); });
})();
