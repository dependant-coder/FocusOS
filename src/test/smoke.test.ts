import { describe, it, expect } from 'vitest'
import { cn } from '../lib/cn'

describe('FocusOS Foundation Test Suite', () => {
  it('cn utility merges class names properly', () => {
    const result = cn('px-4 py-2', 'bg-blue-500', { 'text-white': true, 'opacity-50': false })
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
    expect(result).toContain('bg-blue-500')
    expect(result).toContain('text-white')
    expect(result).not.toContain('opacity-50')
  })

  it('verifies timezone configuration in test environment', () => {
    expect(process.env.TZ).toBe('Asia/Kolkata')
  })
})
