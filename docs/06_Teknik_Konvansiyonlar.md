# 06 · Teknik Konvansiyonlar

## Yığın
- **Frontend:** React + Vite + Tailwind CSS
- **Backend/Veri:** Supabase (Auth + Postgres + RLS), `@supabase/supabase-js`
- **Dağıtım:** Vercel (otomatik build). PWA — telefonda uygulama gibi.

## Klasör yapısı (öneri)
```
src/
  lib/supabase.js          # istemci + yardımcılar
  context/AuthContext.jsx  # oturum + seçili şube
  components/              # ortak UI (grid, hücre, çıktı, modal)
  modules/
    cizelge/               # haftalık çizelge ekranı + motor
    puantaj/               # puantaj ekranı
    mesai/                 # mesai ekranı
  pages/                   # Giriş, ŞubeSeçimi, Pano
```

## Ortam değişkenleri (.env)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
(Anahtarlar Vercel proje ayarlarına da girilir; koda gömülmez.)

## Stil / tema
- Koyu deniz teması: arka plan #081520, panel #0e2233; vurgu **foam** #3fe0c5, **violet** #9d8bff, **amber** #ffb454, **coral** #ff6b5c.
- Font: Space Grotesk (başlık), Inter (gövde), IBM Plex Mono (sayı/çıktı).
- Mobil öncelikli; tablolarda yatay kaydırma.

## Çıktı bileşenleri (ortak)
- **Temiz Görünüm + PNG indir** (html2canvas), **WhatsApp metni** (kopyala), **Yazdır/PDF**.

## Akış
- Geliştirme: yerelde Vite. Yayın: GitHub → Vercel otomatik deploy.
- Veritabanı değişiklikleri SQL migrasyonları ile.
