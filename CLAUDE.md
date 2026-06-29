# Claude Code Brief — Mutlukent Saha Yönetim Sistemi

Bu, şube mesul müdürlerinin **çalışma çizelgesi · puantaj · mesai** işlerini dijitale taşıyan, çok şubeli bir yönetim uygulamasıdır. Türkçe geliştir.

## Önce oku
`docs/` klasöründeki tüm dokümanlar bağlayıcıdır:
- `00_Vizyon.md`, `02_Subeler.md` (lokasyon→alt şube hiyerarşisi), `03_Cizelge_Kurallari.md` (adalet motoru), `04_Puantaj_Mesai.md`, `05_Veri_Modeli.md`, `06_Teknik_Konvansiyonlar.md`, `07_Yol_Haritasi.md`, `01_Sozluk.md`.
- `docs/supabase_schema.sql` — veritabanı (tablolar + RLS + şube tohumu).
- `docs/reference/haftalik_calisma_cizelgesi.html` — çizelge ekranının çalışan referans prototipi (tasarım, R/C, ara vardiya, temiz görünüm, PNG/WhatsApp çıktısı, izinli listesi). UI'yi buna sadık kur.

## Yığın
React + Vite + Tailwind + Supabase (`@supabase/supabase-js`), dağıtım Vercel. Mobil öncelikli, koyu/neon tema (tailwind.config.js renkleri).

## Hazır olan (scaffold)
- Supabase istemcisi (`src/lib/supabase.js`), Auth context, korumalı yönlendirme.
- Giriş ekranı, Şube seçimi (hiyerarşik, RLS ile kapsanmış).
- Adalet motoru: `src/modules/cizelge/engine.js` (`makePlan`). Saf fonksiyon, hazır kullan.

## Yapılacaklar (Faz 1 — Çizelge)
1. `CizelgePage`: seçili şubenin `gorevler`, `personel` (+`personel_gorevleri`), `yapi`'sını çek; vardiya modeline göre (tek/çift) gridi kur.
2. Hücre düzenleme: isim seç, R/C, ara vardiya saati; otomatik izinli listesi; imza kutusu.
3. Kaydet/Yükle: `cizelge` + `cizelge_atamalari`. "Adaletli Üret" → `makePlan` (counters `rotasyon_sayaclari`'ndan; kaydedince ilerlet).
4. Çıktılar: Temiz Görünüm + PNG (html2canvas), WhatsApp metni (kopyala), Yazdır/PDF.
5. Şube kurulum ekranı: görev/personel/yapı/kural (sabit izin) düzenleme.

## Faz 2-3: Puantaj ve Mesai modülleri (`04_Puantaj_Mesai.md`).

## İlkeler
- Her sorumlu yalnız kendi lokasyonu + alt şubelerini görür (RLS hallediyor).
- Şube/alt şube kapanabilir (`aktif=false`), sorumlu değişebilir — sabit varsayma.
- Çalışan, küçük adımlar; çıktı her zaman WhatsApp + temiz görsel odaklı.
