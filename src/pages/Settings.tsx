import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { User, Sun, Moon, Monitor, Bell, Download, LogOut, ChevronRight } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import Toggle from '../components/ui/Toggle'
import { useAuth } from '../hooks/useAuth'
import { useProfile, useUpdateProfile, useExportData } from '../hooks/useSettings'
import toast from 'react-hot-toast'

import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../lib/theme'

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function Settings() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const exportData = useExportData()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState('')
  const [nameEditing, setNameEditing] = useState(false)
  const [notifOn, setNotifOn] = useState(true)
  const [notifTime, setNotifTime] = useState('08:00')

  // Sync local state from profile
  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setNotifOn(profile.notif_on ?? true)
      setNotifTime(profile.notif_time?.slice(0, 5) || '08:00')
    }
  }, [profile])

  // Handle theme change
  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
  }, [setTheme])

  // Handle name save
  const handleNameSave = useCallback(() => {
    setNameEditing(false)
    if (name !== profile?.name) {
      updateProfile.mutate({ name }, {
        onSuccess: () => toast.success('Name updated')
      })
    }
  }, [name, profile?.name, updateProfile])

  // Handle notification toggle
  const handleNotifToggle = useCallback((checked: boolean) => {
    setNotifOn(checked)
    updateProfile.mutate({ notif_on: checked }, {
      onSuccess: () => toast.success(checked ? 'Notifications enabled' : 'Notifications disabled')
    })
  }, [updateProfile])

  // Handle notification time
  const handleNotifTimeChange = useCallback((time: string) => {
    setNotifTime(time)
    updateProfile.mutate({ notif_time: time + ':00' }) // append seconds for postgres TIME type
  }, [updateProfile])

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    toast.loading('Signing out...', { id: 'signout' })
    await signOut()
    toast.dismiss('signout')
  }, [signOut])

  const sectionClass = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden'
  const rowClass = 'flex items-center justify-between px-5 py-4'
  const dividerClass = 'border-t border-gray-100 dark:border-gray-800'

  if (isLoading) {
    return (
      <PageShell title="Settings">
        <div className="max-w-md mx-auto pb-24 pt-6 px-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Settings">
      <div className="max-w-md mx-auto pb-24 pt-6 px-4 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Customize your FocusOS experience.</p>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={sectionClass}
        >
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profile</h2>
          </div>
          <div className={dividerClass} />

          {/* Name row */}
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" size={18} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                {nameEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                    autoFocus
                    className="text-base sm:text-sm font-medium text-gray-900 dark:text-white bg-transparent border-b border-indigo-500 focus:outline-none py-0.5 w-full"
                  />
                ) : (
                  <button
                    onClick={() => setNameEditing(true)}
                    className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                  >
                    {name || 'Set your name'}
                  </button>
                )}
              </div>
            </div>
            {!nameEditing && <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>

          <div className={dividerClass} />

          {/* Email row (read-only) */}
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span className="text-sm">📧</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                  {user?.email || '—'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={sectionClass}
        >
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Appearance</h2>
          </div>
          <div className={dividerClass} />
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200
                    ${theme === value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={sectionClass}
        >
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notifications</h2>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Bell className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Daily Reminders</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Get reminded to check your tasks</p>
              </div>
            </div>
            <Toggle checked={notifOn} onChange={handleNotifToggle} size="sm" />
          </div>
          {notifOn && (
            <>
              <div className={dividerClass} />
              <div className={rowClass}>
                <p className="text-sm text-gray-700 dark:text-gray-300">Reminder Time</p>
                <input
                  type="time"
                  value={notifTime}
                  onChange={(e) => handleNotifTimeChange(e.target.value)}
                  className="text-base sm:text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 border-0 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}
        </motion.div>

        {/* Data Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={sectionClass}
        >
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</h2>
          </div>
          <div className={dividerClass} />
          <button
            onClick={() => exportData.mutate()}
            disabled={exportData.isPending}
            className={`${rowClass} w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors active:bg-gray-100 dark:active:bg-gray-800`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Download className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {exportData.isPending ? 'Exporting...' : 'Export All Data'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Download your data as JSON</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:bg-red-100 dark:active:bg-red-950/50"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </motion.div>

        {/* App Info */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-gray-400 dark:text-gray-600">FocusOS v1.0.0</p>
          <p className="text-xs text-gray-400 dark:text-gray-600">Built for students, by students.</p>
        </div>

      </div>
    </PageShell>
  )
}
