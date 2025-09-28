import { useState, useEffect, useCallback, useRef } from 'react'
import { normalizeStructuredOutput } from '@/utils/structuredOutputUtils'

const ISSUE_UPDATES_STORAGE_KEY = 'cognition-app-issue-updates'

const persistIssueUpdates = (updates: Record<number, {status: string, prUrl?: string}>) => {
  try {
    localStorage.setItem(ISSUE_UPDATES_STORAGE_KEY, JSON.stringify(updates))
  } catch (error) {
    console.warn('Failed to persist issue updates:', error)
  }
}

const restoreIssueUpdates = (): Record<number, {status: string, prUrl?: string}> => {
  try {
    const stored = localStorage.getItem(ISSUE_UPDATES_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.warn('Failed to restore issue updates:', error)
    return {}
  }
}

const isTerminalStatus = (status: string): boolean => {
  return ['completed', 'failed', 'cancelled'].includes(status)
}

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

interface ActiveSessionApiResponse {
  session_id: string
  issue_id: number
  repo_id: string
  issue_title: string
  repo_name: string
  status: string
  created_at: string
  last_accessed: string
}

interface DevinSession {
  status: string
  structured_output?: {
    progress_pct?: number
    confidence?: 'low' | 'medium' | 'high'
    summary?: string
    risks?: string[]
    dependencies?: string[]
    action_plan?: Array<{
      step: number
      desc: string
      done: boolean
    }>
    branch_suggestion?: string
    pr_url?: string
    status?: string
    response?: {
      status: string
      summary: string
      confidence: 'low' | 'medium' | 'high'
      progress_pct: number
      risks: string[]
      dependencies: string[]
      action_plan: Array<{
        step: number
        desc: string
        done: boolean
      }>
      branch_suggestion: string
      pr_url?: string
    }
    progress?: {
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
      pr_url?: string
      status?: string
      response?: {
        status: string
        summary: string
        confidence: 'low' | 'medium' | 'high'
        progress_pct: number
        risks: string[]
        dependencies: string[]
        action_plan: Array<{
          step: number
          desc: string
          done: boolean
        }>
        branch_suggestion: string
        pr_url?: string
      }
    }
  }
  pull_request?: {
    url: string
  }
  url: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useSessionManager() {
  const [activeSessions, setActiveSessions] = useState<SessionData[]>([])
  const [sessionDetails, setSessionDetails] = useState<Record<string, DevinSession>>({})
  const [trackedSessionIds, setTrackedSessionIds] = useState<Set<string>>(new Set())
  const [issueUpdates, setIssueUpdates] = useState<Record<number, {status: string, prUrl?: string}>>(() => restoreIssueUpdates())
  const [isPolling, setIsPolling] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const trackedSessionIdsRef = useRef<Set<string>>(new Set())

  const fetchActiveSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/active`)
      if (response.ok) {
        const sessions = await response.json()
        const transformedSessions = sessions.map((session: ActiveSessionApiResponse) => ({
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
      } else if (response.status === 404) {
        trackedSessionIdsRef.current.delete(sessionId)
        setTrackedSessionIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(sessionId)
          return newSet
        })
        return null
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
    if (pollingIntervalRef.current) {
      return () => {}
    }

    setIsPolling(true)
    pollingIntervalRef.current = setInterval(async () => {
      const sessions = await fetchActiveSessions()
      
      const sessionPromises = sessions
        .filter((session: SessionData) => session.sessionId && session.sessionId !== 'null' && session.sessionId !== 'undefined')
        .map(async (session: SessionData) => {
          trackedSessionIdsRef.current.add(session.sessionId)
          return await fetchSessionDetails(session.sessionId)
        })
      
      await Promise.all(sessionPromises)
      
      setTrackedSessionIds(new Set(trackedSessionIdsRef.current))
      
      const sessionsToRemove: string[] = []
      for (const sessionId of trackedSessionIdsRef.current) {
        const sessionData = sessionDetails[sessionId]
        if (sessionData && isTerminalStatus(sessionData.status)) {
          sessionsToRemove.push(sessionId)
        }
      }
      
      sessionsToRemove.forEach(sessionId => {
        trackedSessionIdsRef.current.delete(sessionId)
      })
      
      setTrackedSessionIds(new Set(trackedSessionIdsRef.current))
    }, 10000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      setIsPolling(false)
    }
  }, [fetchActiveSessions, fetchSessionDetails, sessionDetails])

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  const updateIssueStatus = useCallback((issueId: number, status: string, prUrl?: string) => {
    setIssueUpdates(prev => ({
      ...prev,
      [issueId]: { status, prUrl }
    }))
  }, [])

  useEffect(() => {
    persistIssueUpdates(issueUpdates)
  }, [issueUpdates])

  useEffect(() => {
    Object.entries(sessionDetails).forEach(([sessionId, sessionData]) => {
      const session = activeSessions.find(s => s.sessionId === sessionId)
      if (sessionData) {
        const prUrl = sessionData.pull_request?.url
        
        const normalizedOutput = normalizeStructuredOutput(sessionData.structured_output)
        const isTaskCompleted = sessionData.status === 'finished' || 
                               normalizedOutput?.status === 'completed' ||
                               normalizedOutput?.response?.status === 'completed'
        
        if (isTaskCompleted && prUrl) {
          const issueId = session?.issueId
          if (issueId) {
            updateIssueStatus(issueId, 'PR Submitted', prUrl)
          }
        }
      }
    })
  }, [sessionDetails, activeSessions, updateIssueStatus])

  useEffect(() => {
    const cleanup = startPolling()
    
    return cleanup
  }, [startPolling])

  return {
    activeSessions,
    sessionDetails,
    trackedSessionIds,
    issueUpdates,
    isPolling,
    fetchActiveSessions,
    fetchSessionDetails,
    getIssueSession,
    cancelSession,
    startPolling,
    stopPolling,
    updateIssueStatus
  }
}
