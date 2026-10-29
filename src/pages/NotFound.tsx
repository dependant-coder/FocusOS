import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl font-black text-indigo-600/30 dark:text-indigo-400/20 mb-2">
          404
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          The view you are looking for doesn&apos;t exist or has moved. Return to your command center to stay on track.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20"
          >
            <Home size={16} />
            Back to Home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm transition-all"
          >
            <ArrowLeft size={16} />
            Previous
          </button>
        </div>
      </div>
    </div>
  )
}
