import { drawIcon, filledCount, iconSvg, toast, copyText, download, reducedMotion, esc } from "./util.js";
import { buildPrompt } from "./prompt.js";
import { initEditor } from "./editor.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const lib = await fetch("data/icons.json").then((r) => r.json());
const asDoc = (ic, style) => ({ name: style === "bw" ? `${ic.slug}-bw` : ic.slug, style, ...ic[style] });
const example = lib.find((ic) => ic.slug === "lantern") || lib[0];
const editor = initEditor(() => { const c = lib.find((ic) => ic.slug === "cat"); return [asDoc(c, "color"), asDoc(c, "bw")]; });

// ---------- copying the prompt ----------
async function copyPrompt(word) {
  const ok = await copyText(buildPrompt(word, example));
  toast(ok ? "Prompt copied. Paste it into your AI chat." : "Couldn't copy. Your browser blocked the clipboard.");
}

// ---------- find a word in the library ----------
function findIcon(word) {
  const w = word.toLowerCase().trim();
  if (!w) return null;
  const singular = w.replace(/(ies)$/, "y").replace(/s$/, "");
  const match = (ic, q) => ic.slug === q || ic.label.toLowerCase() === q || ic.keywords.includes(q);
  return lib.find((ic) => match(ic, w)) || lib.find((ic) => match(ic, singular)) ||
    lib.find((ic) => ic.label.toLowerCase().split(/\s+/).includes(w));
}

// ---------- hero ----------
const heroColor = $("#hero-color"), heroBw = $("#hero-bw");
const wordInput = $("#word"), status = $("#word-status");
let anim = 0;

function drawPair(ic, { animate = true } = {}) {
  cancelAnimationFrame(anim);
  const a = ic && asDoc(ic, "color"), b = ic && asDoc(ic, "bw");
  heroColor.setAttribute("aria-label", ic ? `${ic.label}, colour style` : "Empty grid");
  heroBw.setAttribute("aria-label", ic ? `${ic.label}, black and white style` : "Empty grid");
  if (!ic || !animate || reducedMotion()) {
    drawIcon(heroColor, a); drawIcon(heroBw, b);
    return Promise.resolve();
  }
  const total = Math.max(filledCount(a), filledCount(b));
  const start = performance.now(), dur = 900;
  return new Promise((done) => {
    const step = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const n = Math.ceil(k * total);
      drawIcon(heroColor, a, { upto: n });
      drawIcon(heroBw, b, { upto: n });
      if (k < 1) anim = requestAnimationFrame(step); else done();
    };
    anim = requestAnimationFrame(step);
  });
}

function showWord(word) {
  const ic = findIcon(word);
  if (ic) {
    drawPair(ic);
    status.innerHTML = `<p>“${esc(ic.label)}” is in the library. Once the skill is installed, your AI tool can draw any word like this.</p>
      <button class="btn" type="button" data-open="${ic.slug}">Get the SVGs</button>
      <a class="btn" href="#install">Install the skill</a>`;
  } else {
    drawPair(null);
    status.innerHTML = `<p>“${esc(word)}” isn't in the library yet. Your AI tool can draw it:</p>
      <button class="btn primary" type="button" data-prompt="${esc(word)}">Copy prompt for “${esc(word)}”</button>
      <a class="btn" href="#install">Install the skill</a>`;
  }
}

// autoplay: type a word, draw it, pause, next. Stops as soon as someone interacts.
const demoWords = ["cherry", "lantern", "cat", "rocket", "mushroom", "rain", "pizza"];
let autoplay = !reducedMotion();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function play() {
  for (let i = 0; autoplay; i = (i + 1) % demoWords.length) {
    const w = demoWords[i];
    for (let j = 1; j <= w.length && autoplay; j++) { wordInput.value = w.slice(0, j); await sleep(70); }
    if (!autoplay) return;
    await drawPair(findIcon(w));
    await sleep(2200);
  }
}
const stopAutoplay = () => { autoplay = false; };
wordInput.addEventListener("focus", stopAutoplay);
wordInput.addEventListener("pointerdown", stopAutoplay);
$("#word-form").addEventListener("submit", (e) => {
  e.preventDefault();
  stopAutoplay();
  const w = wordInput.value.trim();
  if (w) showWord(w);
});
if (autoplay) play(); else { wordInput.value = "cherry"; drawPair(findIcon("cherry"), { animate: false }); }

document.addEventListener("click", (e) => {
  const p = e.target.closest("[data-prompt]");
  if (p) copyPrompt(p.dataset.prompt);
  const o = e.target.closest("[data-open]");
  if (o) openDialog(lib.find((ic) => ic.slug === o.dataset.open));
});

// ---------- install tabs ----------
const tabs = $$('[role="tab"]');
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
    if (e.key === "Home") { e.preventDefault(); selectTab(tabs[0], true); }
    if (e.key === "End") { e.preventDefault(); selectTab(tabs.at(-1), true); }
  });
});
$$(".cmd .copy").forEach((b) => b.addEventListener("click", async () => {
  const ok = await copyText(b.previousElementSibling.textContent);
  b.textContent = ok ? "Copied" : "Couldn't copy";
  setTimeout(() => (b.textContent = "Copy"), 1600);
}));
$("#prompt-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const w = $("#prompt-word").value.trim();
  if (!w) { toast("Type a word first."); $("#prompt-word").focus(); return; }
  copyPrompt(w);
});

// ---------- the two styles ----------
const cherry = lib.find((ic) => ic.slug === "cherry") || lib[0];
drawIcon($("#style-color"), asDoc(cherry, "color"));
drawIcon($("#style-bw"), asDoc(cherry, "bw"));

// ---------- library ----------
const grid = $("#lib-grid"), search = $("#lib-search");
let cat = "All", show = "both";
$("#lib-count").textContent = lib.length;
const cats = ["All", ...new Set(lib.map((ic) => ic.category))];
$("#lib-cats").innerHTML = cats.map((c) => `<button type="button" aria-pressed="${c === cat}">${esc(c)}</button>`).join("");
$$("#lib-cats button").forEach((b) => b.addEventListener("click", () => {
  cat = b.textContent;
  $$("#lib-cats button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  renderLib();
}));
$$("#library .seg button").forEach((b) => b.addEventListener("click", () => {
  show = b.dataset.show;
  $$("#library .seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  renderLib();
}));
search.addEventListener("input", renderLib);

function renderLib() {
  const q = search.value.toLowerCase().trim();
  const items = lib.filter((ic) =>
    (cat === "All" || ic.category === cat) &&
    (!q || ic.label.toLowerCase().includes(q) || ic.category.toLowerCase().includes(q) || ic.keywords.some((k) => k.includes(q))));
  grid.classList.toggle("single", show !== "both");
  grid.innerHTML = items.map((ic) => {
    const art = (show === "both" ? ["color", "bw"] : [show]).map((s) => iconSvg(asDoc(ic, s), 56)).join("");
    return `<li><button class="tile" type="button" data-open="${ic.slug}" aria-label="${esc(ic.label)}: open to copy or download">
      <span class="tile-art" aria-hidden="true">${art}</span><span>${esc(ic.label)}</span></button></li>`;
  }).join("");
  const empty = $("#lib-empty");
  empty.hidden = items.length > 0;
  if (!items.length) {
    $("#lib-empty-text").textContent = q
      ? `No icons match “${search.value.trim()}”. Copy a prompt and your AI tool can draw it.`
      : "No icons in this category.";
    $("#lib-empty-prompt").dataset.prompt = search.value.trim();
    $("#lib-empty-prompt").hidden = !q;
  }
}
renderLib();

// ---------- icon dialog ----------
const dlg = $("#icon-dialog");
let current = null;
function openDialog(ic) {
  if (!ic) return;
  current = ic;
  $("#dlg-title").textContent = ic.label;
  $("#dlg-color").innerHTML = iconSvg(asDoc(ic, "color"), 256);
  $("#dlg-bw").innerHTML = iconSvg(asDoc(ic, "bw"), 256);
  dlg.showModal();
}
dlg.addEventListener("click", async (e) => {
  if (e.target === dlg || e.target.closest("[data-close]")) return dlg.close();
  const b = e.target.closest("button");
  if (!b || !current) return;
  const style = b.dataset.copy || b.dataset.download || b.dataset.edit;
  if (!style) return;
  const d = asDoc(current, style);
  if (b.dataset.copy) toast((await copyText(iconSvg(d))) ? "SVG copied." : "Couldn't copy. Your browser blocked the clipboard.");
  if (b.dataset.download) { download(`${d.name}.svg`, iconSvg(d)); toast(`Downloaded ${d.name}.svg`); }
  if (b.dataset.edit) {
    dlg.close();
    editor.open([asDoc(current, "color"), asDoc(current, "bw")], style === "bw" ? 1 : 0);
    document.getElementById("editor").scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
  }
});
$$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
