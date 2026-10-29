import { useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import CaptureButton from './CaptureButton'
import { OfflineBanner } from '../common/OfflineBanner'
import { LayoutContext } from '../../context/LayoutContext'

export default function AppLayout() {
  const [title, setTitle] = useState('FocusOS')
  const [action, setAction] = useState<ReactNode | null>(null)

  return (
    <LayoutContext.Provider value={{ title, setTitle, action, setAction }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row text-gray-900 dark:text-gray-100 transition-colors duration-150">
        {/* Desktop Sidebar (md+) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <OfflineBanner />
          <TopBar title={title} action={action} />
          <main className="flex-1 pt-4">
            <Outlet />
          </main>
          {/* Mobile Bottom Navigation */}
          <BottomNav />
          {/* Global Quick Capture Floating Button */}
          <CaptureButton />
        </div>
      </div>
    </LayoutContext.Provider>
  )
}
