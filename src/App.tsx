import { lazy, Suspense, useEffect, useState } from 'react'
import { Crosshair } from 'lucide-react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { useRealtimeSync } from './hooks/useRealtime'
import { useAuth } from './hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'

// Lazy-loaded pages
const AuthPage = lazy(() => import('./pages/Auth'))
const Home = lazy(() => import('./pages/Home'))
const Vault = lazy(() => import('./pages/Vault'))
const Daily = lazy(() => import('./pages/Daily'))
const Habits = lazy(() => import('./pages/Habits'))
const Weekly = lazy(() => import('./pages/Weekly'))
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })))
const Settings = lazy(() => import('./pages/Settings'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

import { PageTransition } from './components/layout/PageTransition'
import { ThemeProvider } from './providers/ThemeProvider'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 mb-4 animate-pulse">
          <Crosshair size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white">FocusOS</div>
        <div className="text-xs text-gray-400 mt-1">Loading...</div>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  const location = useLocation()
  // Subscribe to Realtime changes for cross-tab/device sync
  useRealtimeSync(user?.id ?? '')

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/daily" element={<PageTransition><Daily /></PageTransition>} />
          <Route path="/vault" element={<PageTransition><Vault /></PageTransition>} />
          <Route path="/habits" element={<PageTransition><Habits /></PageTransition>} />
          <Route path="/weekly" element={<PageTransition><Weekly /></PageTransition>} />
          <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}

type AppSession = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']

export default function App() {
  const [session, setSession] = useState<AppSession>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const qc = useQueryClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/reset')
      } else if (event === 'SIGNED_IN' && session) {
        // Only navigate to '/' if currently on an auth page, avoiding bouncing on tab refocus
        if (window.location.pathname.startsWith('/auth') && window.location.pathname !== '/auth/reset') {
          navigate('/')
        }
      } else if (event === 'SIGNED_OUT') {
        // Clear React Query cache and local user state on sign out
        qc.clear()
        try {
          localStorage.removeItem('focusos-focus-session')
        } catch {
          // ignore storage error
        }
        navigate('/auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate, qc])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <ThemeProvider>
      <Routes>
        <Route
          path="/auth/reset"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <ResetPassword />
            </Suspense>
          }
        />
        <Route
          path="/auth"
          element={
            !session ? (
              <Suspense fallback={<LoadingScreen />}>
                <AuthPage />
              </Suspense>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/*"
          element={session ? <AppRoutes /> : <Navigate to="/auth" replace />}
        />
      </Routes>
    </ThemeProvider>
  )
}
