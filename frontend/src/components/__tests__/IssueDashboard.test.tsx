import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import IssueDashboard from '../IssueDashboard'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ owner: 'testuser', name: 'test-repo' }),
    useNavigate: () => vi.fn()
  }
})

vi.mock('@/hooks/useSessionManager', () => ({
  useSessionManager: () => ({
    activeSessions: [],
    sessionDetails: {},
    issueUpdates: {}
  })
}))

describe('IssueDashboard', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))

    renderWithRouter(<IssueDashboard />)
    
    expect(screen.getByText('Loading issues...')).toBeInTheDocument()
  })

  it('makes API calls on mount', () => {
    const mockFetch = vi.fn().mockImplementation(() => new Promise(() => {}))
    global.fetch = mockFetch

    renderWithRouter(<IssueDashboard />)
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/repos/testuser/test-repo/issues')
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/repos')
    )
  })

  it('component mounts without errors', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))

    expect(() => {
      renderWithRouter(<IssueDashboard />)
    }).not.toThrow()
  })
})
