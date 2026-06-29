# 07 · Yol Haritası

## Faz 1 — Çizelge MVP  ⏳
- Supabase şema + RLS (hazır: `supabase_schema.sql`)
- Giriş (Supabase Auth) + şube seçimi
- Haftalık çizelge ekranı (mevcut motor genelleştirilmiş): görev/vardiya esnek, çoklu görev, R/C, ara vardiya, otomatik izinli listesi
- Adaletli üret + kaydet + geçmiş (rotasyon hafızası)
- Çıktılar: temiz PNG, WhatsApp, yazdır
- 3 şube kurulu

## Faz 2 — Puantaj
- Günlük x/i/R/Üİ kaydı, haftalık/aylık görünüm
- Resmi puantaj cetveli PDF + WhatsApp (muhasebe)
- Çizelgeden otomatik ön-doldurma

## Faz 3 — Mesai
- Günlük +saat kaydı, aylık özet, muhasebe çıktısı

## Faz 4 — Merkez panel
- İşletme müdürü için çok şube tek bakışta
- Eksik kapsama / çakışma uyarıları

## Durum
- [x] Tek şube çizelge prototipi (HTML)
- [x] Proje dokümanları + Supabase şema taslağı
- [ ] React MVP
