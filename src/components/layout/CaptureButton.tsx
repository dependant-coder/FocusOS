import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import QuickCaptureSheet from '../tasks/QuickCaptureSheet'

export default function CaptureButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [initialText, setInitialText] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  // Hide button on auth or focus-run pages
  const isHidden =
    location.pathname.startsWith('/auth') ||
    location.pathname === '/focus/run'

  // Handle incoming shortcut URL parameters (?capture=1 or ?share=1)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const isCapture = params.get('capture') === '1' || params.get('capture') === 'true'
    const isShare = params.get('share') === '1' || params.get('share') === 'true'

    if (isCapture || isShare) {
      const shareTitle = params.get('title') || ''
      const shareText = params.get('text') || ''
      const shareUrl = params.get('url') || ''

      const combined = [shareTitle, shareText, shareUrl].filter(Boolean).join(' ')
      if (combined) {
        setInitialText(combined)
      }

      setIsOpen(true)

      // Clean up search query parameters from URL without full reload
      params.delete('capture')
      params.delete('share')
      params.delete('title')
      params.delete('text')
      params.delete('url')

      const newSearch = params.toString()
      const newPath = `${location.pathname}${newSearch ? `?${newSearch}` : ''}${location.hash}`
      navigate(newPath, { replace: true })
    }
  }, [location.search, location.pathname, location.hash, navigate])

  // Keyboard shortcut: 'n' opens quick capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'n' || e.key === 'N') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !isOpen &&
        !isHidden
      ) {
        e.preventDefault()
        setInitialText('')
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isHidden])

  if (isHidden) return null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInitialText('')
          setIsOpen(true)
        }}
        aria-label="Quick capture task (keyboard shortcut N)"
        title="Quick Capture (N)"
        className="fixed bottom-20 md:bottom-8 right-5 z-20 flex items-center justify-center w-13 h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg shadow-indigo-500/30 transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      <QuickCaptureSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialText={initialText}
      />
    </>
  )
}
