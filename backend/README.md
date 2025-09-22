# Backend - GitHub Issue Automation with Devin

A FastAPI backend service for GitHub issue management and automation with Devin AI integration.

## Architecture

### Technology Stack
- **Framework**: FastAPI 0.117+ with automatic OpenAPI documentation
- **Python Version**: 3.12+
- **Dependency Management**: Poetry for package management and virtual environments
- **HTTP Client**: httpx for async HTTP requests to GitHub and Devin APIs
- **Environment**: python-dotenv for configuration management
- **Database**: In-memory storage (repos_store, issues_store) for development

### Project Structure
```
app/
├── main.py                   # Main FastAPI application with all endpoints
├── __init__.py              # Package initialization
└── models/                  # Pydantic models (defined in main.py)
    ├── ConnectRepoRequest
    ├── ScopeRequest
    ├── MessageRequest
    ├── ExecuteRequest
    └── Response models
```

## Core Services

### DevinAPIService (`app/main.py:115-206`)
**Purpose**: Handles all interactions with the Devin AI API

**Key Methods**:
- `create_session(prompt: str)` - Creates new Devin session with structured output
- `get_session(session_id: str)` - Retrieves session status and structured output
- `send_message(session_id: str, message: str)` - Sends messages to existing sessions

**Configuration**:
- **Base URL**: `https://api.devin.ai`
- **Authentication**: Bearer token from `DEVIN_API_KEY` environment variable
- **Timeout**: 30 seconds for all API calls
- **Error Handling**: Comprehensive error handling with API key redaction

**Structured Output Schema**:
```json
{
  "progress_pct": 0,                       // 0-100, updated as work progresses
  "confidence": "low|medium|high",         // feasibility assessment
  "summary": "one-paragraph plan",
  "risks": ["list of potential risks"],
  "dependencies": ["list of dependencies"],
  "estimated_hours": 4,
  "action_plan": [{"step":1,"desc":"...","done":false}],
  "branch_suggestion": "feat/issue-123-description"
}
```

## API Endpoints

### Repository Management

#### `POST /api/repos/connect`
**Purpose**: Connect a new GitHub repository for issue management

**Request Body**:
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "githubPat": "ghp_xxxxxxxxxxxxxxxxxxxx"
}
```

**Process**:
1. Validates GitHub URL format
2. Extracts owner/repo from URL
3. Tests GitHub API access with provided PAT
4. Fetches repository metadata and initial issues
5. Stores repository in repos_store with unique ID

**Response**: Repository ID and metadata

#### `GET /api/repos`
**Purpose**: List all connected repositories

**Response**: Array of repository objects with issue counts and connection timestamps

#### `DELETE /api/repos/{repo_id}`
**Purpose**: Remove repository connection and cleanup stored data

#### `POST /api/repos/{repo_id}/resync`
**Purpose**: Re-sync repository issues from GitHub API

**Process**:
1. Validates repository exists and GitHub PAT is still valid
2. Fetches latest issues from GitHub API
3. Processes and filters issues (excludes pull requests)
4. Updates issues_store with fresh data
5. Calculates age_days for each issue

### Issue Management

#### `GET /api/repos/{repo_id}/issues`
**Purpose**: Retrieve repository issues with pagination and filtering

**Query Parameters**:
- `q` (optional): Search query for issue titles
- `label` (optional): Filter by specific label
- `page` (default: 1): Page number for pagination
- `pageSize` (default: 20): Number of issues per page

**Response**: Paginated list of issues with metadata

#### `POST /api/issues/{issue_id}/scope`
**Purpose**: Start Devin AI scoping session for an issue

**Request Body**:
```json
{
  "additionalContext": "Optional additional context from developer"
}
```

**Process**:
1. Locates issue data in issues_store
2. Builds comprehensive scoping prompt with:
   - Repository URL and issue details
   - Issue title, body, and GitHub URL
   - Additional developer context
   - Structured output schema requirements
3. Creates Devin session via DevinAPIService
4. Returns session ID for polling

**Scoping Prompt Template**:
```
You are Devin, scoping a GitHub issue for feasibility and a concrete, developer-ready plan.

Repo: {repo_url}
Issue: {issue_title} (#{issue_number})
Issue URL: {issue_url}
Issue Body:
{issue_body}

Additional context from developer:
{additional_context}

Please produce and keep updated a Structured Output JSON with the following schema:
{structured_output_schema}

Guidelines:
- Do NOT make code changes yet.
- Ensure the plan includes architecture notes and test strategy.
- Keep Structured Output updated whenever you refine the plan.
```

#### `POST /api/issues/{issue_id}/execute`
**Purpose**: Execute approved plan for an issue

**Request Body**:
```json
{
  "sessionId": "devin-session-id",
  "branchName": "feat/issue-123-description",
  "targetBranch": "main"
}
```

**Process**:
1. Sends execution prompt to existing Devin session
2. Includes branch management requirements
3. Specifies PR creation requirements with template

**Execution Prompt Template**:
```
Execute the approved plan for the same issue.

Requirements:
- Create a new branch named: {branch_name} from {target_branch}
- Implement the change set per the plan; write/adjust tests; run locally and capture screenshots if relevant
- Open a PR back to {target_branch} with detailed description following our PR template (devin_pr_template.md)

Provide the created PR URL in your final message and set Structured Output:
{completion_schema}
```

### Devin Integration

#### `GET /api/devin/{session_id}`
**Purpose**: Poll Devin session for status and structured output updates

**Response**:
```json
{
  "status": "claimed|running|completed|failed",
  "structured_output": {
    "progress_pct": 75,
    "confidence": "high",
    "summary": "Implementation plan ready",
    // ... full structured output
  },
  "url": "https://app.devin.ai/sessions/{session_id}"
}
```

**Usage**: Frontend polls this endpoint every few seconds to update UI

#### `POST /api/devin/{session_id}/message`
**Purpose**: Send follow-up instructions to running Devin session

**Request Body**:
```json
{
  "message": "Please also consider adding unit tests for the new functionality"
}
```

**Process**:
1. Builds follow-up prompt with user message
2. Sends to Devin session via DevinAPIService
3. Instructs Devin to update structured output accordingly

**Follow-up Prompt Template**:
```
Apply these follow-up instructions to the existing plan:
{user_message}

Then update the Structured Output JSON accordingly (plan steps, risks, estimates, confidence, progress_pct).
```

## Data Models

### Pydantic Models
All request/response models use Pydantic for validation and serialization:

- **ConnectRepoRequest**: Repository URL and GitHub PAT
- **ScopeRequest**: Optional additional context for scoping
- **MessageRequest**: Follow-up message content
- **ExecuteRequest**: Session ID, branch name, and target branch
- **RepoResponse**: Repository metadata with issue counts
- **IssueResponse**: Complete issue data with GitHub metadata
- **DevinSessionResponse**: Session status and structured output

### In-Memory Storage
Development uses dictionaries for data persistence:

```python
repos_store: Dict[str, Dict] = {}     # Repository metadata
issues_store: Dict[str, List] = {}    # Issues by repository ID
```

**Repository Storage Schema**:
```python
{
  "id": "unique-repo-id",
  "owner": "github-owner",
  "name": "repo-name", 
  "url": "https://github.com/owner/repo",
  "connectedAt": "2024-01-01T00:00:00Z",
  "openIssuesCount": 42,
  "githubPat": "encrypted-or-hashed-token"
}
```

**Issue Storage Schema**:
```python
{
  "id": 123456789,
  "title": "Issue title",
  "body": "Issue description",
  "labels": ["bug", "high-priority"],
  "number": 42,
  "author": "github-username",
  "created_at": "2024-01-01T00:00:00Z",
  "age_days": 5,
  "status": "open"
}
```

## Configuration

### Environment Variables
Required environment variables in `.env` file:

```env
# Devin AI Integration
DEVIN_API_KEY=apk_user_xxxxxxxxxxxxxxxxxxxx

# GitHub Integration (stored per repository)
# GITHUB_PAT is provided per repository connection

# API Configuration (optional)
API_HOST=0.0.0.0
API_PORT=8000

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### CORS Configuration
FastAPI configured to allow frontend access:
- **Allowed Origins**: Frontend URL from environment
- **Allowed Methods**: GET, POST, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization

## Error Handling

### API Error Responses
Standardized error handling with appropriate HTTP status codes:

- **400 Bad Request**: Invalid input data or malformed requests
- **401 Unauthorized**: Invalid GitHub PAT or expired tokens
- **403 Forbidden**: GitHub API rate limits or insufficient permissions
- **404 Not Found**: Repository, issue, or session not found
- **500 Internal Server Error**: Unexpected errors with sanitized messages

### Security Considerations
- **API Key Redaction**: Devin API keys removed from error messages
- **GitHub PAT Protection**: Tokens not logged or exposed in responses
- **Input Validation**: Pydantic models validate all request data
- **URL Validation**: GitHub URLs validated for proper format

### Logging Strategy
- **Request Logging**: API endpoint access and timing
- **Error Logging**: Detailed error information for debugging
- **Security Logging**: Authentication failures and suspicious activity
- **Performance Logging**: Slow API calls and resource usage

## Development Workflow

### Local Development
```bash
# Install dependencies
poetry install

# Start development server
poetry run fastapi dev app/main.py --host 0.0.0.0 --port 8000

# Alternative: Use make command
make dev
```

### Code Quality
```bash
# Linting
poetry run flake8 app/

# Formatting
poetry run black app/

# Type checking
poetry run mypy app/
```

### Testing Strategy
```bash
# Run tests
poetry run pytest

# Test coverage
poetry run pytest --cov=app
```

## API Documentation

### Interactive Documentation
FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

### Health Check
- **Endpoint**: `GET /healthz`
- **Response**: `{"status": "ok"}`
- **Purpose**: Service health monitoring and load balancer checks

## Performance Considerations

### Async Operations
- **HTTP Requests**: All external API calls use httpx async client
- **Concurrent Handling**: FastAPI handles multiple requests concurrently
- **Timeout Management**: 30-second timeouts for external API calls

### Caching Strategy
- **In-Memory Storage**: Fast access to repository and issue data
- **GitHub API**: Intelligent re-sync to avoid rate limits
- **Devin Sessions**: Efficient polling with structured output caching

### Rate Limiting
- **GitHub API**: Respects GitHub rate limits with proper error handling
- **Devin API**: Manages session creation and message sending efficiently

## Deployment

### Production Configuration
```bash
# Production server
poetry run fastapi run app/main.py --host 0.0.0.0 --port 8000

# With Gunicorn
poetry run gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Environment Setup
- **Environment Variables**: Production values for API keys and URLs
- **Database Migration**: Replace in-memory storage with persistent database
- **Monitoring**: Application performance monitoring and error tracking
- **Security**: HTTPS, API rate limiting, and input sanitization

## Future Enhancements

### Planned Features
- **Database Integration**: PostgreSQL for persistent data storage
- **Authentication**: User management and API key authentication
- **Webhooks**: GitHub webhook integration for real-time issue updates
- **Caching**: Redis for session and API response caching
- **Background Tasks**: Celery for long-running operations

### Technical Improvements
- **Database Models**: SQLAlchemy ORM with proper relationships
- **API Versioning**: Versioned endpoints for backward compatibility
- **Rate Limiting**: Request throttling and quota management
- **Monitoring**: Comprehensive logging and metrics collection
- **Testing**: Complete test suite with mocking and integration tests

### Security Enhancements
- **OAuth Integration**: GitHub OAuth for secure repository access
- **API Key Management**: Secure storage and rotation of API keys
- **Audit Logging**: Complete audit trail for all operations
- **Input Sanitization**: Enhanced validation and sanitization
- **RBAC**: Role-based access control for multi-user environments
