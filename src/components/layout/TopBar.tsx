import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sun,
  Moon,
  Laptop,
  LogOut,
  Settings,
  Search,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'

interface TopBarProps {
  title?: string
  action?: ReactNode
  onSearchClick?: () => void
}

export default function TopBar({ title, action, onSearchClick }: TopBarProps) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
  }

  const userInitial = (user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100/60 dark:border-gray-800/60 pt-safe">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6 max-w-5xl mx-auto">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {title || 'FocusOS'}
          </h1>
        </div>

        {/* Right: Actions & User Avatar Menu */}
        <div className="flex items-center gap-2">
          {action}

          {/* Search Trigger */}
          <button
            type="button"
            onClick={onSearchClick || (() => navigate('/vault'))}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            title="Search tasks (Ctrl+K)"
            aria-label="Search tasks"
          >
            <Search size={18} />
          </button>

          {/* User Avatar & Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs ring-2 ring-indigo-500/20 hover:ring-indigo-500/40 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="User profile and settings menu"
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                userInitial
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl py-2 z-50 text-sm animate-in fade-in zoom-in-95 duration-150"
              >
                {/* User info */}
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {user?.user_metadata?.full_name || 'FocusOS User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || ''}
                  </p>
                </div>

                {/* Theme selector */}
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 px-1 mb-1.5 uppercase tracking-wider">
                    Theme
                  </p>
                  <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/80 rounded-xl p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition-all ${
                        theme === 'light'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title="Light Mode"
                    >
                      <Sun size={13} />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition-all ${
                        theme === 'dark'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title="Dark Mode"
                    >
                      <Moon size={13} />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('system')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg font-medium transition-all ${
                        theme === 'system'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title="System Theme"
                    >
                      <Laptop size={13} />
                      <span>Auto</span>
                    </button>
                  </div>
                </div>

                {/* Links */}
                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
                    role="menuitem"
                  >
                    <Settings size={16} className="text-gray-400" />
                    <span>Settings &amp; Reminders</span>
                  </Link>
                  <Link
                    to="/vault"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
                    role="menuitem"
                  >
                    <UserIcon size={16} className="text-gray-400" />
                    <span>Manage Tasks</span>
                  </Link>
                </div>

                {/* Sign Out */}
                <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left font-medium"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
