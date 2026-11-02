import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Automatically unmount React trees after each test
afterEach(() => {
  cleanup()
})

// Default test environment timezone fixed to Asia/Kolkata (UTC+5:30)
// This ensures any UTC vs Local date divergence is caught during tests
process.env.TZ = 'Asia/Kolkata'
