import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ExternalLink, Play, MessageSquare, CheckCircle, Loader2, Clock, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSessionManager } from '@/hooks/useSessionManager'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DOMPurify from 'dompurify'

interface Issue {
  id: number
  title: string
  body: string
  labels: string[]
  number: number
  author: string
  created_at: string
  age_days: number
  status: string
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

interface IssueDetailModalProps {
  issue: Issue | null
  isOpen: boolean
  onClose: () => void
  onIssueUpdate?: (issueId: number, status: string, prUrl?: string) => void
  repoData?: {owner: string, name: string, url: string} | null
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const isSessionCompleted = (session: DevinSession | null) => {
  return session?.status === 'completed' || session?.structured_output?.status === 'completed'
}

export default function IssueDetailModal({ issue, isOpen, onClose, onIssueUpdate, repoData }: IssueDetailModalProps) {
  const [additionalContext, setAdditionalContext] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [session, setSession] = useState<DevinSession | null>(null)
  const [followUpMessage, setFollowUpMessage] = useState('')
  const [branchName, setBranchName] = useState('')
  const [targetBranch, setTargetBranch] = useState('main')
  const [isScoping, setIsScoping] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isPlanApproved, setIsPlanApproved] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRequestChangesDialog, setShowRequestChangesDialog] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [requestChangesMessage, setRequestChangesMessage] = useState('')
  const [questionMessage, setQuestionMessage] = useState('')
  const { toast } = useToast()
  const { getIssueSession, fetchSessionDetails, sessionDetails, isPolling, fetchActiveSessions } = useSessionManager()

  const checkForExistingSession = useCallback(async () => {
    if (!issue) return
    
    try {
      const existingSessionId = await getIssueSession(issue.id)
      if (existingSessionId) {
        setSessionId(existingSessionId)
        await fetchSessionDetails(existingSessionId)
      }
    } catch (error) {
      console.error('Failed to check for existing session:', error)
    }
  }, [issue])

  useEffect(() => {
    if (session?.structured_output?.branch_suggestion && !branchName) {
      setBranchName(session.structured_output.branch_suggestion)
    }
  }, [session?.structured_output?.branch_suggestion, branchName])

  useEffect(() => {
    if (isOpen && issue) {
      checkForExistingSession()
    }
  }, [isOpen, issue])

  useEffect(() => {
    if (sessionId && sessionDetails[sessionId]) {
      const sessionData = sessionDetails[sessionId]
      setSession(sessionData)
      
      if (sessionData.status === 'completed' && sessionData.structured_output?.pr_url && issue) {
        onIssueUpdate?.(issue.id, 'PR Submitted', sessionData.structured_output.pr_url)
      }
    }
  }, [sessionId, sessionDetails, issue])

  useEffect(() => {
    if (issue) {
      setSessionId(null)
      setSession(null)
      setIsPlanApproved(false)
      setIsExecuting(false)
    }
  }, [issue?.id])

  useEffect(() => {
    const handleAutoExecution = async () => {
      if (
        session?.status === 'blocked' &&
        session?.structured_output?.confidence === 'high' &&
        session?.structured_output?.branch_suggestion &&
        !isPlanApproved &&
        !isExecuting &&
        sessionId &&
        issue
      ) {
        const suggestedBranch = session.structured_output.branch_suggestion
        setBranchName(suggestedBranch)
        setTargetBranch('main')
        setIsPlanApproved(true)
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/issues/${issue.id}/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: sessionId,
              branchName: suggestedBranch,
              targetBranch: 'main',
              approved: true
            })
          })

          if (response.ok) {
            toast({
              title: "Auto-Execution Started",
              description: "High confidence plan approved and execution started automatically"
            })
          } else {
            setIsPlanApproved(false)
            toast({
              title: "Auto-execution failed",
              description: "Please approve manually",
              variant: "destructive"
            })
          }
        } catch {
          setIsPlanApproved(false)
          toast({
            title: "Auto-execution failed",
            description: "Please approve manually",
            variant: "destructive"
          })
        }
      }
    }

    handleAutoExecution()
  }, [session?.status, session?.structured_output?.confidence, session?.structured_output?.branch_suggestion, isPlanApproved, isExecuting, sessionId, issue])

  const startScoping = async () => {
    if (!issue) return

    setIsScoping(true)
    setIsPlanApproved(false)
    setShowApprovalDialog(false)
    try {
      const formData = new FormData()
      formData.append('additionalContext', additionalContext)
      
      uploadedFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(`${API_BASE_URL}/api/issues/${issue.id}/scope`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId)
        await fetchSessionDetails(data.sessionId)
        await fetchActiveSessions()
        toast({
          title: "Success",
          description: "Scoping session started"
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.detail || "Failed to start scoping session",
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      })
    } finally {
      setIsScoping(false)
    }
  }


  const sendFollowUp = async () => {
    if (!sessionId || !followUpMessage.trim()) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/devin/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: followUpMessage
        })
      })

      if (response.ok) {
        setFollowUpMessage('')
        toast({
          title: "Message sent successfully",
          description: session?.status === 'running' 
            ? "Your context has been sent to Devin while working"
            : "Your message has been sent to Devin",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to send follow-up",
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to send follow-up",
        variant: "destructive"
      })
    }
  }

  const sendApprovalMessage = async (message: string) => {
    if (!sessionId) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/devin/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Message sent successfully"
        })
        setIsPlanApproved(false)
      } else {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }


  const executePlan = async () => {
    if (!issue || !branchName.trim() || !targetBranch.trim() || !isPlanApproved) {
      if (!isPlanApproved) {
        toast({
          title: "Approval Required",
          description: "Please approve the plan before executing",
          variant: "destructive"
        })
      }
      return
    }

    setIsExecuting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issue.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          branchName,
          targetBranch,
          approved: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId)
        await fetchActiveSessions()
        toast({
          title: "Success",
          description: "Plan execution started"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to execute plan",
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const handleClose = () => {
    setAdditionalContext('')
    setUploadedFiles([])
    setFollowUpMessage('')
    setBranchName('')
    setTargetBranch('main')
    setIsPlanApproved(false)
    setShowApprovalDialog(false)
    setShowRequestChangesDialog(false)
    setShowQuestionDialog(false)
    setRequestChangesMessage('')
    setQuestionMessage('')
    onClose()
  }

  if (!issue) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Issue #{issue.number}: {issue.title}
            <a
              href={repoData ? `${repoData.url}/issues/${issue.number}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </DialogTitle>
          <DialogDescription>
            Created by <a
              href={`https://github.com/${issue.author}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {issue.author}
            </a> • {issue.age_days} days ago
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            {issue.labels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>

          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <div className="bg-gray-50 p-4 rounded-md overflow-y-auto" style={{maxHeight: '500px'}}>
              <div className="prose prose-sm max-w-none prose-img:rounded-lg prose-img:shadow-md">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: (props) => (
                      <img 
                        {...props} 
                        className="max-w-full h-auto rounded-md border border-gray-200 shadow-sm" 
                        style={{maxHeight: '400px', objectFit: 'contain'}} 
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ),
                    a: (props) => (
                      <a {...props} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer" />
                    ),
                    code: (props) => {
                      const {className} = props;
                      const isInline = !className || !className.includes('language-');
                      return isInline ? 
                        <code {...props} className="bg-gray-200 px-1 py-0.5 rounded text-sm" /> :
                        <code {...props} className="block bg-gray-200 p-2 rounded text-sm overflow-x-auto" />
                    }
                  }}
                >
                  {DOMPurify.sanitize(issue.body || 'No description provided')}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {!sessionId && (
            <Card>
              <CardHeader>
                <CardTitle>Scope & Triage</CardTitle>
                <CardDescription>
                  Start a Devin session to analyze this issue and create an implementation plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Upload Files (Optional)</Label>
                  <div className="mt-2">
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".txt,.md,.py,.js,.ts,.jsx,.tsx,.json,.yaml,.yml,.xml,.html,.css,.sql,.sh,.env,.gitignore,.dockerfile,.conf,.ini,.cfg,.log"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        setUploadedFiles(files)
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploadedFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                            <button
                              onClick={() => {
                                const newFiles = uploadedFiles.filter((_, i) => i !== index)
                                setUploadedFiles(newFiles)
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="additional-context">Additional Context (Optional)</Label>
                  <Textarea
                    id="additional-context"
                    placeholder="Provide any additional context or requirements..."
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={startScoping} disabled={isScoping}>
                  {isScoping ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {isScoping ? 'Starting...' : 'Scope & Triage'}
                </Button>
              </CardContent>
            </Card>
          )}

          {session && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    Devin Analysis
                    {isPolling && !isSessionCompleted(session) && session.status !== 'new' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                  </div>
                  <a
                    href={session.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </CardTitle>
                <CardDescription>
                  Status: {session.status}
                  {session.structured_output && (
                    <>
                      {' • '}
                      <span className={`ml-1 font-medium ${getConfidenceColor(session.structured_output.confidence || '')}`}>
                        {session.structured_output.confidence} confidence
                      </span>
                    </>
                  )}
                  {session.structured_output?.pr_url && (
                    <>
                      {' • '}
                      <a
                        href={session.structured_output.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <ExternalLink className="h-3 w-3" />
                        PR
                      </a>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {session.structured_output && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{session.structured_output.progress_pct}%</span>
                      </div>
                      <Progress value={session.structured_output.progress_pct} />
                    </div>

                    <div>
                      <h5 className="font-semibold mb-2">Summary</h5>
                      <p className="text-sm text-gray-700">{session.structured_output.summary}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold mb-2">Risks</h5>
                        <ul className="text-sm space-y-1">
                          {session.structured_output.risks.length > 0 ? (
                            session.structured_output.risks.map((risk, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                {risk}
                              </li>
                            ))
                          ) : (
                            <li className="text-sm text-muted-foreground">No risks identified</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-2">Dependencies</h5>
                        <ul className="text-sm space-y-1">
                          {session.structured_output.dependencies.length > 0 ? (
                            session.structured_output.dependencies.map((dep, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                {dep}
                              </li>
                            ))
                          ) : (
                            <li className="text-sm text-muted-foreground">No dependencies found</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-semibold mb-2">Action Plan</h5>
                      <div className="space-y-2">
                        {session.structured_output?.action_plan.map((step, index) => {
                          const isCurrentStep = !step.done && index === session.structured_output?.action_plan.findIndex(s => !s.done)
                          return (
                            <div key={`action-${step.step}`} className="flex items-start gap-2">
                              {step.done ? (
                                <CheckCircle className="h-4 w-4 mt-1 text-green-500" />
                              ) : isCurrentStep && session.status === 'running' && !isSessionCompleted(session) ? (
                                <Loader2 className="h-4 w-4 mt-1 animate-spin text-blue-600" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mt-1 text-gray-300" />
                              )}
                              <span className={`text-sm ${step.done ? 'line-through text-gray-500' : ''}`}>
                                {step.step}. {step.desc}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {session.status === 'blocked' && !isPlanApproved && session.structured_output?.confidence !== 'high' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <h5 className="font-semibold text-blue-800">Plan Review Required</h5>
                        </div>
                        <p className="text-sm text-blue-700 mb-4">
                          Please review the implementation plan above and choose how to proceed:
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            onClick={() => sendApprovalMessage('APPROVE: proceed with step 1. If risks exist, call them out first.')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve Plan
                          </Button>
                          <Button 
                            onClick={() => setShowRequestChangesDialog(true)}
                            variant="outline"
                            className="border-orange-500 text-orange-700 hover:bg-orange-50"
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Request Changes
                          </Button>
                          <Button 
                            onClick={() => setShowQuestionDialog(true)}
                            variant="outline"
                            className="border-blue-500 text-blue-700 hover:bg-blue-50"
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Ask Question
                          </Button>
                        </div>
                      </div>
                    )}

                    {session.status === 'blocked' && session.structured_output?.confidence === 'high' && !isPlanApproved && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                          <h5 className="font-semibold text-green-800">Auto-Executing High Confidence Plan</h5>
                        </div>
                        <p className="text-sm text-green-700">
                          This plan has high confidence and is being executed automatically. No manual approval required.
                        </p>
                      </div>
                    )}

                    {session.status === 'completed' && !isPlanApproved && !session.structured_output?.pr_url && session.structured_output?.confidence !== 'high' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                          <h5 className="font-semibold text-blue-800">Plan Review Required</h5>
                        </div>
                        <p className="text-sm text-blue-700 mb-4">
                          Please review the implementation plan above. Do you approve this plan for execution?
                        </p>
                        <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
                          <AlertDialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve & Execute Plan
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Plan Execution</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to execute this plan? Devin will create a new branch, implement the changes, and open a pull request.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => {
                                setIsPlanApproved(true)
                                setShowApprovalDialog(false)
                              }}>
                                Yes, Execute Plan
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}

                    {isPlanApproved && !session.structured_output?.pr_url && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Plan Approved - Ready for Execution</span>
                        </div>
                      </div>
                    )}

                    {session.structured_output.pr_url && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h5 className="font-semibold text-green-800">Execution Complete!</h5>
                        </div>
                        <p className="text-sm text-green-700 mb-3">
                          Your pull request has been created successfully.
                        </p>
                        <a
                          href={session.structured_output.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View Pull Request
                        </a>
                      </div>
                    )}

                    {session.structured_output?.pr_url && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Pull Request Created</span>
                          <a
                            href={session.structured_output.pr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View PR
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Follow-up message UI - always available for active sessions */}
                {(session.status === 'running' || session.status === 'blocked') && !isSessionCompleted(session) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">
                          {session.status === 'running' 
                            ? "Devin is actively working on this issue" 
                            : "Devin is waiting for guidance"}
                        </p>
                        <p>
                          You can add additional context, requirements, or guidance at any time using the message box below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="follow-up">Send Follow-up</Label>
                    <Textarea
                      id="follow-up"
                      placeholder={
                        session.status === 'running' 
                          ? "Add context or guidance while Devin is working..." 
                          : session.status === 'blocked'
                          ? "Provide additional context or answer questions..."
                          : "Ask questions or provide additional guidance..."
                      }
                      value={followUpMessage}
                      onChange={(e) => setFollowUpMessage(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button onClick={sendFollowUp} disabled={!followUpMessage.trim()}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>

                    {isPlanApproved && !session.structured_output?.pr_url && (
                      <div className="border-t pt-4">
                        <h5 className="font-semibold mb-2">Execute Plan</h5>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor="branch-name">Branch Name</Label>
                            <Input
                              id="branch-name"
                              value={branchName}
                              onChange={(e) => setBranchName(e.target.value)}
                              placeholder="feat/issue-123-implementation"
                            />
                          </div>
                          <div>
                            <Label htmlFor="target-branch">Target Branch</Label>
                            <Input
                              id="target-branch"
                              value={targetBranch}
                              onChange={(e) => setTargetBranch(e.target.value)}
                              placeholder="main"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={executePlan} disabled={isExecuting || !branchName.trim() || !targetBranch.trim()}>
                            {isExecuting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            {isExecuting ? 'Executing...' : 'Execute Plan'}
                          </Button>
                          <Button variant="outline" onClick={() => setIsPlanApproved(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Request Changes Dialog */}
      <AlertDialog open={showRequestChangesDialog} onOpenChange={setShowRequestChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Provide feedback on what changes you'd like to see in the plan:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describe the changes you'd like to see..."
              value={requestChangesMessage}
              onChange={(e) => setRequestChangesMessage(e.target.value)}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestChangesMessage('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                sendApprovalMessage(`REQUEST CHANGES: ${requestChangesMessage}`)
                setShowRequestChangesDialog(false)
                setRequestChangesMessage('')
              }}
              disabled={!requestChangesMessage.trim()}
            >
              Send Feedback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Question Dialog */}
      <AlertDialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ask Question</AlertDialogTitle>
            <AlertDialogDescription>
              Ask a clarifying question about the implementation plan:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="What would you like to know?"
              value={questionMessage}
              onChange={(e) => setQuestionMessage(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuestionMessage('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                sendApprovalMessage(`QUESTION: ${questionMessage}`)
                setShowQuestionDialog(false)
                setQuestionMessage('')
              }}
              disabled={!questionMessage.trim()}
            >
              Ask Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
