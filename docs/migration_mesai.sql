-- Mesai tablosu migration — SQL Editor'da çalıştır
create table if not exists mesai (
  id uuid primary key default gen_random_uuid(),
  sube_id uuid not null references subeler(id) on delete cascade,
  personel_id uuid not null references personel(id) on delete cascade,
  tarih date not null,
  ek_saat numeric(5,1) not null check (ek_saat > 0),
  created_at timestamptz default now(),
  unique (sube_id, personel_id, tarih)
);

alter table mesai enable row level security;

create policy mesai_erisim on mesai for all
  using (has_sube(sube_id)) with check (has_sube(sube_id));
