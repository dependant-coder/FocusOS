import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Crosshair } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useRealtimeSync } from './hooks/useRealtime'
import { ThemeProvider } from './providers/ThemeProvider'
import { RequireAuth } from './components/auth/RequireAuth'
import AppLayout from './components/layout/AppLayout'
import { PageTransition } from './components/layout/PageTransition'

// Lazy-loaded pages
const AuthPage = lazy(() => import('./pages/Auth'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Home = lazy(() => import('./pages/Home'))
const Vault = lazy(() => import('./pages/Vault'))
const Daily = lazy(() => import('./pages/Daily'))
const Habits = lazy(() => import('./pages/Habits'))
const Weekly = lazy(() => import('./pages/Weekly'))
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))

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

function AuthenticatedApp() {
  const { user } = useAuth()
  // Subscribe to Realtime postgres changes for active user
  useRealtimeSync(user?.id ?? '')

  return <AppLayout />
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/auth/reset"
              element={<ResetPassword />}
            />
            <Route
              path="/auth"
              element={!user ? <AuthPage /> : <Navigate to="/" replace />}
            />

            {/* Protected App Routes with Persistent Layout */}
            <Route
              element={
                <RequireAuth>
                  <AuthenticatedApp />
                </RequireAuth>
              }
            >
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/daily" element={<PageTransition><Daily /></PageTransition>} />
              <Route path="/vault" element={<PageTransition><Vault /></PageTransition>} />
              <Route path="/habits" element={<PageTransition><Habits /></PageTransition>} />
              <Route path="/weekly" element={<PageTransition><Weekly /></PageTransition>} />
              <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
              <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
              <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </Route>
          </Routes>
        </Suspense>
      </MotionConfig>
    </ThemeProvider>
  )
}
