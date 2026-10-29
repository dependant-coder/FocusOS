import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'
import TaskForm, { type TaskFormData } from '../tasks/TaskForm'
import { useCreateTask } from '../../hooks/useTasks'

export default function CaptureButton() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const createTask = useCreateTask()

  // Hide button on auth or focus-run pages
  const isHidden =
    location.pathname.startsWith('/auth') ||
    location.pathname === '/focus/run'

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with 'n' key if not typing in an input or textarea
      if (
        (e.key === 'n' || e.key === 'N') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !isOpen
      ) {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSubmit = (formData: TaskFormData) => {
    createTask.mutate(
      {
        title: formData.title,
        priority: formData.priority,
        category: formData.category,
        due_date: formData.due_date || null,
        description: formData.description || null,
        resources_url: formData.resources_url || null,
        energy_level: formData.energy_level || null,
        pin_to_today: formData.pin_to_today,
      },
      {
        onSuccess: () => setIsOpen(false),
      }
    )
  }

  if (isHidden) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Quick capture task"
        title="Quick Capture (N)"
        className="fixed bottom-20 md:bottom-8 right-5 z-20 flex items-center justify-center w-13 h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg shadow-indigo-500/30 transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Quick Capture Task"
      >
        <div className="p-4">
          <TaskForm
            onSubmit={handleSubmit}
            onCancel={() => setIsOpen(false)}
            isSubmitting={createTask.isPending}
          />
        </div>
      </BottomSheet>
    </>
  )
}
