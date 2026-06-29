# 00 · Vizyon

## Amaç
Şube mesul müdürleri ve işletme müdürlerinin haftalık **çalışma çizelgesi**, **puantaj** ve **mesai** işlerini kağıttan dijitale taşıyan, tek uygulamada toplayan bir yönetim aracı. Her sorumlu kendi şubesini kolayca yönetir; merkez (işletme müdürü) bağlı şubeleri tek yerden görür.

## Kullanıcılar
- **Şube Mesul Müdürü / Sorumlusu** — kendi şubesinin çizelgesini kurar, üretir, paylaşır.
- **İşletme Müdürü / Merkez** — birden çok şubeyi görür ve denetler (örn. Metehan: 3 şube).

## Üç modül
1. **Çalışma Çizelgesi** — haftalık vardiya planı (gündüz/gece, görevler, izinler), adaletli otomatik üretim, WhatsApp + temiz görsel çıktısı.
2. **Puantaj** — günlük çalışma/izin kaydı (x / i / R / Üİ), haftalık ve aylık bildirim, muhasebe çıktısı.
3. **Mesai** — fazla çalışma saatleri kaydı, aylık özet.

## Alınan kararlar
- Altyapı: **Supabase** (Auth + Postgres + RLS). Frontend: **React + Vite + Tailwind**. Dağıtım: **Vercel**.
- Erişim: her şube sorumlusu kendi girişiyle, yalnız kendi şubesi.
- Kapsam: 6 lokasyon (Rumeli İskelesi, Sahil, Vagon, Tunaboyu, Millet Bahçesi, Yahya Kemal) ve alt şubeleri. Şubeler/alt şubeler kapanabilir, sorumlular değişebilir. İlk etap: Metehan'ın lokasyonu (Rumeli İskelesi + İskele Dondurma + Balık Ekmek).

## Fayda
Kağıt işini bitirir, hatayı azaltır, merkezi görünürlük sağlar; çizelge → puantaj → mesai aynı veriden beslenir.
