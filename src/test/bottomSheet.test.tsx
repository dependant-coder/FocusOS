import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BottomSheet from '../components/ui/BottomSheet'

describe('BottomSheet component', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <BottomSheet isOpen={false} onClose={vi.fn()}>
        <div>Sheet Content</div>
      </BottomSheet>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders dialog with accessibility attributes when isOpen is true', () => {
    render(
      <BottomSheet isOpen={true} onClose={vi.fn()} title="Test Sheet" footer={<button>Save</button>}>
        <div>Sheet Content</div>
      </BottomSheet>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('Test Sheet')).toBeDefined()
    expect(screen.getByText('Sheet Content')).toBeDefined()
    expect(screen.getByText('Save')).toBeDefined()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="Escape Test">
        <input placeholder="Type here" />
      </BottomSheet>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when close icon button is clicked', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="Close Button Test">
        <div>Content</div>
      </BottomSheet>
    )

    const closeBtn = screen.getByLabelText('Close dialog')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
