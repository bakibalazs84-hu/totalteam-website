-- Kézzel foglaltnak jelölt raktári tételek (admin → Foglaltság fül)
-- Futtasd le egyszer a Supabase projektben: SQL Editor → New query → beillesztés → Run

create table if not exists public.foglalasok (
  termek_id  text primary key,          -- pl. "ASZ001" (a raktár PRODUCTS id-ja)
  ok         text,                      -- miért foglalt (csak az adminban látszik)
  created_at timestamptz not null default now()
);

-- Csak a szerver (service_role kulcs) érheti el: RLS bekapcsolva, nyilvános szabály nincs
alter table public.foglalasok enable row level security;
