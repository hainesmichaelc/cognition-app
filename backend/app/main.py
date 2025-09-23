from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import httpx
from dotenv import load_dotenv
import os
from urllib.parse import unquote

load_dotenv()

app = FastAPI(title="Cognition App API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.on_event("startup")
async def startup_event():
    """Run cleanup on startup"""
    cleanup_old_sessions()

repos_store: Dict[str, Dict] = {}
issues_store: Dict[str, List[Dict]] = {}
pr_creation_store: Dict[str, Dict[str, Any]] = {}
sessions_store: Dict[str, Dict[str, Any]] = {}

if os.getenv("LOAD_TEST_DATA", "false").lower() == "true":
    test_repo_id = "testuser/test-repo"
    repos_store[test_repo_id] = {
        "id": test_repo_id,
        "owner": "testuser",
        "name": "test-repo",
        "url": "https://github.com/testuser/test-repo",
        "connectedAt": datetime.now(),
        "openIssuesCount": 25,
        "githubPat": "test_token",
    }

    test_issues = []
    
    test_scenarios = [
        {"count": 10, "type": "standard", "status": "open"},
        {"count": 3, "type": "long_content", "status": "open"},
        {"count": 2, "type": "no_labels", "status": "open"},
        {"count": 2, "type": "many_labels", "status": "open"},
        {"count": 3, "type": "closed", "status": "closed"},
        {"count": 2, "type": "old_issues", "status": "open"},
        {"count": 3, "type": "recent_issues", "status": "open"}
    ]
    
    issue_id = 1000
    for scenario in test_scenarios:
        for i in range(scenario["count"]):
            labels = []
            title = ""
            body = ""
            age_days = i
            
            if scenario["type"] == "standard":
                if i % 3 == 0:
                    labels = ["bug", "high-priority", "frontend", "ui",
                              "critical"]
                elif i % 3 == 1:
                    labels = ["feature", "enhancement"]
                else:
                    labels = ["documentation", "help-wanted",
                              "good-first-issue", "backend", "api",
                              "database"]
                title = (f"Test Issue #{issue_id - 999}: Sample issue for "
                         f"testing dashboard functionality")
                body = (f"This is a test issue body for issue "
                        f"#{issue_id - 999}. It contains sample content "
                        f"for testing the Issue Dashboard.")
            
            elif scenario["type"] == "long_content":
                labels = ["bug", "ui", "overflow-test"]
                title = (f"Very Long Issue Title That Should Test UI "
                         f"Overflow Handling And Responsive Design In The "
                         f"Dashboard Component #{issue_id - 999}")
                body = ("This is an extremely long issue body that "
                        "contains multiple paragraphs and extensive "
                        "content to test how the dashboard handles "
                        "overflow, truncation, and responsive design. "
                        * 10)
            
            elif scenario["type"] == "no_labels":
                labels = []
                title = f"Issue Without Labels #{issue_id - 999}"
                body = "This issue has no labels to test empty label handling."
            
            elif scenario["type"] == "many_labels":
                labels = ["bug", "feature", "enhancement", "documentation",
                          "help-wanted", "good-first-issue", "backend",
                          "frontend", "api", "database", "ui", "critical",
                          "high-priority", "low-priority", "wontfix",
                          "duplicate"]
                title = f"Issue With Many Labels #{issue_id - 999}"
                body = ("This issue has many labels to test label overflow "
                        "and tooltip functionality.")
            
            elif scenario["type"] == "closed":
                labels = ["bug", "fixed"]
                title = f"Closed Issue #{issue_id - 999}"
                body = "This is a closed issue to test status filtering."
            
            elif scenario["type"] == "old_issues":
                labels = ["legacy", "technical-debt"]
                title = f"Old Issue #{issue_id - 999}"
                body = "This is an old issue to test age-based sorting."
                age_days = 365 + i * 30
            
            elif scenario["type"] == "recent_issues":
                labels = ["new", "urgent"]
                title = f"Recent Issue #{issue_id - 999}"
                body = "This is a recent issue to test recent sorting."
                age_days = i
            
            test_issues.append({
                "id": issue_id,
                "title": title,
                "body": body,
                "labels": labels,
                "number": issue_id - 999,
                "author": f"user{(issue_id % 5) + 1}",
                "created_at": datetime.now() - timedelta(days=age_days),
                "age_days": age_days,
                "status": scenario["status"],
            })
            issue_id += 1

    issues_store[test_repo_id] = test_issues
    
    print(f"✅ Loaded {len(test_issues)} test issues for {test_repo_id}")
    print(f"   - Issues with labels: "
          f"{len([i for i in test_issues if i['labels']])}")
    print(f"   - Issues without labels: "
          f"{len([i for i in test_issues if not i['labels']])}")
    print(f"   - Open issues: "
          f"{len([i for i in test_issues if i['status'] == 'open'])}")
    print(f"   - Closed issues: "
          f"{len([i for i in test_issues if i['status'] == 'closed'])}")
    print(f"   - Age range: {min(i['age_days'] for i in test_issues)} to "
          f"{max(i['age_days'] for i in test_issues)} days")
    
    repos_store[test_repo_id]["openIssuesCount"] = len([
        i for i in test_issues if i['status'] == 'open'
    ])


class ConnectRepoRequest(BaseModel):
    repoUrl: HttpUrl
    githubPat: str


class ResyncRequest(BaseModel):
    pass


class ScopeRequest(BaseModel):
    additionalContext: Optional[str] = ""


class MessageRequest(BaseModel):
    message: str


class ExecuteRequest(BaseModel):
    sessionId: str
    branchName: str
    targetBranch: str = "main"
    approved: bool = False


class RepoResponse(BaseModel):
    id: str
    owner: str
    name: str
    url: str
    connectedAt: datetime
    openIssuesCount: int


class IssueResponse(BaseModel):
    id: int
    title: str
    body: str
    labels: List[str]
    number: int
    author: str
    created_at: datetime
    age_days: int
    status: str = "open"


class PRCreationRequest(BaseModel):
    title: str
    body: str
    head: str
    base: str
    issue_number: int


class PRResponse(BaseModel):
    url: str
    number: int
    created: bool = True


class DevinSessionResponse(BaseModel):
    status: str
    structured_output: Optional[Dict[str, Any]] = None
    url: str


class SessionMetadata(BaseModel):
    issue_id: int
    repo_id: str
    created_at: datetime
    last_accessed: datetime
    status: str


class ActiveSessionResponse(BaseModel):
    session_id: str
    issue_id: int
    repo_id: str
    issue_title: str
    repo_name: str
    status: str
    created_at: datetime
    last_accessed: datetime


class DevinAPIService:
    def __init__(self):
        self.api_key = os.getenv("DEVIN_API_KEY")
        self.base_url = "https://api.devin.ai"
        if not self.api_key:
            raise ValueError("DEVIN_API_KEY environment variable is required")

    def _read_readme_content(self) -> str:
        """Read all README.md files found in the codebase"""
        readme_content = "\n\n## CODEBASE DOCUMENTATION\n\n"

        try:
            current_dir = os.path.dirname(__file__)
            repo_root = current_dir
            while repo_root != os.path.dirname(repo_root):
                if (os.path.exists(os.path.join(repo_root, '.git')) or
                        os.path.exists(os.path.join(repo_root,
                                                    'package.json')) or
                        os.path.exists(os.path.join(repo_root,
                                                    'pyproject.toml'))):
                    break
                repo_root = os.path.dirname(repo_root)

            readme_files = []
            for root, dirs, files in os.walk(repo_root):
                dirs[:] = [d for d in dirs if d not in {
                    '.git', 'node_modules', '__pycache__', '.pytest_cache',
                    'dist', 'build', '.venv', 'venv', '.mypy_cache'
                }]
                for file in files:
                    if file.lower() == 'readme.md':
                        readme_files.append(os.path.join(root, file))

            readme_files.sort()

            for readme_path in readme_files:
                try:
                    with open(readme_path, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                    if content:  # Only include non-empty README files
                        rel_path = os.path.relpath(readme_path, repo_root)
                        section_name = self._get_readme_section_name(rel_path)
                        readme_content += f"### {section_name}\n\n"
                        readme_content += content + "\n\n"
                except Exception:
                    continue

            if len(readme_files) == 0:
                readme_content += ("### No Documentation Found\n\n"
                                   "No README.md files found in codebase.\n\n")

        except Exception:
            readme_content += ("### Documentation Error\n\n"
                               "Unable to read README files.\n\n")

        return readme_content

    def _get_readme_section_name(self, rel_path: str) -> str:
        """Generate a descriptive section name from README file path"""
        if rel_path == 'README.md':
            return "Project Overview"
        dir_name = os.path.dirname(rel_path)
        if not dir_name or dir_name == '.':
            return "Root Documentation"
        parts = dir_name.split(os.sep)
        section_parts = []
        for part in parts:
            if part in {'frontend', 'client', 'ui', 'web'}:
                section_parts.append("Frontend")
            elif part in {'backend', 'server', 'api'}:
                section_parts.append("Backend")
            elif part in {'docs', 'documentation'}:
                section_parts.append("Documentation")
            else:
                clean_part = part.replace('-', ' ').replace('_', ' ')
                section_parts.append(clean_part.title())
        return " - ".join(section_parts) + " Documentation"

    async def create_session(self, prompt: str,
                             wait_for_approval: bool = True) -> Dict[str, Any]:
        """Create a new Devin session with structured output enabled"""
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "prompt": prompt,
                "unlisted": True,
                "wait_for_approval": wait_for_approval
            }

            response = await client.post(
                f"{self.base_url}/v1/sessions",
                headers=headers,
                json=payload,
                timeout=30.0
            )

            if response.status_code != 200:
                error_msg = (f"Failed to create Devin session: "
                             f"{response.status_code}")
                if response.text and self.api_key not in response.text:
                    error_msg += f" - {response.text}"
                raise HTTPException(status_code=500, detail=error_msg)

            return response.json()

    async def get_session(self, session_id: str) -> Dict[str, Any]:
        """Retrieve session details including structured output"""
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }

            response = await client.get(
                f"{self.base_url}/v1/sessions/{session_id}",
                headers=headers,
                timeout=30.0
            )

            if response.status_code == 404:
                raise HTTPException(status_code=404,
                                    detail="Session not found")
            elif response.status_code != 200:
                error_msg = (f"Failed to retrieve Devin session: "
                             f"{response.status_code}")
                if response.text and self.api_key not in response.text:
                    error_msg += f" - {response.text}"
                raise HTTPException(status_code=500, detail=error_msg)

            return response.json()

    async def send_message(self, session_id: str,
                           message: str) -> Dict[str, Any]:
        """Send a message to an existing Devin session"""
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "message": message
            }

            response = await client.post(
                f"{self.base_url}/v1/sessions/{session_id}/message",
                headers=headers,
                json=payload,
                timeout=30.0
            )

            if response.status_code == 404:
                raise HTTPException(status_code=404,
                                    detail="Session not found")
            elif response.status_code != 200:
                error_msg = (f"Failed to send message to Devin session: "
                             f"{response.status_code}")
                if response.text and self.api_key not in response.text:
                    error_msg += f" - {response.text}"
                raise HTTPException(status_code=500, detail=error_msg)

            return response.json()


devin_api = DevinAPIService()


async def fetch_all_github_issues(
    client: httpx.AsyncClient, headers: dict, owner: str, name: str
) -> List[dict]:
    """Fetch all open issues from GitHub API using pagination"""
    all_issues = []
    page = 1

    while True:
        response = await client.get(
            f"https://api.github.com/repos/{owner}/{name}/issues",
            headers=headers,
            params={"state": "open", "per_page": 100, "page": page},
        )

        if response.status_code == 403:
            raise HTTPException(
                status_code=400,
                detail="GitHub API rate limit exceeded or insufficient "
                       "permissions"
            )
        elif response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to fetch repository issues"
            )

        issues_data = response.json()

        if len(issues_data) == 0:
            break

        all_issues.extend(issues_data)

        if len(issues_data) < 100:
            break

        page += 1

    return all_issues


async def create_github_pr(
    owner: str, name: str, github_pat: str, pr_data: PRCreationRequest
) -> PRResponse:
    """Create a pull request via GitHub API with automatic issue linking"""
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"token {github_pat}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Cognition-App/1.0",
        }

        pr_body = f"{pr_data.body}\n\nCloses #{pr_data.issue_number}"

        payload = {
            "title": pr_data.title,
            "body": pr_body,
            "head": pr_data.head,
            "base": pr_data.base
        }

        response = await client.post(
            f"https://api.github.com/repos/{owner}/{name}/pulls",
            headers=headers,
            json=payload
        )

        if response.status_code == 401:
            raise HTTPException(status_code=400,
                                detail="Invalid GitHub Personal Access Token")
        elif response.status_code == 403:
            raise HTTPException(status_code=400,
                                detail="GitHub API rate limit exceeded or "
                                       "insufficient permissions")
        elif response.status_code == 422:
            raise HTTPException(status_code=400,
                                detail="Pull request creation failed - "
                                       "check branch names and repository "
                                       "state")
        elif response.status_code != 201:
            raise HTTPException(status_code=400,
                                detail="Failed to create pull request")

        pr_response = response.json()
        return PRResponse(
            url=pr_response["html_url"],
            number=pr_response["number"]
        )


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/api/repos/connect", response_model=Dict[str, str])
async def connect_repo(request: ConnectRepoRequest):
    try:
        url_str = str(request.repoUrl)
        if not url_str.startswith("https://github.com/"):
            raise HTTPException(
                status_code=400,
                detail="Only GitHub repositories are supported"
            )

        parts = (url_str.replace("https://github.com/", "")
                 .strip("/").split("/"))
        if len(parts) != 2:
            raise HTTPException(
                status_code=400, detail="Invalid repository URL format"
            )

        owner, name = parts
        repo_id = f"{owner}/{name}"

        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"token {request.githubPat}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Cognition-App/1.0",
            }

            repo_response = await client.get(
                f"https://api.github.com/repos/{owner}/{name}",
                headers=headers
            )

            if repo_response.status_code == 401:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid GitHub Personal Access Token"
                )
            elif repo_response.status_code == 403:
                raise HTTPException(
                    status_code=400,
                    detail="GitHub API rate limit exceeded or insufficient "
                           "permissions",
                )
            elif repo_response.status_code == 404:
                raise HTTPException(
                    status_code=400,
                    detail="Repository not found or you don't have access "
                           "to it",
                )
            elif repo_response.status_code != 200:
                raise HTTPException(
                    status_code=400, detail="Failed to access repository"
                )

            repo_data = repo_response.json()

            if not repo_data.get("permissions"):
                raise HTTPException(
                    status_code=400,
                    detail="GitHub Personal Access Token lacks 'repo' scope. "
                           "Please create a new token with 'repo' "
                           "permissions.",
                )

            permissions = repo_data.get("permissions", {})
            if not permissions.get("push", False):
                raise HTTPException(
                    status_code=400,
                    detail="You don't have push access to this repository. "
                           "Push access is required to open pull requests.",
                )

            issues_data = await fetch_all_github_issues(
                client, headers, owner, name
            )

            processed_issues = []
            for issue in issues_data:
                if "pull_request" not in issue:  # Skip PRs
                    age_days = (
                        datetime.now(timezone.utc)
                        - datetime.fromisoformat(
                            issue["created_at"].replace("Z", "+00:00")
                        )
                    ).days
                    processed_issues.append(
                        {
                            "id": issue["id"],
                            "title": issue["title"],
                            "body": issue["body"] or "",
                            "labels": [label["name"] for label in
                                       issue["labels"]],
                            "number": issue["number"],
                            "author": issue["user"]["login"],
                            "created_at": datetime.fromisoformat(
                                issue["created_at"].replace("Z", "+00:00")
                            ),
                            "age_days": age_days,
                            "status": "open",
                        }
                    )

            repos_store[repo_id] = {
                "id": repo_id,
                "owner": owner,
                "name": name,
                "url": url_str,
                "connectedAt": datetime.now(),
                "openIssuesCount": len(processed_issues),
                "githubPat": request.githubPat,  # Store PAT for future
                # API calls
            }

            issues_store[repo_id] = processed_issues

            return {"id": repo_id,
                    "owner": owner,
                    "name": name,
                    "message": "Repository connected successfully"}

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=500,
            detail="Failed to connect to GitHub API - network error"
        )
    except Exception as e:
        error_msg = str(e)
        if request.githubPat in error_msg:
            error_msg = error_msg.replace(request.githubPat, "[REDACTED]")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {error_msg}"
        )


@app.get("/api/repos", response_model=List[RepoResponse])
async def list_repos():
    repos = []
    for repo_id, repo_data in repos_store.items():
        safe_repo_data = {k: v for k, v in repo_data.items()
                          if k != "githubPat"}
        repos.append(
            RepoResponse(
                id=safe_repo_data["id"],
                owner=safe_repo_data["owner"],
                name=safe_repo_data["name"],
                url=safe_repo_data["url"],
                connectedAt=safe_repo_data["connectedAt"],
                openIssuesCount=safe_repo_data["openIssuesCount"],
            )
        )
    return repos


@app.delete("/api/repos/{owner}/{name}")
async def delete_repo(owner: str, name: str):
    repo_id = f"{unquote(owner)}/{unquote(name)}"
    if repo_id not in repos_store:
        raise HTTPException(status_code=404, detail="Repository not found")

    del repos_store[repo_id]
    if repo_id in issues_store:
        del issues_store[repo_id]

    return {"message": "Repository deleted successfully"}


@app.post("/api/repos/{owner}/{name}/resync")
async def resync_repo(owner: str, name: str, request: ResyncRequest):
    repo_id = f"{unquote(owner)}/{unquote(name)}"
    if repo_id not in repos_store:
        raise HTTPException(status_code=404, detail="Repository not found")

    try:
        repo_data = repos_store[repo_id]
        github_pat = repo_data["githubPat"]
        owner = repo_data["owner"]
        name = repo_data["name"]

        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"token {github_pat}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Cognition-App/1.0",
            }

            issues_data = await fetch_all_github_issues(
                client, headers, owner, name
            )

            processed_issues = []
            for issue in issues_data:
                if "pull_request" not in issue:  # Skip PRs
                    age_days = (
                        datetime.now(timezone.utc)
                        - datetime.fromisoformat(
                            issue["created_at"].replace("Z", "+00:00")
                        )
                    ).days
                    processed_issues.append(
                        {
                            "id": issue["id"],
                            "title": issue["title"],
                            "body": issue["body"] or "",
                            "labels": [label["name"] for label in
                                       issue["labels"]],
                            "number": issue["number"],
                            "author": issue["user"]["login"],
                            "created_at": datetime.fromisoformat(
                                issue["created_at"].replace("Z", "+00:00")
                            ),
                            "age_days": age_days,
                            "status": "open",
                        }
                    )

            issues_store[repo_id] = processed_issues
            repos_store[repo_id]["openIssuesCount"] = len(processed_issues)

            return {
                "message": "Repository resynced successfully",
                "issuesCount": len(processed_issues),
            }

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=500,
            detail="Failed to connect to GitHub API - network error"
        )
    except Exception as e:
        error_msg = str(e)
        if github_pat in error_msg:
            error_msg = error_msg.replace(github_pat, "[REDACTED]")
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred"
        )


@app.get("/api/repos/{owner}/{name}/issues",
         response_model=List[IssueResponse])
async def get_issues(
    owner: str,
    name: str,
    q: Optional[str] = None,
    label: Optional[str] = None,
    page: int = 1,
    pageSize: int = 20,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
):
    repo_id = f"{unquote(owner)}/{unquote(name)}"
    if repo_id not in issues_store:
        raise HTTPException(status_code=404, detail="Repository not found")

    issues = issues_store[repo_id]

    valid_sort_fields = ["created_at", "age_days", "title", "number"]
    if sort_by not in valid_sort_fields:
        sort_by = "created_at"
    
    reverse_order = bool(sort_order and sort_order.lower() == "desc")
    
    if sort_by == "created_at":
        issues = sorted(issues, key=lambda x: x["created_at"], reverse=reverse_order)
    elif sort_by == "age_days":
        issues = sorted(issues, key=lambda x: x["age_days"], reverse=reverse_order)
    elif sort_by == "title":
        issues = sorted(issues, key=lambda x: x["title"].lower(), reverse=reverse_order)
    elif sort_by == "number":
        issues = sorted(issues, key=lambda x: x["number"], reverse=reverse_order)

    if q:
        issues = [issue for issue in issues
                  if q.lower() in issue["title"].lower()]

    if label:
        issues = [issue for issue in issues if label in issue["labels"]]

    start = (page - 1) * pageSize
    end = start + pageSize

    return [
        IssueResponse(
            id=issue["id"],
            title=issue["title"],
            body=issue["body"],
            labels=issue["labels"],  # Return all labels for tooltip
            number=issue["number"],
            author=issue["author"],
            created_at=issue["created_at"],
            age_days=issue["age_days"],
            status=issue["status"],
        )
        for issue in issues[start:end]
    ]


@app.post("/api/issues/{issue_id}/scope")
async def scope_issue(
    issue_id: int,
    additionalContext: str = "",
    files: List[UploadFile] = File(default=[])
):
    issue_data = None
    repo_data = None
    repo_id = None

    for current_repo_id, issues in issues_store.items():
        for issue in issues:
            if issue["id"] == issue_id:
                issue_data = issue
                repo_data = repos_store[current_repo_id]
                repo_id = current_repo_id
                break
        if issue_data:
            break

    if not issue_data or not repo_data:
        raise HTTPException(status_code=404, detail="Issue not found")

    repo_url = repo_data["url"]
    issue_title = issue_data["title"]
    issue_number = issue_data["number"]
    issue_body = issue_data["body"]
    issue_url = f"{repo_url}/issues/{issue_number}"
    additional_context = additionalContext or "none"

    file_contents = ""
    if files:
        file_contents = "\n\n## UPLOADED FILES\n\n"
        for file in files:
            if file.size and file.size > 10 * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} exceeds 10MB limit"
                )

            allowed_extensions = {
                '.txt', '.md', '.py', '.js', '.ts', '.jsx', '.tsx',
                '.json', '.yaml', '.yml', '.xml', '.html', '.css',
                '.sql', '.sh', '.env', '.gitignore', '.dockerfile',
                '.conf', '.ini', '.cfg', '.log'
            }
            file_ext = os.path.splitext(file.filename or "")[1].lower()
            filename_lower = (file.filename or "").lower()
            if (file_ext not in allowed_extensions and
                    not filename_lower.startswith('readme')):
                raise HTTPException(
                    status_code=400,
                    detail=f"File type {file_ext} not supported. "
                           f"Only text-based files are allowed."
                )

            try:
                content = await file.read()
                decoded_content = content.decode('utf-8')
                file_contents += (
                    f"### {file.filename}\n\n```\n{decoded_content}\n```\n\n"
                )
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} is not a valid text file"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error reading file {file.filename}: {str(e)}"
                )

    combined_context = additional_context
    if file_contents:
        combined_context += file_contents

    scoping_prompt = f"""First, read the repo context and propose a numbered \
implementation plan. Then **STOP and wait** for my explicit approval. Do **not** \
make code changes or run commands until I reply with `APPROVE:`. If you need \
clarification, ask one concise question and wait.

You are Devin in PLANNING PHASE ONLY. Your job is to \
analyze this GitHub issue for feasibility and create a detailed \
implementation \
plan for human review and approval.

IMPORTANT: This is a scoping session, NOT implementation. Do NOT make any \
code \
changes, create branches, or implement anything. Your role is strictly to \
analyze and plan.

To understand the codebase architecture and context, please read all \
README.md \
files present in the repository. Start by reading the main README.md in the \
root, then explore any README.md files in subdirectories (like backend/, \
frontend/, docs/, etc.) to get comprehensive context about the project \
structure, technology stack, and development workflow.

Repo: {repo_url}
Issue: {issue_title} (#{issue_number})
Issue URL: {issue_url}
Issue Body:
{issue_body}

Additional context from developer:
{combined_context}

Please produce and keep updated a Structured Output JSON with the \
following schema:
{{
  "progress_pct": 100,
  "confidence": "low|medium|high",
  "status": "scoping",
  "summary": "one-paragraph implementation plan",
  "risks": ["list of potential risks"],
  "dependencies": ["list of dependencies"],
  "estimated_hours": <number>,
  "action_plan": [{{"step":1,"desc":"detailed implementation step",\
"done":false}}],
  "branch_suggestion": "feat/issue-{issue_number}-<slug>"
}}

Status transitions:
- Use "scoping" while actively analyzing and creating the plan
- Change to "blocked" when your plan is complete and ready for human review/approval
- Use "executing" during implementation phase  
- Use "completed" when finished

IMPORTANT: Set status to "blocked" when you finish your analysis and plan (progress_pct: 100) to trigger the approval workflow in the UI.

Guidelines:
- PLANNING PHASE ONLY - Do NOT implement anything
- Do NOT make code changes, create branches, or open PRs
- Focus on thorough analysis and detailed planning
- Include architecture considerations and test strategy
- Set progress_pct to 100 when planning is complete
- When your plan is complete and ready for review, set status to "blocked" to enable the approval workflow
- Keep Structured Output updated as you refine the plan"""

    try:
        session_response = await devin_api.create_session(
            scoping_prompt, wait_for_approval=True)
        session_id = session_response.get("session_id")

        if not session_id:
            raise HTTPException(
                status_code=500,
                detail="Failed to get session ID from Devin API"
            )

        sessions_store[session_id] = {
            "issue_id": issue_id,
            "repo_id": repo_id,
            "created_at": datetime.now(timezone.utc),
            "last_accessed": datetime.now(timezone.utc),
            "status": "scoping"
        }

        return {"sessionId": session_id}

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if devin_api.api_key and devin_api.api_key in error_msg:
            error_msg = error_msg.replace(devin_api.api_key, "[REDACTED]")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Devin session: {error_msg}"
        )


@app.get("/api/devin/{session_id}", response_model=DevinSessionResponse)
async def get_devin_session(session_id: str):
    try:
        session_data = await devin_api.get_session(session_id)

        status = session_data.get("status", "unknown")
        structured_output = session_data.get("structured_output")
        clean_session_id = session_id.removeprefix("devin-")
        url = session_data.get(
            "url", f"https://app.devin.ai/sessions/{clean_session_id}"
        )

        if session_id in sessions_store:
            sessions_store[session_id]["last_accessed"] = datetime.now(
                timezone.utc)
            sessions_store[session_id]["status"] = status

        if (status == "completed" and
            session_id in pr_creation_store and
                not pr_creation_store[session_id]["pr_created"]):

            try:
                pr_metadata = pr_creation_store[session_id]
                repo_data = pr_metadata["repo_data"]

                issue_num = pr_metadata['issue_number']
                branch_name = pr_metadata['branch_name']
                target_branch = pr_metadata['target_branch']

                pr_request = PRCreationRequest(
                    title=f"Fix issue #{issue_num}: Implementation via "
                          f"Devin AI",
                    body=f"This PR implements the solution for issue "
                         f"#{issue_num} as planned and executed by Devin AI."
                         f"\n\n**Branch**: {branch_name}\n**Target**: "
                         f"{target_branch}",
                    head=branch_name,
                    base=target_branch,
                    issue_number=issue_num
                )

                pr_response = await create_github_pr(
                    repo_data["owner"],
                    repo_data["name"],
                    repo_data["githubPat"],
                    pr_request
                )

                if structured_output:
                    structured_output["pr_url"] = pr_response.url
                else:
                    structured_output = {"pr_url": pr_response.url}

                pr_creation_store[session_id]["pr_created"] = True

            except Exception as e:
                print(f"Failed to create PR for session {session_id}: "
                      f"{str(e)}")

        return DevinSessionResponse(
            status=status,
            structured_output=structured_output,
            url=url,
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if devin_api.api_key and devin_api.api_key in error_msg:
            error_msg = error_msg.replace(devin_api.api_key, "[REDACTED]")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve Devin session: {error_msg}"
        )


@app.post("/api/devin/{session_id}/message")
async def send_message_to_devin(session_id: str, request: MessageRequest):
    follow_up_prompt = f"""Apply these follow-up instructions to the \
existing plan:
{request.message}

If you need additional codebase context, please read the relevant README.md \
files in the repository to understand the project structure and architecture.

Then update the Structured Output JSON accordingly (plan steps, risks, \
estimates, confidence, progress_pct)."""

    try:
        await devin_api.send_message(session_id, follow_up_prompt)
        return {"message": "Follow-up sent successfully"}

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if devin_api.api_key and devin_api.api_key in error_msg:
            error_msg = error_msg.replace(devin_api.api_key, "[REDACTED]")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send message to Devin session: "
                   f"{error_msg}"
        )


@app.post("/api/issues/{issue_id}/execute")
async def execute_plan(issue_id: int, request: ExecuteRequest):
    if not request.approved:
        raise HTTPException(
            status_code=400,
            detail="Plan must be explicitly approved before execution"
        )
    issue_data = None
    repo_data = None

    for repo_id, issues in issues_store.items():
        for issue in issues:
            if issue["id"] == issue_id:
                issue_data = issue
                repo_data = repos_store[repo_id]
                break
        if issue_data:
            break

    if not issue_data or not repo_data:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue_number = issue_data["number"]

    execution_prompt = f"""Execute the approved plan for the same issue.

If you need codebase context during implementation, please read the README.md \
files in the repository to understand the project structure, development \
workflow, and deployment processes.

Requirements:
- Create a new branch named: {request.branchName} from \
{request.targetBranch}.
- Implement the change set per the plan; write/adjust tests; run locally \
and capture screenshots if relevant.
- Open a PR back to {request.targetBranch} with a detailed description \
following our PR template (devin_pr_template.md), including:
  - Summary of changes
  - Evidence: passing tests summary, and screenshots if UI
  - Manual test plan / reproducible steps
  - Checklist
  - **IMPORTANT**: Include "Closes #{issue_number}" in the PR description \
to automatically link and close the issue when merged

Provide the created PR URL in your final message and set Structured Output:
{{
  "progress_pct": 100,
  "confidence": "<final assessment>",
  "status": "completed",
  "summary": "Implemented",
  "risks": ["any implementation risks encountered"],
  "dependencies": ["dependencies used"],
  "action_plan": [... with done=true],
  "branch_suggestion": "feat/issue-{issue_number}-<slug>",
  "pr_url": "<url>"
}}

Status should be "executing" during implementation and "completed" when finished with PR created."""

    try:
        await devin_api.send_message(request.sessionId, execution_prompt)

        pr_creation_store[request.sessionId] = {
            "issue_id": issue_id,
            "issue_number": issue_number,
            "repo_data": repo_data,
            "branch_name": request.branchName,
            "target_branch": request.targetBranch,
            "pr_created": False
        }

        if request.sessionId in sessions_store:
            sessions_store[request.sessionId]["status"] = "executing"
            sessions_store[request.sessionId]["last_accessed"] = datetime.now(
                timezone.utc)

        return {
            "sessionId": request.sessionId,
            "message": "Execution started",
            "branchName": request.branchName,
            "targetBranch": request.targetBranch,
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if devin_api.api_key and devin_api.api_key in error_msg:
            error_msg = error_msg.replace(devin_api.api_key, "[REDACTED]")
        raise HTTPException(
            status_code=500, detail=f"Failed to execute plan: {error_msg}"
        )


@app.get("/api/issues/{issue_id}/session")
async def get_issue_session(issue_id: int):
    """Get active session for a specific issue"""
    for session_id, session_data in sessions_store.items():
        if (session_data["issue_id"] == issue_id and
                session_data["status"] not in ["completed", "failed"]):
            return {"sessionId": session_id, "status": session_data["status"]}

    return {"sessionId": None, "status": None}


@app.get("/api/sessions/active", response_model=List[ActiveSessionResponse])
async def get_active_sessions():
    """Get all active sessions across all issues"""
    active_sessions = []

    for session_id, session_data in sessions_store.items():
        if session_data["status"] not in ["completed", "failed"]:
            issue_data = None
            repo_data = None

            for repo_id, issues in issues_store.items():
                for issue in issues:
                    if issue["id"] == session_data["issue_id"]:
                        issue_data = issue
                        repo_data = repos_store[repo_id]
                        break
                if issue_data:
                    break

            if issue_data and repo_data:
                active_sessions.append(ActiveSessionResponse(
                    session_id=session_id,
                    issue_id=session_data["issue_id"],
                    repo_id=session_data["repo_id"],
                    issue_title=issue_data["title"],
                    repo_name=repo_data["name"],
                    status=session_data["status"],
                    created_at=session_data["created_at"],
                    last_accessed=session_data["last_accessed"]
                ))

    return active_sessions


@app.delete("/api/sessions/{session_id}")
async def cancel_session(session_id: str):
    """Cancel/cleanup a session"""
    if session_id not in sessions_store:
        raise HTTPException(status_code=404, detail="Session not found")

    sessions_store[session_id]["status"] = "cancelled"
    sessions_store[session_id]["last_accessed"] = datetime.now(timezone.utc)

    return {"message": "Session cancelled successfully"}


def cleanup_old_sessions():
    """Cleanup sessions older than 24 hours"""
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
    sessions_to_remove = []

    for session_id, session_data in sessions_store.items():
        if session_data["last_accessed"] < cutoff_time:
            sessions_to_remove.append(session_id)

    for session_id in sessions_to_remove:
        del sessions_store[session_id]

    return len(sessions_to_remove)
