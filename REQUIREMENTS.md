# Complete Electron.js CI/CD Management Application Development Prompt

## Project Overview
Create a production-ready Electron desktop application called "DevOps Control Center" that serves as a comprehensive CI/CD management tool for developers. The application should provide a unified interface to manage GitHub repositories, deployments, VPS servers, and DevOps workflows without requiring terminal access.

## Technology Stack
- **Framework**: Electron.js (latest stable version)
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS (light theme only)
- **State Management**: Redux Toolkit
- **API Integration**: GitHub REST API & GraphQL API
- **SSH Management**: node-ssh
- **Editor**: Monaco Editor (VS Code editor)
- **Database**: SQLite (local storage)
- **Authentication**: GitHub PAT (Personal Access Token) primary, OAuth as fallback
- **Build System**: Vite
- **Testing**: Jest + React Testing Library
- **Auto-updater**: electron-updater

## Core Features Required

### 1. Authentication & Repository Management
- **PAT Token Authentication**: 
  - Secure token storage using electron-safeStorage
  - Token validation and scope checking
  - Multiple account support
  - Token refresh mechanism
- **Repository Features**:
  - List all repositories (public/private)
  - Clone repositories locally
  - View repository statistics
  - Branch management (create, delete, merge)
  - Commit history viewer
  - File browser with syntax highlighting
  - Quick commit & push functionality
  - PR and Issue management interface

### 2. Build & Deployment Management
- **Pipeline Visualization**:
  - Visual workflow builder (drag-and-drop)
  - Real-time pipeline status monitoring
  - Step-by-step execution logs
  - Parallel and sequential job support
- **Deployment Options**:
  - One-click deployments to multiple environments
  - Rollback functionality with versioning
  - Environment variable management
  - Secrets management (encrypted storage)
  - Deploy to: First we target only github actions ( this are our futue scopes VPS, Docker, Kubernetes, Vercel, Netlify, AWS, GCP, Azure)
- **Build Features**:
  - Custom build scripts
  - Docker image building
  - Artifact management
  - Cache management

### 3. Workflow Editor
- **Integrated YAML Editor**:
  - Monaco editor with GitHub Actions schema support
  - Syntax highlighting and IntelliSense
  - Live YAML validation
  - Template library for common workflows
  - Visual workflow designer that generates YAML
- **Workflow Management**:
  - Create, edit, delete workflow files
  - Test workflows locally
  - Workflow history and versioning
  - Scheduled workflow management

### 4. VPS Integration & Management
- **Server Management**:
  - Add unlimited VPS servers
  - SSH key management (generate, import, export)
  - Server health monitoring (CPU, RAM, Disk, Network)
  - Real-time server metrics dashboard
- **Remote Operations**:
  - Integrated SSH terminal
  - File manager (upload, download, edit)
  - Service management (start, stop, restart)
  - Log viewer with real-time tailing
  - Database management interface
  - Nginx/Apache configuration editor
  - SSL certificate management
  - Firewall rules management

### 5. Developer-Focused Features
- **Monitoring & Alerts**:
  - Application performance monitoring
  - Error tracking and reporting
  - Custom alert rules
  - Slack/Discord/Email notifications
  - Uptime monitoring for deployed apps

- **Database Tools**:
  - Database backup automation
  - Migration management
  - Query builder interface
  - Database performance analytics

- **Container Management**:
  - Docker container monitoring
  - Docker Compose management
  - Container logs and shell access
  - Image registry management

- **Development Tools**:
  - API testing interface (like Postman)
  - Environment synchronization
  - Team collaboration features
  - Code snippet manager
  - Documentation generator

- **Security Features**:
  - Security vulnerability scanning
  - Dependency update notifications
  - SSL/TLS certificate monitoring
  - Secret rotation reminders
  - Audit logs

- **Analytics & Insights**:
  - Deployment frequency metrics
  - Build time analytics
  - Cost tracking for cloud resources
  - Performance benchmarking
  - Custom dashboards

## User Interface Requirements

### Design Specifications
- **Theme**: Clean, modern light theme only
- **Layout**: 
  - Collapsible sidebar navigation
  - Tab-based interface for multiple views
  - Resizable panels
  - Global command palette (Cmd/Ctrl+K)
- **Components**:
  - Custom Tailwind component library
  - Consistent spacing (8px grid system)
  - Smooth animations and transitions
  - Loading states and skeletons
  - Toast notifications
  - Context menus
  - Keyboard shortcuts for all major actions

### Main Views
1. **Dashboard View**: Overview cards, quick actions, recent activities
2. **Repositories View**: Grid/List toggle, search, filters, batch operations
3. **Pipelines View**: Kanban board style, timeline view, calendar view
4. **Servers View**: Server cards with live status, grouped by projects
5. **Editor View**: Multi-tab support, split view, integrated terminal
6. **Settings View**: Organized in categories, search functionality
7. **Logs View**: Filterable, exportable, with log level colors

## Technical Implementation Details

### Project Structure
```
devops-control-center/
├── src/
│   ├── main/              # Electron main process
│   │   ├── api/           # Backend API handlers
│   │   ├── services/      # Business logic
│   │   ├── database/      # SQLite models
│   │   └── ipc/          # IPC communication
│   ├── renderer/          # React application
│   │   ├── components/    # Reusable components
│   │   ├── views/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── store/        # Redux store
│   │   └── utils/        # Helper functions
│   ├── shared/           # Shared types and constants
│   └── assets/           # Images, icons, fonts
├── tests/
├── scripts/              # Build and deployment scripts
└── dist/                # Built application
```

### Security Requirements
- Implement Content Security Policy
- Use contextBridge for IPC communication
- Encrypt all stored credentials
- Implement rate limiting for API calls
- Regular security dependency updates
- Code signing for distribution

### Performance Requirements
- App startup time < 2 seconds
- Smooth 60fps UI animations
- Lazy loading for heavy components
- Virtual scrolling for large lists
- Efficient memory management
- Background task queue system

### Data Management
- Local SQLite database for:
  - Server configurations
  - Deployment history
  - User preferences
  - Cached repository data
  - Workflow templates
- Implement data export/import functionality
- Automatic backups
- Data migration system

## Development Phases

### Phase 1: Foundation (Week 1-2)
- Project setup with Electron, React, TypeScript, Tailwind
- Basic authentication with GitHub PAT
- Repository listing and basic operations
- Main UI layout and navigation

### Phase 2: Core Features (Week 3-4)
- GitHub Actions workflow viewer/editor
- Basic deployment functionality
- VPS server connection and management
- SSH terminal integration

### Phase 3: Advanced Features (Week 5-6)
- Visual workflow builder
- Real-time monitoring dashboards
- Docker integration
- Database management tools

### Phase 4: Polish & Testing (Week 7-8)
- UI/UX improvements
- Comprehensive testing
- Performance optimization
- Documentation
- Auto-updater implementation

### Phase 5: Production Ready (Week 9-10)
- Security audit
- Code signing setup
- Distribution packages (Windows, macOS, Linux)
- CI/CD for the app itself
- Launch preparation

## Testing Requirements
- Unit tests for all services (>80% coverage)
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance testing
- Security testing
- Cross-platform testing

## Documentation Requirements
- User documentation with screenshots
- API documentation
- Developer setup guide
- Troubleshooting guide
- Video tutorials for main features

## Distribution & Updates
- Auto-updater with delta updates
- Signed installers for all platforms
- Portable version option
- GitHub Releases integration
- Update changelog in-app

## Future Enhancements (Post-Launch)
- Plugin system for extensibility
- Cloud sync for settings
- Mobile companion app
- Team collaboration features
- AI-powered deployment suggestions
- Cost optimization recommendations
- Kubernetes cluster management
- Infrastructure as Code generator

## Success Metrics
- < 5% crash rate
- > 4.5 star rating
- < 100MB installer size
- < 200MB RAM usage
- Support for 100+ simultaneous server connections

## Specific Implementation Notes for @hardikkanajariya

### Priority Features for Your Use Case
1. **Quick Deploy Button**: One-click deploy to `/var/www/html`
2. **Laravel/PHP Specific**: Artisan command runner, composer integration
3. **Multiple Environment Support**: Dev, staging, production presets
4. **Database Sync Tool**: Sync database between environments
5. **Backup Automation**: Scheduled backups before deployment

### Suggested Keyboard Shortcuts
- `Ctrl+D`: Quick deploy to last used server
- `Ctrl+Shift+T`: Open terminal for selected server
- `Ctrl+R`: Refresh repository list
- `Ctrl+P`: Open command palette
- `Ctrl+S`: Save current workflow

## Development Start Commands
```bash
# Initialize project
npx create-electron-app devops-control-center --template=webpack-typescript
cd devops-control-center
npm install react react-dom @reduxjs/toolkit react-redux
npm install -D @types/react @types/react-dom tailwindcss
npm install monaco-editor node-ssh @octokit/rest sqlite3
npm install electron-updater electron-store

# Development
npm run start

# Build for production
npm run make
```

Please create this application with:
1. Clean, maintainable, well-commented code
2. Proper error handling and user feedback
3. Responsive UI that works on different screen sizes
4. Accessibility features (keyboard navigation, screen reader support)
5. Professional look and feel
6. Comprehensive logging system
7. Offline capability where possible

Remember: This is for @hardikkanajariya's personal use but should be production-quality and potentially scalable for team use later.