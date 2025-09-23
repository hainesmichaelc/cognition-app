import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeft, Search, RefreshCw, X, ExternalLink, Loader2, CheckCircle, AlertCircle, Clock, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSessionManager } from '@/hooks/useSessionManager'
import IssueDetailModal from './IssueDetailModal'

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


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function IssueDashboard() {
  const { owner, name } = useParams<{ owner: string; name: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { activeSessions, sessionDetails } = useSessionManager()
  
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalIssues, setTotalIssues] = useState(0)
  const [issueUpdates, setIssueUpdates] = useState<Record<number, {status: string, prUrl?: string}>>({})
  const [repoData, setRepoData] = useState<{owner: string, name: string, url: string} | null>(null)
  const pageSize = 20

  useEffect(() => {
    if (owner && name) {
      fetchIssues()
      fetchRepoData()
    }
  }, [owner, name, currentPage, searchQuery, selectedLabel])

  const fetchIssues = useCallback(async () => {
    if (!owner || !name) return
    
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('q', searchQuery)
      if (selectedLabel) params.append('label', selectedLabel)
      params.append('page', currentPage.toString())
      params.append('pageSize', pageSize.toString())
      
      const response = await fetch(`${API_BASE_URL}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues?${params}`)
      if (response.ok) {
        const data = await response.json()
        setIssues(data)
        
        const totalParams = new URLSearchParams()
        if (searchQuery) totalParams.append('q', searchQuery)
        if (selectedLabel) totalParams.append('label', selectedLabel)
        totalParams.append('pageSize', '1000') // Get all issues to count
        
        const totalResponse = await fetch(`${API_BASE_URL}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues?${totalParams}`)
        if (totalResponse.ok) {
          const totalData = await totalResponse.json()
          setTotalIssues(totalData.length)
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch issues",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error)
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [owner, name, currentPage, searchQuery, selectedLabel])

  const fetchRepoData = useCallback(async () => {
    if (!owner || !name) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/repos`)
      if (response.ok) {
        const repos = await response.json()
        const repo = repos.find((r: {id: string, owner: string, name: string, url: string}) => r.id === `${owner}/${name}`)
        if (repo) {
          setRepoData({ owner: repo.owner, name: repo.name, url: repo.url })
        }
      }
    } catch (error) {
      console.error('Failed to fetch repository data:', error)
    }
  }, [owner, name])

  const resyncRepo = async () => {
    if (!owner || !name) return
    
    setSyncing(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/resync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Repository resynced successfully"
        })
        await fetchIssues()
      } else {
        toast({
          title: "Error",
          description: "Failed to resync repository",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to resync repository:', error)
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    setLoading(true)
    fetchIssues()
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedLabel('')
    setCurrentPage(1)
    setLoading(true)
    fetchIssues()
  }

  const handleIssueUpdate = (issueId: number, status: string, prUrl?: string) => {
    setIssueUpdates(prev => ({
      ...prev,
      [issueId]: { status, prUrl }
    }))
  }

  const openIssueDetail = (issue: Issue) => {
    setSelectedIssue(issue)
    setIsModalOpen(true)
  }

  const getAllLabels = () => {
    const labels = new Set<string>()
    issues.forEach(issue => {
      issue.labels.forEach(label => labels.add(label))
    })
    return Array.from(labels)
  }

  const getSessionStatusForIssue = (issueId: number) => {
    const session = activeSessions.find(s => s.issueId === issueId)
    if (!session) return null
    
    const details = sessionDetails[session.sessionId]
    return {
      sessionId: session.sessionId,
      status: session.status,
      details,
      url: details?.url
    }
  }

  const getSessionStatusBadge = (status: string) => {
    switch (status) {
      case 'scoping':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Scoping
          </Badge>
        )
      case 'ready':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Ready for Review
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case 'executing':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <Clock className="mr-1 h-3 w-3" />
            Executing
          </Badge>
        )
      case 'suspended':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Suspended
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading issues...</div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/repos')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Repositories
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Issue Dashboard</h2>
          <p className="text-muted-foreground">
            Manage and triage repository issues
            {activeSessions.length > 0 && (
              <span className="ml-2">
                • <strong>{activeSessions.length}</strong> active session{activeSessions.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <Button onClick={resyncRepo} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Re-sync'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex-1">
              <select
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
              >
                <option value="">All labels</option>
                {getAllLabels().map(label => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issues ({issues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No issues found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session Status</TableHead>
                  <TableHead>Issue Status</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Labels</TableHead>
                  <TableHead>Issue ID</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => {
                  const sessionStatus = getSessionStatusForIssue(issue.id)
                  return (
                    <TableRow key={issue.id}>
                      <TableCell>
                        {sessionStatus ? (
                          <div className="flex items-center gap-2">
                            {getSessionStatusBadge(sessionStatus.status)}
                            {sessionStatus.url && (
                              <a
                                href={sessionStatus.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No session</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {issueUpdates[issue.id] ? (
                          issueUpdates[issue.id].prUrl ? (
                            <a
                              href={issueUpdates[issue.id].prUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1"
                            >
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {issueUpdates[issue.id].status}
                              </Badge>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <Badge variant="secondary">{issueUpdates[issue.id].status}</Badge>
                          )
                        ) : (
                          <Badge variant={issue.status === 'open' ? 'default' : 'secondary'}>
                            {issue.status}
                          </Badge>
                        )}
                      </TableCell>
                    <TableCell>
                      <button
                        className="text-left hover:underline font-medium"
                        onClick={() => openIssueDetail(issue)}
                      >
                        {issue.title}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {issue.labels.slice(0, 3).map((label) => (
                          <Badge key={label} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                        {issue.labels.length > 3 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help">
                                +{issue.labels.length - 3}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs">
                                <p className="font-semibold mb-1">Additional labels:</p>
                                <div className="flex flex-wrap gap-1">
                                  {issue.labels.slice(3).map((label) => (
                                    <Badge key={label} variant="outline" className="text-xs">
                                      {label}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>#{issue.number}</TableCell>
                    <TableCell>
                      <a
                        href={`https://github.com/${issue.author}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {issue.author}
                      </a>
                    </TableCell>
                      <TableCell>{issue.age_days} days</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalIssues > pageSize && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.ceil(totalIssues / pageSize) }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => currentPage < Math.ceil(totalIssues / pageSize) && setCurrentPage(currentPage + 1)}
                className={currentPage >= Math.ceil(totalIssues / pageSize) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <IssueDetailModal
        issue={selectedIssue}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onIssueUpdate={handleIssueUpdate}
        repoData={repoData}
      />
      </div>
    </TooltipProvider>
  )
}
