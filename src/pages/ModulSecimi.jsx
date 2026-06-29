import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MODULLER = [
  { key: 'cizelge', ikon: '📅', ad: 'Haftalık Çalışma Çizelgesi', aciklama: 'Vardiya planı, izinler, adil rotasyon', to: '/cizelge', hazir: true },
  { key: 'puantaj', ikon: '🗂️', ad: 'Puantaj Çizelgesi', aciklama: 'Günlük çalışma / izin kaydı', to: '/puantaj', hazir: true },
  { key: 'mesai', ikon: '⏱️', ad: 'Mesai Çizelgesi', aciklama: 'Fazla çalışma saatleri özeti', to: '/mesai', hazir: false },
]

export default function ModulSecimi() {
  const { signOut } = useAuth()

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="font-mono text-xs tracking-[0.22em] uppercase text-foam">Mutlukent</div>
          <h1 className="font-disp text-2xl mt-1">Ne yapmak istersin?</h1>
        </div>
        <button onClick={signOut} className="text-mute text-sm border border-line rounded-lg px-3 py-2 transition-transform duration-150 active:scale-[0.97]">Çıkış</button>
      </div>

      <div className="grid gap-4">
        {MODULLER.map((m) =>
          m.hazir ? (
            <Link
              key={m.key}
              to={m.to}
              className="bg-sea-800 border border-line rounded-xl p-5 flex items-center gap-4 transition duration-150 hover:border-foam hover:bg-sea-700 active:scale-[0.99]"
            >
              <span className="text-3xl">{m.ikon}</span>
              <div>
                <div className="font-disp text-lg">{m.ad}</div>
                <div className="text-mute text-sm mt-0.5">{m.aciklama}</div>
              </div>
            </Link>
          ) : (
            <div key={m.key} className="bg-sea-800 border border-line rounded-xl p-5 flex items-center gap-4 opacity-50">
              <span className="text-3xl">{m.ikon}</span>
              <div className="flex-1">
                <div className="font-disp text-lg">{m.ad}</div>
                <div className="text-mute text-sm mt-0.5">{m.aciklama}</div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wide text-mute border border-line rounded-full px-2 py-1 whitespace-nowrap">
                Yakında
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
