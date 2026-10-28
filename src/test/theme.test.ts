import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStoredTheme,
  setTheme,
  applyTheme,
  THEME_STORAGE_KEY,
} from '../lib/theme'

describe('theme persistence (P1-2)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = ''
  })

  it('defaults to system when no theme is stored', () => {
    expect(getStoredTheme()).toBe('system')
  })

  it('persists and retrieves chosen theme', () => {
    setTheme('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(getStoredTheme()).toBe('dark')

    setTheme('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(getStoredTheme()).toBe('light')
  })

  it('applies dark theme to document root', () => {
    const isDark = applyTheme('dark')
    expect(isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('applies light theme to document root', () => {
    applyTheme('dark') // set dark first
    const isDark = applyTheme('light')
    expect(isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})
