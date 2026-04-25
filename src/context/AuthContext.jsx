import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { withTimeout } from '../lib/withTimeout'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let cancelled = false

    withTimeout(supabase.auth.getSession(), 10000, 'getSession')
      .then(({ data: { session } }) => {
        if (cancelled) return
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('getSession failed:', err)
        setAuthError('Не удаётся подключиться. Проверь интернет.')
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    // Safety timeout: force loading off even if everything else hangs
    const safety = setTimeout(() => {
      if (cancelled) return
      setLoading(prev => {
        if (prev) {
          console.warn('Safety timeout: forcing loading=false')
          setAuthError('Не удаётся подключиться. Проверь интернет.')
        }
        return false
      })
    }, 15000)

    return () => {
      cancelled = true
      clearTimeout(safety)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).single(),
        10000,
        'fetchProfile'
      )
      setProfile(data)

      // Handle pending invite from registration
      const inviteFrom = localStorage.getItem('invite_from')
      if (inviteFrom) {
        localStorage.removeItem('invite_from')
        const { error } = await supabase.rpc('accept_friend_invite', {
          inviter_username_param: inviteFrom,
        })
        if (error) console.error('invite friendship error:', error)
      }
    } catch (err) {
      console.error('fetchProfile error:', err)
      setAuthError('Не удаётся загрузить профиль. Проверь интернет.')
    } finally {
      setLoading(false)
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
    <AuthContext.Provider value={{ user, profile, loading, authError, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
