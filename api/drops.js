// The About page wall: every visitor's drawn-and-dropped icons, shared.
// GET    /api/drops            -> the latest drops, newest first
// POST   /api/drops            -> add one { palette, grid, who? }   (5 per visitor per day)
// DELETE /api/drops?id=...     -> remove one (only with the admin token)
//
// Storage: Supabase (Postgres) through its REST API, no packages. The table is created once with the SQL
// in api/drops.sql. Vercel's Supabase integration sets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// (Upstash Redis also works: set KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / _TOKEN.)
// ADMIN_TOKEN is a password you choose, set in Vercel's environment variables.
import { createHash, randomBytes } from "node:crypto";

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LIST = "pb:drops", KEEP = 200, SHOW = 60, PER_DAY = 5;
const backend = SB_URL && SB_KEY ? "supabase" : URL_ && TOKEN ? "redis" : null;

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

// ---- the three things the wall needs, for either backend ----
const store = {
  async list() {
    if (backend === "supabase") return (await (await sb(`pixbits_drops?select=id,t,palette,grid,who&order=t.desc&limit=${SHOW}`)).json());
    const [raw] = await redis(["LRANGE", LIST, 0, SHOW - 1]);
    return (raw || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  },
  // how many this visitor has dropped today, counting the new one
  async countToday(v) {
    const day = new Date().toISOString().slice(0, 10);
    if (backend === "supabase") {
      const since = Date.parse(`${day}T00:00:00Z`);
      const r = await sb(`pixbits_drops?select=id&visitor=eq.${v}&t=gte.${since}`, { prefer: "count=exact" });
      return Number((r.headers.get("content-range") || "*/0").split("/")[1]) + 1;
    }
    const rate = `pb:rate:${v}:${day}`;
    const [count] = await redis(["INCR", rate], ["EXPIRE", rate, 86400]);
    return count;
  },
  async add(drop, v) {
    if (backend === "supabase") return sb("pixbits_drops", { method: "POST", body: { ...drop, visitor: v }, prefer: "return=minimal" });
    await redis(["LPUSH", LIST, JSON.stringify(drop)], ["LTRIM", LIST, 0, KEEP - 1]);
  },
  async remove(id) {
    if (backend === "supabase") {
      const r = await sb(`pixbits_drops?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=representation" });
      return (await r.json()).length > 0;
    }
    const [raw] = await redis(["LRANGE", LIST, 0, -1]);
    const hit = (raw || []).find((s) => { try { return JSON.parse(s).id === id; } catch { return false; } });
    if (!hit) return false;
    await redis(["LREM", LIST, 1, hit]);
    return true;
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
  if (!admin || req.headers.get("authorization") !== `Bearer ${admin}`) return json({ error: "not allowed" }, 401);
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f]{12}$/.test(id)) return json({ error: "not found" }, 404);
  return (await store.remove(id)) ? json({ ok: true }) : json({ error: "not found" }, 404);
}
