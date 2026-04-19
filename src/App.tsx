import { lazy, Suspense, useEffect, useState } from 'react'
import { Crosshair } from 'lucide-react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useRealtimeSync } from './hooks/useRealtime'
import { useAuth } from './hooks/useAuth'

// Lazy-loaded pages
const AuthPage = lazy(() => import('./pages/Auth'))
const Home = lazy(() => import('./pages/Home'))
const Vault = lazy(() => import('./pages/Vault'))
const Daily = lazy(() => import('./pages/Daily'))
const Habits = lazy(() => import('./pages/Habits'))
import PageShell from './components/layout/PageShell'

// Placeholder pages for later phases
function PlaceholderPage({ title }: { title: string }) {
  return (
    <PageShell title={title}>
      <div className="flex items-center justify-center py-32 px-4">
        <div className="text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Coming soon</p>
        </div>
      </div>
    </PageShell>
  )
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
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
  // Subscribe to Realtime changes for cross-tab/device sync
  useRealtimeSync(user?.id ?? '')

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/weekly" element={<PlaceholderPage title="Weekly" />} />
        <Route path="/analytics" element={<PlaceholderPage title="Analytics" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

type AppSession = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']

export default function App() {
  const [session, setSession] = useState<AppSession>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
      if (event === 'SIGNED_IN' && session) navigate('/')
      if (event === 'SIGNED_OUT') navigate('/auth')
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
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
  )
}
