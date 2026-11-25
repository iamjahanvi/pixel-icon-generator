// Make an icon on the site: the visitor's own Anthropic API key, called straight from the browser.
// The key never touches our server; it goes only to api.anthropic.com.
import { check } from "./core.js";
import { parseIcons } from "./editor.js";
import { buildPrompt } from "./prompt.js";

const API = "https://api.anthropic.com/v1/messages";
const KEY_STORE = "pixel-icons-api-key";
const MAX_FIXES = 2;

export const MODELS = [
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (faster)" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 (best results)" },
];

export function savedKey() {
  try { return localStorage.getItem(KEY_STORE) || ""; } catch { return ""; }
}
export function rememberKey(key) {
  try { key ? localStorage.setItem(KEY_STORE, key) : localStorage.removeItem(KEY_STORE); } catch { /* storage blocked */ }
}

class MakeError extends Error {}

async function ask(key, model, messages, signal) {
  let res;
  try {
    res = await fetch(API, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model, max_tokens: 16000, messages }),
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new MakeError("Couldn't reach Anthropic. Check your connection and try again.");
  }
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) {
    const msg = body?.error?.message || "";
    if (res.status === 401) throw new MakeError("That API key didn't work. Check it in the Claude Console and paste it again.");
    if (res.status === 403) throw new MakeError(`Your key can't use this model. ${msg}`.trim());
    if (res.status === 429) throw new MakeError("Your key hit its rate limit. Wait a minute and try again.");
    if (res.status === 529 || res.status >= 500) throw new MakeError("Claude is busy right now. Try again in a moment.");
    throw new MakeError(msg || `Anthropic returned an error (${res.status}).`);
  }
  return (body.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

// Runs the whole job: draw, check, and ask for fixes until the icon passes or we run out of tries.
// onStep(text) reports progress. Returns { doc, idea, errs, warns }.
export async function makeIcon({ word, key, model, example, onStep, signal }) {
  const messages = [{ role: "user", content: buildPrompt(word, example, { api: true }) }];
  onStep(`Drawing “${word}”…`);
  let reply = await ask(key, model, messages, signal);
  for (let round = 0; ; round++) {
    const parsed = parseIcons(reply);
    const idea = reply.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("```") && !l.startsWith("{")) || "";
    if (parsed.error) {
      if (round >= MAX_FIXES) throw new MakeError("Claude didn't send back an icon. Try again, or try a more concrete word.");
      messages.push({ role: "assistant", content: reply }, { role: "user", content: "I couldn't find the icon JSON in your reply. Reply with one line, then one code block containing only the JSON." });
    } else {
      const doc = { ...parsed.icons[0], style: "color" };
      if (!Object.values(doc.palette).includes("#000000")) doc.palette.K = "#000000";
      const [errs, warns] = check(doc);
      if (!errs.length || round >= MAX_FIXES) return { doc, idea: idea.replace(/^[#*>\s-]+/, ""), errs, warns };
      onStep(`Fixing ${errs.length === 1 ? "1 problem" : `${errs.length} problems`}…`);
      messages.push({ role: "assistant", content: reply }, {
        role: "user",
        content: `The style checker found these problems:\n${errs.slice(0, 20).map((e) => `- ${e}`).join("\n")}\n\nCoordinates are (column,row), both counted from 0. Fix every problem without changing the idea, then reply with one line and one code block containing the corrected JSON.`,
      });
    }
    reply = await ask(key, model, messages, signal);
  }
}
