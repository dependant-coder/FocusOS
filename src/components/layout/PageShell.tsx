import { useEffect, type ReactNode } from 'react'
import { useLayout } from '../../context/LayoutContext'

interface PageShellProps {
  title?: string
  action?: ReactNode
  children: ReactNode
  size?: 'narrow' | 'wide'
  hideNav?: boolean
}

export default function PageShell({
  title,
  action,
  children,
  size = 'narrow',
}: PageShellProps) {
  const { setTitle, setAction } = useLayout()

  useEffect(() => {
    if (title) setTitle(title)
    if (action !== undefined) setAction(action)
    return () => {
      if (action !== undefined) setAction(null)
    }
  }, [title, action, setTitle, setAction])

  const maxWidthClass = size === 'wide' ? 'max-w-5xl' : 'max-w-lg'

  return (
    <div className={`w-full mx-auto px-4 sm:px-6 pb-28 md:pb-12 ${maxWidthClass}`}>
      {children}
    </div>
  )
}
