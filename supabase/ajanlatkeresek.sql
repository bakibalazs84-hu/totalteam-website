-- Bérlési ajánlatkérések a raktár oldalról (bérlési lista → "Bérlési igény küldése")
-- Futtasd le egyszer a Supabase projektben: SQL Editor → New query → beillesztés → Run

create table if not exists public.ajanlatkeresek (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nev         text not null,
  tel         text,
  ceg         text,
  tol         date,
  ig          date,
  megjegyzes  text,
  -- [{ "id": "ASZ001", "code": "ASZ-001", "name": "…", "dims": "…", "qty": 2 }]
  tetelek     jsonb not null default '[]'::jsonb,
  statusz     text not null default 'uj'      -- uj | ajanlat | kiadva | lezart
);

create index if not exists ajanlatkeresek_created_idx on public.ajanlatkeresek (created_at desc);

-- Csak a szerver (service_role kulcs) érheti el: RLS bekapcsolva, nyilvános szabály nincs
alter table public.ajanlatkeresek enable row level security;
