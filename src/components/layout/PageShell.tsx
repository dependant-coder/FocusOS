import type { ReactNode } from 'react'
import BottomNav from './BottomNav'
import TopBar from './TopBar'

interface PageShellProps {
  title: string
  action?: ReactNode
  children: ReactNode
  hideNav?: boolean
}

export default function PageShell({ title, action, children, hideNav = false }: PageShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopBar title={title} action={action} />
      <main className="max-w-lg mx-auto pb-24">
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}
