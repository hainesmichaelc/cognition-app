import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Search, RefreshCw, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
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
  const { repoId } = useParams<{ repoId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (repoId) {
      fetchIssues()
    }
  }, [repoId])

  const fetchIssues = async () => {
    if (!repoId) return
    
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('q', searchQuery)
      if (selectedLabel) params.append('label', selectedLabel)
      
      const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/issues?${params}`)
      if (response.ok) {
        const data = await response.json()
        setIssues(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch issues",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resyncRepo = async () => {
    if (!repoId) return
    
    setSyncing(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/repos/${repoId}/resync`, {
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
    setLoading(true)
    fetchIssues()
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedLabel('')
    setLoading(true)
    fetchIssues()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading issues...</div>
      </div>
    )
  }

  return (
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
                  <TableHead>Status</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Labels</TableHead>
                  <TableHead>Issue ID</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Badge variant={issue.status === 'open' ? 'default' : 'secondary'}>
                        {issue.status}
                      </Badge>
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
                          <Badge variant="outline" className="text-xs">
                            +{issue.labels.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>#{issue.number}</TableCell>
                    <TableCell>{issue.author}</TableCell>
                    <TableCell>{issue.age_days} days</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <IssueDetailModal
        issue={selectedIssue}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
