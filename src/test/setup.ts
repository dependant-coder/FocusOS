import '@testing-library/jest-dom'

// Default test environment timezone fixed to Asia/Kolkata (UTC+5:30)
// This ensures any UTC vs Local date divergence is caught during tests
process.env.TZ = 'Asia/Kolkata'
