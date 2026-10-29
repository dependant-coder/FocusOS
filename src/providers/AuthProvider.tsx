import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthSession, type AuthUser } from '../context/AuthContext'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Single subscription for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)

      if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/reset')
      } else if (event === 'SIGNED_IN' && newSession) {
        if (window.location.pathname.startsWith('/auth') && window.location.pathname !== '/auth/reset') {
          navigate('/')
        }
      } else if (event === 'SIGNED_OUT') {
        queryClient.clear()
        try {
          localStorage.removeItem('focusos-focus-session')
          localStorage.removeItem('FOCUSOS_OFFLINE_CACHE')
        } catch {
          // ignore storage error
        }
        navigate('/auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate, queryClient])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
