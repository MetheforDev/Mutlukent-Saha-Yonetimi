import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const VARDIYA_BASLIK = { gunduz: '☀ Gündüz', gece: '🌙 Gece', tek: 'Yapı' }
const RENK_PALETI = ['#6fb0ff', '#ff8f6b', '#ffbf9b', '#3fe0c5', '#ffd166', '#ffe08a', '#9aa7b0', '#9d8bff', '#ffb454', '#ff6b5c']

export default function SubeAyarlari() {
  const { subeId } = useParams()
  const [sube, setSube] = useState(null)
  const [gorevler, setGorevler] = useState([])
  const [yapi, setYapi] = useState([])
  const [personel, setPersonel] = useState([])
  const [loading, setLoading] = useState(true)
  const [pasifGoster, setPasifGoster] = useState(false)

  const [yeniGorevAdi, setYeniGorevAdi] = useState('')
  const [yeniGorevRenk, setYeniGorevRenk] = useState(RENK_PALETI[0])

  const [yeniPersonelAdi, setYeniPersonelAdi] = useState('')
  const [yeniPersonelGorevler, setYeniPersonelGorevler] = useState([])
  const [yeniPersonelIzin, setYeniPersonelIzin] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('subeler').select('*').eq('id', subeId).single(),
      supabase.from('gorevler').select('*').eq('sube_id', subeId).order('sira'),
      supabase.from('yapi').select('*').eq('sube_id', subeId),
      supabase.from('personel').select('*, personel_gorevleri(gorev_id)').eq('sube_id', subeId).order('ad'),
    ]).then(([subeRes, gorevRes, yapiRes, personelRes]) => {
      setSube(subeRes.data)
      setGorevler(gorevRes.data || [])
      setYapi(yapiRes.data || [])
      setPersonel(personelRes.data || [])
      setLoading(false)
    })
  }, [subeId])

  if (loading) return <div className="p-8 text-mute animate-pulse">Yükleniyor…</div>
  if (!sube) return <div className="p-8 text-coral">Şube bulunamadı.</div>

  const vardiyalar = sube.vardiya_modeli === 'cift' ? ['gunduz', 'gece'] : ['tek']
  const gorevlerSirali = [...gorevler].sort((a, b) => a.sira - b.sira)

  const gorevGuncelle = async (id, patch) => {
    setGorevler((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
    await supabase.from('gorevler').update(patch).eq('id', id)
  }

  const gorevEkle = async () => {
    const ad = yeniGorevAdi.trim()
    if (!ad) return
    const sira = gorevler.length ? Math.max(...gorevler.map((g) => g.sira)) + 1 : 1
    const { data } = await supabase.from('gorevler').insert({ sube_id: subeId, ad, renk: yeniGorevRenk, sira }).select().single()
    if (data) setGorevler((prev) => [...prev, data])
    setYeniGorevAdi('')
    setYeniGorevRenk(RENK_PALETI[(gorevler.length + 1) % RENK_PALETI.length])
  }

  const gorevSirasiDegistir = async (id, yon) => {
    const sirali = [...gorevler].sort((a, b) => a.sira - b.sira)
    const idx = sirali.findIndex((g) => g.id === id)
    const hedef = idx + yon
    if (hedef < 0 || hedef >= sirali.length) return
    const a = sirali[idx], b = sirali[hedef]
    setGorevler((prev) => prev.map((g) => (g.id === a.id ? { ...g, sira: b.sira } : g.id === b.id ? { ...g, sira: a.sira } : g)))
    await Promise.all([
      supabase.from('gorevler').update({ sira: b.sira }).eq('id', a.id),
      supabase.from('gorevler').update({ sira: a.sira }).eq('id', b.id),
    ])
  }

  const slotDegistir = async (vardiya, gorevId, delta) => {
    const mevcut = yapi.find((y) => y.vardiya === vardiya && y.gorev_id === gorevId)
    const yeniSayi = Math.max(0, Math.min(25, (mevcut?.slot_sayisi ?? 0) + delta))
    if (mevcut) {
      setYapi((prev) => prev.map((y) => (y.id === mevcut.id ? { ...y, slot_sayisi: yeniSayi } : y)))
      await supabase.from('yapi').update({ slot_sayisi: yeniSayi }).eq('id', mevcut.id)
    } else if (yeniSayi > 0) {
      const { data } = await supabase.from('yapi').insert({ sube_id: subeId, vardiya, gorev_id: gorevId, slot_sayisi: yeniSayi }).select().single()
      if (data) setYapi((prev) => [...prev, data])
    }
  }

  const personelGuncelle = async (id, patch) => {
    setPersonel((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    await supabase.from('personel').update(patch).eq('id', id)
  }

  const gorevToggle = async (personelId, gorevId) => {
    const p = personel.find((x) => x.id === personelId)
    const varMi = p.personel_gorevleri.some((pg) => pg.gorev_id === gorevId)
    if (varMi) {
      setPersonel((prev) => prev.map((x) => (x.id === personelId ? { ...x, personel_gorevleri: x.personel_gorevleri.filter((pg) => pg.gorev_id !== gorevId) } : x)))
      await supabase.from('personel_gorevleri').delete().eq('personel_id', personelId).eq('gorev_id', gorevId)
    } else {
      setPersonel((prev) => prev.map((x) => (x.id === personelId ? { ...x, personel_gorevleri: [...x.personel_gorevleri, { gorev_id: gorevId }] } : x)))
      await supabase.from('personel_gorevleri').insert({ personel_id: personelId, gorev_id: gorevId })
    }
  }

  const yeniGorevToggle = (gorevId) => {
    setYeniPersonelGorevler((prev) => (prev.includes(gorevId) ? prev.filter((id) => id !== gorevId) : [...prev, gorevId]))
  }

  const personelEkle = async () => {
    const ad = yeniPersonelAdi.trim()
    if (!ad) return
    const { data } = await supabase
      .from('personel')
      .insert({ sube_id: subeId, ad, sabit_izin_gunu: yeniPersonelIzin === '' ? null : +yeniPersonelIzin })
      .select()
      .single()
    if (data) {
      if (yeniPersonelGorevler.length) {
        await supabase.from('personel_gorevleri').insert(yeniPersonelGorevler.map((gorev_id) => ({ personel_id: data.id, gorev_id })))
      }
      setPersonel((prev) => [...prev, { ...data, personel_gorevleri: yeniPersonelGorevler.map((gorev_id) => ({ gorev_id })) }])
    }
    setYeniPersonelAdi('')
    setYeniPersonelGorevler([])
    setYeniPersonelIzin('')
  }

  const gorunenPersonel = personel.filter((p) => pasifGoster || p.aktif)
  const pasifSayisi = personel.filter((p) => !p.aktif).length

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link to={`/cizelge/${subeId}`} className="text-mute text-sm">&larr; Çizelgeye dön</Link>

      <header className="mt-2 mb-6">
        <div className="font-mono text-xs tracking-[0.22em] uppercase text-foam">{sube.ikon} {sube.ad}</div>
        <h1 className="font-disp text-2xl mt-1">Şube Ayarları</h1>
        <p className="text-mute text-sm mt-1">Görevler, personel ve haftalık yapıyı buradan düzenle.</p>
      </header>

      <section className="bg-sea-800 border border-line rounded-xl p-4 mb-6">
        <h2 className="font-mono text-xs uppercase tracking-wide text-mute mb-3">Görevler</h2>
        <div className="flex flex-col gap-2">
          {gorevlerSirali.map((g, idx) => (
            <div key={g.id} className="flex items-center gap-2 bg-sea-900 border border-line rounded-lg px-3 py-2">
              <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: g.renk }} />
              <input
                value={g.ad}
                onChange={(e) => setGorevler((prev) => prev.map((x) => (x.id === g.id ? { ...x, ad: e.target.value } : x)))}
                onBlur={(e) => gorevGuncelle(g.id, { ad: e.target.value })}
                className="flex-1 bg-transparent outline-none text-sm transition-colors duration-150 focus:text-foam"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => gorevSirasiDegistir(g.id, -1)}
                  disabled={idx === 0}
                  className="w-6 h-6 rounded border border-line text-mute text-xs transition duration-150 hover:border-foam hover:text-foam active:scale-90 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => gorevSirasiDegistir(g.id, 1)}
                  disabled={idx === gorevlerSirali.length - 1}
                  className="w-6 h-6 rounded border border-line text-mute text-xs transition duration-150 hover:border-foam hover:text-foam active:scale-90 disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex gap-1">
            {RENK_PALETI.map((renk) => (
              <button
                key={renk}
                onClick={() => setYeniGorevRenk(renk)}
                className={`w-5 h-5 rounded-full transition-transform duration-150 active:scale-90 ${yeniGorevRenk === renk ? 'ring-2 ring-offset-2 ring-offset-sea-800 ring-ink' : ''}`}
                style={{ background: renk }}
              />
            ))}
          </div>
          <input
            value={yeniGorevAdi}
            onChange={(e) => setYeniGorevAdi(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && gorevEkle()}
            placeholder="Yeni görev adı…"
            className="flex-1 min-w-[160px] bg-sea-900 border border-line rounded-lg px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-foam"
          />
          <button
            onClick={gorevEkle}
            disabled={!yeniGorevAdi.trim()}
            className="text-sm font-semibold text-sea-900 rounded-lg px-3 py-2 transition-transform duration-150 active:scale-[0.97] disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#6df0d8,#3fe0c5)' }}
          >
            Ekle
          </button>
        </div>
        <p className="text-mute text-xs mt-2">Bir görev artık kullanılmıyorsa silmek yerine aşağıdaki Yapı bölümünden tüm slotlarını 0 yap — geçmiş çizelgeler bozulmaz.</p>
      </section>

      <section className="bg-sea-800 border border-line rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-xs uppercase tracking-wide text-mute">Personel</h2>
          {pasifSayisi > 0 && (
            <button onClick={() => setPasifGoster((v) => !v)} className="text-xs text-mute transition-colors duration-150 hover:text-foam">
              {pasifGoster ? 'Pasifleri gizle' : `Pasif personeli göster (${pasifSayisi})`}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {gorunenPersonel.map((p) => (
            <div key={p.id} className={`bg-sea-900 border border-line rounded-lg px-3 py-2.5 ${!p.aktif ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={p.ad}
                  onChange={(e) => setPersonel((prev) => prev.map((x) => (x.id === p.id ? { ...x, ad: e.target.value } : x)))}
                  onBlur={(e) => personelGuncelle(p.id, { ad: e.target.value })}
                  className="bg-transparent outline-none text-sm font-semibold w-32 transition-colors duration-150 focus:text-foam"
                />
                <div className="flex gap-1 flex-wrap">
                  {gorevlerSirali.map((g) => {
                    const aktifGorev = p.personel_gorevleri.some((pg) => pg.gorev_id === g.id)
                    return (
                      <button
                        key={g.id}
                        onClick={() => gorevToggle(p.id, g.id)}
                        className="text-[11px] font-semibold rounded-md px-2 py-1 border transition duration-150 active:scale-95"
                        style={aktifGorev ? { borderColor: g.renk, color: g.renk, background: `${g.renk}1a` } : { borderColor: '#1d3b53', color: '#7e9aaa' }}
                      >
                        {g.ad}
                      </button>
                    )
                  })}
                </div>
                <select
                  value={p.sabit_izin_gunu ?? ''}
                  onChange={(e) => personelGuncelle(p.id, { sabit_izin_gunu: e.target.value === '' ? null : +e.target.value })}
                  className="bg-sea-800 border border-line rounded-lg text-xs text-mute px-2 py-1.5 outline-none transition-colors duration-150 focus:border-foam"
                >
                  <option value="">Sabit izin: —</option>
                  {GUNLER.map((g, i) => (
                    <option key={g} value={i}>İzin: {g}</option>
                  ))}
                </select>
                <button
                  onClick={() => personelGuncelle(p.id, { aktif: !p.aktif })}
                  className="ml-auto text-xs border border-line rounded-lg px-2.5 py-1.5 text-mute transition duration-150 hover:border-coral hover:text-coral active:scale-[0.97]"
                >
                  {p.aktif ? 'Pasife al' : 'Aktif et'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 bg-sea-900/60 border border-line rounded-lg p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={yeniPersonelAdi}
              onChange={(e) => setYeniPersonelAdi(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && personelEkle()}
              placeholder="Yeni personel adı…"
              className="bg-sea-800 border border-line rounded-lg px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-foam w-40"
            />
            <div className="flex gap-1 flex-wrap">
              {gorevlerSirali.map((g) => {
                const secili = yeniPersonelGorevler.includes(g.id)
                return (
                  <button
                    key={g.id}
                    onClick={() => yeniGorevToggle(g.id)}
                    className="text-[11px] font-semibold rounded-md px-2 py-1 border transition duration-150 active:scale-95"
                    style={secili ? { borderColor: g.renk, color: g.renk, background: `${g.renk}1a` } : { borderColor: '#1d3b53', color: '#7e9aaa' }}
                  >
                    {g.ad}
                  </button>
                )
              })}
            </div>
            <select
              value={yeniPersonelIzin}
              onChange={(e) => setYeniPersonelIzin(e.target.value)}
              className="bg-sea-800 border border-line rounded-lg text-xs text-mute px-2 py-2 outline-none transition-colors duration-150 focus:border-foam"
            >
              <option value="">Sabit izin: —</option>
              {GUNLER.map((g, i) => (
                <option key={g} value={i}>İzin: {g}</option>
              ))}
            </select>
            <button
              onClick={personelEkle}
              disabled={!yeniPersonelAdi.trim()}
              className="text-sm font-semibold text-sea-900 rounded-lg px-3 py-2 transition-transform duration-150 active:scale-[0.97] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#6df0d8,#3fe0c5)' }}
            >
              Ekle
            </button>
          </div>
        </div>
        <p className="text-mute text-xs mt-2">İşten ayrılan personeli silme — "Pasife al" geçmiş çizelgeleri korur, çizelgede artık seçilemez olur.</p>
      </section>

      <section className="bg-sea-800 border border-line rounded-xl p-4">
        <h2 className="font-mono text-xs uppercase tracking-wide text-mute mb-3">Yapı — her vardiyada hangi görevden kaç slot olsun</h2>
        <div className="flex gap-8 flex-wrap">
          {vardiyalar.map((vardiya) => (
            <div key={vardiya} className="min-w-[220px] flex-1">
              <div className={`font-disp text-sm mb-2 ${vardiya === 'gece' ? 'text-violet' : 'text-foam'}`}>{VARDIYA_BASLIK[vardiya]}</div>
              {gorevlerSirali.map((g) => {
                const y = yapi.find((row) => row.vardiya === vardiya && row.gorev_id === g.id)
                const sayi = y?.slot_sayisi ?? 0
                return (
                  <div key={g.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-line">
                    <span className="text-sm flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: g.renk }} />
                      {g.ad}
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => slotDegistir(vardiya, g.id, -1)}
                        className="w-6 h-6 rounded border border-line text-mute transition duration-150 hover:border-foam hover:text-foam active:scale-90"
                      >
                        −
                      </button>
                      <b className="font-mono text-sm w-4 text-center inline-block">{sayi}</b>
                      <button
                        onClick={() => slotDegistir(vardiya, g.id, 1)}
                        className="w-6 h-6 rounded border border-line text-mute transition duration-150 hover:border-foam hover:text-foam active:scale-90"
                      >
                        +
                      </button>
                    </span>
                  </div>
                )
              })}
              {gorevler.length === 0 && <p className="text-mute text-sm">Önce yukarıdan görev ekle.</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
