import { createContext } from 'react'
import type { supabase } from '../lib/supabase'

export type AuthSession = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
export type AuthUser = NonNullable<AuthSession>['user']

export interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})
