# Frontend - GitHub Issue Automation with Devin

A React + TypeScript + Vite frontend application for GitHub issue management and automation with Devin AI integration.

## Architecture

### Technology Stack
- **Framework**: React 18.3+ with TypeScript
- **Build Tool**: Vite 6.0+ for fast development and building
- **Styling**: Tailwind CSS 3.4+ with custom configuration
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Routing**: React Router DOM 7.9+
- **State Management**: React hooks (useState, useEffect)
- **HTTP Client**: Fetch API for backend communication
- **Icons**: Lucide React
- **Notifications**: Sonner toast library

### Project Structure
```
src/
├── components/
│   ├── ui/                    # Shadcn UI components (buttons, dialogs, etc.)
│   ├── RepoNavigator.tsx      # Repository management interface
│   ├── IssueDashboard.tsx     # Issue listing and filtering
│   └── IssueDetailModal.tsx   # Issue details and Devin workflow
├── hooks/
│   ├── use-toast.ts          # Toast notification hook
│   └── use-mobile.tsx        # Mobile detection hook
├── App.tsx                   # Main application component
└── main.tsx                  # Application entry point
```

## Core Components

### RepoNavigator (`src/components/RepoNavigator.tsx`)
**Purpose**: Manages GitHub repository connections and navigation

**Key Features**:
- Connect new GitHub repositories with Personal Access Token
- Display connected repositories in a table format
- Navigate to repository issue dashboards
- Delete repository connections
- Real-time repository statistics (open issues count)

**API Integration**:
- `GET /api/repos` - Fetch connected repositories
- `POST /api/repos/connect` - Connect new repository
- `DELETE /api/repos/{repo_id}` - Remove repository connection

### IssueDashboard (`src/components/IssueDashboard.tsx`)
**Purpose**: Displays and manages repository issues with filtering capabilities

**Key Features**:
- Paginated issue listing with search functionality
- Label-based filtering with multi-select support
- Issue status tracking and visual indicators
- Re-sync capability for GitHub repositories
- Responsive table design with mobile support

**API Integration**:
- `GET /api/repos/{repo_id}/issues` - Fetch repository issues with pagination
- `POST /api/repos/{repo_id}/resync` - Re-sync repository with GitHub

### IssueDetailModal (`src/components/IssueDetailModal.tsx`)
**Purpose**: Handles the complete Devin AI workflow for issue analysis and execution

**Key Features**:
- **Scope & Triage**: Start Devin session for issue analysis
- **Real-time Polling**: Monitor Devin session progress with structured output
- **Follow-up Instructions**: Send additional context to running sessions
- **Plan Execution**: Execute approved plans with branch management
- **Progress Tracking**: Visual progress indicators and confidence levels
- **External Links**: Direct links to Devin sessions and created PRs

**Devin Workflow States**:
1. **Initial**: Ready to start scoping
2. **Scoping**: Devin analyzing issue feasibility
3. **Scoped**: Analysis complete, ready for follow-ups or execution
4. **Executing**: Devin implementing the approved plan
5. **Completed**: Implementation finished with PR created

**API Integration**:
- `POST /api/issues/{issue_id}/scope` - Start Devin scoping session
- `GET /api/devin/{session_id}` - Poll session status and structured output
- `POST /api/devin/{session_id}/message` - Send follow-up instructions
- `POST /api/issues/{issue_id}/execute` - Execute approved plan

## UI/UX Design System

### Shadcn UI Components
The application uses a comprehensive set of Shadcn UI components for consistent design:

- **Layout**: Card, Sheet, Separator, Scroll Area
- **Navigation**: Breadcrumb, Menubar, Pagination
- **Forms**: Input, Textarea, Label, Button, Select, Checkbox
- **Feedback**: Dialog, Alert Dialog, Toast, Progress, Badge
- **Data Display**: Table, Avatar, Hover Card, Tooltip

### Styling Approach
- **Utility-First**: Tailwind CSS for rapid styling
- **Component Variants**: Class Variance Authority (CVA) for component variations
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Dark Mode**: Next-themes integration for theme switching
- **Animations**: Tailwind CSS animations with custom keyframes

### Color Scheme & Branding
- **Primary Colors**: Blue-based palette for actions and links
- **Status Colors**: 
  - Green for success states and completed actions
  - Yellow/Orange for warnings and in-progress states
  - Red for errors and destructive actions
  - Gray for neutral states and disabled elements

## State Management

### Local State Patterns
- **Repository List**: Managed in RepoNavigator with loading states
- **Issue Data**: Cached in IssueDashboard with pagination metadata
- **Devin Sessions**: Real-time polling with structured output tracking
- **Form State**: Controlled components with validation feedback

### Data Flow
1. **Repository Connection**: User provides GitHub URL + PAT → Backend validates → Updates repository list
2. **Issue Loading**: Repository selection → Fetch issues with filters → Display in dashboard
3. **Devin Workflow**: Issue selection → Start scoping → Poll progress → Execute plan → Track completion

## API Communication

### Base Configuration
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

### Error Handling
- **Network Errors**: Toast notifications with retry suggestions
- **API Errors**: Detailed error messages from backend responses
- **Loading States**: Skeleton loaders and disabled states during operations
- **Timeout Handling**: Graceful degradation for slow API responses

### Request Patterns
- **GET Requests**: Simple fetch with error handling
- **POST Requests**: JSON payloads with proper headers
- **Polling**: Interval-based requests for Devin session updates
- **Authentication**: GitHub PAT handled securely through backend

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: React and TypeScript rules configured
- **Prettier**: Code formatting (if configured)
- **Import Organization**: Absolute imports with @ alias

### Environment Variables
```env
# Backend API URL
VITE_API_URL=http://localhost:8000
```

## Testing Strategy

### Component Testing
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interaction with API
- **User Flow Tests**: Complete workflows (connect repo → scope issue → execute plan)

### Manual Testing Checklist
- [ ] Repository connection with valid/invalid GitHub URLs
- [ ] Issue dashboard pagination and filtering
- [ ] Devin session creation and polling
- [ ] Follow-up message functionality
- [ ] Plan execution with branch selection
- [ ] Error handling for network failures
- [ ] Mobile responsiveness across all components

## Performance Considerations

### Optimization Strategies
- **Code Splitting**: Route-based lazy loading
- **Bundle Analysis**: Vite bundle analyzer for size optimization
- **Image Optimization**: Proper image formats and lazy loading
- **API Caching**: Strategic caching of repository and issue data
- **Polling Optimization**: Intelligent polling intervals based on session state

### Monitoring
- **Core Web Vitals**: LCP, FID, CLS tracking
- **Error Tracking**: Client-side error reporting
- **Performance Metrics**: API response times and user interactions

## Deployment

### Build Process
```bash
# Production build
npm run build

# Output directory: dist/
# Static files ready for CDN deployment
```

### Environment Setup
- **Production API**: Update VITE_API_URL for production backend
- **CDN Configuration**: Proper caching headers for static assets
- **Error Boundaries**: Production error handling and reporting

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live session updates
- **Advanced Filtering**: Saved filters and custom query builders
- **Bulk Operations**: Multi-issue selection and batch processing
- **Analytics Dashboard**: Issue resolution metrics and trends
- **Collaboration Features**: Team-based repository management

### Technical Improvements
- **State Management**: Consider Zustand or Redux for complex state
- **Testing**: Comprehensive test suite with Vitest/Jest
- **Accessibility**: WCAG 2.1 AA compliance
- **Internationalization**: Multi-language support
- **Progressive Web App**: Offline functionality and app-like experience
