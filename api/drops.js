// The About page wall: every visitor's drawn-and-dropped icons, shared.
// GET    /api/drops            -> the latest drops, newest first
// POST   /api/drops            -> add one { palette, grid, who? }   (5 per visitor per day)
// DELETE /api/drops?id=...     -> remove one (only with the admin token)
//
// Storage: Supabase (Postgres) through its REST API, no packages. The table is created once with the SQL
// in supabase/pixbits_drops.sql. Vercel's Supabase integration sets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// ADMIN_TOKEN is a password you choose, set in Vercel's environment variables.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHOW = 60, PER_DAY = 5;
const backend = SB_URL && SB_KEY;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Supabase's REST API (PostgREST) with the service key: only this server can read or write the table
async function sb(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, "content-type": "application/json", ...(prefer ? { prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`supabase ${r.status} ${await r.text()}`);
  return r;
}

// ---- the things the wall needs ----
const store = {
  async list() {
    return (await sb(`pixbits_drops?select=id,t,palette,grid,who&order=t.desc&limit=${SHOW}`)).json();
  },
  // how many this visitor has dropped today, counting the new one
  async countToday(v) {
    const since = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const r = await sb(`pixbits_drops?select=id&visitor=eq.${v}&t=gte.${since}`, { prefer: "count=exact" });
    return Number((r.headers.get("content-range") || "*/0").split("/")[1]) + 1;
  },
  async add(drop, v) {
    return sb("pixbits_drops", { method: "POST", body: { ...drop, visitor: v }, prefer: "return=minimal" });
  },
  async remove(id) {
    const r = await sb(`pixbits_drops?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=representation" });
    return (await r.json()).length > 0;
  },
};

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
  if (!backend) return json({ error: "storage not set up" }, 503);
  return json({ drops: await store.list() });
}

export async function POST(req) {
  if (!backend) return json({ error: "storage not set up" }, 503);
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const icon = cleanIcon(body);
  if (!icon) return json({ error: "not a 16x16 drawing" }, 400);
  const v = visitor(req);
  if ((await store.countToday(v)) > PER_DAY) return json({ error: "That's 5 drops for today. Come back tomorrow!" }, 429);
  const drop = { id: randomBytes(6).toString("hex"), t: Date.now(), ...icon, who: cleanWho(body.who) };
  await store.add(drop, v);
  return json({ drop }, 201);
}

export async function DELETE(req) {
  if (!backend) return json({ error: "storage not set up" }, 503);
  const admin = process.env.ADMIN_TOKEN;
  // compared in constant time, so the password can't be guessed a character at a time from response times
  const sent = createHash("sha256").update(req.headers.get("authorization") || "").digest();
  if (!admin || !timingSafeEqual(sent, createHash("sha256").update(`Bearer ${admin}`).digest())) return json({ error: "not allowed" }, 401);
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f]{12}$/.test(id)) return json({ error: "not found" }, 404);
  return (await store.remove(id)) ? json({ ok: true }) : json({ error: "not found" }, 404);
}
