-- Admin felület felhasználói (a fő "admin" belépés továbbra is az ADMIN_PASSWORD, ez a többieké)
-- Futtasd le egyszer a Supabase projektben: SQL Editor → New query → beillesztés → Run

create table if not exists public.felhasznalok (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  nev          text not null,
  jelszo_hash  text not null,                       -- scrypt, sóval (api/_lib.js hashPw)
  szerep       text not null default 'raktaros',    -- admin | raktaros | ajanlat
  aktiv        boolean not null default true
);

create unique index if not exists felhasznalok_nev_idx on public.felhasznalok (lower(nev));

-- Csak a szerver (service_role kulcs) érheti el: RLS bekapcsolva, nyilvános szabály nincs
alter table public.felhasznalok enable row level security;
