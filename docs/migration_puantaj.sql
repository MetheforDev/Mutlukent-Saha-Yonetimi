-- ============================================================
-- Puantaj modülü — günlük çalışma/izin kaydı
-- docs/04_Puantaj_Mesai.md · docs/01_Sozluk.md (x/i/R/Üİ)
-- supabase_schema.sql üzerine ek migration. SQL Editor'da tek seferde çalışır.
-- ============================================================

create table if not exists puantaj (
  id uuid primary key default gen_random_uuid(),
  sube_id uuid not null references subeler(id) on delete cascade,
  personel_id uuid not null references personel(id) on delete cascade,
  tarih date not null,
  durum text not null check (durum in ('x','i','R','Üİ')),
  created_at timestamptz default now(),
  unique (sube_id, personel_id, tarih)
);

alter table puantaj enable row level security;

create policy puantaj_erisim on puantaj for all
  using (has_sube(sube_id)) with check (has_sube(sube_id));
