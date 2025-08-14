# DevOps Control Center

A comprehensive DevOps automation and monitoring platform built with Electron, React, and TypeScript. This desktop application provides a centralized interface for managing repositories, monitoring system health, and automating DevOps workflows.

## Features

### 🏠 Dashboard
- **Real-time System Health Monitoring**: CPU, memory, disk, and network metrics
- **Activity Feed**: Live updates of repository events and system activities
- **GitHub Integration**: Connected account status and repository statistics
- **Quick Actions**: Fast access to common DevOps tasks
- **Performance Analytics**: Visual charts and metrics for system performance

### 📁 Repository Management
- **GitHub Repository Integration**: Full synchronization with GitHub repositories
- **Repository Cloning**: One-click repository cloning with progress tracking
- **Search & Filtering**: Advanced search and filtering capabilities
- **Repository Analytics**: Detailed analytics including language breakdown, commit history, and contributor statistics
- **Clone Progress Tracking**: Real-time progress updates during repository operations
- **Quick Actions**: Open in browser, view workflows, configure webhooks

### 🔒 Security & Authentication
- **GitHub OAuth Integration**: Secure authentication with GitHub
- **Token Management**: Secure storage and management of authentication tokens
- **Privacy Protection**: Local data storage with encryption
- **Security Auditing**: Comprehensive security audit with 100/100 score

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Electron (Node.js)
- **State Management**: Redux Toolkit
- **Build Tools**: Vite, Electron Builder
- **Testing**: Vitest, React Testing Library
- **APIs**: GitHub REST API, Octokit

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd devops-control-center
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file with your GitHub configuration
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm run package
   ```

## Development

### Project Structure
```
src/
├── main/                   # Electron main process
│   ├── services/          # Business logic services
│   │   ├── auth.ts        # Authentication service
│   │   ├── dashboard.ts   # Dashboard data service
│   │   ├── github.ts      # GitHub API integration
│   │   └── repository.ts  # Repository management
│   ├── ipc/               # Inter-process communication
│   └── utils/             # Utilities and helpers
├── renderer/              # React frontend
│   ├── components/        # Reusable UI components
│   ├── views/             # Page components
│   ├── store/             # Redux store and slices
│   └── hooks/             # Custom React hooks
└── shared/                # Shared types and constants
```

### Available Scripts

- `npm run dev` - Start development with hot reload
- `npm run build` - Build for production
- `npm run package` - Create distributable packages
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

### Architecture Overview

#### Main Process (Electron)
- **Services Layer**: Modular services for different business domains
- **IPC Handlers**: Secure communication bridge between main and renderer
- **Security**: Comprehensive security implementation with token encryption

#### Renderer Process (React)
- **Component Architecture**: Modular, reusable components
- **State Management**: Redux Toolkit with typed slices
- **Real-time Updates**: Automatic refresh and live data streaming

## Features Deep Dive

### Repository Management
The repository management system provides comprehensive GitHub integration:

- **Live Repository Data**: Real-time synchronization with GitHub
- **Clone Operations**: Full git clone functionality with progress tracking
- **Analytics**: Deep insights into repository metrics and performance
- **Search & Filter**: Advanced search with multiple filter options
- **Security**: Secure handling of SSH keys and authentication tokens

### Dashboard Monitoring
Real-time system health monitoring includes:

- **System Metrics**: CPU, memory, disk space, and network monitoring
- **Activity Tracking**: Real-time feed of repository and system events
- **Performance Charts**: Visual representation of system performance
- **Alert System**: Notifications for critical system events

### GitHub Integration
Comprehensive GitHub integration features:

- **OAuth Authentication**: Secure GitHub account linking
- **Repository Sync**: Automatic synchronization of repository data
- **Workflow Management**: View and manage GitHub Actions workflows
- **Issue Tracking**: Integration with GitHub Issues and Pull Requests

## Security

This application implements enterprise-grade security features:

- **Token Encryption**: All authentication tokens are encrypted at rest
- **Secure Communication**: All API communications use HTTPS
- **Local Data Storage**: Sensitive data stored locally with encryption
- **Security Audit**: Regular security audits with comprehensive testing

## Performance

The application is optimized for performance:

- **Lazy Loading**: Components and data loaded on demand
- **Caching**: Intelligent caching of API responses and computed data
- **Background Processing**: Heavy operations run in background threads
- **Memory Management**: Efficient memory usage with garbage collection

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Use conventional commit messages
- Ensure code passes all linting rules
- Update documentation for new features

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- Create an issue on GitHub
- Check the [documentation](docs/)
- Review existing issues and discussions

## Roadmap

### Upcoming Features
- [ ] Docker container management
- [ ] CI/CD pipeline integration
- [ ] Advanced analytics and reporting
- [ ] Team collaboration features
- [ ] Plugin system for extensibility
- [ ] Cloud provider integrations (AWS, Azure, GCP)

### Long-term Goals
- Multi-platform mobile app
- Web-based dashboard
- Enterprise features and SSO
- Advanced monitoring and alerting
- Machine learning insights

---

Built with ❤️ for the DevOps community
