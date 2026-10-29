import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './providers/AuthProvider'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import App from './App'
import './index.css'

import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
})

// Configure offline query persistence (P2-5)
if (typeof window !== 'undefined') {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'FOCUSOS_OFFLINE_CACHE',
  })

  persistQueryClient({
    queryClient: queryClient as unknown as Parameters<typeof persistQueryClient>[0]['queryClient'],
    persister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        const queryKey = query.queryKey[0]
        return ['tasks', 'daily_todos', 'habits', 'habit_logs', 'profile'].includes(
          queryKey as string
        )
      },
    },
  })
}

// Register Workbox PWA service worker with reload notification prompt
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">New version available!</span>
            <button
              onClick={() => {
                updateSW(true)
                toast.dismiss(t.id)
              }}
              className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs"
            >
              Update
            </button>
          </div>
        ),
        { duration: Infinity, id: 'pwa-update-prompt' }
      )
    },
    onOfflineReady() {
      console.info('[FocusOS] App is cached and ready for offline use.')
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '10px 16px',
                  background: '#111827',
                  color: '#f9fafb',
                  border: '1px solid #374151',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                },
                success: {
                  iconTheme: { primary: '#10b981', secondary: '#111827' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#111827' },
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
