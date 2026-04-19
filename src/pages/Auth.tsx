import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { DAILY_QUOTES } from '../lib/constants'
import { getDayOfYear } from '../lib/dates'
import { Crosshair } from 'lucide-react'
import toast from 'react-hot-toast'

type AuthMode = 'sign_in' | 'sign_up' | 'forgot_password'

export default function Auth() {
  const todayQuote = DAILY_QUOTES[getDayOfYear(new Date()) % DAILY_QUOTES.length]
  const [mode, setMode] = useState<AuthMode>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)

    try {
      if (mode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        toast.success('Check your email for a reset link!')
        setMode('sign_in')
      } else if (mode === 'sign_up') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        toast.success('Check your email to confirm your account!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) toast.error(error.message)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo & branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 mb-4">
            <Crosshair size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Focus<span className="text-indigo-400">OS</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Your daily command center</p>
        </div>

        {/* Daily quote */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs text-slate-300 italic text-center leading-relaxed">
            "{todayQuote.text}"
            <span className="block text-slate-500 mt-1 not-italic">— {todayQuote.author}</span>
          </p>
        </div>

        {/* Auth form */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
          {/* Google OAuth */}
          <button
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium transition-all mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-500 uppercase">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {mode !== 'forgot_password' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
            >
              {loading
                ? 'Loading...'
                : mode === 'sign_in'
                ? 'Sign In'
                : mode === 'sign_up'
                ? 'Create Account'
                : 'Send Reset Link'}
            </button>
          </form>

          {/* Mode switcher links */}
          <div className="mt-4 text-center space-y-1.5">
            {mode === 'sign_in' && (
              <>
                <button onClick={() => setMode('forgot_password')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors block mx-auto">
                  Forgot password?
                </button>
                <button onClick={() => setMode('sign_up')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors block mx-auto">
                  Don't have an account? <span className="font-semibold">Sign up</span>
                </button>
              </>
            )}
            {mode === 'sign_up' && (
              <button onClick={() => setMode('sign_in')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Already have an account? <span className="font-semibold">Sign in</span>
              </button>
            )}
            {mode === 'forgot_password' && (
              <button onClick={() => setMode('sign_in')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Built for focus. Designed for students.
        </p>
      </div>
    </div>
  )
}
