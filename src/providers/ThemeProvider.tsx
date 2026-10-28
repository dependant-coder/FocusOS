import { useEffect, useState, type ReactNode } from 'react'
import { type Theme, getStoredTheme, setTheme as saveTheme, applyTheme, isSystemDark } from '../lib/theme'
import { ThemeContext } from '../context/ThemeContext'
import { useProfile, useUpdateProfile } from '../hooks/useSettings'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setLocalTheme] = useState<Theme>(getStoredTheme)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const current = getStoredTheme()
    return current === 'dark' || (current === 'system' && isSystemDark())
  })

  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()

  // Apply theme and update state
  const handleSetTheme = (newTheme: Theme) => {
    setLocalTheme(newTheme)
    saveTheme(newTheme)
    const darkActive = applyTheme(newTheme)
    setIsDark(darkActive)

    if (profile && profile.theme !== newTheme) {
      updateProfile.mutate({ theme: newTheme })
    }
  }

  // Sync when profile loads: profile wins if different from localStorage
  useEffect(() => {
    if (profile?.theme) {
      const profileTheme = profile.theme as Theme
      if (profileTheme !== theme) {
        setLocalTheme(profileTheme)
        saveTheme(profileTheme)
        setIsDark(applyTheme(profileTheme))
      }
    }
  }, [profile?.theme, theme])

  // Listen to system prefers-color-scheme changes when theme is system
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        const darkActive = applyTheme('system')
        setIsDark(darkActive)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
