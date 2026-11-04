import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const isProd = import.meta.env.PROD

const hasValidEnv = Boolean(
  rawSupabaseUrl &&
  rawSupabaseAnonKey &&
  !rawSupabaseUrl.includes('placeholder') &&
  rawSupabaseUrl.startsWith('http')
)

if (!hasValidEnv) {
  if (isProd && !useMock) {
    throw new Error(
      '[FocusOS Fatal Error] Missing required Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY). In production builds, real credentials are required unless explicitly opted into mock mode via VITE_USE_MOCK=true.'
    )
  }
  if (!useMock) {
    console.warn(
      '[FocusOS] Warning: Supabase credentials are missing and VITE_USE_MOCK is not "true". Falling back to mock client in non-production environment. Set VITE_USE_MOCK=true in .env to explicitly enable mock mode.'
    )
  }
}

let supabase: SupabaseClient<Database>

if (hasValidEnv && !useMock) {
  supabase = createClient<Database>(rawSupabaseUrl, rawSupabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
} else {
  const { createMockSupabaseClient } = await import('./supabaseMock')
  supabase = createMockSupabaseClient() as unknown as SupabaseClient<Database>
}

export { supabase }
