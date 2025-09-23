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
import { ExternalLink, Play, MessageSquare, CheckCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSessionManager } from '@/hooks/useSessionManager'

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
    estimated_hours: number
    action_plan: Array<{
      step: number
      desc: string
      done: boolean
    }>
    branch_suggestion: string
    pr_url: string
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

export default function IssueDetailModal({ issue, isOpen, onClose, onIssueUpdate, repoData }: IssueDetailModalProps) {
  const [additionalContext, setAdditionalContext] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [session, setSession] = useState<DevinSession | null>(null)
  const [followUpMessage, setFollowUpMessage] = useState('')
  const [branchName, setBranchName] = useState('')
  const [targetBranch, setTargetBranch] = useState('main')
  const [isScoping, setIsScoping] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isPlanApproved, setIsPlanApproved] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const { toast } = useToast()
  const { getIssueSession, fetchSessionDetails, sessionDetails, isPolling } = useSessionManager()

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
  }, [issue, getIssueSession, fetchSessionDetails])

  useEffect(() => {
    if (session?.structured_output?.branch_suggestion && !branchName) {
      setBranchName(session.structured_output.branch_suggestion)
    }
  }, [session?.structured_output?.branch_suggestion, branchName])

  useEffect(() => {
    if (isOpen && issue) {
      checkForExistingSession()
    }
  }, [isOpen, issue, checkForExistingSession])

  useEffect(() => {
    if (sessionId && sessionDetails[sessionId]) {
      const sessionData = sessionDetails[sessionId]
      setSession(sessionData)
      
      if (sessionData.status === 'completed' && sessionData.structured_output?.pr_url && issue) {
        onIssueUpdate?.(issue.id, 'PR Submitted', sessionData.structured_output.pr_url)
      }
    }
  }, [sessionId, sessionDetails, issue, onIssueUpdate])

  const startScoping = async () => {
    if (!issue) return

    setIsScoping(true)
    setIsPlanApproved(false)
    setShowApprovalDialog(false)
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issue.id}/scope`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          additionalContext
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId)
        toast({
          title: "Success",
          description: "Scoping session started"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to start scoping session",
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
          title: "Success",
          description: "Follow-up sent successfully"
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
    setFollowUpMessage('')
    setBranchName('')
    setTargetBranch('main')
    setIsPlanApproved(false)
    setShowApprovalDialog(false)
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
            <div className="bg-gray-50 p-4 rounded-md max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">
                {issue.body || 'No description provided'}
              </pre>
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
                    {isPolling && session.status !== 'completed' && (
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
                  Status: {session.status} • 
                  <span className={`ml-1 font-medium ${getConfidenceColor(session.structured_output?.confidence || '')}`}>
                    {session.structured_output?.confidence} confidence
                  </span>
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
                        {session.structured_output.action_plan.map((step, index) => {
                          const isCurrentStep = !step.done && index === session.structured_output?.action_plan.findIndex(s => !s.done)
                          return (
                            <div key={step.step} className="flex items-start gap-2">
                              {step.done ? (
                                <CheckCircle className="h-4 w-4 mt-1 text-green-500" />
                              ) : isCurrentStep && session.status === 'running' ? (
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

                    {session.status === 'completed' && !isPlanApproved && !session.structured_output?.pr_url && (
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

                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label htmlFor="follow-up">Send Follow-up</Label>
                        <Textarea
                          id="follow-up"
                          placeholder="Ask questions or provide additional guidance..."
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
                  </>
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
    </Dialog>
  )
}
