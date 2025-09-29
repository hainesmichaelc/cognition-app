export const SESSION_PHASES = {
  SCOPING: 'scoping',
  EXECUTING: 'executing', 
  COMPLETED: 'completed'
} as const

export const SESSION_STATES = {
  RUNNING: 'running',
  BLOCKED: 'blocked',
  FINISHED: 'finished',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  INITIALIZING: 'Initializing'
} as const

export const DISPLAY_STATUS = {
  NOT_SCOPED: 'not-scoped',
  SCOPING: 'scoping',
  INITIALIZING: 'initializing',
  AWAITING_INPUT: 'awaiting-input',
  EXECUTING: 'executing',
  PR_READY: 'pr-ready'
} as const

interface DevinSession {
  status: string
  structured_output?: {
    status?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export function getSessionDisplayStatus(session: DevinSession | null): string {
  if (!session) return DISPLAY_STATUS.NOT_SCOPED
  
  if (session.status === SESSION_STATES.INITIALIZING) {
    return DISPLAY_STATUS.INITIALIZING
  }
  
  if (session.status === SESSION_STATES.FINISHED || session.status === SESSION_PHASES.COMPLETED) {
    return DISPLAY_STATUS.PR_READY
  }
  
  if (session.status === SESSION_STATES.BLOCKED) {
    return DISPLAY_STATUS.AWAITING_INPUT
  }
  
  const structuredStatus = session.structured_output?.status
  if (structuredStatus === SESSION_PHASES.SCOPING) {
    return DISPLAY_STATUS.SCOPING
  } else if (structuredStatus === SESSION_PHASES.EXECUTING) {
    return DISPLAY_STATUS.EXECUTING
  } else if (structuredStatus === SESSION_PHASES.COMPLETED) {
    return DISPLAY_STATUS.PR_READY
  }
  
  return DISPLAY_STATUS.SCOPING
}

export function isSessionCompleted(session: DevinSession | null): boolean {
  if (!session) return false
  
  return session.structured_output?.status === SESSION_PHASES.COMPLETED ||
         session.status === SESSION_STATES.FINISHED ||
         session.status === SESSION_PHASES.COMPLETED
}
