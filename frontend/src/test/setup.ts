import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

global.fetch = vi.fn()

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})
