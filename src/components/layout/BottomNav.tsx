import { NavLink } from 'react-router-dom'
import { Home, CalendarCheck, Archive, Leaf, BarChart3 } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/daily', label: 'Daily', icon: CalendarCheck },
  { to: '/vault', label: 'Tasks', icon: Archive },
  { to: '/habits', label: 'Habits', icon: Leaf },
  { to: '/weekly', label: 'Review', icon: BarChart3 },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 pb-safe"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl transition-all duration-150
              ${isActive
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-medium'
              }
            `}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <item.icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-transform group-active:scale-95"
                />
                <span className="text-[11px] leading-tight tracking-tight mt-0.5">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
