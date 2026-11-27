// The About page wall: every visitor's drawn-and-dropped icons, shared.
// GET    /api/drops            -> the latest drops, newest first
// POST   /api/drops            -> add one { palette, grid, who? }   (5 per visitor per day)
// DELETE /api/drops?id=...     -> remove one (only with the admin token)
//
// Storage: Upstash Redis over its REST API (no packages). Vercel's Upstash integration sets
// KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
// ADMIN_TOKEN is a password you choose, set in Vercel's environment variables.
import { createHash, randomBytes } from "node:crypto";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LIST = "pb:drops", KEEP = 200, SHOW = 60, PER_DAY = 5;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function redis(...cmds) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).map((x) => x.result);
}

// ---- validation: only a 16x16 grid, a few hex colours, and a clean handle get through ----
const HEX = /^#[0-9a-f]{6}$/i;
function cleanIcon(b) {
  const pal = b && b.palette, grid = b && b.grid;
  if (!pal || typeof pal !== "object" || !Array.isArray(grid) || grid.length !== 16) return null;
  const keys = Object.keys(pal);
  if (keys.length < 1 || keys.length > 12 || !keys.every((k) => /^[A-Za-z]$/.test(k) && HEX.test(pal[k]))) return null;
  if (!grid.every((row) => typeof row === "string" && row.length === 16 && [...row].every((c) => c === "." || keys.includes(c)))) return null;
  if (grid.every((row) => /^\.+$/.test(row))) return null;
  return { palette: Object.fromEntries(keys.map((k) => [k, pal[k].toLowerCase()])), grid };
}
function cleanWho(w) {
  if (!w || typeof w !== "object") return null;
  if (w.kind === "x" && /^[A-Za-z0-9_]{1,15}$/.test(w.handle || "")) return { kind: "x", handle: w.handle };
  if (w.kind === "li" && /^[A-Za-z0-9-_%]{3,100}$/.test(w.handle || "")) {
    const name = String(w.name || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 40);
    return { kind: "li", handle: w.handle, name: name || null };
  }
  return null;
}
const visitor = (req) => {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`pb:${ip}`).digest("hex").slice(0, 24); // hashed: the raw IP is never stored
};

export async function GET() {
  if (!URL_) return json({ error: "storage not set up" }, 503);
  const [raw] = await redis(["LRANGE", LIST, 0, SHOW - 1]);
  return json({ drops: (raw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean) });
}

export async function POST(req) {
  if (!URL_) return json({ error: "storage not set up" }, 503);
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const icon = cleanIcon(body);
  if (!icon) return json({ error: "not a 16x16 drawing" }, 400);
  const day = new Date().toISOString().slice(0, 10), rate = `pb:rate:${visitor(req)}:${day}`;
  const [count] = await redis(["INCR", rate], ["EXPIRE", rate, 86400]);
  if (count > PER_DAY) return json({ error: "That's 5 drops for today. Come back tomorrow!" }, 429);
  const drop = { id: randomBytes(6).toString("hex"), t: Date.now(), ...icon, who: cleanWho(body.who) };
  await redis(["LPUSH", LIST, JSON.stringify(drop)], ["LTRIM", LIST, 0, KEEP - 1]);
  return json({ drop }, 201);
}

export async function DELETE(req) {
  if (!URL_) return json({ error: "storage not set up" }, 503);
  const admin = process.env.ADMIN_TOKEN;
  if (!admin || req.headers.get("authorization") !== `Bearer ${admin}`) return json({ error: "not allowed" }, 401);
  const id = new URL(req.url).searchParams.get("id");
  const [raw] = await redis(["LRANGE", LIST, 0, -1]);
  const hit = (raw || []).find((s) => { try { return JSON.parse(s).id === id; } catch { return false; } });
  if (!hit) return json({ error: "not found" }, 404);
  await redis(["LREM", LIST, 1, hit]);
  return json({ ok: true });
}
