import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const DURUMLAR = [null, 'x', 'i', 'R', 'Üİ']
const DURUM_STIL = {
  x: 'bg-foam/15 text-foam border-foam',
  i: 'bg-amber/15 text-amber border-amber',
  R: 'bg-violet/15 text-violet border-violet',
  'Üİ': 'bg-coral/15 text-coral border-coral',
}

const isoYerel = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const buAyBaslangic = () => {
  const t = new Date()
  return isoYerel(new Date(t.getFullYear(), t.getMonth(), 1))
}

const ayGunleri = (ayISO) => {
  const [y, m] = ayISO.split('-').map(Number)
  const gunSayisi = new Date(y, m, 0).getDate()
  return Array.from({ length: gunSayisi }, (_, i) => new Date(y, m - 1, i + 1))
}

export default function PuantajPage() {
  const { subeId } = useParams()
  const [sube, setSube] = useState(null)
  const [personel, setPersonel] = useState([])
  const [ayBaslangic, setAyBaslangic] = useState(buAyBaslangic())
  const [kayitlar, setKayitlar] = useState({})
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
      .from('puantaj')
      .select('*')
      .eq('sube_id', subeId)
      .gte('tarih', ilkGun)
      .lte('tarih', sonGun)
      .then(({ data }) => {
        const next = {}
        ;(data || []).forEach((r) => { next[`${r.personel_id}|${r.tarih}`] = r.durum })
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
  }

  const durumDegistir = async (personelId, tarihISO) => {
    const key = `${personelId}|${tarihISO}`
    const mevcut = kayitlar[key] ?? null
    const i = DURUMLAR.indexOf(mevcut)
    const yeni = DURUMLAR[(i + 1) % DURUMLAR.length]
    setKayitlar((prev) => {
      const next = { ...prev }
      if (yeni) next[key] = yeni
      else delete next[key]
      return next
    })
    if (yeni) {
      await supabase.from('puantaj').upsert({ sube_id: subeId, personel_id: personelId, tarih: tarihISO, durum: yeni }, { onConflict: 'sube_id,personel_id,tarih' })
    } else {
      await supabase.from('puantaj').delete().eq('sube_id', subeId).eq('personel_id', personelId).eq('tarih', tarihISO)
    }
  }

  const ozet = (personelId) => {
    const sayac = { x: 0, i: 0, R: 0, 'Üİ': 0 }
    Object.entries(kayitlar).forEach(([key, durum]) => {
      if (key.startsWith(`${personelId}|`)) sayac[durum] = (sayac[durum] || 0) + 1
    })
    return sayac
  }

  const muhasebeOzeti = () => {
    const satirlar = personelSirali.map((p) => {
      const o = ozet(p.id)
      return `${p.ad}: x=${o.x} i=${o.i} R=${o.R} Üİ=${o['Üİ']}`
    })
    return `📋 *${sube.ad.toLocaleUpperCase('tr')} — ${AY_ADLARI[ayAy - 1]} ${ayYil} Puantaj Özeti*\n\n${satirlar.join('\n')}\n\nx=çalıştı · i=haftalık izin · R=rapor · Üİ=ücretsiz izin`
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
      <Link to="/puantaj" className="text-mute text-sm">&larr; Şubeler</Link>

      <header className="flex items-end justify-between gap-4 flex-wrap mt-2 mb-5">
        <div>
          <div className="font-mono text-xs tracking-[0.22em] uppercase text-foam">{sube.ikon} {sube.ad}</div>
          <h1 className="font-disp text-2xl mt-1">Puantaj</h1>
        </div>
        <div className="flex gap-3 flex-wrap text-xs text-mute items-center font-mono">
          <span><b className="text-foam">x</b> çalıştı</span>
          <span><b className="text-amber">i</b> haftalık izin</span>
          <span><b className="text-violet">R</b> rapor</span>
          <span><b className="text-coral">Üİ</b> ücretsiz izin</span>
        </div>
      </header>

      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2 bg-sea-800 border border-line rounded-lg px-2 py-1.5">
          <button onClick={() => ayDegistir(-1)} className="w-6 h-6 rounded text-mute transition duration-150 hover:text-foam active:scale-90">‹</button>
          <span className="font-mono text-xs text-ink px-1">{AY_ADLARI[ayAy - 1]} {ayYil}</span>
          <button onClick={() => ayDegistir(1)} className="w-6 h-6 rounded text-mute transition duration-150 hover:text-foam active:scale-90">›</button>
        </div>
        <button onClick={() => setOzetAcik((v) => !v)} className="text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-amber hover:text-amber active:scale-[0.97]">
          📋 Muhasebe Özeti
        </button>
        {mesaj && <span className="text-xs font-mono text-foam animate-fade-in">{mesaj}</span>}
      </div>

      {ozetAcik && (
        <div className="mb-5 bg-sea-800 border border-line rounded-xl p-4">
          <div className="font-mono text-xs uppercase tracking-wide text-mute mb-2">Aylık Özet — muhasebeye WhatsApp</div>
          <textarea
            readOnly
            value={muhasebeOzeti()}
            className="w-full min-h-[160px] bg-sea-900 border border-line rounded-lg text-xs font-mono leading-relaxed p-3 outline-none resize-vertical"
          />
          <button onClick={kopyala} className="mt-2 text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-foam hover:text-foam active:scale-[0.97]">
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
                <th className="bg-sea-800 px-2 py-2 text-center border-b border-line border-l font-mono text-[10px] text-foam">x</th>
                <th className="bg-sea-800 px-2 py-2 text-center border-b border-line border-l font-mono text-[10px] text-amber">i</th>
                <th className="bg-sea-800 px-2 py-2 text-center border-b border-line border-l font-mono text-[10px] text-violet">R</th>
                <th className="bg-sea-800 px-2 py-2 text-center border-b border-line border-l font-mono text-[10px] text-coral">Üİ</th>
              </tr>
            </thead>
            <tbody>
              {personelSirali.map((p) => {
                const o = ozet(p.id)
                return (
                  <tr key={p.id} className="border-b border-line transition-colors duration-150 hover:bg-sea-800/40">
                    <td className="sticky left-0 z-[1] bg-sea-850 font-mono text-xs text-mute px-3 py-1.5 whitespace-nowrap">
                      {p.ad}
                    </td>
                    {gunler.map((d, i) => {
                      const tarihISO = isoYerel(d)
                      const durum = kayitlar[`${p.id}|${tarihISO}`]
                      return (
                        <td key={i} className="p-0.5 border-l border-line">
                          <button
                            onClick={() => durumDegistir(p.id, tarihISO)}
                            className={`w-full h-7 rounded text-[11px] font-mono font-semibold border transition duration-150 active:scale-90 ${durum ? DURUM_STIL[durum] : 'border-transparent text-mute hover:border-line'}`}
                          >
                            {durum || ''}
                          </button>
                        </td>
                      )
                    })}
                    <td className="text-center font-mono text-xs text-foam border-l border-line">{o.x || ''}</td>
                    <td className="text-center font-mono text-xs text-amber border-l border-line">{o.i || ''}</td>
                    <td className="text-center font-mono text-xs text-violet border-l border-line">{o.R || ''}</td>
                    <td className="text-center font-mono text-xs text-coral border-l border-line">{o['Üİ'] || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
