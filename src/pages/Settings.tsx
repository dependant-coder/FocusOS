import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Sun,
  Moon,
  Monitor,
  Bell,
  Download,
  LogOut,
  ChevronRight,
  Send,
  AlertTriangle,
  Info,
  Calendar,
} from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import Toggle from '../components/ui/Toggle'
import { useAuth } from '../hooks/useAuth'
import { useProfile, useUpdateProfile, useExportData } from '../hooks/useSettings'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../lib/theme'
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSupported,
  isStandalone,
  getPermissionState,
  getExistingSubscription,
} from '../lib/push'
import toast from 'react-hot-toast'

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function Settings() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const exportData = useExportData()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState('')
  const [nameEditing, setNameEditing] = useState(false)

  // Real push subscription state
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default')
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false)
  const [togglingPush, setTogglingPush] = useState(false)

  // Reminder settings
  const [notifTime, setNotifTime] = useState('08:00')
  const [weeklyReminderOn, setWeeklyReminderOn] = useState(true)
  const [weeklyReminderTime, setWeeklyReminderTime] = useState('18:00')
  const [weeklyReminderDay, setWeeklyReminderDay] = useState(0)

  // Check hardware and platform push status
  useEffect(() => {
    const supported = isPushSupported()
    if (!supported) {
      setPermissionState('unsupported')
      return
    }

    setPermissionState(getPermissionState())

    // Check iOS standalone
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIos && !isStandalone()) {
      setIsIosNotStandalone(true)
    }

    // Check if subscription actually exists in browser
    getExistingSubscription().then((sub) => {
      setPushSubscribed(Boolean(sub))
    })
  }, [])

  // Sync state from profile
  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setNotifTime(profile.notif_time?.slice(0, 5) || '08:00')
      setWeeklyReminderOn(profile.weekly_reminder_on ?? true)
      setWeeklyReminderTime(profile.weekly_reminder_time?.slice(0, 5) || '18:00')
      setWeeklyReminderDay(profile.weekly_reminder_day ?? 0)
    }
  }, [profile])

  const handleNameSave = useCallback(() => {
    setNameEditing(false)
    if (name !== profile?.name) {
      updateProfile.mutate(
        { name },
        { onSuccess: () => toast.success('Name updated') }
      )
    }
  }, [name, profile?.name, updateProfile])

  // Non-cosmetic notification toggle handler
  const handleNotifToggle = async (checked: boolean) => {
    if (!user) return
    setTogglingPush(true)

    try {
      if (checked) {
        if (isIosNotStandalone) {
          toast.error('Add FocusOS to your Home Screen first to enable push notifications on iOS.')
          return
        }

        const res = await subscribeToPush(user.id)
        if (!res.success) {
          toast.error(res.error || 'Failed to enable notifications')
          setPushSubscribed(false)
        } else {
          setPushSubscribed(true)
          setPermissionState(getPermissionState())
          toast.success('Push reminders enabled!')
        }
      } else {
        await unsubscribeFromPush(user.id)
        setPushSubscribed(false)
        toast.success('Push reminders disabled')
      }
    } finally {
      setTogglingPush(false)
    }
  }

  const handleSendTestNotification = async () => {
    try {
      if (!isPushSupported() || Notification.permission !== 'granted') {
        toast.error('Notifications not granted yet')
        return
      }

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification('FocusOS Reminder', {
          body: 'Your daily focus notifications are active and ready!',
          icon: '/pwa-192x192.png',
        })
        toast.success('Test notification sent!')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send test'
      toast.error(msg)
    }
  }

  const handleNotifTimeChange = useCallback(
    (time: string) => {
      setNotifTime(time)
      updateProfile.mutate({ notif_time: time + ':00' })
    },
    [updateProfile]
  )

  const handleWeeklyReminderToggle = useCallback(
    (checked: boolean) => {
      setWeeklyReminderOn(checked)
      updateProfile.mutate({ weekly_reminder_on: checked })
    },
    [updateProfile]
  )

  const handleWeeklyReminderTimeChange = useCallback(
    (time: string) => {
      setWeeklyReminderTime(time)
      updateProfile.mutate({ weekly_reminder_time: time + ':00' })
    },
    [updateProfile]
  )

  const handleWeeklyReminderDayChange = useCallback(
    (day: number) => {
      setWeeklyReminderDay(day)
      updateProfile.mutate({ weekly_reminder_day: day })
    },
    [updateProfile]
  )

  const handleSignOut = useCallback(async () => {
    toast.loading('Signing out...', { id: 'signout' })
    await signOut()
    toast.dismiss('signout')
  }, [signOut])

  const sectionClass =
    'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden'
  const rowClass = 'flex items-center justify-between px-5 py-4'
  const dividerClass = 'border-t border-gray-100 dark:border-gray-800'

  if (isLoading) {
    return (
      <PageShell title="Settings">
        <div className="max-w-md mx-auto pb-24 pt-6 px-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Settings">
      <div className="max-w-md mx-auto pb-24 pt-2 px-1 sm:px-4 space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={sectionClass}
        >
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Profile
            </h2>
          </div>
          <div className={dividerClass} />

          {/* Name row */}
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                {nameEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                    autoFocus
                    className="text-sm font-medium text-gray-900 dark:text-white bg-transparent border-b border-indigo-500 focus:outline-none py-0.5 w-full"
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
              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm">
                📧
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                  {user?.email || '—'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={sectionClass}
        >
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Appearance
            </h2>
          </div>
          <div className={dividerClass} />
          <div className="px-5 py-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Theme Selection</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150
                    ${
                      theme === value
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

        {/* Push Notifications Section (P2-4) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={sectionClass}
        >
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Push Reminders
            </h2>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                pushSubscribed
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {pushSubscribed ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className={dividerClass} />

          {/* iOS Non-standalone Explainer */}
          {isIosNotStandalone && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/50 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
              <Info size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">iOS Notification Requirement</p>
                <p>
                  To receive web push notifications on iPhone/iPad, tap the <strong>Share</strong> button in Safari and select <strong>&quot;Add to Home Screen&quot;</strong>, then open FocusOS from your home screen.
                </p>
              </div>
            </div>
          )}

          {/* Permission Denied Explainer */}
          {permissionState === 'denied' && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border-b border-red-200/50 dark:border-red-900/50 flex gap-3 text-xs text-red-800 dark:text-red-300">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Notifications Blocked</p>
                <p>
                  Notifications are blocked in your browser settings. To enable them, click the lock/settings icon in your browser address bar and set Notifications to &quot;Allow&quot;.
                </p>
              </div>
            </div>
          )}

          {/* Daily Reminder Toggle */}
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Bell size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Daily Focus Reminders</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive a morning briefing of pending tasks and habits
                </p>
              </div>
            </div>
            <Toggle
              checked={pushSubscribed}
              onChange={handleNotifToggle}
              size="sm"
              disabled={togglingPush || permissionState === 'unsupported'}
            />
          </div>

          {pushSubscribed && (
            <>
              <div className={dividerClass} />
              <div className={rowClass}>
                <p className="text-sm text-gray-700 dark:text-gray-300">Daily Reminder Time</p>
                <input
                  type="time"
                  value={notifTime}
                  onChange={(e) => handleNotifTimeChange(e.target.value)}
                  className="text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 border-0 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className={dividerClass} />

              {/* Weekly Review Reminder */}
              <div className={rowClass}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Weekly Review Prompt</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Reminder to reflect and plan next week</p>
                  </div>
                </div>
                <Toggle
                  checked={weeklyReminderOn}
                  onChange={handleWeeklyReminderToggle}
                  size="sm"
                />
              </div>

              {weeklyReminderOn && (
                <>
                  <div className={`${dividerClass} px-5 py-3 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-4`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Day:</span>
                      <select
                        value={weeklyReminderDay}
                        onChange={(e) => handleWeeklyReminderDayChange(parseInt(e.target.value, 10))}
                        className="text-xs font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1.5 border-0"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Time:</span>
                      <input
                        type="time"
                        value={weeklyReminderTime}
                        onChange={(e) => handleWeeklyReminderTimeChange(e.target.value)}
                        className="text-xs font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1.5 border-0"
                      >
                      </input>
                    </div>
                  </div>
                </>
              )}

              {/* Test Notification Button */}
              <div className={`${dividerClass} px-5 py-3`}>
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors"
                >
                  <Send size={13} />
                  <span>Send Test Notification</span>
                </button>
              </div>
            </>
          )}
        </motion.div>

        {/* Data Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={sectionClass}
        >
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Data &amp; Backup
            </h2>
          </div>
          <div className={dividerClass} />
          <button
            onClick={() => exportData.mutate()}
            disabled={exportData.isPending}
            className={`${rowClass} w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors active:bg-gray-100 dark:active:bg-gray-800`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Download size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {exportData.isPending ? 'Exporting...' : 'Export All Data'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Download your tasks, habits, and history as JSON</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
          <p className="text-xs text-gray-400 dark:text-gray-600">FocusOS v2.0 • Offline Ready</p>
          <p className="text-xs text-gray-400 dark:text-gray-600">Built for students, by students.</p>
        </div>
      </div>
    </PageShell>
  )
}
