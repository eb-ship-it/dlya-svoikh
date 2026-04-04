import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)

    // Handle pending invite from registration
    const inviteFrom = localStorage.getItem('invite_from')
    if (inviteFrom) {
      localStorage.removeItem('invite_from')
      const { data: inviter } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', inviteFrom)
        .single()
      if (inviter && inviter.id !== userId) {
        await supabase.from('friendships').insert({
          requester_id: inviter.id,
          addressee_id: userId,
          status: 'accepted',
        }).then(() => {})
      }
    }
  }

  async function signUp(username, password, displayName) {
    const email = `${username}@messenger.local`
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, username, display_name: displayName || null })
      if (profileError && profileError.code !== '23505') throw profileError
    }
  }

  async function signIn(username, password) {
    const email = `${username}@messenger.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
