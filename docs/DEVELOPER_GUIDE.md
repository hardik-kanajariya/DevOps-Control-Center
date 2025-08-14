# DevOps Control Center - Developer Setup Guide

## Overview

This guide will help you set up the development environment for the DevOps Control Center application.

## Prerequisites

### Required Software

1. **Node.js** (v18.0.0 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

2. **Git** (latest version)
   - Download from [git-scm.com](https://git-scm.com/)
   - Configure with your GitHub credentials

3. **Code Editor** (recommended: VS Code)
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)
   - Install recommended extensions (see below)

### Optional Tools

1. **GitHub CLI** (for enhanced GitHub integration)
   - Install: `npm install -g @github/cli`
   - Authenticate: `gh auth login`

2. **Docker** (for container management features)
   - Download from [docker.com](https://www.docker.com/)
   - Required for Docker management features

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/hardikkanajariya/DevOps-Control-Center.git
cd DevOps-Control-Center
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies for both the main and renderer processes.

### 3. Environment Configuration

Create a `.env` file in the root directory (optional):

```bash
# Development settings
NODE_ENV=development
ELECTRON_IS_DEV=true

# GitHub API settings (optional)
GITHUB_API_URL=https://api.github.com

# Auto-updater settings
GITHUB_OWNER=hardikkanajariya
GITHUB_REPO=DevOps-Control-Center
```

## Development Workflow

### Starting Development Server

```bash
npm run dev
```

This command:
1. Starts Vite development server for the renderer process
2. Compiles the main process TypeScript
3. Launches Electron with hot reload enabled

### Available Scripts

```bash
# Development
npm run dev              # Start development environment
npm run dev:vite        # Start only Vite dev server
npm run dev:electron    # Start only Electron (requires Vite to be running)

# Building
npm run build           # Build both main and renderer
npm run build:main      # Build main process only
npm run build:renderer  # Build renderer process only
npm run build:electron  # Create distributable packages

# Testing
npm run test           # Run all tests
npm run test:ui        # Run tests with UI
npm run test:coverage  # Run tests with coverage report
npm run test:run       # Run tests once (CI mode)

# Other
npm run preview        # Preview production build
```

## Project Structure

```
DevOps-Control-Center/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Application entry point
│   │   ├── preload.ts       # Preload script for IPC
│   │   └── services/        # Backend services
│   │       ├── AuthService.ts
│   │       ├── GitHubService.ts
│   │       ├── DatabaseService.ts
│   │       └── AutoUpdaterService.ts
│   ├── renderer/            # React application
│   │   ├── components/      # React components
│   │   ├── views/          # Page components
│   │   ├── store/          # Redux store and slices
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Utility functions
│   ├── shared/             # Shared types and utilities
│   │   └── types.ts        # TypeScript type definitions
│   └── test/               # Test files and utilities
│       ├── setup.ts        # Test setup configuration
│       ├── utils.tsx       # Test utilities
│       ├── components/     # Component tests
│       └── store/          # Store tests
├── docs/                   # Documentation
├── dist/                   # Built files (generated)
├── dist-electron/          # Electron distributables (generated)
└── public/                 # Static assets
```

## Architecture Overview

### Main Process (`src/main/`)

The main process is responsible for:
- Application lifecycle management
- IPC (Inter-Process Communication) handlers
- Backend services (GitHub API, database, etc.)
- System integrations (file system, SSH, etc.)

Key files:
- `main.ts`: Application entry point and window management
- `preload.ts`: Secure IPC bridge between main and renderer
- `services/`: Backend service implementations

### Renderer Process (`src/renderer/`)

The renderer process contains the React application:
- Component-based UI architecture
- Redux for state management
- TypeScript for type safety
- Tailwind CSS for styling

Key directories:
- `components/`: Reusable UI components
- `views/`: Page-level components
- `store/`: Redux store configuration and slices
- `hooks/`: Custom React hooks

### Shared Code (`src/shared/`)

Common code used by both processes:
- TypeScript type definitions
- Constants and enums
- Utility functions

## Development Guidelines

### Code Style

1. **TypeScript**: All code must be written in TypeScript
2. **ESLint**: Follow the configured ESLint rules
3. **Prettier**: Use Prettier for code formatting
4. **Naming Conventions**:
   - Components: PascalCase (e.g., `UserProfile`)
   - Files: PascalCase for components, camelCase for utilities
   - Variables: camelCase
   - Constants: UPPER_SNAKE_CASE

### Component Guidelines

1. **Functional Components**: Use function components with hooks
2. **Props Interface**: Define TypeScript interfaces for all props
3. **Default Exports**: Use default exports for components
4. **File Structure**:
   ```typescript
   import { useState, useEffect } from 'react';
   
   interface ComponentProps {
     prop1: string;
     prop2?: number;
   }
   
   export default function Component({ prop1, prop2 }: ComponentProps) {
     // Component implementation
   }
   ```

### State Management

1. **Redux Toolkit**: Use RTK for global state
2. **Local State**: Use useState for component-local state
3. **Async Actions**: Use createAsyncThunk for API calls
4. **Slice Structure**:
   ```typescript
   interface StateInterface {
     data: DataType[];
     loading: boolean;
     error: string | null;
   }
   
   const slice = createSlice({
     name: 'feature',
     initialState,
     reducers: {
       // Sync actions
     },
     extraReducers: (builder) => {
       // Async actions
     }
   });
   ```

### IPC Communication

1. **Type Safety**: All IPC calls must be typed
2. **Error Handling**: Always handle IPC errors gracefully
3. **Response Format**: Use consistent response format:
   ```typescript
   interface IPCResponse<T = any> {
     success: boolean;
     data?: T;
     error?: string;
   }
   ```

## Testing

### Test Structure

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user workflows (future)

### Testing Utilities

Located in `src/test/`:
- `setup.ts`: Test environment configuration
- `utils.tsx`: Testing utilities and custom render function
- Mock data generators for consistent testing

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../utils';
import Component from '../../renderer/components/Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- Component.test.tsx
```

## Debugging

### Development Tools

1. **Electron DevTools**: Press F12 to open DevTools
2. **React DevTools**: Install browser extension
3. **Redux DevTools**: Install browser extension
4. **VS Code Debugger**: Use the configured debug settings

### Debug Configuration (VS Code)

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": [".", "--remote-debugging-port=9222"],
      "outputCapture": "std",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Debugging Tips

1. **Console Logging**: Use `console.log()` for quick debugging
2. **Breakpoints**: Set breakpoints in VS Code or DevTools
3. **Network Tab**: Monitor API calls in DevTools
4. **Redux DevTools**: Track state changes
5. **Error Boundaries**: Implement for better error handling

## Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
npm run build:renderer
npx vite-bundle-analyzer dist/
```

### Performance Guidelines

1. **Lazy Loading**: Use dynamic imports for large components
2. **Memoization**: Use React.memo, useMemo, useCallback appropriately
3. **Virtual Scrolling**: Implement for large lists
4. **Image Optimization**: Use appropriate image formats and sizes

### Memory Management

1. **Cleanup**: Always cleanup timers, listeners, and subscriptions
2. **Memory Monitoring**: Use the built-in memory utilities
3. **Efficient Re-renders**: Minimize unnecessary re-renders

## Building and Distribution

### Development Build

```bash
npm run build
```

### Production Build

```bash
# Set environment
export NODE_ENV=production

# Build application
npm run build

# Create distributable
npm run build:electron
```

### Platform-specific Builds

```bash
# Windows
npm run build:electron -- --win

# macOS
npm run build:electron -- --mac

# Linux
npm run build:electron -- --linux
```

## Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes with proper tests
4. Run tests: `npm run test`
5. Build and verify: `npm run build`
6. Commit with conventional commits format
7. Push and create pull request

### Commit Message Format

```
type(scope): description

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Code Review Guidelines

1. All code must pass tests and type checking
2. Follow established patterns and conventions
3. Include appropriate documentation
4. Consider performance implications
5. Ensure backward compatibility

## Troubleshooting

### Common Issues

1. **Module Resolution Errors**:
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear cache: `npm cache clean --force`

2. **TypeScript Errors**:
   - Check tsconfig.json configuration
   - Ensure all dependencies are typed

3. **Build Failures**:
   - Check for TypeScript errors
   - Verify all imports are correct
   - Clear dist directories

4. **Electron Issues**:
   - Check Electron version compatibility
   - Verify preload script configuration
   - Test IPC communication

### Getting Help

1. Check existing GitHub issues
2. Review documentation thoroughly
3. Ask in development Discord/Slack
4. Create detailed bug reports

## Resources

### Documentation

- [Electron Documentation](https://electronjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Handbook](https://typescriptlang.org/docs)
- [Vite Documentation](https://vitejs.dev/guide)
- [Vitest Documentation](https://vitest.dev/guide)

### Tools and Extensions

#### VS Code Extensions

- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

#### Browser Extensions

- React Developer Tools
- Redux DevTools

---

**Happy Coding!** 🚀

For questions or support, contact the development team or create an issue on GitHub.
