import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  const signOut = () => supabase.auth.signOut()
  return <Ctx.Provider value={{ session, loading, signOut }}>{children}</Ctx.Provider>
}
