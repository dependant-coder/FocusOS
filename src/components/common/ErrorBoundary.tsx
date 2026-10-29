import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FocusOS ErrorBoundary caught an error]:', error, errorInfo)

    // Automatically recover once from dynamic import / chunk load failures after deployment
    const isChunkFailure =
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Importing a module script failed') ||
      error.message?.includes('Loading chunk')

    if (isChunkFailure) {
      const hasReloaded = sessionStorage.getItem('focusos_chunk_reload')
      if (!hasReloaded) {
        sessionStorage.setItem('focusos_chunk_reload', 'true')
        window.location.reload()
      }
    }
  }

  private handleReset = () => {
    sessionStorage.removeItem('focusos_chunk_reload')
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mb-4">
              <AlertCircle size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              An unexpected error occurred. You can reload the application to restore your workspace.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20 w-full"
            >
              <RotateCcw size={16} />
              Reload FocusOS
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
