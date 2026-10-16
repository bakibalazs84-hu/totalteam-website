-- Saját projektre kivitt raktári tételek
-- Futtasd le egyszer a Supabase projektben: SQL Editor → New query → beillesztés → Run

create table if not exists public.kivitelek (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  projekt          text not null,
  felelos          text,
  kivitel_napja    date,
  vissza_tervezett date,
  megjegyzes       text,
  -- [{ "id": "ASZ001", "code": "ASZ-001", "name": "…", "qty": 2, "vissza": 0 }]
  tetelek          jsonb not null default '[]'::jsonb,
  visszahozva_at   timestamptz
);

create index if not exists kivitelek_created_idx on public.kivitelek (created_at desc);

-- Csak a szerver (service_role kulcs) érheti el: RLS bekapcsolva, nyilvános szabály nincs
alter table public.kivitelek enable row level security;
