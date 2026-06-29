-- ============================================================
-- Mutlukent Saha Yönetim Sistemi — Supabase şeması
-- Lokasyon→alt şube hiyerarşisi · aktif/kapalı · değişebilir sorumlu
-- Tablolar + RLS + şube tohumu. SQL Editor'da tek seferde çalışır.
-- ============================================================

-- ---------- TABLOLAR ----------
create table if not exists subeler (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  ikon text,                                   -- emoji (🌊 🍦 🐟 …)
  ust_sube_id uuid references subeler(id) on delete cascade,  -- alt şube ise ana şube
  sorumlu_adi text,                            -- görünen sorumlu adı (hesaptan bağımsız)
  vardiya_modeli text not null default 'cift' check (vardiya_modeli in ('tek','cift')),
  ara_vardiya_aktif boolean not null default false,
  konum_etiketi_aktif boolean not null default false,  -- R/C
  acilis text, kapanis text,
  aktif boolean not null default true,         -- kapanınca false (silinmez)
  created_at timestamptz default now()
);

create table if not exists kullanici_subeleri (
  user_id uuid not null references auth.users(id) on delete cascade,
  sube_id uuid not null references subeler(id) on delete cascade,
  rol text not null default 'sorumlu' check (rol in ('sorumlu','merkez')),
  primary key (user_id, sube_id)
);

create table if not exists gorevler (
  id uuid primary key default gen_random_uuid(),
  sube_id uuid not null references subeler(id) on delete cascade,
  ad text not null, renk text default '#3fe0c5', sira int default 0
);

create table if not exists personel (
  id uuid primary key default gen_random_uuid(),
  sube_id uuid not null references subeler(id) on delete cascade,
  ad text not null, sabit_izin_gunu int, aktif boolean not null default true
);

create table if not exists personel_gorevleri (
  personel_id uuid not null references personel(id) on delete cascade,
  gorev_id uuid not null references gorevler(id) on delete cascade,
  primary key (personel_id, gorev_id)
);

create table if not exists yapi (
  id uuid primary key default gen_random_uuid(),
  sube_id uuid not null references subeler(id) on delete cascade,
  vardiya text not null check (vardiya in ('tek','gunduz','gece')),
  gorev_id uuid not null references gorevler(id) on delete cascade,
  slot_sayisi int not null default 1
);

create table if not exists cizelge (
  id uuid primary key default gen_random_uuid(),
  sube_id uuid not null references subeler(id) on delete cascade,
  hafta_baslangic date not null,
  durum text not null default 'taslak' check (durum in ('taslak','yayinlandi')),
  rotasyon_index int default 0,
  created_by uuid references auth.users(id), created_at timestamptz default now(),
  unique (sube_id, hafta_baslangic)
);

create table if not exists cizelge_atamalari (
  id uuid primary key default gen_random_uuid(),
  cizelge_id uuid not null references cizelge(id) on delete cascade,
  personel_id uuid references personel(id) on delete set null,
  gun int not null check (gun between 0 and 6),
  vardiya text not null check (vardiya in ('tek','gunduz','gece')),
  gorev_id uuid references gorevler(id) on delete set null,
  slot int default 0, konum text check (konum in ('R','C')), saat text
);

create table if not exists rotasyon_sayaclari (
  sube_id uuid not null references subeler(id) on delete cascade,
  personel_id uuid not null references personel(id) on delete cascade,
  gunduz int default 0, gece int default 0, toplam int default 0,
  primary key (sube_id, personel_id)
);

-- ---------- YETKİ (miras: ana şubeye bağlı sorumlu alt şubelere de erişir) ----------
create or replace function has_sube(s uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from subeler sb
    where sb.id = s and exists (
      select 1 from kullanici_subeleri ks
      where ks.user_id = auth.uid()
        and (ks.sube_id = sb.id or ks.sube_id = sb.ust_sube_id)
    )
  );
$$;

-- ---------- RLS ----------
alter table subeler enable row level security;
alter table kullanici_subeleri enable row level security;
alter table gorevler enable row level security;
alter table personel enable row level security;
alter table personel_gorevleri enable row level security;
alter table yapi enable row level security;
alter table cizelge enable row level security;
alter table cizelge_atamalari enable row level security;
alter table rotasyon_sayaclari enable row level security;

create policy sube_erisim on subeler for all using (has_sube(id)) with check (has_sube(id));
create policy ks_self on kullanici_subeleri for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy gorev_erisim on gorevler for all using (has_sube(sube_id)) with check (has_sube(sube_id));
create policy personel_erisim on personel for all using (has_sube(sube_id)) with check (has_sube(sube_id));
create policy yapi_erisim on yapi for all using (has_sube(sube_id)) with check (has_sube(sube_id));
create policy cizelge_erisim on cizelge for all using (has_sube(sube_id)) with check (has_sube(sube_id));
create policy rotasyon_erisim on rotasyon_sayaclari for all using (has_sube(sube_id)) with check (has_sube(sube_id));
create policy pg_erisim on personel_gorevleri for all
  using (exists (select 1 from personel p where p.id = personel_id and has_sube(p.sube_id)))
  with check (exists (select 1 from personel p where p.id = personel_id and has_sube(p.sube_id)));
create policy atama_erisim on cizelge_atamalari for all
  using (exists (select 1 from cizelge c where c.id = cizelge_id and has_sube(c.sube_id)))
  with check (exists (select 1 from cizelge c where c.id = cizelge_id and has_sube(c.sube_id)));

-- ---------- ŞUBE TOHUMU (lokasyonlar + alt şubeler + sorumlular) ----------
do $$
declare rumeli uuid; sahil uuid; vagon uuid; tuna uuid; millet uuid; yahya uuid; idond uuid; balik uuid; gid uuid;
begin
  -- Lokasyonlar (ana şube)
  insert into subeler(ad,ikon,vardiya_modeli,ara_vardiya_aktif,konum_etiketi_aktif,acilis,kapanis,sorumlu_adi)
    values ('Rumeli İskelesi','🌊','cift',true,true,'09:00','00:00','Metehan Arslan') returning id into rumeli;
  insert into subeler(ad,ikon,sorumlu_adi) values ('Sahil','🏖️','Bahtiyar Kurt') returning id into sahil;
  insert into subeler(ad,ikon,sorumlu_adi) values ('Vagon','🚂','Baturay Cimpiri') returning id into vagon;
  insert into subeler(ad,ikon,sorumlu_adi) values ('Tunaboyu','🏞️','Semra Polat') returning id into tuna;
  insert into subeler(ad,ikon,sorumlu_adi) values ('Millet Bahçesi','🌳','Melis Boyalık') returning id into millet;
  insert into subeler(ad,ikon,sorumlu_adi) values ('Yahya Kemal','📚','Berkay Nazlıgül') returning id into yahya;

  -- Alt şubeler
  insert into subeler(ad,ikon,ust_sube_id,vardiya_modeli,acilis,kapanis,sorumlu_adi)
    values ('İskele Dondurma','🍦',rumeli,'tek','14:00','22:00','Metehan Arslan') returning id into idond;
  insert into subeler(ad,ikon,ust_sube_id,vardiya_modeli,acilis,kapanis,sorumlu_adi)
    values ('Balık Ekmek','🐟',rumeli,'tek','14:00','22:00','Metehan Arslan') returning id into balik;
  insert into subeler(ad,ikon,ust_sube_id,vardiya_modeli,sorumlu_adi) values
    ('Sahil Dondurma','🍦',sahil,'tek','Bahtiyar Kurt'),
    ('Vagon Dondurma','🍦',vagon,'tek','Baturay Cimpiri'),
    ('TunaPub','🍻',tuna,'tek','Semra Polat'),
    ('Millet Dondurma','🍦',millet,'tek','Melis Boyalık');

  -- Rumeli İskelesi görevleri + yapı (gündüz/gece)
  insert into gorevler(sube_id,ad,renk,sira) values
    (rumeli,'Kasa','#6fb0ff',1),(rumeli,'Ocak','#ff8f6b',2),(rumeli,'Aracı','#ffbf9b',3),
    (rumeli,'Garson','#3fe0c5',4),(rumeli,'Mutfak','#ffd166',5),(rumeli,'Kahvaltı','#ffe08a',6),
    (rumeli,'Temizlik','#9aa7b0',7);
  for gid in select id from gorevler where sube_id = rumeli loop
    insert into yapi(sube_id,vardiya,gorev_id,slot_sayisi) values (rumeli,'gunduz',gid,1),(rumeli,'gece',gid,1);
  end loop;

  -- İskele Dondurma
  insert into gorevler(sube_id,ad,renk,sira) values (idond,'Dondurmacı','#ffd166',1),(idond,'Kasiyer','#6fb0ff',2);
  for gid in select id from gorevler where sube_id = idond loop
    insert into yapi(sube_id,vardiya,gorev_id,slot_sayisi) values (idond,'tek',gid,1);
  end loop;

  -- Balık Ekmek
  insert into gorevler(sube_id,ad,renk,sira) values (balik,'Balıkçı','#6fb0ff',1),(balik,'Kasa','#3fe0c5',2);
  for gid in select id from gorevler where sube_id = balik loop
    insert into yapi(sube_id,vardiya,gorev_id,slot_sayisi) values (balik,'tek',gid,1);
  end loop;
end $$;

-- ---------- KENDİNİ ŞUBENE BAĞLA (oturum açıkken) ----------
-- Rumeli İskelesi'ne bağlan; alt şubelere erişim otomatik miras kalır:
-- insert into kullanici_subeleri(user_id, sube_id, rol)
-- select auth.uid(), id, 'sorumlu' from subeler where ad = 'Rumeli İskelesi';
