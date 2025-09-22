# Cognition App

A full-stack application for GitHub issue management and automation with Devin AI integration.

## Architecture

- **Backend**: FastAPI (Python) with Poetry dependency management
- **Frontend**: Vite + React + TypeScript with Tailwind CSS and Shadcn UI
- **Development**: Makefile for easy setup and deployment

## Prerequisites

Before running the application locally, ensure you have the following installed:

### Required Dependencies

1. **Python 3.12+**
   ```bash
   # Check version
   python --version
   ```

2. **Poetry** (Python dependency management)
   ```bash
   # Install Poetry
   curl -sSL https://install.python-poetry.org | python3 -
   
   # Add to PATH (add to your shell profile)
   export PATH="$HOME/.local/bin:$PATH"
   
   # Verify installation
   poetry --version
   ```

3. **Node.js 18+** and **npm/pnpm**
   ```bash
   # Check versions
   node --version
   npm --version
   
   # Optional: Install pnpm for faster package management
   npm install -g pnpm
   ```

4. **Make** (usually pre-installed on Linux/macOS)
   ```bash
   # Check if available
   make --version
   ```

## Local Development Setup

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cognition-app
   ```

2. **Install dependencies and start development servers**
   ```bash
   make install-deps  # Install all dependencies first
   make dev           # Start both servers
   ```
   
   Or in one command:
   ```bash
   make dev
   ```
   
   This will:
   - Start backend with FastAPI dev server (port 8000)
   - Start frontend with Vite dev server (port 5173)
   - Enable hot reloading for both services

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Manual Setup (Alternative)

If you prefer to set up each service individually:

#### Backend Setup
```bash
cd backend
poetry install
poetry run fastapi dev app/main.py --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# GitHub Integration (optional for testing)
GITHUB_TOKEN=your_github_personal_access_token

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000
```

## Available Make Commands

- `make dev` - Start both backend and frontend development servers
- `make install-deps` - Install all dependencies (backend and frontend)
- `make format` - Format code (backend with black, frontend if configured)
- `make lint` - Lint code (backend with flake8, frontend with eslint)
- `make health` - Check health of both services
- `make clean` - Clean build artifacts
- `make help` - Show all available commands

## Features

### Issue Dashboard
- GitHub-like issue table with pagination
- Search and filter functionality
- Label management with tooltip overflow
- Re-sync capability for GitHub repositories
- Default sorting by most recent issues

### Issue Detail Modal
- Complete issue metadata display
- Scope & Triage workflow with Devin AI integration
- Real-time progress tracking with polling
- Follow-up instruction capability
- Plan execution with branch management

### Plan Execution Workflow
- Target branch selection (defaults to main)
- Continued polling after execution
- PR link display on completion
- Dashboard status updates to "PR Submitted"

## API Endpoints

### Repository Management
- `GET /api/repos` - List connected repositories
- `POST /api/repos/connect` - Connect new GitHub repository
- `POST /api/repos/{repo_id}/resync` - Re-sync repository issues

### Issue Management
- `GET /api/repos/{repo_id}/issues` - List repository issues with pagination
- `POST /api/issues/{issue_id}/scope` - Start issue scoping with Devin
- `POST /api/issues/{issue_id}/execute` - Execute plan with branch configuration

### Devin Integration
- `GET /api/devin/{session_id}` - Get Devin session status and progress
- `POST /api/devin/{session_id}/message` - Send follow-up instructions

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill processes on ports 8000 or 5173
   lsof -ti:8000 | xargs kill -9
   lsof -ti:5173 | xargs kill -9
   ```

2. **Poetry not found**
   ```bash
   # Ensure Poetry is in PATH
   export PATH="$HOME/.local/bin:$PATH"
   source ~/.bashrc  # or ~/.zshrc
   ```

3. **Node modules issues**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Python dependency conflicts**
   ```bash
   cd backend
   poetry env remove python
   poetry install
   ```

### Development Tips

- Use `make dev` for the best development experience with hot reloading
- Backend changes require server restart, frontend changes are hot-reloaded
- Check browser console and terminal output for error messages
- API documentation is available at http://localhost:8000/docs

## Testing

### Frontend Testing
```bash
cd frontend
npm run test
```

### Backend Testing
```bash
cd backend
poetry run pytest
```

## Production Deployment

For production deployment, build the frontend and serve both applications:

```bash
# Build frontend
cd frontend
npm run build

# Serve backend with production settings
cd backend
poetry run fastapi run app/main.py --host 0.0.0.0 --port 8000
```

## Contributing

1. Create a feature branch from main
2. Make your changes with proper testing
3. Ensure all linting and formatting passes
4. Submit a pull request with detailed description

## License

[Add your license information here]
