import { ReactNode } from 'react'

interface TopBarProps {
  title: string
  action?: ReactNode
}

export default function TopBar({ title, action }: TopBarProps) {
  return (
    <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100/50 dark:border-gray-800/50 pt-safe">
      <div className="flex items-center justify-between h-14 px-5 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h1>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}
