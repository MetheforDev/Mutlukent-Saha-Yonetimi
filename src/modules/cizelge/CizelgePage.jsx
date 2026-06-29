import { Fragment, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { makePlan } from './engine'

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const HAFTASONU = [5, 6]
const VARDIYA_BASLIK = { gunduz: '☀ Gündüz Vardiyası', gece: '🌙 Gece Vardiyası' }
const SAATLER = [null, '12:00', '14:00']

const isoYerel = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const buHaftaPazartesi = () => {
  const t = new Date()
  const gun = (t.getDay() + 6) % 7
  const pzt = new Date(t)
  pzt.setDate(t.getDate() - gun)
  return isoYerel(pzt)
}

const haftaGunleri = (baslangicISO) => {
  const base = new Date(baslangicISO + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d
  })
}

const gunFormat = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

const isGunduz = (vardiya) => vardiya === 'gunduz' || vardiya === 'tek'

export default function CizelgePage() {
  const { subeId } = useParams()
  const { session } = useAuth()
  const [sube, setSube] = useState(null)
  const [gorevler, setGorevler] = useState([])
  const [yapi, setYapi] = useState([])
  const [personel, setPersonel] = useState([])
  const [sayaclar, setSayaclar] = useState({})
  const [gecmisHaftalar, setGecmisHaftalar] = useState([])
  const [haftaBaslangic, setHaftaBaslangic] = useState(buHaftaPazartesi())
  const [cizelgeId, setCizelgeId] = useState(null)
  const [atamalar, setAtamalar] = useState({})
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [cleanMode, setCleanMode] = useState(false)
  const [signAdi, setSignAdi] = useState('')
  const [whatsappAcik, setWhatsappAcik] = useState(false)
  const printableRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('subeler').select('*').eq('id', subeId).single(),
      supabase.from('gorevler').select('*').eq('sube_id', subeId).order('sira'),
      supabase.from('yapi').select('*').eq('sube_id', subeId),
      supabase.from('personel').select('*, personel_gorevleri(gorev_id)').eq('sube_id', subeId).eq('aktif', true),
      supabase.from('rotasyon_sayaclari').select('*').eq('sube_id', subeId),
      supabase.from('cizelge').select('id, hafta_baslangic, durum, rotasyon_index').eq('sube_id', subeId).order('hafta_baslangic', { ascending: false }),
    ]).then(([subeRes, gorevRes, yapiRes, personelRes, sayacRes, cizelgeRes]) => {
      setSube(subeRes.data)
      setGorevler(gorevRes.data || [])
      setYapi(yapiRes.data || [])
      setPersonel(personelRes.data || [])
      setSayaclar(Object.fromEntries((sayacRes.data || []).map((r) => [r.personel_id, { g: r.gunduz, n: r.gece, tot: r.toplam }])))
      setGecmisHaftalar(cizelgeRes.data || [])
      setSignAdi((prev) => prev || subeRes.data?.sorumlu_adi || '')
      setLoading(false)
    })
  }, [subeId])

  useEffect(() => {
    if (!subeId || !haftaBaslangic) return
    supabase
      .from('cizelge')
      .select('id')
      .eq('sube_id', subeId)
      .eq('hafta_baslangic', haftaBaslangic)
      .maybeSingle()
      .then(({ data: c }) => {
        if (!c) {
          setCizelgeId(null)
          setAtamalar({})
          return
        }
        setCizelgeId(c.id)
        supabase
          .from('cizelge_atamalari')
          .select('*')
          .eq('cizelge_id', c.id)
          .then(({ data: rows }) => {
            const next = {}
            ;(rows || []).forEach((r) => {
              next[cellKey(r.vardiya, r.gorev_id, r.slot, r.gun)] = { personelId: r.personel_id, konum: r.konum, saat: r.saat }
            })
            setAtamalar(next)
          })
      })
  }, [subeId, haftaBaslangic])

  if (loading) return <div className="p-8 text-mute animate-pulse">Yükleniyor…</div>
  if (!sube) return <div className="p-8 text-coral">Şube bulunamadı.</div>

  const vardiyalar = sube.vardiya_modeli === 'cift' ? ['gunduz', 'gece'] : ['tek']
  const gunler = haftaGunleri(haftaBaslangic)

  const satirlarFor = (vardiya) => {
    const out = []
    gorevler.forEach((g) => {
      const y = yapi.find((row) => row.gorev_id === g.id && row.vardiya === vardiya)
      const slotSayisi = y?.slot_sayisi ?? 0
      for (let s = 0; s < slotSayisi; s++) out.push({ gorevId: g.id, ad: g.ad, renk: g.renk, slot: s })
    })
    return out
  }

  const kisilerForGorev = (gorevId) =>
    personel.filter((p) => p.personel_gorevleri.some((pg) => pg.gorev_id === gorevId))

  const kisiAdi = (id) => personel.find((p) => p.id === id)?.ad || ''

  const gunAtanmislari = (gun) => {
    const set = new Set()
    Object.entries(atamalar).forEach(([key, a]) => {
      if (!a?.personelId) return
      if (+key.split('|')[3] === gun) set.add(a.personelId)
    })
    return set
  }

  const gunIzinlileri = (gun) => {
    const atanan = gunAtanmislari(gun)
    return personel.filter((p) => !atanan.has(p.id))
  }

  const rowVeriVar = (vardiya, row) => GUNLER.some((_, d) => atamalar[cellKey(vardiya, row.gorevId, row.slot, d)]?.personelId)

  const personelAta = (key, personelId, gorevAdi) => {
    setAtamalar((prev) => {
      const next = { ...prev }
      if (personelId) next[key] = { personelId, konum: gorevAdi === 'Garson' ? 'R' : null, saat: null }
      else delete next[key]
      return next
    })
  }

  const konumDegistir = (key) => {
    setAtamalar((prev) => {
      const cur = prev[key]
      if (!cur) return prev
      return { ...prev, [key]: { ...cur, konum: cur.konum === 'R' ? 'C' : 'R' } }
    })
  }

  const saatDegistir = (key) => {
    setAtamalar((prev) => {
      const cur = prev[key]
      if (!cur) return prev
      const i = SAATLER.indexOf(cur.saat)
      return { ...prev, [key]: { ...cur, saat: SAATLER[(i + 1) % SAATLER.length] } }
    })
  }

  const haftaDegistir = (delta) => {
    const d = new Date(haftaBaslangic + 'T00:00:00')
    d.setDate(d.getDate() + delta * 7)
    setHaftaBaslangic(isoYerel(d))
  }

  const temizle = () => setAtamalar({})

  const rotIcin = () => gecmisHaftalar.filter((h) => h.id !== cizelgeId).length

  const adilPlanla = () => {
    const roleKeyMap = gorevler.map((g) => ({ id: g.id, key: g.ad.toLocaleUpperCase('tr') }))
    const staff = personel.map((p) => ({
      id: p.id,
      name: p.ad,
      roles: p.personel_gorevleri.map((pg) => roleKeyMap.find((r) => r.id === pg.gorev_id)?.key).filter(Boolean),
      fixedOff: p.sabit_izin_gunu,
    }))
    const tpl = {}
    vardiyalar.forEach((v) => { tpl[v] = {} })
    yapi.forEach((y) => {
      const r = roleKeyMap.find((x) => x.id === y.gorev_id)
      if (r && tpl[y.vardiya]) tpl[y.vardiya][r.key] = y.slot_sayisi
    })
    const { plan } = makePlan({ staff, tpl, shifts: vardiyalar, rot: rotIcin(), counters: sayaclar })
    const next = {}
    Object.entries(plan).forEach(([k, v]) => {
      const [sh, roleSlot, dStr] = k.split('|')
      const eslesen = roleKeyMap.find(({ key }) => roleSlot.startsWith(key) && /^\d+$/.test(roleSlot.slice(key.length)))
      if (!eslesen) return
      const slotIdx = +roleSlot.slice(eslesen.key.length)
      next[cellKey(sh, eslesen.id, slotIdx, +dStr)] = { personelId: v.staffId, konum: v.loc, saat: v.time }
    })
    setAtamalar(next)
    setMesaj('Adil taslak üretildi')
    setTimeout(() => setMesaj(''), 3000)
  }

  const kaydet = async () => {
    setKaydediliyor(true)
    const ilkKayit = !cizelgeId
    try {
      const rot = rotIcin()
      const { data: c, error: ce } = await supabase
        .from('cizelge')
        .upsert(
          { sube_id: subeId, hafta_baslangic: haftaBaslangic, rotasyon_index: rot, created_by: session?.user?.id },
          { onConflict: 'sube_id,hafta_baslangic' }
        )
        .select('id')
        .single()
      if (ce) throw ce
      const cid = c.id
      setCizelgeId(cid)

      await supabase.from('cizelge_atamalari').delete().eq('cizelge_id', cid)
      const girdiler = Object.entries(atamalar).filter(([, a]) => a?.personelId)
      if (girdiler.length) {
        const satirlar = girdiler.map(([key, a]) => {
          const [vardiya, gorevId, slot, gun] = key.split('|')
          return { cizelge_id: cid, personel_id: a.personelId, gun: +gun, vardiya, gorev_id: gorevId, slot: +slot, konum: a.konum || null, saat: a.saat || null }
        })
        const { error: ae } = await supabase.from('cizelge_atamalari').insert(satirlar)
        if (ae) throw ae
      }

      if (ilkKayit) {
        const yeniSayac = JSON.parse(JSON.stringify(sayaclar))
        girdiler.forEach(([key, a]) => {
          const vardiya = key.split('|')[0]
          const c2 = yeniSayac[a.personelId] || (yeniSayac[a.personelId] = { g: 0, n: 0, tot: 0 })
          if (isGunduz(vardiya)) c2.g++; else c2.n++
          c2.tot++
        })
        await Promise.all(
          Object.entries(yeniSayac).map(([personelId, c2]) =>
            supabase
              .from('rotasyon_sayaclari')
              .upsert({ sube_id: subeId, personel_id: personelId, gunduz: c2.g, gece: c2.n, toplam: c2.tot }, { onConflict: 'sube_id,personel_id' })
          )
        )
        setSayaclar(yeniSayac)
      }
      setGecmisHaftalar((prev) => (prev.some((h) => h.id === cid) ? prev : [{ id: cid, hafta_baslangic: haftaBaslangic, durum: 'taslak', rotasyon_index: rot }, ...prev]))
      setMesaj(ilkKayit ? 'Hafta kaydedildi · rotasyon ilerledi' : 'Hafta güncellendi')
    } catch (err) {
      setMesaj('Kaydedilemedi: ' + err.message)
    } finally {
      setKaydediliyor(false)
      setTimeout(() => setMesaj(''), 3000)
    }
  }

  const lineForVardiya = (vardiya, gun) => {
    const byRole = {}
    satirlarFor(vardiya).forEach((row) => {
      const atama = atamalar[cellKey(vardiya, row.gorevId, row.slot, gun)]
      if (!atama?.personelId) return
      let s = kisiAdi(atama.personelId)
      if (atama.konum) s += `(${atama.konum})`
      if (atama.saat) s += ` ${atama.saat}`
      ;(byRole[row.ad] = byRole[row.ad] || []).push(s)
    })
    return Object.entries(byRole).map(([rol, kisiler]) => `${rol}: ${kisiler.join(', ')}`).join(' · ')
  }

  const whatsappMetni = () => {
    const blocks = GUNLER.map((gunAdi, d) => {
      const izinli = gunIzinlileri(d).map((p) => p.ad)
      const vardiyaSatirlari = vardiyalar
        .map((v) => {
          const baslik = vardiyalar.length > 1 ? `${v === 'gunduz' ? '☀ GÜNDÜZ' : '🌙 GECE'}\n` : ''
          return `${baslik}${lineForVardiya(v, d) || '—'}`
        })
        .join('\n')
      return `*${gunAdi} ${gunFormat(gunler[d])}*\n${vardiyaSatirlari}\n🛌 İzin: ${izinli.length ? izinli.join(', ') : '—'}`
    })
    return `📋 *${sube.ad.toLocaleUpperCase('tr')} — Haftalık Çalışma Çizelgesi*\n\n${blocks.join('\n\n')}\n\nDüzenleyen: ${signAdi || '—'} (Mesul Müdür) ⚓`
  }

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMetni())
      setMesaj('Kopyalandı')
    } catch {
      setMesaj('Kopyalanamadı')
    }
    setTimeout(() => setMesaj(''), 2000)
  }

  const gorselIndir = async () => {
    const oncekiMod = cleanMode
    if (!oncekiMod) setCleanMode(true)
    await new Promise((r) => setTimeout(r, 100))
    try {
      const canvas = await html2canvas(printableRef.current, { scale: 2, backgroundColor: '#081520', useCORS: true })
      const a = document.createElement('a')
      a.download = `${sube.ad.toLocaleLowerCase('tr').replace(/\s+/g, '-')}-cizelge.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } catch {
      setMesaj('Görsel oluşturulamadı.')
      setTimeout(() => setMesaj(''), 3000)
    }
    if (!oncekiMod) setCleanMode(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {cleanMode && (
        <button
          onClick={() => setCleanMode(false)}
          className="fixed top-4 right-4 z-50 print:hidden font-mono text-xs uppercase tracking-wide border border-line bg-sea-800 rounded-lg px-3 py-2 text-mute shadow-lg transition duration-150 hover:border-foam hover:text-foam active:scale-[0.97]"
        >
          ✎ Düzenlemeye dön
        </button>
      )}

      {!cleanMode && (
        <div className="print:hidden">
          <Link to="/cizelge" className="text-mute text-sm">&larr; Şubeler</Link>

          <header className="flex items-end justify-between gap-4 flex-wrap mt-2 mb-5">
            <div>
              <div className="font-mono text-xs tracking-[0.22em] uppercase text-foam">{sube.ikon} {sube.ad}</div>
              <h1 className="font-disp text-2xl mt-1">
                Haftalık Çalışma Çizelgesi
                <span className="text-mute text-base font-body ml-2">
                  — {sube.vardiya_modeli === 'cift' ? 'gündüz / gece' : 'tek vardiya'}
                </span>
              </h1>
            </div>
            <div className="flex gap-4 flex-wrap text-sm text-mute items-center font-body">
              {sube.konum_etiketi_aktif && <span><b className="text-foam">R</b> Restoran · <b className="text-violet">C</b> Cafe</span>}
              {sube.ara_vardiya_aktif && <span><b className="text-amber">⏰</b> Ara vardiya</span>}
              <Link
                to={`/cizelge/${subeId}/ayarlar`}
                className="font-mono text-xs uppercase tracking-wide border border-line rounded-lg px-3 py-2 text-mute transition duration-150 hover:border-foam hover:text-foam active:scale-[0.97]"
              >
                ⚙ Şube Ayarları
              </Link>
            </div>
          </header>

          <div className="flex items-center gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2 bg-sea-800 border border-line rounded-lg px-2 py-1.5">
              <button onClick={() => haftaDegistir(-1)} className="w-6 h-6 rounded text-mute transition duration-150 hover:text-foam active:scale-90">‹</button>
              <span className="font-mono text-xs text-ink px-1">{gunFormat(gunler[0])} – {gunFormat(gunler[6])}</span>
              <button onClick={() => haftaDegistir(1)} className="w-6 h-6 rounded text-mute transition duration-150 hover:text-foam active:scale-90">›</button>
            </div>
            <select
              value=""
              onChange={(e) => e.target.value && setHaftaBaslangic(e.target.value)}
              className="bg-sea-800 border border-line rounded-lg text-xs text-mute px-2 py-2 outline-none transition-colors duration-150 focus:border-foam"
            >
              <option value="">📁 Geçmiş haftalar ({gecmisHaftalar.length})…</option>
              {gecmisHaftalar.map((h) => (
                <option key={h.id} value={h.hafta_baslangic}>
                  {gunFormat(haftaGunleri(h.hafta_baslangic)[0])} – {gunFormat(haftaGunleri(h.hafta_baslangic)[6])} {h.durum === 'yayinlandi' ? '✓' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={adilPlanla}
              className="font-disp font-bold text-sm text-sea-900 rounded-lg px-4 py-2 transition-transform duration-150 active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg,#6df0d8,#3fe0c5)' }}
            >
              ⚓ Adil Planla
            </button>
            <button
              onClick={kaydet}
              disabled={kaydediliyor}
              className="font-disp font-bold text-sm text-sea-900 rounded-lg px-4 py-2 transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#bff7ea,#7fe9d6)' }}
            >
              💾 {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button onClick={temizle} className="text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-coral hover:text-coral active:scale-[0.97]">
              Temizle
            </button>
            {mesaj && <span className="text-xs font-mono text-foam animate-fade-in">{mesaj}</span>}
          </div>

          <div className="flex items-center gap-3 flex-wrap mb-5 pb-4 border-b border-line">
            <span className="font-mono text-[10px] uppercase tracking-wide text-mute">Çıktılar:</span>
            <button onClick={() => setCleanMode(true)} className="text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-foam hover:text-foam active:scale-[0.97]">
              👁 Temiz Görünüm
            </button>
            <button onClick={gorselIndir} className="text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-violet hover:text-violet active:scale-[0.97]">
              📷 Görsel İndir
            </button>
            <button onClick={() => window.print()} className="text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-foam hover:text-foam active:scale-[0.97]">
              🖨️ Yazdır / PDF
            </button>
            <button onClick={() => setWhatsappAcik((v) => !v)} className="text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-amber hover:text-amber active:scale-[0.97]">
              💬 WhatsApp Metni
            </button>
          </div>

          {whatsappAcik && (
            <div className="mb-5 bg-sea-800 border border-line rounded-xl p-4">
              <div className="font-mono text-xs uppercase tracking-wide text-mute mb-2">WhatsApp Metni — güne göre</div>
              <textarea
                readOnly
                value={whatsappMetni()}
                className="w-full min-h-[220px] bg-sea-900 border border-line rounded-lg text-xs font-mono leading-relaxed p-3 outline-none resize-vertical"
              />
              <div className="flex items-center gap-3 mt-2">
                <button onClick={kopyala} className="text-sm text-mute border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-foam hover:text-foam active:scale-[0.97]">
                  Kopyala
                </button>
                <p className="text-mute text-xs">İzinli listesi otomatik — bir güne atanmayan kişi o günün izinlisidir.</p>
              </div>
            </div>
          )}

        </div>
      )}

      <div ref={printableRef} id="cizelge-printable" className="bg-sea-900 rounded-xl">
        <div className="px-1 py-3">
          <div className="font-disp text-lg font-bold uppercase tracking-wide">{sube.ikon} {sube.ad}</div>
          <div className="font-mono text-xs text-mute mt-0.5">Hafta: {gunFormat(gunler[0])} – {gunFormat(gunler[6])}</div>
        </div>

        {gorevler.length === 0 ? (
          <div className="text-mute bg-sea-800 border border-line rounded-xl p-6">
            Bu şube için henüz görev/yapı tanımlanmamış. Önce şube kurulumunda görev ekleyin.
          </div>
        ) : (
          <div className="border border-line rounded-xl bg-sea-850 overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[2] bg-sea-800 text-left font-mono text-[11px] uppercase tracking-wide text-mute px-3 py-2 min-w-[110px] border-b border-line">
                    Görev
                  </th>
                  {GUNLER.map((gun, i) => (
                    <th key={gun} className={`bg-sea-800 px-2 py-2 text-center border-b border-line border-l ${HAFTASONU.includes(i) ? 'text-amber' : ''}`}>
                      <div className="font-disp text-xs uppercase tracking-wide">{gun}</div>
                      <div className="font-mono text-[10px] text-mute mt-0.5">{gunFormat(gunler[i])}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vardiyalar.map((vardiya) => {
                  const satirlar = (cleanMode ? satirlarFor(vardiya).filter((row) => rowVeriVar(vardiya, row)) : satirlarFor(vardiya))
                  return (
                    <Fragment key={vardiya}>
                      {VARDIYA_BASLIK[vardiya] && (
                        <tr key={`${vardiya}-baslik`} className="bg-sea-900">
                          <td className="sticky left-0 bg-sea-900" colSpan={8}>
                            <span className={`font-disp text-xs uppercase tracking-[0.18em] px-3 py-2 block ${vardiya === 'gunduz' ? 'text-foam' : 'text-violet'}`}>
                              {VARDIYA_BASLIK[vardiya]}
                            </span>
                          </td>
                        </tr>
                      )}
                      {satirlar.length === 0 ? (
                        <tr key={`${vardiya}-bos`}>
                          <td className="text-mute text-sm px-3 py-3" colSpan={8}>{cleanMode ? '—' : 'Bu vardiya için slot tanımlı değil.'}</td>
                        </tr>
                      ) : satirlar.map((row) => (
                        <tr key={`${vardiya}-${row.gorevId}-${row.slot}`} className="border-b border-line transition-colors duration-150 hover:bg-sea-800/40">
                          <td className="sticky left-0 z-[1] bg-sea-850 font-mono text-xs text-mute px-3 py-2 whitespace-nowrap">
                            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: row.renk }} />
                            {row.ad}
                          </td>
                          {GUNLER.map((_, d) => {
                            const key = cellKey(vardiya, row.gorevId, row.slot, d)
                            if (cleanMode) {
                              const atama = atamalar[key]
                              return (
                                <td key={d} className="px-2 py-2 align-top border-l border-line">
                                  {atama?.personelId && (
                                    <div className="text-sm whitespace-nowrap">
                                      {kisiAdi(atama.personelId)}
                                      {atama.konum && <small className={`ml-1 font-mono text-[10px] ${atama.konum === 'C' ? 'text-violet' : 'text-foam'}`}>({atama.konum})</small>}
                                      {atama.saat && <small className="ml-1 font-mono text-[10px] text-amber">{atama.saat}</small>}
                                    </div>
                                  )}
                                </td>
                              )
                            }
                            return (
                              <td key={d} className="px-1.5 py-1.5 border-l border-line">
                                <AtamaHucre
                                  kisiler={kisilerForGorev(row.gorevId)}
                                  gun={d}
                                  atama={atamalar[key]}
                                  atanmislar={gunAtanmislari(d)}
                                  rcAktif={sube.konum_etiketi_aktif && row.ad === 'Garson'}
                                  araVardiyaAktif={sube.ara_vardiya_aktif}
                                  onPersonelDegis={(v) => personelAta(key, v, row.ad)}
                                  onKonumDegis={() => konumDegistir(key)}
                                  onSaatDegis={() => saatDegistir(key)}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {gorevler.length > 0 && (
          <div className="mt-4 border border-line rounded-xl bg-sea-850 overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[2] bg-sea-800 text-left font-mono text-[11px] uppercase tracking-wide text-mute px-3 py-2 min-w-[110px] border-b border-line">
                    İzinli
                  </th>
                  {GUNLER.map((gun, i) => (
                    <th key={gun} className={`bg-sea-800 px-2 py-2 text-center border-b border-line border-l ${HAFTASONU.includes(i) ? 'text-amber' : ''}`}>
                      <div className="font-disp text-[10px] uppercase tracking-wide">{gun}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky left-0 bg-sea-850 font-mono text-xs text-mute px-3 py-2 whitespace-nowrap">— isim</td>
                  {GUNLER.map((_, d) => {
                    const izinli = gunIzinlileri(d)
                    return (
                      <td key={d} className="px-2 py-2 border-l border-line align-top">
                        <div className="flex flex-col gap-1">
                          {izinli.length
                            ? izinli.map((p) => <span key={p.id} className="text-xs text-amber whitespace-nowrap">– {p.ad}</span>)
                            : <span className="text-xs text-mute">—</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <div className="border border-line rounded-xl bg-sea-850 p-4 min-w-[260px]">
            <div className="font-mono text-[10px] uppercase tracking-wide text-mute mb-1.5">Düzenleyen</div>
            {cleanMode ? (
              <div className="font-disp text-base font-semibold">{signAdi || '—'}</div>
            ) : (
              <input
                value={signAdi}
                onChange={(e) => setSignAdi(e.target.value)}
                className="w-full bg-transparent border-b border-dashed border-line outline-none transition-colors duration-150 focus:border-foam font-disp text-base font-semibold pb-1"
              />
            )}
            <div className="text-mute text-sm mt-1">Mesul Müdür</div>
            <div className="font-mono text-[11px] text-mute mt-3 pt-2 border-t border-dashed border-line">İmza: ______________________</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function cellKey(vardiya, gorevId, slot, gun) {
  return `${vardiya}|${gorevId}|${slot}|${gun}`
}

function AtamaHucre({ kisiler, gun, atama, atanmislar, rcAktif, araVardiyaAktif, onPersonelDegis, onKonumDegis, onSaatDegis }) {
  const deger = atama?.personelId || ''
  return (
    <div>
      <select
        value={deger}
        onChange={(e) => onPersonelDegis(e.target.value || null)}
        className="w-full bg-sea-900 border border-line rounded-md text-xs px-1.5 py-2 outline-none focus:border-foam"
      >
        <option value="">—</option>
        {kisiler.map((p) => {
          const izinli = p.sabit_izin_gunu === gun
          const baskaSlotta = !izinli && atanmislar.has(p.id) && p.id !== deger
          const devreDisi = izinli || baskaSlotta
          return (
            <option key={p.id} value={p.id} disabled={devreDisi}>
              {p.ad}{izinli ? ' (izinli)' : baskaSlotta ? ' (atanmış)' : ''}
            </option>
          )
        })}
      </select>
      {deger && (rcAktif || araVardiyaAktif) && (
        <div className="flex gap-1 mt-1">
          {rcAktif && (
            <button
              onClick={onKonumDegis}
              className={`flex-1 text-[10px] font-mono rounded border px-1 py-0.5 ${atama.konum === 'C' ? 'border-violet text-violet bg-violet/10' : 'border-foam text-foam bg-foam/10'}`}
            >
              {atama.konum || 'R'}
            </button>
          )}
          {araVardiyaAktif && (
            <button
              onClick={onSaatDegis}
              className={`flex-1 text-[10px] font-mono rounded border px-1 py-0.5 ${atama.saat ? 'border-amber text-amber bg-amber/10' : 'border-line text-mute'}`}
            >
              {atama.saat || '⏰'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
