# Electron App: DevOps Automation Center

## Context & Pain Points for @hardikkanajariya
Current Date: 2025-08-14
User: hardikkanajariya

### Current Manual Workflow Pain Points:
1. **VPS Configuration**: Manual SSH key setup, user access, git repo cloning
2. **GitHub Secrets**: Manual creation and configuration of all secrets
3. **Workflow Files**: Manual YAML configuration that often fails on first run
4. **Multiple Tools**: Switching between terminal, server panels, and GitHub for different tasks

## Project: All-in-One VPS + GitHub Actions Automation Tool

### Core Problem to Solve
Create an Electron desktop application that automates the entire deployment pipeline from server setup to successful GitHub Actions deployment, integrating directly with VPS servers via SSH, AWS EC2, and GitHub - eliminating ALL manual steps.

## Technology Stack
- **Framework**: Electron.js with React + TypeScript
- **Styling**: Tailwind CSS (light theme)
- **SSH Integration**: ssh2 library for server management
- **AWS Integration**: AWS SDK for JavaScript v3
- **Terminal**: xterm.js (embedded terminal)
- **State Management**: Redux Toolkit
- **Database**: electron-store for config, SQLite for logs

## MUST-HAVE Features (Based on Your Workflow)

### 1. Intelligent SSH & Git Setup
```typescript
interface AutoSSHSetup {
  // Completely automated SSH setup
  autoConfig: {
    generateKeys: () => Promise<KeyPair>;
    uploadToServer: (serverId: string) => Promise<void>;
    addToGitHub: (repoName: string) => Promise<void>;
    testConnection: () => Promise<boolean>;
  };
  
  // Smart repo cloning
  smartClone: {
    detectOptimalPath: (serverConfig: ServerConfig) => string;
    cloneWithProgress: (repo: string, path: string) => Observable<Progress>;
    setupPermissions: () => Promise<void>;
    createGitHooks: () => Promise<void>;
  };
}
```

### 2. GitHub Secrets Auto-Configuration
```typescript
interface SecretsAutomation {
  // Auto-detect and create all needed secrets
  autoDetect: {
    scanServer: () => Promise<RequiredSecrets>; // HOST, USERNAME, SSH_KEY, etc.
    scanProject: () => Promise<ProjectSecrets>; // .env variables
  };
  
  // Bulk secret creation
  bulkCreate: {
    createAll: (secrets: Secret[]) => Promise<void>;
    validateSecrets: () => Promise<ValidationResult>;
    syncWithRepo: (repoName: string) => Promise<void>;
  };
}
```

### 3. Intelligent Workflow Generator
```typescript
interface WorkflowAI {
  // Smart workflow generation based on project type
  detectProjectType: (repoPath: string) => ProjectType; // Laravel, Node, React, etc.
  
  generateWorkflow: {
    fromTemplate: (type: ProjectType) => string;
    customizeForServer: (workflow: string, serverConfig: ServerConfig) => string;
    addCaching: () => string;
    addTestStage: () => string;
    validateYAML: (content: string) => ValidationResult;
  };
  
  // Fix common issues automatically
  autoFix: {
    permissionIssues: () => Promise<void>;
    pathProblems: () => Promise<void>;
    secretMismatches: () => Promise<void>;
    runtimeVersionConflicts: () => Promise<void>;
  };
}
```

### 4. One-Click Full Stack Deployment
```typescript
interface MagicDeployment {
  // The dream feature - one button does everything
  deployNewProject: async (config: {
    serverHost: string;
    targetPath: string;
    githubRepo: string;
    projectType: 'laravel' | 'wordpress' | 'node' | 'static';
    phpVersion?: string;
    nodeVersion?: string;
  }) => {
    // This single function should:
    // 1. Configure SSH keys on server
    // 2. Create target directory
    // 3. Clone repository
    // 4. Setup proper permissions
    // 5. Create all GitHub secrets
    // 6. Generate optimal workflow
    // 7. Commit workflow file
    // 8. Trigger first deployment
    // 9. Monitor and auto-fix any issues
    // 10. Send success notification
  };
}
```

## UI Design Specifications

### Main Dashboard View
```
┌─────────────────────────────────────────────────────────────┐
│ DevOps Control Center         @hardikkanajariya      [─][□][×]│
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────────────────────────────────────┐   │
│ │          │ │  Quick Deploy New Project                 │   │
│ │ ▼ Servers│ │  ┌────────────────┐ ┌─────────────────┐ │   │
│ │  AWS EC2 │ │  │ Domain Name    │ │ GitHub Repo     │ │   │
│ │  • i-123 │ │  └────────────────┘ └─────────────────┘ │   │
│ │          │ │  ┌────────────────┐ ┌─────────────────┐ │   │
│ │ ▼ Sites  │ │  │ Project Type ▼ │ │ [DEPLOY NOW]    │ │   │
│ │  site1   │ │  └────────────────┘ └─────────────────┘ │   │
│ │  site2   │ ├──────────────────────────────────────────┤   │
│ │          │ │  Active Deployments                      │   │
│ │ ▼ Actions│ │  ┌────────────────────────────────────┐ │   │
│ │  ✓ Build │ │  │ site1.com - Deploying... ████░░ 70%│ │   │
│ │  ✓ Deploy│ │  │ site2.com - ✓ Deployed 2 min ago   │ │   │
│ │  ⚠ Tests │ │  └────────────────────────────────────┘ │   │
│ └──────────┘ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Smart Terminal View
```typescript
interface SmartTerminal {
  // Embedded Termius-like experience
  features: {
    multiTab: boolean; // Multiple SSH sessions
    serverShortcuts: string[]; // Quick commands for common tasks
    autoComplete: boolean; // Command suggestions
    historySync: boolean; // Sync across sessions
  };
  
  // Pre-configured commands
  quickCommands: {
    restartNginx: 'sudo systemctl restart nginx';
    clearCache: 'cd {deployPath} && php artisan cache:clear';
    pullLatest: 'git pull origin main';
    runMigrations: 'php artisan migrate --force';
  };
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. **Electron Setup** with TypeScript + React + Tailwind
2. **VPS Server Management** - SSH connections, health monitoring
3. **AWS EC2 Integration** - List instances, get details
4. **GitHub Integration** - OAuth + PAT support
5. **Basic UI Layout** - Sidebar, main area, terminal

### Phase 2: Automation Features (Week 2)
1. **SSH Key Automation** - Generate, upload, test
2. **Server Configuration** - Remote setup automation
3. **Repository Cloning** - With progress tracking
4. **Secrets Scanner** - Auto-detect required secrets
5. **Secrets Bulk Creation** - GitHub API integration

### Phase 3: Intelligent Features (Week 3)
1. **Project Type Detection** - Analyze repo structure
2. **Workflow Generator** - Smart YAML creation
3. **Auto-Fix Engine** - Common issue resolver
4. **Deployment Monitor** - Real-time status
5. **Error Recovery** - Automatic retry logic

### Phase 4: Polish & Testing (Week 4)
1. **UI Improvements** - Animations, loading states
2. **Error Handling** - User-friendly messages
3. **Performance Optimization** - Caching, lazy loading
4. **Testing** - Unit, integration, E2E
5. **Documentation** - User guide, tooltips

## Specific VPS Deployment Workflows to Automate

### Laravel Project Deployment
```yaml
automation:
  - Create MySQL database on server
  - Configure PHP version (8.2)
  - Clone repository to target path
  - Copy .env.example to .env
  - Generate app key
  - Run composer install
  - Run npm install && npm run build
  - Set permissions (storage, bootstrap/cache)
  - Create GitHub Action for auto-deployment
  - Setup queue workers if needed
```

### WordPress Deployment
```yaml
automation:
  - Setup web server configuration
  - Install WordPress
  - Clone custom theme/plugins
  - Setup staging environment
  - Configure backup automation
  - Create deployment workflow
```

## Error Prevention & Auto-Recovery

### Common Issues to Auto-Fix
1. **Permission Errors**
   - Auto-detect and fix file/folder permissions
   - Set correct ownership (www-data or configured user)

2. **Path Issues**
   - Auto-detect server directory structure
   - Fix relative vs absolute paths

3. **Runtime Version Mismatches**
   - Detect required version from composer.json/package.json
   - Configure appropriate runtime version

4. **Database Connection Failures**
   - Auto-create database if missing
   - Fix credentials in .env

5. **GitHub Action Failures**
   - Auto-retry with exponential backoff
   - Smart error message parsing
   - Suggested fixes based on error type

## Success Metrics
- **Zero manual SSH key setup** - 100% automated
- **First deployment success rate** > 95%
- **Setup time reduction** - From 30 min to < 2 min
- **Server management coverage** - All essential SSH operations
- **Error auto-recovery rate** > 80%

## Sample Configuration File
```json
{
  "aws": {
    "region": "us-east-1",
    "instanceId": "i-1234567890abcdef0"
  },
  "servers": [
    {
      "name": "Production",
      "host": "your-server.com",
      "username": "deploy",
      "sshKeyPath": "~/.ssh/id_rsa"
    }
  ],
  "github": {
    "username": "hardikkanajariya",
    "token": "encrypted_pat_here"
  },
  "defaults": {
    "phpVersion": "8.2",
    "nodeVersion": "18",
    "deployBranch": "main",
    "deployUser": "www-data"
  },
  "automations": {
    "autoFixPermissions": true,
    "autoCreateDatabase": true,
    "autoSetupSSL": true,
    "autoRetryOnFailure": true
  }
}
```

## Development Commands
```bash
# Setup
git clone https://github.com/hardikkanajariya/devops-control-center
cd devops-control-center
npm install

# Development with hot reload
npm run dev

# Build for production
npm run build:mac
npm run build:win
npm run build:linux

# Run tests
npm test
```

## Priority Implementation for @hardikkanajariya
1. **Server SSH Management** - Most critical
2. **One-click deployment** - Biggest time saver
3. **Auto SSH setup** - Eliminates manual config
4. **Smart workflow generator** - Prevents first-run failures
5. **Embedded terminal** - Replace Termius need

This tool should completely eliminate your manual workflow and reduce deployment setup from 30+ minutes to under 2 minutes with a 95%+ success rate on first run.