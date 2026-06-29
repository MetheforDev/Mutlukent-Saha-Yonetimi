import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const nav = useNavigate()

  async function girisYap() {
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) setErr(error.message); else nav('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-sea-800 border border-line rounded-2xl p-7">
        <div className="text-foam font-mono text-xs tracking-[0.22em] uppercase">Mutlukent</div>
        <h1 className="font-disp text-2xl mt-1 mb-5">Saha Yönetim Sistemi</h1>
        <input className="w-full bg-sea-900 border border-line rounded-lg px-3 py-2.5 mb-2 outline-none transition-colors duration-150 focus:border-foam"
          placeholder="E-posta" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full bg-sea-900 border border-line rounded-lg px-3 py-2.5 mb-3 outline-none transition-colors duration-150 focus:border-foam"
          placeholder="Şifre" value={pass} onChange={e=>setPass(e.target.value)} />
        {err && <div className="text-coral text-sm mb-3">{err}</div>}
        <button onClick={girisYap}
          className="w-full font-disp font-bold text-sea-900 rounded-lg py-3 transition-transform duration-150 active:scale-[0.97]"
          style={{background:'linear-gradient(135deg,#6df0d8,#3fe0c5)'}}>Giriş Yap</button>
      </div>
    </div>
  )
}
