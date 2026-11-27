import { iconSvg, iconImg, toast, copyText, download, esc, slugify, makeZip } from "./util.js";
import { makeIcon, MODELS, savedKey, rememberKey } from "./make.js";
import { buildPrompt } from "./prompt.js";
import { initEditor } from "./editor.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const lib = await fetch("data/icons.json").then((r) => r.json());
window.__bootStep?.(0.7); // the loading fill tracks real progress: icon data is in
// Logo hover: the logo fills with a light colour pixel by pixel (bottom row first, small random stagger),
// a new colour on every hover. The colour layer is an inline SVG built from the logo's own letter pixels.
{
  const img = document.querySelector(".brand-fill"), brand = document.querySelector(".brand");
  const wrap = img?.parentElement;
  const LOGO_FILLS = ["#ffe580", "#a8dcff", "#b8f0a0", "#ffc4dc", "#d8c4ff", "#ffcf99", "#ffb0a8", "#a8f0dc"]; // lemon, sky, mint-green, pink, lilac, peach, coral, aqua
  if (img && brand && wrap) {
    fetch(img.getAttribute("src")).then((r) => r.text()).then((text) => {
      const doc = new DOMParser().parseFromString(text, "image/svg+xml"), src = doc.documentElement;
      const [, , vw, vh] = src.getAttribute("viewBox").split(/\s+/).map(Number);
      const px = [...src.querySelectorAll("rect")].filter((r) => r.getAttribute("fill").toLowerCase() !== "#000000")
        .map((r) => [+r.getAttribute("x"), +r.getAttribute("y")]);
      const rects = px.map(([x, y]) => {
        const up = (vh - 1 - y) / vh, down = y / vh; // 0 at the bottom row → 1 at the top
        const d = (up * 0.42 + Math.random() * 0.14).toFixed(3), dr = (down * 0.24 + Math.random() * 0.08).toFixed(3);
        return `<rect x="${x}" y="${y}" width="1" height="1" style="--d:${d}s;--dr:${dr}s"/>`;
      }).join("");
      const svg = `<svg class="brand-fill" viewBox="0 0 ${vw} ${vh}" aria-hidden="true">${rects}</svg>`;
      img.outerHTML = svg;
      let next = 0;
      const pick = () => wrap.style.setProperty("--logo-fill", LOGO_FILLS[next++ % LOGO_FILLS.length]);
      pick();
      brand.addEventListener("mouseleave", () => setTimeout(pick, 400)); // the next hover gets the next colour
      brand.addEventListener("blur", () => setTimeout(pick, 400));
    }).catch(() => {});
  }
}
// Library hover tooltip: "130+ icons" (count rounded down to the nearest 10), centred over the pill
{
  const badge = document.getElementById("lib-badge");
  const libBtn = document.querySelector('.pill-btn[data-view="icons"]');
  if (badge && libBtn) {
    badge.innerHTML = `<span class="tip">${Math.floor(lib.length / 10) * 10}+ icons</span>`;
    libBtn.addEventListener("mouseenter", () => { badge.parentElement.style.left = `${libBtn.offsetLeft + libBtn.offsetWidth / 2}px`; /* bubble and tail centred on the tab */ });
  }
}
const bySlug = (s) => lib.find((ic) => ic.slug === s);
const asDoc = (ic) => ({ name: ic.slug, style: "color", ...ic.color });
// the worked example in the prompt: never the word being asked for, so the model isn't handed the answer
const EXAMPLES = ["lantern", "coffee", "cactus", "heart"].map(bySlug).filter(Boolean);
const exampleFor = (word) => {
  const w = (word || "").trim().toLowerCase();
  return EXAMPLES.find((ic) => !(w && (ic.slug === w || ic.label.toLowerCase().includes(w) || w.includes(ic.slug) || ic.keywords.includes(w)))) || lib[0];
};
const editor = initEditor();

// Free route: open a new chat with the prompt filled in. The visitor reviews it and presses send.
const CHATS = {
  claude: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
  chatgpt: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
};
// Real links (not window.open), so they work in every browser and frame. Each link's href follows its word.
function setChatLinks(scope, word) {
  $$('a[data-chat]', scope).forEach((a) => {
    a.href = word ? CHATS[a.dataset.chat](buildPrompt(word, exampleFor(word))) : CHATS[a.dataset.chat]("").replace(/\?q=$/, "");
    a.dataset.word = word;
  });
}

async function copyPrompt(word) {
  const ok = await copyText(buildPrompt(word, exampleFor(word)));
  toast(ok ? "Prompt copied. Paste it into any AI chat." : "Couldn't copy. Your browser blocked the clipboard.");
}

// ---------- the word wall ----------
// [slug, word, colour, weight]: each word takes its icon's colour; weights alternate like a checkerboard.
const WALL = [
  [["heart", "Heart", "#e8243c", 600], ["fish", "Goldfish", "#f5861f", 300], ["tree", "Tree", "#3fae49", 600], ["watermelon", "Watermelon", "#e23a4f", 300], ["penguin", "Penguin", "#34404e", 600], ["sunflower", "Sunflower", "#d99a0b", 300], ["sushi", "Sushi", "#e2574c", 600], ["planet", "Planet", "#7a5bd6", 300]],
  [["rain", "Rain", "#3a8ee6", 300], ["key", "Key", "#d9a21a", 600], ["mushroom", "Mushroom", "#e5322d", 300], ["frog", "Frog", "#3f9e3a", 600], ["owl", "Owl", "#9a6a3a", 300], ["rainbow", "Rainbow", "#e0483c", 600], ["lemonade", "Lemonade", "#d9b21a", 300], ["headphones", "Headphones", "#4a4f57", 600]],
  [["pizza", "Pizza", "#e2a04a", 300], ["house", "House", "#d9483b", 600], ["cat", "Cat", "#e8862a", 300], ["tulip", "Tulip", "#3a9a3e", 600], ["butterfly", "Butterfly", "#ef7d22", 300], ["crab", "Crab", "#e04a3a", 600], ["medal-gold", "Medal", "#d9a21a", 300], ["cactus", "Cactus", "#5a9a2a", 600]],
  [["whale", "Whale", "#2f7fd8", 600], ["pencil", "Pencil", "#e09a12", 300], ["rocket", "Rocket", "#e23b3b", 600], ["ice-cream", "Ice cream", "#e0679b", 300], ["dog", "Dog", "#a0703a", 600], ["pineapple", "Pineapple", "#d9a21a", 300], ["hot-air-balloon", "Balloon", "#e8433c", 600], ["sprout", "Sprout", "#4caf50", 300]],
  // two extra rows, shown on phones only (one above the others, one below) so the hero stays centred
  [["apple", "Apple", "#e8243c", 600], ["bee", "Bee", "#d9a21a", 300], ["mountain", "Mountain", "#5b7a99", 600], ["donut", "Donut", "#ec6f9e", 300], ["fox", "Fox", "#e8742a", 600], ["camera", "Camera", "#4a4f57", 300], ["burger", "Burger", "#c9802e", 600], ["sun", "Sun", "#e0a10a", 300]],
  [["avocado", "Avocado", "#5a9a2a", 300], ["castle", "Castle", "#6b7280", 600], ["coffee", "Coffee", "#6b3b1f", 300], ["earth", "Earth", "#2f7fd8", 600], ["giraffe", "Giraffe", "#d9961a", 300], ["ladybug", "Ladybug", "#e04a3a", 600], ["lantern", "Lantern", "#d4a52a", 300], ["popsicle", "Popsicle", "#e0679b", 600]],
];
const LEAD = ["coffee", "Coffee", "#6b3b1f", 600];
const TRAIL = ["book", "Book", "#d93a3a", 300];
const wordBtn = ([slug, word, color, weight]) => {
  const ic = bySlug(slug);
  return ic ? `<button class="w w-btn" type="button" data-open="${slug}" style="color:${color};font-weight:${weight}" aria-label="${esc(ic.label)}">${esc(word)}${iconImg(asDoc(ic), 64, ic.slug)}</button>` : "";
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
  syncChat(); // the Any chat row and the paste box follow its own word, or this one if it's empty
  showSlot(findIcon(w));
}

// the slot beside the field: an icon poofs in (with smoke) when a word matches, and shrinks away when it stops matching
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
    // leaving: just a quick stepped shrink, no smoke (the smoke is only for an icon arriving)
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
  const WORDS = ["trophy", "umbrella", "koala", "lightning", "snail", "lightbulb", "cherry", "envelope", "moon", "bird"]; // none of these are in the hero rows
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
// Any chat: type the word right in the sentence ("a pixel icon of an umbrella, please")
const chatIn = $("#chat-in");
function syncChat() {
  const w = chatIn.value.trim();
  const art = /^[aeiou]/i.test(w) ? "an" : "a";
  $("#chat-art").textContent = art;
  fitChat(); // the dashed line is exactly as wide as the word (or the placeholder)
  setChatLinks($("#any-chat"), w);
  setChatLinks($("#paste-dialog"), w || wordIn.value.trim()); // the paste box's "No reply yet? Open in Claude"
}
const textMeter = document.createElement("canvas").getContext("2d");
function fitChat() {
  const cs = getComputedStyle(chatIn);
  textMeter.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const text = chatIn.value || chatIn.placeholder;
  const ls = parseFloat(cs.letterSpacing) || 0; // the big text is set a little tight
  chatIn.style.width = `${Math.ceil(textMeter.measureText(text).width + ls * text.length + parseFloat(cs.fontSize) * 0.08)}px`;
}
document.fonts?.ready.then(fitChat);
chatIn.addEventListener("input", syncChat);
chatIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $('#any-chat a[data-chat="claude"]').click(); } });
onWord();
$("#word-form").addEventListener("submit", (e) => { e.preventDefault(); $('#pill-cta a[data-chat="claude"]').click(); });
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-chat]");
  if (a) {
    if (!a.dataset.word) { e.preventDefault(); toast("Type a word first."); (a.closest("#pill-cta") ? wordIn : a.closest("#any-chat, #paste-dialog") ? chatIn : search).focus(); return; }
  }
  const c = e.target.closest('button[data-chat="copy"]');
  if (c) {
    const w = c.closest("#lib-empty") ? search.value.trim() : c.closest("#any-chat, #paste-dialog") ? chatIn.value.trim() || wordIn.value.trim() : wordIn.value.trim();
    if (!w) { toast("Type a word first."); (c.closest("#lib-empty") ? search : chatIn).focus(); return; }
    if (!w) { toast("Type a word first."); return; }
    copyPrompt(w);
  }
});

// ---------- icon table: pick a cell and it expands in place, its neighbours reflow around it ----------
// every icon, filtered by the search field in the floating bar
const search = $("#lib-search");
const matches = (ic, q) => !q || ic.label.toLowerCase().includes(q) || ic.slug.includes(q) || ic.category.toLowerCase().includes(q) || ic.keywords.some((k) => k.includes(q));
// the short name under each icon in the table; the table lists icons A to Z by it
const CELL_NAMES = { fish: "goldfish", bird: "robin" }; // where the slug reads differently from the icon
const cellName = (ic) => CELL_NAMES[ic.slug] || ic.slug.replace(/-/g, " ");
const sorted = [...lib].sort((a, b) => cellName(a).localeCompare(cellName(b)));
let cat = "All"; // the category picked from the menu in the floating bar
const shown = () => sorted.filter((ic) => (cat === "All" || ic.category === cat) && matches(ic, search.value.toLowerCase().trim()));
// every icon is the same plain tile; clicking one opens the icon window, as the words on the landing page do
function renderTable() {
  const items = shown();
  $("#table").innerHTML = items.map((ic) => `<button class="cell" type="button" data-open="${ic.slug}" aria-label="${esc(ic.label)}">${iconImg(asDoc(ic), 56, ic.slug)}<span class="cn" title="${esc(cellName(ic))}">${esc(cellName(ic))}</span></button>`).join("");
  // nothing matched: offer to have an AI tool draw the word
  $("#lib-empty").hidden = items.length > 0;
  $("#table").hidden = !items.length;
  if (!items.length) {
    const w = search.value.trim();
    $("#lib-empty-text").textContent = cat !== "All" ? `No ${cat.toLowerCase()} icon for “${w}” yet. Your AI tool can draw it.` : `No icon for “${w}” yet. Your AI tool can draw it.`;
    setChatLinks($("#lib-empty"), w);
  }
}
renderTable();

// ---------- install rows ----------
// commands stay on one line and may be cut off with …, so the full text shows on hover
$$(".install .cmd").forEach((c) => (c.title = c.dataset.copy || c.textContent.trim()));
$$("[data-copy-btn]").forEach((b) => b.addEventListener("click", async () => {
  const prev = b.previousElementSibling, cmd = prev && prev.classList.contains("cmd") ? prev : $(".cmd", b.closest(".row")); // each step has its own button
  const ok = await copyText(cmd.dataset.copy || cmd.textContent.trim());
  const l = $(".bl", b) || b, label = l.textContent; // only the words change; the icon stays
  l.textContent = ok ? "Copied" : "Couldn't copy";
  setTimeout(() => (l.textContent = label), 1500);
}));

// ---------- search: the field in the floating bar filters the table ----------
search.addEventListener("input", () => renderTable());
search.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); const first = $("#table [data-open]"); if (first) first.click(); else if (search.value.trim()) $('#lib-empty a[data-chat="claude"]').click(); }
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (search.value) { search.value = ""; renderTable(); } else search.blur(); }
});
// ---------- menus that open upward from the floating bar: category and download all ----------
const menus = [];
function barMenu(btn, menu, onPick) {
  const items = () => $$('[role^="menuitem"]', menu);
  const toggle = (open, focusItem = true) => {
    if (open) menus.forEach((m) => m !== toggle && m(false));
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", open);
    if (!open) return;
    // under its pill: left edges line up; a menu at the end of the bar lines up with the bar's right edge
    menu.style.left = `${menu.classList.contains("end") ? bar.offsetWidth - bar.clientLeft - menu.offsetWidth : btn.offsetLeft}px`; // end menus line up with the bar's right edge
    if (focusItem) (items().find((b) => b.getAttribute("aria-checked") === "true") || items()[0]).focus();
  };
  menus.push(toggle);
  btn.addEventListener("click", () => toggle(menu.hidden));
  menu.addEventListener("click", (e) => { const it = e.target.closest('[role^="menuitem"]'); if (it) { onPick(it, e); toggle(false); btn.focus(); } });
  menu.addEventListener("keydown", (e) => {
    const list = items(), i = list.indexOf(document.activeElement);
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (next !== undefined) { e.preventDefault(); list[(next + list.length) % list.length].focus(); }
    if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); toggle(false); btn.focus(); }
  });
  document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) toggle(false); });
  return toggle;
}
const closeMenus = () => menus.forEach((m) => m(false));

// category: a row of chips at the top of the library (stays pinned while the grid scrolls)
const cats = ["All", ...new Set(lib.map((ic) => ic.category))];
const inCat = (c) => (c === "All" ? lib : lib.filter((ic) => ic.category === c));
const chips = $("#cat-chips");
chips.innerHTML = cats.map((c) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === cat}"><span>${esc(c)}</span><span class="n">${inCat(c).length}</span></button>`).join("");
chips.addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) pickCat(b.dataset.cat); });
// the fade under the pinned chip row only shows once the grid has scrolled
{
  const view = $("#icons"), catBar = $("#cat-bar");
  view.addEventListener("scroll", () => catBar.classList.toggle("scrolled", view.scrollTop > 4), { passive: true });
}
function pickCat(c) {
  cat = c;
  $$("[data-cat]", chips).forEach((b) => b.setAttribute("aria-pressed", b.dataset.cat === c));
  updateDlMenu();
  renderTable();
  $("#icons").scrollTo({ top: 0 });
}
// the download menu follows the chip: "All SVGs 139" or "Food SVGs 30", and downloads just those
function updateDlMenu() {
  const n = inCat(cat).length, name = cat === "All" ? "All" : cat;
  $('#dl-menu [data-dl="svg"] .dl-l').textContent = `${name} SVGs`;
  $('#dl-menu [data-dl="png"] .dl-l').textContent = `${name} PNGs, 256px`;
  $$("#dl-menu .dl-n").forEach((s) => (s.textContent = n));
}
updateDlMenu();
barMenu($("#dl-btn"), $("#dl-menu"), (it, e) => {
  if (it.dataset.dl === "svg") {
    if (cat === "All") { toast(`Downloading all ${lib.length} SVGs.`); return; } // the prebuilt zip (with licence); the link does it
    e.preventDefault();
    downloadSvgs(cat);
    return;
  }
  e.preventDefault();
  downloadPngs(cat, 256);
});
let zipping = false;
const zipName = (c, kind) => `pixel-icons-${c === "All" ? "" : slugify(c) + "-"}${kind}`;
function downloadSvgs(c) {
  const list = inCat(c), dir = zipName(c, "svg"), enc = new TextEncoder();
  const files = list.map((ic) => ({ name: `${dir}/${ic.slug}.svg`, data: enc.encode(iconSvg(asDoc(ic), 16)) }));
  download(`${dir}.zip`, makeZip(files), "application/zip");
  toast(`Downloaded ${list.length} ${c.toLowerCase()} SVGs.`);
}
async function downloadPngs(c, px) {
  if (zipping) return;
  zipping = true;
  const list = inCat(c), dir = zipName(c, "png");
  toast(`Preparing ${list.length} PNGs…`);
  try {
    const files = await Promise.all(list.map(async (ic) => ({ name: `${dir}/${ic.slug}.png`, data: new Uint8Array(await (await pngBlob(ic, px)).arrayBuffer()) })));
    download(`${dir}.zip`, makeZip(files), "application/zip");
    toast(`Downloaded ${list.length} PNGs.`);
  } catch {
    toast("Couldn't make the PNGs. Try again, or download the SVGs.");
  } finally { zipping = false; }
}

function openLibrary() {
  closeAll();
  if (view !== "icons") showView("icons", { focus: false });
  search.focus();
  search.select();
}

// ---------- one icon ----------
const dtDlg = $("#detail");
let current = null, size = 64, fmt = "svg";
// size: a slider in 16px steps, so every size is a whole multiple of the grid and the pixels stay crisp
$("#dt-size").addEventListener("input", (e) => { size = +e.target.value; renderDetail(); });
// format: one picker for everything below it (radio-group keys: arrows move and pick)
const fmtBtns = $$("#dt-fmt [data-fmt]");
fmtBtns.forEach((b) => b.addEventListener("click", () => { fmt = b.dataset.fmt; renderDetail(); }));
$("#dt-fmt").addEventListener("keydown", (e) => {
  const i = fmtBtns.findIndex((b) => b.dataset.fmt === fmt), step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (step === undefined) return;
  e.preventDefault();
  const b = fmtBtns[(i + step + fmtBtns.length) % fmtBtns.length];
  fmt = b.dataset.fmt; renderDetail(); b.focus();
});
// what Copy and Download do for each format
const FMT = {
  svg: { copy: "Copy SVG", dl: "Download .svg" },
  png: { copy: "Copy PNG", dl: "Download .png" },
  react: { copy: "Copy React", dl: "Download .jsx" },
  html: { copy: "Copy HTML", dl: "Download .html" },
};

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
  // self-contained: the SVG is embedded in the tag, so it works pasted anywhere with no separate file
  if (fmt === "html") return `<img src="data:image/svg+xml,${encodeURIComponent(iconSvg(d, size))}" width="${size}" height="${size}" alt="${ic.label}" style="image-rendering: pixelated">`;
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
  $("#dt-stage").innerHTML = `<div class="px-grid">${iconSvg(asDoc(current), size)}</div>`;
  $("#dt-size").value = size; $("#dt-size-out").textContent = `${size}px`;
  $("#dt-size").style.setProperty("--fill", `${((size - 16) / 112) * 100}%`);
  fmtBtns.forEach((b) => { const on = b.dataset.fmt === fmt; b.setAttribute("aria-checked", on); b.tabIndex = on ? 0 : -1; });
  $("#dt-copy").textContent = FMT[fmt].copy; $("#dt-dl").textContent = FMT[fmt].dl;
  // a code preview for the text formats; PNG is the picture above
  $("#dt-pre").hidden = fmt === "png";
  if (fmt !== "png") $("#dt-code").textContent = codeFor(current);
}
function openDetail(ic) {
  if (!ic) return;
  current = ic;
  closeAll();
  renderDetail();
  dtDlg.showModal();
}
const blocked = "Couldn't copy. Your browser blocked the clipboard.";
$("#dt-copy").addEventListener("click", async () => {
  if (fmt !== "png") { toast((await copyText(codeFor(current))) ? `Copied the ${FMT[fmt].copy.slice(5)} (${size}px).` : blocked); return; }
  // the PNG goes on the clipboard as an image; the blob is passed as a promise so Safari keeps the click's permission while it's drawn
  try {
    if (!window.ClipboardItem || !navigator.clipboard?.write) throw new Error("no image clipboard");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob(current, size) })]);
    toast(`Copied the PNG (${size}px).`);
  } catch { toast("Couldn't copy the image here. Use Download instead."); }
});
$("#dt-dl").addEventListener("click", () => {
  if (fmt === "png") return savePng(current, size);
  if (fmt === "react") { const name = `${pascal(current.slug)}Icon.jsx`; download(name, codeFor(current), "text/javascript"); toast(`Downloaded ${name}`); return; }
  if (fmt === "html") { const name = `${current.slug}.html`; download(name, codeFor(current) + "\n", "text/html"); toast(`Downloaded ${name}`); return; }
  download(`${current.slug}.svg`, iconSvg(asDoc(current), size)); toast(`Downloaded ${current.slug}.svg (${size}px)`);
});
// an icon drawn crisp onto a transparent canvas, px wide, as a PNG blob
function pngBlob(ic, px) {
  const d = asDoc(ic), c = document.createElement("canvas");
  c.width = c.height = px;
  const ctx = c.getContext("2d"), k = px / 16;
  d.grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") { ctx.fillStyle = d.palette[ch]; ctx.fillRect(x * k, y * k, k, k); } }));
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"));
}
function savePng(ic, px) {
  pngBlob(ic, px).then((blob) => {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `${ic.slug}-${px}.png`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Downloaded ${ic.slug}-${px}.png`);
  });
}
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
    const r = await makeIcon({ word, key, model: $("#mk-model").value, example: exampleFor(word), signal: job.signal, onStep: (t) => ($("#mk-step").textContent = t) });
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

// ---------- About: draw your own icon and drop it on the pile ----------
// The pile holds only the visitor's own drawings (kept in this browser). It's a layer over the whole About page:
// a new drop falls from the drawing grid to the floor of the window; pick any icon up, drag it anywhere on
// the page, and it falls back down when you let go (where each one rests is remembered). Each drop is trimmed to the pixels actually drawn.
const pile = (() => {
  const box = $("#pile"), PX = 3, KEY = "pi-pile-2", POS = "pb-pos";
  let MAX = 18, shared = false; // shared: the wall comes from /api/drops (everyone's drops); otherwise this browser's own pile
  try { localStorage.removeItem("pi-pile"); } catch { /* storage blocked */ } // fresh start: drop piles saved before the reset
  const bodies = [];
  let running = false, still = 0, started = false, drag = null, last = null, down = null;
  const W = () => box.clientWidth, H = () => box.clientHeight;
  // the layer covers the whole window (fixed, inset 0), so there's nothing to place
  function place() {}
  // only the drawn pixels, as a small SVG at PX screen pixels per icon pixel
  function trimmed(d) {
    const ys = d.grid.map((r, y) => (/[^.]/.test(r) ? y : -1)).filter((y) => y >= 0);
    const xs = d.grid.flatMap((r) => [...r].map((c, x) => (c !== "." ? x : -1))).filter((x) => x >= 0);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 + 1, h = Math.max(...ys) - y0 + 1;
    let rects = "";
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = d.grid[y0 + y][x0 + x]; if (k !== ".") rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${d.palette[k]}"/>`; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * PX}" height="${h * PX}" shape-rendering="crispEdges">${rects}</svg>`;
    return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, w: w * PX, h: h * PX };
  }
  // an icon with no saved spot falls in below the drawing grid (a little scatter across its width)
  function underGrid(r) {
    const g = $("#dd-cv")?.getBoundingClientRect();
    if (!g || !g.width) return r + Math.random() * Math.max(1, W() - 2 * r);
    return Math.min(W() - r, Math.max(r, g.left + r + Math.random() * Math.max(1, g.width - 2 * r)));
  }
  function add(d, { x = null, y = null, pinned = false } = {}) {
    const t = trimmed(d), el = document.createElement("img");
    el.src = t.src; el.alt = d.who ? `Drawn by ${d.who.kind === "x" ? "@" + d.who.handle : d.who.name || d.who.handle}` : ""; el.draggable = false; el.width = t.w; el.height = t.h;
    box.append(el);
    box.classList.add("has-icons");
    const r = Math.max(t.w, t.h) / 2 * 0.9;
    const b = { el, w: t.w, h: t.h, r, x: x ?? underGrid(r), y: y ?? -t.h, vx: (Math.random() - 0.5) * 2, vy: 0, a: (Math.random() - 0.5) * 30, va: (Math.random() - 0.5) * 6, d, pinned };
    if (pinned) { b.a = 0; b.va = 0; }
    if (d.who) {
      el.classList.add("signed");
      el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !drag) showChip(b); });
      el.addEventListener("pointerleave", hideSoon);
    }
    bodies.push(b);
    return b;
  }
  const saved = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
  const positions = () => { try { return JSON.parse(localStorage.getItem(POS) || "{}"); } catch { return {}; } };
  // remember where icons were placed by hand (as a share of the window, so it survives resizes).
  // On the shared wall only the spots are kept here; the drops themselves live on the server.
  const save = () => {
    try {
      if (shared) {
        const p = positions();
        bodies.forEach((b) => { if (!b.d.id) return; if (b.pinned) p[b.d.id] = { fx: b.x / W(), fy: b.y / H() }; else delete p[b.d.id]; });
        localStorage.setItem(POS, JSON.stringify(p));
      } else localStorage.setItem(KEY, JSON.stringify(bodies.map((b) => ({ ...b.d, pos: b.pinned ? { fx: b.x / W(), fy: b.y / H() } : undefined }))));
    } catch { /* storage blocked */ }
  };
  // ---- who drew it: a chip with their picture, name and a link, over a signed icon ----
  const chip = document.createElement("a");
  chip.className = "who-chip"; chip.target = "_blank"; chip.rel = "noopener noreferrer";
  box.append(chip);
  let chipFor = null, chipT = 0;
  const X_LOGO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
  const GO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  function showChip(b) {
    clearTimeout(chipT);
    const w = b.d.who, x = w.kind === "x";
    const name = x ? `@${w.handle}` : w.name || w.handle, ini = esc((x ? w.handle : w.name || w.handle).charAt(0).toUpperCase());
    if (chipFor !== b) {
      chip.href = x ? `https://x.com/${encodeURIComponent(w.handle)}` : `https://www.linkedin.com/in/${encodeURIComponent(w.handle)}`;
      chip.setAttribute("aria-label", `${name} on ${x ? "X" : "LinkedIn"}`);
      chip.innerHTML = `<span class="who-av">${x ? `<img src="https://unavatar.io/x/${encodeURIComponent(w.handle)}?fallback=false" alt="" referrerpolicy="no-referrer">` : `<span class="ini li">${ini}</span>`}<span class="who-badge ${x ? "x" : "li"}">${x ? X_LOGO : "in"}</span></span><span class="who-name">${esc(name)}<small>${x ? "on X" : "on LinkedIn"}</small></span><span class="who-go">${GO}</span>`;
      const img = $("img", chip);
      if (img) img.addEventListener("error", () => { img.outerHTML = `<span class="ini">${ini}</span>`; }); // no picture: their initial instead
      chipFor = b;
    }
    chip.style.left = "0px"; chip.style.top = "0px";
    const cw = chip.offsetWidth || 180;
    chip.style.left = `${Math.min(W() - cw / 2 - 8, Math.max(cw / 2 + 8, b.x))}px`;
    chip.style.top = `${Math.max(chip.offsetHeight + 8, b.y - b.h / 2 - 6)}px`;
    chip.classList.add("on");
  }
  const hideChip = () => { clearTimeout(chipT); chip.classList.remove("on"); };
  function hideSoon() { clearTimeout(chipT); chipT = setTimeout(hideChip, 300); }
  chip.addEventListener("pointerenter", () => clearTimeout(chipT));
  chip.addEventListener("pointerleave", hideSoon);
  function step() {
    const w = W(), h = H();
    let moving = 0;
    for (const b of bodies) {
      if (b === drag || b.pinned) continue; // placed icons stay where they were dropped
      b.vy += 0.45; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.a += b.va; b.va *= 0.96;
      if (b.y > h - b.h / 2) { b.y = h - b.h / 2; b.vy *= -0.3; b.vx *= 0.8; b.va *= 0.7; b.a *= 0.9; } // on the floor it settles upright
      if (b.y < b.h / 2) { b.y = b.h / 2; b.vy *= -0.4; } // the top of the window is a ceiling: a hard throw bounces back down
      if (b.x < b.r) { b.x = b.r; b.vx *= -0.5; }
      if (b.x > w - b.r) { b.x = w - b.r; b.vx *= -0.5; }
    }
    for (let it = 0; it < 3; it++) for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, o = a.r + b.r - d;
      if (o <= 0) continue;
      // a dragged icon doesn't move; the other one takes the whole push
      const fa = a === drag || a.pinned, fb = b === drag || b.pinned; // dragged and placed icons don't get pushed
      if (fa && fb) continue;
      const nx = dx / d, ny = dy / d, wa = fa ? 0 : fb ? 1 : 0.5, wb = fb ? 0 : fa ? 1 : 0.5;
      a.x -= nx * o * wa; a.y -= ny * o * wa; b.x += nx * o * wb; b.y += ny * o * wb;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { const k = rv * 0.6; a.vx += nx * k * wa * 2; a.vy += ny * k * wa * 2; b.vx -= nx * k * wb * 2; b.vy -= ny * k * wb * 2; }
    }
    for (const b of bodies) {
      if (Math.abs(b.vx) + Math.abs(b.vy) > 0.15) moving++;
      b.el.style.transform = `translate(${b.x - b.w / 2}px, ${b.y - b.h / 2}px) rotate(${b.a}deg)`;
    }
    return moving;
  }
  // run while anything moves; sleep once the pile settles, so a still page costs nothing
  function loop() {
    if (!running) return;
    still = step() || drag ? 0 : still + 1;
    if (still > 40 || $("#how").hidden) { running = false; bodies.forEach((b) => (b.pinned = true)); save(); bodies.forEach((b) => (b.pinned = false)); return; }
    requestAnimationFrame(loop);
  }
  function wake() {
    if ($("#how").hidden) return;
    place();
    if (!W()) return;
    if (!started) { started = true; load(); return; }
    still = 0;
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  // the shared wall if the server has one; otherwise this browser's own pile
  async function load() {
    let list = null;
    try { const r = await fetch("/api/drops", { cache: "no-store" }); if (r.ok) list = (await r.json()).drops; } catch { /* offline or no server */ }
    if (list) {
      shared = true; MAX = 60;
      const pos = positions();
      list.slice().reverse().forEach((d, n) => add(d, { x: pos[d.id] ? pos[d.id].fx * W() : null, y: -60 - n * 30 })); // each falls in above where it last rested
    } else saved().forEach((d, n) => add(d, { x: d.pos ? d.pos.fx * W() : null, y: -60 - n * 40 }));
    // with reduced motion, settle the pile before showing it instead of letting it fall
    if (calm.matches) { for (let i = 0; i < 600; i++) step(); return; }
    still = 0;
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  addEventListener("resize", () => { if (!$("#how").hidden) wake(); });
  $("#how").addEventListener("scroll", () => place(), { passive: true });
  const local = (e) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  box.addEventListener("pointerdown", (e) => {
    const { x, y } = local(e);
    drag = [...bodies].reverse().find((b) => Math.hypot(b.x - x, b.y - y) < b.r + 2) || null;
    if (!drag) return;
    hideChip(); down = { x, y, moved: false };
    box.setPointerCapture(e.pointerId);
    drag.el.classList.add("dragging"); drag.pinned = false; drag.a = 0; drag.va = 0;
    last = { x, y, t: performance.now() };
    wake();
  });
  box.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const { x, y } = local(e), t = performance.now(), dt = Math.max(16, t - last.t);
    if (down && Math.hypot(x - down.x, y - down.y) > 5) down.moved = true;
    drag.vx = ((x - last.x) / dt) * 16; drag.vy = ((y - last.y) / dt) * 16;
    drag.x = Math.min(W() - drag.w / 2, Math.max(drag.w / 2, x)); drag.y = Math.min(H() - drag.h / 2, Math.max(drag.h / 2, y));
    last = { x, y, t };
  });
  const release = () => {
    if (!drag) return;
    drag.el.classList.remove("dragging");
    const b = drag, tap = down && !down.moved;
    drag = null; down = null;
    if (tap) { if (b.d.who) showChip(b); wake(); return; } // a tap (no drag) shows who drew it; on touch that's the only way
    b.pinned = false; // let go: it falls back down, keeping the speed of the throw (capped, so it can't fly off)
    b.vx = Math.max(-24, Math.min(24, b.vx)); b.vy = Math.max(-24, Math.min(24, b.vy));
    save();
    wake();
  };
  box.addEventListener("pointerup", release);
  box.addEventListener("pointercancel", release);
  return {
    wake,
    // a drawn icon falls in from the top of the layer, under where it was drawn
    drop(d) {
      // keep the latest few; the oldest one leaves the pile when it's full
      if (bodies.length >= MAX) bodies.shift().el.remove();
      place();
      const from = $("#dd-cv").getBoundingClientRect();
      add(d, { x: from.left + from.width / 2, y: from.bottom }); // falls from under the grid where it was drawn
      save();
      wake();
    },
  };
})();

// sign a drop: ask for an X handle or LinkedIn profile, or skip. Resolves to the handle, null (skip) or undefined (closed).
function askWho(d) {
  const dlg = $("#who-dialog"), form = $("#who-form"), err = $("#who-err");
  let kind = "x";
  const pick = (k) => {
    kind = k;
    $$(".who-seg button", dlg).forEach((b) => b.setAttribute("aria-checked", b.dataset.kind === k));
    $$("[data-kind]", form).forEach((el) => { if (!el.matches("button")) el.hidden = el.dataset.kind !== k; });
    err.textContent = "";
  };
  let last = {};
  try { last = JSON.parse(localStorage.getItem("pb-who") || "{}"); } catch { /* storage blocked */ }
  $("#who-x").value = last.x || ""; $("#who-li").value = last.li || ""; $("#who-name").value = last.name || "";
  pick(last.kind || "x");
  // a preview of what's being signed
  let rects = "";
  d.grid.forEach((row, y) => [...row].forEach((k, x) => { if (k !== ".") rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${d.palette[k]}"/>`; }));
  $("#who-icon").src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>`)}`;
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; cleanup(); if (dlg.open) dlg.close(); resolve(v); };
    const onSeg = (e) => { const b = e.target.closest(".who-seg button"); if (b) pick(b.dataset.kind); };
    const onSkip = () => finish(null);
    const onClose = () => finish(undefined);
    const onSubmit = (e) => {
      e.preventDefault();
      let who = null;
      if (kind === "x") {
        const v = $("#who-x").value.trim(), m = v.match(/(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})/i), h = (m ? m[1] : v).replace(/^@/, "");
        if (!h) { err.textContent = "Add your handle, or skip."; return; }
        if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) { err.textContent = "That doesn't look like an X handle (letters, numbers and _ only, up to 15)."; return; }
        who = { kind: "x", handle: h };
      } else {
        const v = $("#who-li").value.trim(), m = v.match(/linkedin\.com\/in\/([A-Za-z0-9\-_%]+)/i), h = m ? m[1] : v.replace(/\/+$/, "");
        if (!h) { err.textContent = "Add your profile link, or skip."; return; }
        if (!/^[A-Za-z0-9\-_%]{3,100}$/.test(h)) { err.textContent = "Paste your profile link, like linkedin.com/in/your-name."; return; }
        who = { kind: "li", handle: h, name: $("#who-name").value.trim().slice(0, 40) || null };
      }
      try { localStorage.setItem("pb-who", JSON.stringify({ kind, x: $("#who-x").value.trim(), li: $("#who-li").value.trim(), name: $("#who-name").value.trim() })); } catch { /* storage blocked */ }
      finish(who);
    };
    function cleanup() {
      dlg.removeEventListener("click", onSeg); $("#who-skip").removeEventListener("click", onSkip);
      form.removeEventListener("submit", onSubmit); dlg.removeEventListener("close", onClose);
    }
    dlg.addEventListener("click", onSeg); $("#who-skip").addEventListener("click", onSkip);
    form.addEventListener("submit", onSubmit); dlg.addEventListener("close", onClose);
    dlg.showModal();
    (kind === "x" ? $("#who-x") : $("#who-li")).focus();
  });
}

// the drawing grid: click or drag to paint, pick a colour, then drop it on the pile
(() => {
  const cv = $("#dd-cv"), ctx = cv.getContext("2d"), C = cv.width / 16;
  const PAL = { K: "#000000", w: "#ffffff", r: "#e8243c", o: "#f28c28", y: "#ffd23f", g: "#3fa34d", b: "#3b82f6", p: "#f7a1c4", n: "#8b5a2b" };
  const NAMES = { K: "Black", w: "White", r: "Red", o: "Orange", y: "Yellow", g: "Green", b: "Blue", p: "Pink", n: "Brown", ".": "Eraser" };
  const ERASER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 21h13"/><path d="M5.6 14.4l8.5-8.5a2 2 0 0 1 2.8 0l2.6 2.6a2 2 0 0 1 0 2.8L12 18.8 9.4 21H7.5l-1.9-1.9a2 2 0 0 1 0-2.8z"/><path d="M10.5 9.5l5 5"/></svg>';
  const grid = Array.from({ length: 16 }, () => Array(16).fill("."));
  let ink = "K", painting = false;
  $("#dd-sw").innerHTML = [...Object.keys(PAL), "."].map((k) => `<button type="button" role="radio" aria-checked="${k === ink}" aria-label="${NAMES[k]}" title="${NAMES[k]}" data-ink="${k}"${k === "." ? ' class="eraser"' : ` style="background:${PAL[k]}"`}>${k === "." ? ERASER : ""}</button>`).join("");
  $$("#dd-sw button").forEach((b) => b.addEventListener("click", () => { ink = b.dataset.ink; $$("#dd-sw button").forEach((x) => x.setAttribute("aria-checked", x === b)); }));
  const empty = () => grid.every((r) => r.every((k) => k === "."));
  function draw() {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    grid.forEach((row, y) => row.forEach((k, x) => { if (k !== ".") { ctx.fillStyle = PAL[k]; ctx.fillRect(x * C, y * C, C, C); } }));
    ctx.strokeStyle = "#eceef2"; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < 16; i++) { ctx.moveTo(i * C + 0.5, 0); ctx.lineTo(i * C + 0.5, cv.height); ctx.moveTo(0, i * C + 0.5); ctx.lineTo(cv.width, i * C + 0.5); }
    ctx.stroke();
    $("#dd-drop").disabled = empty();
  }
  const paintAt = (e) => {
    const r = cv.getBoundingClientRect(), x = Math.floor(((e.clientX - r.left) / r.width) * 16), y = Math.floor(((e.clientY - r.top) / r.height) * 16);
    if (x < 0 || x > 15 || y < 0 || y > 15 || grid[y][x] === ink) return;
    grid[y][x] = ink; draw();
  };
  cv.addEventListener("pointerdown", (e) => { painting = true; cv.setPointerCapture(e.pointerId); paintAt(e); });
  cv.addEventListener("pointermove", (e) => painting && paintAt(e));
  cv.addEventListener("pointerup", () => (painting = false));
  cv.addEventListener("pointercancel", () => (painting = false));
  $("#dd-clear").addEventListener("click", () => { grid.forEach((r) => r.fill(".")); draw(); });
  $("#dd-drop").addEventListener("click", async () => {
    if (empty()) return;
    const used = new Set(grid.flat().filter((k) => k !== "."));
    const d = { name: "my-icon", style: "color", palette: Object.fromEntries([...used].map((k) => [k, PAL[k]])), grid: grid.map((r) => r.join("")) };
    const who = await askWho(d); // a handle, null if skipped, undefined if closed
    if (who === undefined) return; // closed: keep drawing
    let saved = null;
    try {
      const r = await fetch("/api/drops", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ palette: d.palette, grid: d.grid, who }) });
      if (r.status === 429) { toast((await r.json()).error || "That's enough drops for today."); return; }
      if (r.ok) saved = (await r.json()).drop;
    } catch { /* no server: it stays on this browser's pile */ }
    pile.drop(saved ? { ...d, ...saved } : { ...d, who });
    grid.forEach((r) => r.fill(".")); draw();
    toast(saved ? "Dropped on the wall for everyone." : "Dropped on your pile.");
  });
  draw();
})();

// About: "Got feedback?" opens a bubble with the email (click again, or anywhere else, to close)
{
  const fb = $(".fb-wrap"), fbBtn = $("#fb-btn");
  const setFb = (on) => { fb.classList.toggle("open", on); fbBtn.setAttribute("aria-expanded", on); };
  fbBtn.addEventListener("click", (e) => { e.stopPropagation(); setFb(!fb.classList.contains("open")); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".fb-wrap")) setFb(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setFb(false); });
}
// phones: the socials are the whole bar, so they're always reachable by keyboard
const phone = matchMedia("(max-width: 720px)");
$("#m-count").textContent = `${Math.floor(lib.length / 10) * 10}+`; // the phone bar's Library badge
const ghIcon = $('.pills > .icon-pill[data-for="how"][href*="github.com"]');
const phoneBar = () => {
  $$('.pills > .icon-pill[data-for="how"]').forEach((a) => { if (phone.matches) a.tabIndex = 0; });
  $(".by").tabIndex = phone.matches ? -1 : 0;
  // on phones the GitHub icon opens the skill's repo; on desktop (About) it's Jahanvi's profile
  const repo = phone.matches;
  ghIcon.href = repo ? "https://github.com/iamjahanvi/pixel-icon-generator" : "https://github.com/iamjahanvi";
  ghIcon.setAttribute("aria-label", repo ? "The Pixbits skill on GitHub" : "Jahanvi on GitHub");
  ghIcon.title = repo ? "The Pixbits skill on GitHub" : "Jahanvi on GitHub";
}; // on phones "By Jahanvi" is plain text, so it's skipped by Tab too
phone.addEventListener?.("change", () => { phoneBar(); if (!phone.matches) layoutBar(false); });
setTimeout(phoneBar, 0);
// About: copy the feedback email
$("#fb-copy")?.addEventListener("click", async (e) => { e.preventDefault(); toast((await copyText("iamjahanvi@gmail.com")) ? "Email copied." : "Couldn't copy. It's iamjahanvi@gmail.com"); });

// the hero is centred on the whole screen: the CSS needs the header's height to balance the space below it
{
  const top = $(".top");
  const setTop = () => document.documentElement.style.setProperty("--top-h", `${top.offsetHeight}px`);
  setTop();
  new ResizeObserver(setTop).observe(top);
}

// ---------- views: the floating bar swaps the hero for another view ----------
const VIEWS = ["icons", "install", "how"];
// the address bar names each view after its tab; the old names still open the right view
const HASH = { icons: "library", install: "skill", how: "about" };
const FROM_HASH = { library: "icons", skill: "install", about: "how", icons: "icons", install: "install", how: "how" };
const bar = $(".pills"), ind = $(".pill-ind"), viewBtns = $$(".pill-btn[data-view]");
// in the library view only its close button and a search pill stay in the bar
// views with their own actions: the bar slims to the close button and the items marked data-for that view
const FOCUSED = ["icons", "install", "how"];
const soloItems = $$(".pills [data-for]"), extras = [$(".pills > .sep:not([data-for])"), $("#tog-motion")];
const CLOSED = 40; // an open section's button shrinks to a round close button this wide
const noMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let view = null, natural = new Map();
// each button's own width (icon + word), measured once the font has loaded and again on resize
function measure() {
  const all = [...viewBtns, ...soloItems];
  all.forEach((b) => { b.style.transition = "none"; b.style.width = ""; b.classList.remove("gone"); });
  all.forEach((b) => natural.set(b, b.getBoundingClientRect().width));
  layoutBar(false);
  void bar.offsetWidth;
  all.forEach((b) => (b.style.transition = ""));
}
// one item's label changed: animate it to its new natural width
function remeasure(el) {
  const was = el.style.width, gone = el.classList.contains("gone");
  el.style.transition = "none"; el.style.width = ""; el.classList.remove("gone"); // measure at full size, even if it's hidden in this view
  natural.set(el, el.getBoundingClientRect().width);
  el.classList.toggle("gone", gone); el.style.width = was; void el.offsetWidth; el.style.transition = "";
  layoutBar();
}
// set every button's target width, and slide the dark highlight to the open one
function layoutBar(animate = true) {
  if (!animate) ind.style.transition = "none";
  let x = parseFloat(getComputedStyle(bar).paddingLeft), gap = parseFloat(getComputedStyle(bar).columnGap) || 0, target = null;
  const solo = FOCUSED.includes(view);
  const hide = (el, gone) => {
    el.classList.toggle("gone", gone);
    const f = el.matches("button, a") ? el : $("input, a, button", el); // a wrapped control (the feedback pill) gets focus too
    if (f) f.tabIndex = gone ? -1 : 0;
  };
  viewBtns.forEach((b) => {
    const on = b.dataset.view === view, w = on ? CLOSED : solo ? 0 : natural.get(b);
    b.style.width = `${w}px`;
    hide(b, !w);
    if (on) target = { x, w };
    if (w) x += w + gap; // a folded button's -2px margin cancels the gap after it, so it takes no room
  });
  soloItems.forEach((el) => { const show = el.dataset.for === view; el.style.width = `${show ? natural.get(el) : 0}px`; hide(el, !show); });
  extras.forEach((el) => hide(el, solo));
  closeMenus(); // a view change closes any open bar menu
  if (target) { ind.style.width = `${target.w}px`; ind.style.transform = `translateX(${target.x}px)`; ind.style.opacity = "1"; }
  else { ind.style.opacity = "0"; ind.style.transform = `${ind.style.transform.split(" scale")[0] || "translateX(0)"} scale(0.6)`; }
  if (!animate) { void ind.offsetWidth; ind.style.transition = ""; }
}
// the top-right pitch changes with the view; views without their own keep the default
const TAGLINES = {
  icons: [`${lib.length} icons, open source and free to use.`, "MIT licence, for personal and commercial work."],
};
const TAG_HIDDEN = ["install", "how"]; // Use Skill and About show no pitch top right
const tagDefault = [$(".tagline .t1").textContent, $(".tagline .t2").textContent];
function setTagline() {
  const tag = $(".tagline"), off = TAG_HIDDEN.includes(view);
  tag.classList.toggle("off", off); // hidden but still taking its space, so the header doesn't jump
  if (off) return;
  const [a, b] = TAGLINES[view] || tagDefault, t1 = $(".tagline .t1"), t2 = $(".tagline .t2");
  if (t1.textContent === a && t2.textContent === b) return;
  t1.textContent = a; t2.textContent = b;
  [t1, t2].forEach((t) => { t.classList.remove("swap"); void t.offsetWidth; t.classList.add("swap"); });
}
function swap() {
  setTagline();
  $("#view-home").hidden = !!view;
  VIEWS.forEach((v) => ($("#" + v).hidden = v !== view));
  if (view === "how") requestAnimationFrame(() => pile.wake()); // the icons tumble in once About is on screen
}
function showView(name, { focus = true, animate = true } = {}) {
  const next = VIEWS.includes(name) ? name : null;
  if (next === view && animate) return;
  // opening a view from the start: the dark highlight begins as the whole tab that was clicked, then closes into
  // the round back button (instead of popping in from nothing)
  if (!view && next && animate && !noMotion()) {
    const b = viewBtns.find((x) => x.dataset.view === next);
    clearTimeout(ind._fade); // a quick reopen cancels the closing fade
    ind.style.transition = "none";
    ind.style.width = `${b.offsetWidth}px`; ind.style.transform = `translateX(${b.offsetLeft}px)`; ind.style.opacity = "1";
    void ind.offsetWidth; ind.style.transition = "";
  }
  // going back to the start: no blur on the way out (only opening a tab blurs its content in)
  const prev = view;
  if (view && !next) { bar.classList.add("going-back"); clearTimeout(bar._back); bar._back = setTimeout(() => bar.classList.remove("going-back"), 700); }
  view = next;
  viewBtns.forEach((b) => {
    const on = b.dataset.view === view;
    b.setAttribute("aria-pressed", on);
    const label = $(".pl", b).textContent;
    b.setAttribute("aria-label", on ? "Back" : label); // the open view's button takes you back to the start
  });
  const closing = prev && !view;
  layoutBar(animate);
  // going back: the dark circle goes as soon as ← is clicked (a quick fade, no stretching), while the tabs return
  if (closing && animate && !noMotion()) {
    ind.style.transition = "opacity 0.1s ease"; ind.style.opacity = "0";
    clearTimeout(ind._fade); ind._fade = setTimeout(() => { ind.style.transition = ""; }, 150);
  }
  // the views morph into each other where the browser supports view transitions
  if (animate && !noMotion() && document.startViewTransition) {
    // the bar's frosted blur would be drawn as a square during the switch, so it's switched off until the switch ends
    const root = document.documentElement;
    root.classList.add("switching");
    document.startViewTransition(swap).finished.finally(() => root.classList.remove("switching"));
  } else swap();
  try { history.replaceState(null, "", view ? `#${HASH[view]}` : location.pathname + location.search); } catch { /* sandboxed */ }
  if (focus) (view ? $("#" + view) : wordIn).focus({ preventScroll: true });
}
if (document.startViewTransition) document.documentElement.classList.add("vt");
viewBtns.forEach((b) => b.addEventListener("click", () => showView(b.dataset.view === view ? null : b.dataset.view)));
$("[data-home]").addEventListener("click", (e) => { e.preventDefault(); showView(null); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && view && !document.querySelector("dialog[open]")) showView(null);
});
measure();
document.fonts?.ready.then(measure);

// GitHub stars on the Use Skill pill: shown once there are any; cached for an hour so visitors don't hit the API on every load
(async () => {
  const KEY = "pi-gh-stars", HOUR = 36e5;
  let n;
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    if (c && Date.now() - c.t < HOUR) n = c.n;
  } catch { /* storage blocked */ }
  if (n === undefined) {
    try {
      const r = await fetch("https://api.github.com/repos/iamjahanvi/pixel-icon-generator");
      if (!r.ok) return;
      n = (await r.json()).stargazers_count;
      try { localStorage.setItem(KEY, JSON.stringify({ n, t: Date.now() })); } catch { /* storage blocked */ }
    } catch { return; }
  }
  if (!(n > 0)) return;
  $("#gh-stars-n").textContent = n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : n;
  $("#gh-stars").hidden = false;
  $("#gh-link").setAttribute("aria-label", `GitHub, ${n} stars`);
  remeasure($("#gh-link"));
})();
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(measure, 120); });
{ const v = FROM_HASH[location.hash.slice(1).toLowerCase()]; if (v) showView(v, { focus: false, animate: false }); }

// ---------- wiring ----------
function closeAll() { $$("dialog[open]").forEach((d) => d.close()); }
document.addEventListener("click", (e) => {
  const t = e.target;
  const o = t.closest("[data-open]");
  if (o) openDetail(bySlug(o.dataset.open));
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
    document.activeElement === search ? search.blur() : openLibrary();
  } else if (e.key === "/" && !e.target.closest("input, textarea, dialog[open]")) {
    e.preventDefault();
    openLibrary();
  }
});
if (location.hash === "#editor" || location.hash === "#draw") openEditor();
if (location.hash === "#paste") { openEditor(); editor.openPaste(); }
if (location.hash === "#make") openMake();

// show the shortcut the visitor actually has

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

// tell the loading state the page is ready (icons rendered, fonts in)
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => window.__bootReady?.());
