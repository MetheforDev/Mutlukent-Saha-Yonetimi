# 05 · Veri Modeli (Supabase)

Tam SQL ve güvenlik kuralları: `supabase_schema.sql`.

## Faz 1 tabloları (Çizelge)
- `subeler` — şube + **ust_sube_id** (lokasyon→alt şube hiyerarşisi) + **ikon** (emoji) + **sorumlu_adi** + **aktif** (kapalı=false, silinmez) + vardiya modeli + opsiyonel özellikler (ara vardiya, R/C)
- `kullanici_subeleri` — kullanıcı ↔ şube yetkisi (sorumlu / merkez)
- `gorevler` — şubeye özel görevler (ad, renk, sıra)
- `personel` — ad, sabit izin günü, aktiflik
- `personel_gorevleri` — çoklu görev bağlantısı (n-n)
- `yapi` — vardiya başına görev slot sayısı
- `cizelge` — haftalık çizelge (tarih, durum, rotasyon indeksi)
- `cizelge_atamalari` — kim / gün / vardiya / görev / slot / konum (R/C) / saat
- `rotasyon_sayaclari` — adalet için gündüz/gece/toplam

## İlerideki tablolar (Puantaj & Mesai)
- `puantaj` — sube_id, personel_id, tarih, durum (x/i/R/Üİ)
- `mesai` — sube_id, personel_id, tarih, ek_saat
- (Çizelge atamalarından otomatik türetme hedeflenir.)

## Güvenlik (RLS)
- Tüm tablolarda satır düzeyi güvenlik açık.
- `has_sube(sube_id)` yardımcısı: kullanıcı bağlı olduğu şubeyi **ve onun alt şubelerini** (miras) görür/düzenler. Sorumlu lokasyona bağlanır, alt şubelere erişim otomatik.
- Çocuk tablolar üst kaydın şubesi üzerinden kontrol edilir.
