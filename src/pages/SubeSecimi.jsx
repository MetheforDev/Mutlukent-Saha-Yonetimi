import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MODUL_BASLIK = {
  cizelge: '📅 Şube seç',
  puantaj: '🗂️ Şube seç',
  mesai: '⏱️ Şube seç',
}

export default function SubeSecimi({ modul = 'cizelge' }) {
  const { signOut } = useAuth()
  const [subeler, setSubeler] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('subeler').select('*').eq('aktif', true).order('ad')
      .then(({ data }) => { setSubeler(data || []); setLoading(false) })
  }, [])

  const anaSubeler = subeler.filter(s => !s.ust_sube_id)
  const altlar = (id) => subeler.filter(s => s.ust_sube_id === id)

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link to="/" className="text-mute text-sm">&larr; Modüller</Link>
      <div className="flex items-center justify-between mb-6 mt-2">
        <h1 className="font-disp text-2xl">{MODUL_BASLIK[modul] || 'Şube seç'}</h1>
        <button onClick={signOut} className="text-mute text-sm border border-line rounded-lg px-3 py-2 transition-transform duration-150 active:scale-[0.97]">Çıkış</button>
      </div>
      {loading ? <div className="text-mute animate-pulse">Yükleniyor…</div> :
        <div className="grid gap-4">
          {anaSubeler.map(s => (
            <div key={s.id} className="bg-sea-800 border border-line rounded-xl p-4 transition-colors duration-150 hover:border-foam/40">
              <Link to={`/${modul}/${s.id}`} className="font-disp text-lg transition-colors duration-150 hover:text-foam">{s.ikon} {s.ad}</Link>
              <div className="flex flex-wrap gap-2 mt-3">
                {altlar(s.id).map(a => (
                  <Link key={a.id} to={`/${modul}/${a.id}`}
                    className="text-sm bg-sea-900 border border-line rounded-lg px-3 py-2 transition duration-150 hover:border-foam hover:text-foam active:scale-[0.97]">
                    {a.ikon} {a.ad}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>}
    </div>
  )
}
