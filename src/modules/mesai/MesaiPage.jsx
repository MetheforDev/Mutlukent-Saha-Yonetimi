import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const isoYerel = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const buAyBaslangic = () => {
  const t = new Date()
  return isoYerel(new Date(t.getFullYear(), t.getMonth(), 1))
}

const ayGunleri = (ayISO) => {
  const [y, m] = ayISO.split('-').map(Number)
  const gunSayisi = new Date(y, m, 0).getDate()
  return Array.from({ length: gunSayisi }, (_, i) => new Date(y, m - 1, i + 1))
}

const saatFormat = (v) => {
  if (v == null || v === 0) return ''
  return v % 1 === 0 ? String(Number(v)) : Number(v).toFixed(1)
}

export default function MesaiPage() {
  const { subeId } = useParams()
  const [sube, setSube] = useState(null)
  const [personel, setPersonel] = useState([])
  const [ayBaslangic, setAyBaslangic] = useState(buAyBaslangic())
  const [kayitlar, setKayitlar] = useState({})
  const [aktifHucre, setAktifHucre] = useState(null)
  const [girisDegeri, setGirisDegeri] = useState('')
  const [loading, setLoading] = useState(true)
  const [mesaj, setMesaj] = useState('')
  const [ozetAcik, setOzetAcik] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('subeler').select('*').eq('id', subeId).single(),
      supabase.from('personel').select('*').eq('sube_id', subeId).eq('aktif', true),
    ]).then(([subeRes, personelRes]) => {
      setSube(subeRes.data)
      setPersonel(personelRes.data || [])
      setLoading(false)
    })
  }, [subeId])

  useEffect(() => {
    if (!subeId || !ayBaslangic) return
    const gunler = ayGunleri(ayBaslangic)
    const ilkGun = isoYerel(gunler[0])
    const sonGun = isoYerel(gunler[gunler.length - 1])
    supabase
      .from('mesai')
      .select('*')
      .eq('sube_id', subeId)
      .gte('tarih', ilkGun)
      .lte('tarih', sonGun)
      .then(({ data }) => {
        const next = {}
        ;(data || []).forEach((r) => { next[`${r.personel_id}|${r.tarih}`] = Number(r.ek_saat) })
        setKayitlar(next)
      })
  }, [subeId, ayBaslangic])

  if (loading) return <div className="p-8 text-mute animate-pulse">Yükleniyor…</div>
  if (!sube) return <div className="p-8 text-coral">Şube bulunamadı.</div>

  const gunler = ayGunleri(ayBaslangic)
  const [ayYil, ayAy] = ayBaslangic.split('-').map(Number)

  const personelSirali = [...personel].sort((a, b) => {
    const aBas = a.ad === sube.sorumlu_adi ? 0 : 1
    const bBas = b.ad === sube.sorumlu_adi ? 0 : 1
    if (aBas !== bBas) return aBas - bBas
    return a.ad.localeCompare(b.ad, 'tr')
  })

  const ayDegistir = (delta) => {
    const d = new Date(ayYil, ayAy - 1 + delta, 1)
    setAyBaslangic(isoYerel(d))
    setAktifHucre(null)
  }

  const hucreAc = (key, mevcutDeger) => {
    setAktifHucre(key)
    setGirisDegeri(mevcutDeger != null ? String(mevcutDeger) : '')
  }

  const hucreKaydet = async (personelId, tarihISO) => {
    const key = `${personelId}|${tarihISO}`
    const deger = parseFloat(girisDegeri.replace(',', '.'))

    setAktifHucre(null)
    setGirisDegeri('')

    if (!isNaN(deger) && deger > 0) {
      setKayitlar((prev) => ({ ...prev, [key]: deger }))
      await supabase
        .from('mesai')
        .upsert(
          { sube_id: subeId, personel_id: personelId, tarih: tarihISO, ek_saat: deger },
          { onConflict: 'sube_id,personel_id,tarih' }
        )
    } else {
      setKayitlar((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      await supabase
        .from('mesai')
        .delete()
        .eq('sube_id', subeId)
        .eq('personel_id', personelId)
        .eq('tarih', tarihISO)
    }
  }

  const kisiToplam = (personelId) =>
    Object.entries(kayitlar)
      .filter(([key]) => key.startsWith(`${personelId}|`))
      .reduce((s, [, v]) => s + v, 0)

  const gunToplam = (tarihISO) =>
    Object.entries(kayitlar)
      .filter(([key]) => key.endsWith(`|${tarihISO}`))
      .reduce((s, [, v]) => s + v, 0)

  const toplamMesai = Object.values(kayitlar).reduce((s, v) => s + v, 0)

  const muhasebeOzeti = () => {
    const satirlar = personelSirali
      .map((p) => {
        const t = kisiToplam(p.id)
        return t > 0 ? `${p.ad}: ${saatFormat(t)} saat` : null
      })
      .filter(Boolean)
    const baslik = `⏱️ *${sube.ad.toLocaleUpperCase('tr')} — ${AY_ADLARI[ayAy - 1]} ${ayYil} Mesai Özeti*`
    if (satirlar.length === 0) return `${baslik}\n\nBu ay mesai kaydı yok.`
    return `${baslik}\n\n${satirlar.join('\n')}\n\nToplam: ${saatFormat(toplamMesai)} saat`
  }

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(muhasebeOzeti())
      setMesaj('Kopyalandı')
    } catch {
      setMesaj('Kopyalanamadı')
    }
    setTimeout(() => setMesaj(''), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link to="/mesai" className="text-mute text-sm">&larr; Şubeler</Link>

      <header className="flex items-end justify-between gap-4 flex-wrap mt-2 mb-5">
        <div>
          <div className="font-mono text-xs tracking-[0.22em] uppercase text-violet">{sube.ikon} {sube.ad}</div>
          <h1 className="font-disp text-2xl mt-1">Mesai</h1>
        </div>
        <div className="text-xs text-mute font-mono">Hücreye tıkla → saat gir → Enter</div>
      </header>

      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2 bg-sea-800 border border-line rounded-lg px-2 py-1.5">
          <button
            onClick={() => ayDegistir(-1)}
            className="w-6 h-6 rounded text-mute transition duration-150 hover:text-violet active:scale-90"
          >‹</button>
          <span className="font-mono text-xs text-ink px-1">{AY_ADLARI[ayAy - 1]} {ayYil}</span>
          <button
            onClick={() => ayDegistir(1)}
            className="w-6 h-6 rounded text-mute transition duration-150 hover:text-violet active:scale-90"
          >›</button>
        </div>

        {toplamMesai > 0 && (
          <div className="font-mono text-xs text-violet border border-violet/30 rounded-lg px-3 py-2 bg-violet/10">
            Ay toplamı: {saatFormat(toplamMesai)} saat
          </div>
        )}

        <button
          onClick={() => setOzetAcik((v) => !v)}
          className="text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-violet hover:text-violet active:scale-[0.97]"
        >
          ⏱️ Muhasebe Özeti
        </button>

        {mesaj && <span className="text-xs font-mono text-foam animate-fade-in">{mesaj}</span>}
      </div>

      {ozetAcik && (
        <div className="mb-5 bg-sea-800 border border-line rounded-xl p-4 animate-fade-in">
          <div className="font-mono text-xs uppercase tracking-wide text-mute mb-2">
            Aylık Özet — muhasebeye WhatsApp
          </div>
          <textarea
            readOnly
            value={muhasebeOzeti()}
            className="w-full min-h-[120px] bg-sea-900 border border-line rounded-lg text-xs font-mono leading-relaxed p-3 outline-none resize-vertical"
          />
          <button
            onClick={kopyala}
            className="mt-2 text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-violet hover:text-violet active:scale-[0.97]"
          >
            Kopyala
          </button>
        </div>
      )}

      {personel.length === 0 ? (
        <div className="text-mute bg-sea-800 border border-line rounded-xl p-6">
          Bu şube için henüz personel tanımlanmamış. Önce Şube Ayarları'ndan personel ekleyin.
        </div>
      ) : (
        <div className="border border-line rounded-xl bg-sea-850 overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-[2] bg-sea-800 text-left font-mono text-[11px] uppercase tracking-wide text-mute px-3 py-2 min-w-[130px] border-b border-line">
                  Personel
                </th>
                {gunler.map((d, i) => {
                  const haftaSonu = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <th key={i} className={`bg-sea-800 px-1 py-2 text-center border-b border-line border-l w-9 ${haftaSonu ? 'text-amber' : ''}`}>
                      <div className="font-disp text-xs">{d.getDate()}</div>
                      <div className="font-mono text-[9px] text-mute">{GUN_KISA[(d.getDay() + 6) % 7]}</div>
                    </th>
                  )
                })}
                <th className="bg-sea-800 px-2 py-2 text-center border-b border-line border-l font-mono text-[10px] text-violet min-w-[52px]">
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody>
              {personelSirali.map((p) => {
                const kisiTop = kisiToplam(p.id)
                return (
                  <tr key={p.id} className="border-b border-line transition-colors duration-150 hover:bg-sea-800/40">
                    <td className="sticky left-0 z-[1] bg-sea-850 font-mono text-xs text-mute px-3 py-1.5 whitespace-nowrap">
                      {p.ad}
                    </td>
                    {gunler.map((d, i) => {
                      const tarihISO = isoYerel(d)
                      const key = `${p.id}|${tarihISO}`
                      const deger = kayitlar[key]
                      const aktif = aktifHucre === key
                      return (
                        <td key={i} className="p-0.5 border-l border-line">
                          {aktif ? (
                            <input
                              autoFocus
                              type="text"
                              inputMode="decimal"
                              value={girisDegeri}
                              onChange={(e) => setGirisDegeri(e.target.value)}
                              onBlur={() => hucreKaydet(p.id, tarihISO)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); hucreKaydet(p.id, tarihISO) }
                                if (e.key === 'Escape') { setAktifHucre(null); setGirisDegeri('') }
                              }}
                              className="w-full h-7 rounded text-[11px] font-mono text-center bg-violet/10 border border-violet text-violet outline-none px-0.5"
                            />
                          ) : (
                            <button
                              onClick={() => hucreAc(key, deger)}
                              className={`w-full h-7 rounded text-[11px] font-mono font-semibold border transition duration-150 active:scale-90 ${
                                deger ? 'bg-violet/15 text-violet border-violet' : 'border-transparent text-mute hover:border-line'
                              }`}
                            >
                              {saatFormat(deger)}
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-center font-mono text-xs text-violet border-l border-line font-semibold px-2">
                      {kisiTop > 0 ? saatFormat(kisiTop) : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-violet/20">
                <td className="sticky left-0 z-[1] bg-sea-800 font-mono text-[10px] text-mute uppercase tracking-wide px-3 py-1.5">
                  Günlük
                </td>
                {gunler.map((d, i) => {
                  const tarihISO = isoYerel(d)
                  const gt = gunToplam(tarihISO)
                  return (
                    <td key={i} className="text-center font-mono text-[10px] text-violet/70 border-l border-line py-1.5 bg-sea-800">
                      {gt > 0 ? saatFormat(gt) : ''}
                    </td>
                  )
                })}
                <td className="text-center font-mono text-xs text-violet border-l border-line py-1.5 bg-sea-800 font-bold px-2">
                  {toplamMesai > 0 ? saatFormat(toplamMesai) : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
