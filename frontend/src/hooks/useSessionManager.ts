import { useState, useEffect, useCallback } from 'react'

interface SessionData {
  sessionId: string
  issueId: number
  repoId: string
  issueTitle: string
  repoName: string
  status: string
  createdAt: string
  lastAccessed: string
}

interface DevinSession {
  status: string
  structured_output?: {
    progress_pct: number
    confidence: 'low' | 'medium' | 'high'
    summary: string
    risks: string[]
    dependencies: string[]
    action_plan: Array<{
      step: number
      desc: string
      done: boolean
    }>
    branch_suggestion: string
    pr_url: string
    status?: string
  }
  url: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useSessionManager() {
  const [activeSessions, setActiveSessions] = useState<SessionData[]>([])
  const [sessionDetails, setSessionDetails] = useState<Record<string, DevinSession>>({})
  const [isPolling, setIsPolling] = useState(false)

  const fetchActiveSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/active`)
      if (response.ok) {
        const sessions = await response.json()
        const transformedSessions = sessions.map((session: any) => ({
          sessionId: session.session_id,
          issueId: session.issue_id,
          repoId: session.repo_id,
          issueTitle: session.issue_title,
          repoName: session.repo_name,
          status: session.status,
          createdAt: session.created_at,
          lastAccessed: session.last_accessed
        }))
        setActiveSessions(transformedSessions)
        return transformedSessions
      }
    } catch (error) {
      console.error('Failed to fetch active sessions:', error)
    }
    return []
  }, [])

  const fetchSessionDetails = useCallback(async (sessionId: string) => {
    if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
      console.warn('fetchSessionDetails called with invalid sessionId:', sessionId)
      return null
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/devin/${sessionId}`)
      if (response.ok) {
        const sessionData = await response.json()
        setSessionDetails(prev => ({
          ...prev,
          [sessionId]: sessionData
        }))
        return sessionData
      }
    } catch (error) {
      console.error(`Failed to fetch session details for ${sessionId}:`, error)
    }
    return null
  }, [])

  const getIssueSession = useCallback(async (issueId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}/session`)
      if (response.ok) {
        const data = await response.json()
        return data.sessionId
      }
    } catch (error) {
      console.error(`Failed to get session for issue ${issueId}:`, error)
    }
    return null
  }, [])

  const cancelSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setActiveSessions(prev => prev.filter(s => s.sessionId !== sessionId))
        setSessionDetails(prev => {
          const updated = { ...prev }
          delete updated[sessionId]
          return updated
        })
        return true
      }
    } catch (error) {
      console.error(`Failed to cancel session ${sessionId}:`, error)
    }
    return false
  }, [])

  const startPolling = useCallback(() => {
    if (isPolling) {
      return () => {} // Return empty cleanup function if already polling
    }

    setIsPolling(true)
    const interval = setInterval(async () => {
      const sessions = await fetchActiveSessions()
      
      for (const session of sessions) {
        if (session.sessionId && session.sessionId !== 'null' && session.sessionId !== 'undefined') {
          await fetchSessionDetails(session.sessionId)
        }
      }
    }, 10000) // Poll every 10 seconds

    return () => {
      clearInterval(interval)
      setIsPolling(false)
    }
  }, [fetchActiveSessions, fetchSessionDetails])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
  }, [])

  useEffect(() => {
    const cleanup = startPolling()
    
    return cleanup
  }, [startPolling])

  return {
    activeSessions,
    sessionDetails,
    isPolling,
    fetchActiveSessions,
    fetchSessionDetails,
    getIssueSession,
    cancelSession,
    startPolling,
    stopPolling
  }
}
