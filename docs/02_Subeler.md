# 02 · Şubeler

## Yapı: Lokasyon → Alt şube
Şirket **lokasyonlardan** (ana şube) oluşur; her lokasyonun bir veya birkaç **alt şubesi** (işletme birimi) olabilir. Her alt şube kendi personeli, görevleri ve çizelgesiyle bağımsız bir birimdir. Her lokasyonun bir **sorumlusu** vardır ve o sorumlu, lokasyonu + tüm alt şubelerini yönetir (erişim alt şubelere miras kalır).

## Önemli ilkeler
- **Şubeler ve alt şubeler kapanabilir.** Silinmez; `aktif = false` yapılır (geçmiş veri korunur, listede gizlenir).
- **Sorumlu müdürler değişebilir.** Sorumlu sabit değil, yeniden atanabilir bir bağ (`kullanici_subeleri`). Müdür değişince eski kayıtlar bozulmaz.
- Yeni lokasyon/alt şube istendiğinde eklenir; bu liste başlangıçtır.

## Mevcut şubeler

| Lokasyon | Alt şube(ler) | Sorumlu |
|---|---|---|
| 🌊 **Rumeli İskelesi** | 🍦 İskele Dondurma · 🐟 Balık Ekmek | **Metehan Arslan** |
| 🏖️ **Sahil** | 🍦 Sahil Dondurma | **Bahtiyar Kurt** |
| 🚂 **Vagon** | 🍦 Vagon Dondurma | **Baturay Cimpiri** |
| 🏞️ **Tunaboyu** | 🍻 TunaPub | **Semra Polat** |
| 🌳 **Millet Bahçesi** | 🍦 Millet Dondurma | **Melis Boyalık** |
| 📚 **Yahya Kemal** | — | **Berkay Nazlıgül** |

## Şube ayarları (her birim kendi belirler)
- **Vardiya modeli:** tek / çift (gündüz-gece).
- **Görevler:** şubeye özel (Kasa, Ocak, Garson, Mutfak, Temizlik, Balıkçı, Dondurmacı, Kasiyer…).
- **Opsiyonel özellikler:** ara vardiya, R/C (restoran/cafe), temizlik — var/yok.
- Hazır şablonlar (Restoran / Balık Ekmek / Dondurma / Pub / Boş) ile hızlı kurulum.

## İlk etap kapsamı
Metehan'ın lokasyonu: **Rumeli İskelesi** + alt şubeleri (İskele Dondurma, Balık Ekmek). Diğer lokasyonların sorumluları kendi şubelerini kurar.

## Bilinen yapılandırmalar
- **Rumeli İskelesi:** çift vardiya · Kasa, Ocak, Aracı, Garson, Mutfak, Kahvaltı, Temizlik · ara vardiya ✓ · R/C ✓ · 09:00–00:00 · ~17–20 kişi.
- **İskele Dondurma:** tek vardiya · Dondurmacı, Kasiyer · 14:00–22:00.
- **Balık Ekmek:** tek vardiya · Balıkçı, Kasa · 14:00–22:00.
