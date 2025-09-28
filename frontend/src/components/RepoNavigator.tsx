import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Repo {
  id: string
  owner: string
  name: string
  url: string
  connectedAt: string
  openIssuesCount: number
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const validateGitHubUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url.trim()) {
    return { isValid: false, error: "Repository URL is required" }
  }

  try {
    const urlObj = new URL(url)
    
    if (urlObj.protocol !== 'https:') {
      return { isValid: false, error: "Repository URL must use HTTPS protocol" }
    }
    
    if (urlObj.hostname !== 'github.com') {
      return { isValid: false, error: "Only GitHub repositories are supported" }
    }
    
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0)
    if (pathParts.length !== 2) {
      return { isValid: false, error: "Invalid GitHub repository URL format. Expected: https://github.com/owner/repo" }
    }
    
    const [owner, repo] = pathParts
    if (!owner || !repo) {
      return { isValid: false, error: "Repository URL must include both owner and repository name" }
    }
    
    if (url.startsWith('ghp_') || url.startsWith('github_pat_')) {
      return { isValid: false, error: "This appears to be a Personal Access Token, not a repository URL" }
    }
    
    return { isValid: true }
  } catch {
    return { isValid: false, error: "Invalid URL format. Please enter a valid GitHub repository URL" }
  }
}

export default function RepoNavigator() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [githubPat, setGithubPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    fetchRepos()
  }, [])

  const fetchRepos = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/repos`)
      if (response.ok) {
        const data = await response.json()
        setRepos(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch repositories",
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
      setLoading(false)
    }
  }

  const connectRepo = async () => {
    if (!repoUrl || !githubPat) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    const urlValidation = validateGitHubUrl(repoUrl)
    if (!urlValidation.isValid) {
      toast({
        title: "Invalid Repository URL",
        description: urlValidation.error,
        variant: "destructive"
      })
      return
    }

    setConnecting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/repos/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl,
          githubPat
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: "Repository connected successfully"
        })
        setIsConnectModalOpen(false)
        setRepoUrl('')
        setGithubPat('')
        await fetchRepos()
        navigate(`/repos/${encodeURIComponent(data.owner)}/${encodeURIComponent(data.name)}/issues`)
      } else {
        try {
          const error = await response.json()
          toast({
            title: "Error",
            description: error.detail || "Failed to connect repository",
            variant: "destructive"
          })
        } catch {
          toast({
            title: "Error",
            description: `Failed to connect repository (${response.status})`,
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to backend. Please check your internet connection and try again.",
        variant: "destructive"
      })
    }finally {
      setConnecting(false)
    }
  }

  const deleteRepo = async (repoId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/repos/${encodeURIComponent(repoId.split('/')[0])}/${encodeURIComponent(repoId.split('/')[1])}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Repository deleted successfully"
        })
        await fetchRepos()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete repository",
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading repositories...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Repository Navigator</h2>
          <p className="text-muted-foreground">
            Connect and manage your GitHub repositories
          </p>
        </div>
        <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Connect Repository
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Connect Repository</DialogTitle>
              <DialogDescription>
                Enter the GitHub repository URL and your Personal Access Token
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="repo-url">Repository URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="github-pat">GitHub Personal Access Token</Label>
                <div className="relative">
                  <Input
                    id="github-pat"
                    type={showPat ? "text" : "password"}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={githubPat}
                    onChange={(e) => setGithubPat(e.target.value)}
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPat(!showPat)}
                  >
                    {showPat ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={connectRepo}
                disabled={connecting}
              >
                {connecting ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {repos.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto max-w-sm">
              <h3 className="text-lg font-semibold">No repositories connected</h3>
              <p className="text-muted-foreground mt-2">
                Connect your first GitHub repository to get started with issue automation
              </p>
              <Button
                className="mt-4"
                onClick={() => setIsConnectModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Connect Repository
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Open Issues</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repos.map((repo) => (
                <TableRow key={repo.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <button
                      className="text-left hover:underline"
                      onClick={() => navigate(`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/issues`)}
                    >
                      {repo.owner}/{repo.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on GitHub
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {repo.openIssuesCount} issues
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(repo.connectedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRepo(repo.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
