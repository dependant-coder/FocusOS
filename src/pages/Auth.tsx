import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { DAILY_QUOTES } from '../lib/constants'
import { getDayOfYear } from '../lib/dates'
import { Crosshair, Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

type AuthMode = 'sign_in' | 'sign_up' | 'forgot_password'

export default function Auth() {
  const todayQuote = DAILY_QUOTES[getDayOfYear(new Date()) % DAILY_QUOTES.length]
  const [mode, setMode] = useState<AuthMode>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [canResendEmail, setCanResendEmail] = useState(false)
  const [resending, setResending] = useState(false)
  const [signUpConfirmationEmail, setSignUpConfirmationEmail] = useState<string | null>(null)

  const mapErrorMessage = (err: unknown): { message: string; isUnconfirmedEmail?: boolean } => {
    const raw = err instanceof Error ? err.message : String(err)
    const lower = raw.toLowerCase()

    if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
      return { message: 'Invalid email or password' }
    }
    if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
      return {
        message: 'Email not confirmed. Please check your inbox or click below to resend the link.',
        isUnconfirmedEmail: true,
      }
    }
    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
      return { message: 'Too many requests. Please wait a moment before trying again.' }
    }
    return { message: raw }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setErrorMessage(null)
    setCanResendEmail(false)

    try {
      if (mode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        })
        if (error) throw error
        toast.success('Check your email for a reset link!')
        setMode('sign_in')
      } else if (mode === 'sign_up') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        })
        if (error) throw error

        // If sign-up requires email confirmation (session is null)
        if (!data.session) {
          setSignUpConfirmationEmail(email)
        } else {
          toast.success('Account created!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      const { message, isUnconfirmedEmail } = mapErrorMessage(err)
      setErrorMessage(message)
      if (isUnconfirmedEmail) {
        setCanResendEmail(true)
      }
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email.trim()) return
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (error) throw error
      toast.success('Confirmation email resent!')
      setCanResendEmail(false)
    } catch (err: unknown) {
      const { message } = mapErrorMessage(err)
      toast.error(message)
    } finally {
      setResending(false)
    }
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) {
        toast.error(error.message)
        setGoogleLoading(false)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center px-4 py-8">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl motion-reduce:hidden" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl motion-reduce:hidden" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl motion-reduce:hidden" />
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
        <div className="bg-white/5 backdrop-blur-sm motion-reduce:backdrop-blur-none border border-white/10 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs text-slate-300 italic text-center leading-relaxed">
            "{todayQuote.text}"
            <span className="block text-slate-500 mt-1 not-italic">— {todayQuote.author}</span>
          </p>
        </div>

        {/* Post-signup confirmation state */}
        {signUpConfirmationEmail ? (
          <div className="bg-white/5 backdrop-blur-md motion-reduce:backdrop-blur-none border border-white/10 rounded-2xl p-6 shadow-xl text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              We sent a link to <span className="text-indigo-400 font-medium">{signUpConfirmationEmail}</span>. Open it on this device to complete your sign-in.
            </p>
            <button
              onClick={() => {
                setSignUpConfirmationEmail(null)
                setMode('sign_in')
              }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          /* Auth form */
          <div className="bg-white/5 backdrop-blur-md motion-reduce:backdrop-blur-none border border-white/10 rounded-2xl p-6 shadow-xl">
            {/* Google OAuth */}
            <button
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium transition-all mb-4 disabled:opacity-60"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Redirecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500 uppercase">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                <p>{errorMessage}</p>
                {canResendEmail && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resending}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors underline disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {mode !== 'forgot_password' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-400">Password</label>
                    {mode === 'sign_up' && (
                      <span className="text-[11px] text-slate-400">At least 8 characters</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={mode === 'sign_up' ? 8 : 6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-3.5 pr-11 py-2.5 text-base sm:text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                <span>
                  {loading
                    ? 'Loading...'
                    : mode === 'sign_in'
                    ? 'Sign In'
                    : mode === 'sign_up'
                    ? 'Create Account'
                    : 'Send Reset Link'}
                </span>
              </button>
            </form>

            {/* Mode switcher links */}
            <div className="mt-4 text-center space-y-1.5">
              {mode === 'sign_in' && (
                <>
                  <button
                    onClick={() => {
                      setErrorMessage(null)
                      setMode('forgot_password')
                    }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors block mx-auto"
                  >
                    Forgot password?
                  </button>
                  <button
                    onClick={() => {
                      setErrorMessage(null)
                      setMode('sign_up')
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors block mx-auto"
                  >
                    Don't have an account? <span className="font-semibold">Sign up</span>
                  </button>
                </>
              )}
              {mode === 'sign_up' && (
                <button
                  onClick={() => {
                    setErrorMessage(null)
                    setMode('sign_in')
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Already have an account? <span className="font-semibold">Sign in</span>
                </button>
              )}
              {mode === 'forgot_password' && (
                <button
                  onClick={() => {
                    setErrorMessage(null)
                    setMode('sign_in')
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  ← Back to sign in
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Built for focus. Designed for students.
        </p>
      </div>
    </div>
  )
}
