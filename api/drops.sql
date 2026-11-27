-- Pixbits wall: run once in Supabase (SQL Editor → New query → paste → Run).
-- A table of its own, so nothing else in the database is touched.
create table if not exists public.pixbits_drops (
  id      text primary key,          -- 12 random hex characters
  t       bigint not null,           -- when it was dropped (ms since 1970)
  palette jsonb  not null,           -- { "K": "#000000", ... }
  grid    jsonb  not null,           -- 16 strings of 16 characters
  who     jsonb,                     -- { kind: "x" | "li", handle, name } or null
  visitor text   not null            -- hashed visitor id, for the 5-a-day limit (never the raw IP)
);
create index if not exists pixbits_drops_t on public.pixbits_drops (t desc);
create index if not exists pixbits_drops_visitor_t on public.pixbits_drops (visitor, t);

-- Locked down: with row level security on and no policies, only the server (service role key) can read or write.
alter table public.pixbits_drops enable row level security;
