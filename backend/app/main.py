from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import httpx
from dotenv import load_dotenv
import uuid

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

repos_store: Dict[str, Dict] = {}
issues_store: Dict[str, List[Dict]] = {}
devin_sessions_store: Dict[str, Dict] = {}

test_repo_id = "test-repo-123"
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
for i in range(25):
    labels = []
    if i % 3 == 0:
        labels = ["bug", "high-priority", "frontend", "ui", "critical"]
    elif i % 3 == 1:
        labels = ["feature", "enhancement"]
    else:
        labels = ["documentation", "help-wanted", "good-first-issue", "backend", "api", "database"]
    
    test_issues.append({
        "id": 1000 + i,
        "title": f"Test Issue #{i + 1}: Sample issue for testing dashboard functionality",
        "body": f"This is a test issue body for issue #{i + 1}. It contains sample content for testing the Issue Dashboard.",
        "labels": labels,
        "number": i + 1,
        "author": f"user{i % 5 + 1}",
        "created_at": datetime.now() - timedelta(days=i),
        "age_days": i,
        "status": "open",
    })

issues_store[test_repo_id] = test_issues


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
    branchName: str


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


class DevinSessionResponse(BaseModel):
    status: str
    structured_output: Optional[Dict[str, Any]] = None
    url: str


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/api/repos/connect", response_model=Dict[str, str])
async def connect_repo(request: ConnectRepoRequest):
    try:
        url_str = str(request.repoUrl)
        if not url_str.startswith("https://github.com/"):
            raise HTTPException(
                status_code=400, detail="Only GitHub repositories are supported"
            )

        parts = url_str.replace("https://github.com/", "").strip("/").split("/")
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid repository URL format")

        owner, name = parts
        repo_id = str(uuid.uuid4())

        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"token {request.githubPat}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Cognition-App/1.0",
            }

            repo_response = await client.get(
                f"https://api.github.com/repos/{owner}/{name}", headers=headers
            )

            if repo_response.status_code == 401:
                raise HTTPException(
                    status_code=400, detail="Invalid GitHub Personal Access Token"
                )
            elif repo_response.status_code == 403:
                raise HTTPException(
                    status_code=400,
                    detail="GitHub API rate limit exceeded or insufficient permissions",
                )
            elif repo_response.status_code == 404:
                raise HTTPException(
                    status_code=400,
                    detail="Repository not found or you don't have access to it",
                )
            elif repo_response.status_code != 200:
                raise HTTPException(
                    status_code=400, detail="Failed to access repository"
                )

            repo_data = repo_response.json()

            if not repo_data.get("permissions"):
                raise HTTPException(
                    status_code=400,
                    detail="GitHub Personal Access Token lacks 'repo' scope. Please create a new token with 'repo' permissions.",
                )

            permissions = repo_data.get("permissions", {})
            if not permissions.get("push", False):
                raise HTTPException(
                    status_code=400,
                    detail="You don't have push access to this repository. Push access is required to open pull requests.",
                )

            issues_response = await client.get(
                f"https://api.github.com/repos/{owner}/{name}/issues",
                headers=headers,
                params={"state": "open", "per_page": 100},
            )

            if issues_response.status_code == 403:
                raise HTTPException(
                    status_code=400, detail="Rate limit exceeded when fetching issues"
                )
            elif issues_response.status_code != 200:
                raise HTTPException(
                    status_code=400, detail="Failed to fetch repository issues"
                )

            issues_data = issues_response.json()

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
                            "labels": [label["name"] for label in issue["labels"]],
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
                "githubPat": request.githubPat,  # Store PAT for future API calls
            }

            issues_store[repo_id] = processed_issues

            return {"id": repo_id, "message": "Repository connected successfully"}

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=500, detail="Failed to connect to GitHub API - network error"
        )
    except Exception as e:
        error_msg = str(e)
        if request.githubPat in error_msg:
            error_msg = error_msg.replace(request.githubPat, "[REDACTED]")
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_msg}")


@app.get("/api/repos", response_model=List[RepoResponse])
async def list_repos():
    repos = []
    for repo_id, repo_data in repos_store.items():
        safe_repo_data = {k: v for k, v in repo_data.items() if k != "githubPat"}
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


@app.delete("/api/repos/{repo_id}")
async def delete_repo(repo_id: str):
    if repo_id not in repos_store:
        raise HTTPException(status_code=404, detail="Repository not found")

    del repos_store[repo_id]
    if repo_id in issues_store:
        del issues_store[repo_id]
    if repo_id in devin_sessions_store:
        del devin_sessions_store[repo_id]

    return {"message": "Repository deleted successfully"}


@app.post("/api/repos/{repo_id}/resync")
async def resync_repo(repo_id: str, request: ResyncRequest):
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

            issues_response = await client.get(
                f"https://api.github.com/repos/{owner}/{name}/issues",
                headers=headers,
                params={"state": "open", "per_page": 100},
            )

            if issues_response.status_code == 401:
                raise HTTPException(
                    status_code=400,
                    detail="GitHub Personal Access Token is no longer valid",
                )
            elif issues_response.status_code == 403:
                raise HTTPException(
                    status_code=400, detail="GitHub API rate limit exceeded"
                )
            elif issues_response.status_code != 200:
                raise HTTPException(
                    status_code=400, detail="Failed to fetch repository issues"
                )

            issues_data = issues_response.json()

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
                            "labels": [label["name"] for label in issue["labels"]],
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

            if repo_id in devin_sessions_store:
                del devin_sessions_store[repo_id]

            return {
                "message": "Repository resynced successfully",
                "issuesCount": len(processed_issues),
            }

    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=500, detail="Failed to connect to GitHub API - network error"
        )
    except Exception as e:
        error_msg = str(e)
        if github_pat in error_msg:
            error_msg = error_msg.replace(github_pat, "[REDACTED]")
        raise HTTPException(status_code=500, detail="Internal server error occurred")


@app.get("/api/repos/{repo_id}/issues", response_model=List[IssueResponse])
async def get_issues(
    repo_id: str,
    q: Optional[str] = None,
    label: Optional[str] = None,
    page: int = 1,
    pageSize: int = 20,
):
    if repo_id not in issues_store:
        raise HTTPException(status_code=404, detail="Repository not found")

    issues = issues_store[repo_id]

    issues = sorted(issues, key=lambda x: x["created_at"], reverse=True)

    if q:
        issues = [issue for issue in issues if q.lower() in issue["title"].lower()]

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
async def scope_issue(issue_id: int, request: ScopeRequest):
    session_id = str(uuid.uuid4())

    devin_sessions_store[session_id] = {
        "status": "running",
        "structured_output": {
            "progress_pct": 10,
            "confidence": "medium",
            "summary": "Analyzing issue requirements and creating implementation plan...",
            "risks": ["Complexity may be higher than initially estimated"],
            "dependencies": ["GitHub API access", "Repository permissions"],
            "estimated_hours": 2,
            "action_plan": [
                {"step": 1, "desc": "Analyze issue requirements", "done": False},
                {"step": 2, "desc": "Create implementation plan", "done": False},
                {"step": 3, "desc": "Identify potential risks", "done": False},
            ],
            "branch_suggestion": f"feat/issue-{issue_id}-implementation",
            "pr_url": "",
        },
        "url": f"https://app.devin.ai/sessions/{session_id}",
    }

    return {"sessionId": session_id}


@app.get("/api/devin/{session_id}", response_model=DevinSessionResponse)
async def get_devin_session(session_id: str):
    if session_id not in devin_sessions_store:
        raise HTTPException(status_code=404, detail="Session not found")

    session = devin_sessions_store[session_id]
    return DevinSessionResponse(
        status=session["status"],
        structured_output=session["structured_output"],
        url=session["url"],
    )


@app.post("/api/devin/{session_id}/message")
async def send_message_to_devin(session_id: str, request: MessageRequest):
    if session_id not in devin_sessions_store:
        raise HTTPException(status_code=404, detail="Session not found")

    session = devin_sessions_store[session_id]
    if session["structured_output"]:
        session["structured_output"]["progress_pct"] = min(
            session["structured_output"]["progress_pct"] + 20, 90
        )
        session["structured_output"][
            "summary"
        ] = f"Updated plan based on feedback: {request.message[:50]}..."

    return {"message": "Follow-up sent successfully"}


@app.post("/api/issues/{issue_id}/execute")
async def execute_plan(issue_id: int, request: ExecuteRequest):
    return {
        "message": "Execution started",
        "branchName": request.branchName,
        "estimatedCompletion": "15-30 minutes",
    }
