import { NavLink } from 'react-router-dom'
import {
  Home,
  CalendarCheck,
  Archive,
  Leaf,
  BarChart3,
  TrendingUp,
  Settings,
  Crosshair,
} from 'lucide-react'

const SIDEBAR_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/daily', label: 'Daily Focus', icon: CalendarCheck },
  { to: '/vault', label: 'Task Vault', icon: Archive },
  { to: '/habits', label: 'Habits', icon: Leaf },
  { to: '/weekly', label: 'Weekly Review', icon: BarChart3 },
  { to: '/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside
      aria-label="Desktop Navigation"
      className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-gray-950 border-r border-gray-200/70 dark:border-gray-800/70 min-h-screen sticky top-0 p-4"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 py-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/25 text-white">
          <Crosshair size={22} strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-1">
            Focus<span className="text-indigo-600 dark:text-indigo-400">OS</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Command Center</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {SIDEBAR_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100'
              }
            `}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <item.icon
                  size={18}
                  strokeWidth={isActive ? 2.3 : 1.8}
                  className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom info */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-900 px-3">
        <p className="text-[11px] text-gray-400 dark:text-gray-600">
          FocusOS v2.0 • Offline First
        </p>
      </div>
    </aside>
  )
}
