import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Globe,
  KeyRound,
  Check,
  FileSpreadsheet,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import PageShell from '../components/layout/PageShell'
import Toggle from '../components/ui/Toggle'
import { useAuth } from '../hooks/useAuth'
import { useProfile, useUpdateProfile, useExportData, useExportCsv } from '../hooks/useSettings'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../lib/theme'
import { safeStorage } from '../lib/safeStorage'
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

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
]

export default function Settings() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const exportData = useExportData()
  const exportCsv = useExportCsv()
  const { theme, setTheme } = useTheme()

  // Profile fields
  const [name, setName] = useState('')
  const [nameEditing, setNameEditing] = useState(false)
  const [timezone, setTimezone] = useState('UTC')

  // Appearance fields
  const [reduceMotion, setReduceMotion] = useState(() => {
    return safeStorage.getItem('focusos_reduce_motion') === 'true'
  })
  const [showDailyQuote, setShowDailyQuote] = useState(() => {
    const saved = safeStorage.getItem('focusos_show_quote')
    return saved === null ? true : saved === 'true'
  })

  // Real push subscription state
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default')
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false)
  const [togglingPush, setTogglingPush] = useState(false)

  // Notification time settings
  const [notifTime, setNotifTime] = useState('08:00')
  const [weeklyReminderOn, setWeeklyReminderOn] = useState(true)
  const [weeklyReminderTime, setWeeklyReminderTime] = useState('18:00')
  const [weeklyReminderDay, setWeeklyReminderDay] = useState(0)

  // "Saved" feedback indicators
  const [profileSaved, setProfileSaved] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

  // Debounce timers
  const notifTimeTimer = useRef<NodeJS.Timeout | null>(null)
  const weeklyTimeTimer = useRef<NodeJS.Timeout | null>(null)

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
      if (sub) setPushSubscribed(true)
    })
  }, [])

  // Sync state from profile
  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
      if (profile.notif_on !== null && profile.notif_on !== undefined) {
        setPushSubscribed(Boolean(profile.notif_on))
      }
      setNotifTime(profile.notif_time?.slice(0, 5) || '08:00')
      setWeeklyReminderOn(profile.weekly_reminder_on ?? true)
      setWeeklyReminderTime(profile.weekly_reminder_time?.slice(0, 5) || '18:00')
      setWeeklyReminderDay(profile.weekly_reminder_day ?? 0)
    }
  }, [profile])

  const showSavedIndicator = (setter: (val: boolean) => void) => {
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  // Profile Save
  const handleNameSave = useCallback(() => {
    setNameEditing(false)
    if (name !== profile?.name) {
      updateProfile.mutate(
        { name },
        { onSuccess: () => showSavedIndicator(setProfileSaved) }
      )
    }
  }, [name, profile?.name, updateProfile])

  const handleTimezoneChange = (newTz: string) => {
    setTimezone(newTz)
    updateProfile.mutate(
      { timezone: newTz },
      { onSuccess: () => showSavedIndicator(setProfileSaved) }
    )
  }

  // Appearance handlers
  const handleReduceMotionToggle = (checked: boolean) => {
    setReduceMotion(checked)
    safeStorage.setItem('focusos_reduce_motion', String(checked))
    window.dispatchEvent(new Event('focusos-reduce-motion-change'))
  }

  const handleDailyQuoteToggle = (checked: boolean) => {
    setShowDailyQuote(checked)
    safeStorage.setItem('focusos_show_quote', String(checked))
  }

  // Password reset via Supabase auth
  const [resettingPassword, setResettingPassword] = useState(false)
  const handleResetPassword = async () => {
    if (!user?.email) return
    setResettingPassword(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (error) throw error
      toast.success('Check your email for a reset link')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset'
      toast.error(msg)
    } finally {
      setResettingPassword(false)
    }
  }

  // Push notification handlers
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
          updateProfile.mutate({ notif_on: true })
          setPermissionState(getPermissionState())
          showSavedIndicator(setNotifSaved)
        }
      } else {
        await unsubscribeFromPush(user.id)
        setPushSubscribed(false)
        updateProfile.mutate({ notif_on: false })
        showSavedIndicator(setNotifSaved)
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

  // Debounced notification time (500 ms)
  const handleNotifTimeChange = (time: string) => {
    setNotifTime(time)
    if (notifTimeTimer.current) clearTimeout(notifTimeTimer.current)
    notifTimeTimer.current = setTimeout(() => {
      updateProfile.mutate(
        { notif_time: time + ':00' },
        { onSuccess: () => showSavedIndicator(setNotifSaved) }
      )
    }, 500)
  }

  const handleWeeklyReminderToggle = (checked: boolean) => {
    setWeeklyReminderOn(checked)
    updateProfile.mutate(
      { weekly_reminder_on: checked },
      { onSuccess: () => showSavedIndicator(setNotifSaved) }
    )
  }

  // Debounced weekly reminder time (500 ms)
  const handleWeeklyReminderTimeChange = (time: string) => {
    setWeeklyReminderTime(time)
    if (weeklyTimeTimer.current) clearTimeout(weeklyTimeTimer.current)
    weeklyTimeTimer.current = setTimeout(() => {
      updateProfile.mutate(
        { weekly_reminder_time: time + ':00' },
        { onSuccess: () => showSavedIndicator(setNotifSaved) }
      )
    }, 500)
  }

  const handleWeeklyReminderDayChange = (day: number) => {
    setWeeklyReminderDay(day)
    updateProfile.mutate(
      { weekly_reminder_day: day },
      { onSuccess: () => showSavedIndicator(setNotifSaved) }
    )
  }

  const handleSignOut = useCallback(async () => {
    toast.loading('Signing out...', { id: 'signout' })
    await signOut()
    toast.dismiss('signout')
  }, [signOut])

  const sectionClass =
    'bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs overflow-hidden'
  const rowClass = 'flex items-center justify-between px-5 py-3.5'
  const dividerClass = 'border-t border-gray-100 dark:border-gray-800'

  // Build timezone choices including detected and current
  const allTimezones = Array.from(new Set([timezone, ...COMMON_TIMEZONES])).sort()

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
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Profile
            </h2>
            <AnimatePresence>
              {profileSaved && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
                >
                  <Check size={12} />
                  <span>Saved</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className={dividerClass} />

          {/* Name row */}
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <User size={16} />
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
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm">
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

          <div className={dividerClass} />

          {/* Timezone row */}
          <div className={rowClass}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Globe size={16} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Timezone</p>
                <select
                  value={timezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  aria-label="User timezone"
                  className="text-xs font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1 mt-0.5 border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {allTimezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={dividerClass} />

          {/* Change Password row */}
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resettingPassword}
            className={`${rowClass} w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors disabled:opacity-50`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <KeyRound size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Change Password</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {resettingPassword ? 'Sending reset link...' : 'Send password reset link to your email'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
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
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150
                    ${
                      theme === value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={dividerClass} />

          {/* Reduce motion */}
          <div className={rowClass}>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Reduce Motion</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Minimize interface animations</p>
            </div>
            <Toggle
              checked={reduceMotion}
              onChange={handleReduceMotionToggle}
              size="sm"
            />
          </div>

          <div className={dividerClass} />

          {/* Daily quote toggle */}
          <div className={rowClass}>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Daily Quote</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Show motivational morning quote on Today</p>
            </div>
            <Toggle
              checked={showDailyQuote}
              onChange={handleDailyQuoteToggle}
              size="sm"
            />
          </div>
        </motion.div>

        {/* Focus Sessions Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={sectionClass}
        >
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Focus Sessions
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
              Active
            </span>
          </div>

          <div className={dividerClass} />

          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50 text-purple-950 dark:text-purple-200 text-xs leading-relaxed">
              <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-900 dark:text-purple-200 mb-0.5">
                  Interruption Tracking &amp; Limitation
                </p>
                <p className="text-purple-800/90 dark:text-purple-300">
                  Web apps cannot restrict OS-level app switching. FocusOS keeps your screen awake using the Screen Wake Lock API and detects when you leave the active tab for more than 10 seconds as an interruption.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notifications Section */}
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
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {notifSaved && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    <Check size={12} />
                    <span>Saved</span>
                  </motion.span>
                )}
              </AnimatePresence>
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
          </div>

          <div className={dividerClass} />

          {/* iOS Non-standalone Explainer */}
          {isIosNotStandalone && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/50 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
              <Info size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">iOS Notification Requirement</p>
                <p>
                  To receive web push notifications on iOS, tap Safari&apos;s <strong>Share</strong> button and select <strong>&quot;Add to Home Screen&quot;</strong>, then open FocusOS.
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
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Bell size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Daily Focus Reminders</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Morning briefing of pending tasks and habits
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
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">Daily Reminder Time</p>
                <input
                  type="time"
                  value={notifTime}
                  onChange={(e) => handleNotifTimeChange(e.target.value)}
                  className="text-xs font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1.5 border-0 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className={dividerClass} />

              {/* Weekly Review Reminder */}
              <div className={rowClass}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Calendar size={16} />
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
                <div className={`${dividerClass} px-5 py-2.5 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-4`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Day:</span>
                    <select
                      value={weeklyReminderDay}
                      onChange={(e) => handleWeeklyReminderDayChange(parseInt(e.target.value, 10))}
                      className="text-xs font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1 border-0"
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
                      className="text-xs font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1 border-0"
                    />
                  </div>
                </div>
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

        {/* Data & Backup Section */}
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

          {/* Export JSON */}
          <button
            type="button"
            onClick={() => exportData.mutate()}
            disabled={exportData.isPending}
            className={`${rowClass} w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors active:bg-gray-100`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Download size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {exportData.isPending ? 'Exporting...' : 'Export All Data (JSON)'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Full backup of tasks, habits, and todos</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <div className={dividerClass} />

          {/* Export CSVs */}
          <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/30">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <FileSpreadsheet size={14} className="text-indigo-500" />
              <span>Export Spreadsheets (CSV)</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => exportCsv.mutate('tasks')}
                disabled={exportCsv.isPending}
                className="py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors text-center"
              >
                Tasks.csv
              </button>
              <button
                type="button"
                onClick={() => exportCsv.mutate('habits')}
                disabled={exportCsv.isPending}
                className="py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors text-center"
              >
                Habits.csv
              </button>
              <button
                type="button"
                onClick={() => exportCsv.mutate('daily_todos')}
                disabled={exportCsv.isPending}
                className="py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors text-center"
              >
                Todos.csv
              </button>
              <button
                type="button"
                onClick={() => exportCsv.mutate('weekly_reviews')}
                disabled={exportCsv.isPending}
                className="py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors text-center"
              >
                Reviews.csv
              </button>
            </div>
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:bg-red-100"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </motion.div>

        {/* App Info */}
        <div className="text-center pt-2 pb-4 text-xs text-gray-400 dark:text-gray-600 space-y-0.5">
          <p>FocusOS v2.0 • Offline Ready</p>
          <p>Built for students, by students.</p>
        </div>
      </div>
    </PageShell>
  )
}
