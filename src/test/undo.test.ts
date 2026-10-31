import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { showUndo, flushPendingUndos } from '../lib/undo'

vi.mock('react-hot-toast', () => {
  const fn = Object.assign(
    vi.fn((render) => {
      if (typeof render === 'function') {
        render({ id: 'toast-1' })
      }
      return 'toast-1'
    }),
    {
      dismiss: vi.fn(),
    }
  )
  return {
    default: fn,
    toast: fn,
  }
})

describe('showUndo system', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    flushPendingUndos()
  })

  it('triggers commit automatically after delay', async () => {
    const onUndo = vi.fn()
    const onCommit = vi.fn()

    showUndo({
      message: 'Task deleted',
      onUndo,
      onCommit,
      ms: 1000,
    })

    expect(onCommit).not.toHaveBeenCalled()
    expect(onUndo).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('cancels commit and executes onUndo when undone', async () => {
    const onUndo = vi.fn()
    const onCommit = vi.fn()

    const handle = showUndo({
      message: 'Habit deleted',
      onUndo,
      onCommit,
      ms: 2000,
    })

    handle.undo()

    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onCommit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(3000)
    // Should still never commit
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('flushes pending commits on flushPendingUndos', () => {
    const onCommit1 = vi.fn()
    const onCommit2 = vi.fn()

    showUndo({ message: 'Task 1', onUndo: vi.fn(), onCommit: onCommit1, ms: 5000 })
    showUndo({ message: 'Task 2', onUndo: vi.fn(), onCommit: onCommit2, ms: 5000 })

    expect(onCommit1).not.toHaveBeenCalled()
    expect(onCommit2).not.toHaveBeenCalled()

    flushPendingUndos()

    expect(onCommit1).toHaveBeenCalledTimes(1)
    expect(onCommit2).toHaveBeenCalledTimes(1)
  })
})
