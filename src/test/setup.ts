import '@testing-library/jest-dom';
import { vi } from 'vitest';

const createSuccessResponse = <T>(data?: T) => ({ success: true, data });

const mockDashboardStats = {
    repositoriesCount: 12,
    successfulDeployments: 34,
    activePipelines: 4,
    connectedServers: 5,
    recentActivity: [],
    systemHealth: {
        cpu: 42,
        memory: 58,
        disk: 67,
        network: 'online' as const,
        services: [
            { name: 'GitHub API', status: 'running' as const, uptime: 86400000, lastCheck: new Date().toISOString() }
        ]
    },
    deploymentMetrics: {
        totalDeployments: 40,
        successRate: 92.5,
        averageDeployTime: 210,
        deploymentsToday: 3,
        failedDeployments: 3
    }
};

// Mock Electron APIs
(global as any).electronAPI = {
    auth: {
        setToken: vi.fn().mockResolvedValue(createSuccessResponse()),
        getToken: vi.fn().mockResolvedValue(createSuccessResponse('mock-token')),
        validateToken: vi.fn().mockResolvedValue(createSuccessResponse(true)),
        clear: vi.fn().mockResolvedValue(createSuccessResponse()),
        check: vi.fn().mockResolvedValue(createSuccessResponse({ isAuthenticated: true, user: { login: 'testuser' } }))
    },
    github: {
        getRepositories: vi.fn(),
        getRepository: vi.fn(),
        getWorkflows: vi.fn(),
        createWorkflow: vi.fn(),
        updateWorkflow: vi.fn(),
        deleteWorkflow: vi.fn()
    },
    store: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn()
    },
    database: {
        init: vi.fn(),
        query: vi.fn(),
        close: vi.fn()
    },
    dashboard: {
        getStats: vi.fn().mockResolvedValue(createSuccessResponse(mockDashboardStats)),
        getRecentActivity: vi.fn().mockResolvedValue(createSuccessResponse([])),
        getSystemHealth: vi.fn().mockResolvedValue(createSuccessResponse(mockDashboardStats.systemHealth)),
        refreshStats: vi.fn().mockResolvedValue(createSuccessResponse(mockDashboardStats))
    },
    servers: {
        list: vi.fn().mockResolvedValue(createSuccessResponse([])),
        add: vi.fn().mockResolvedValue(createSuccessResponse()),
        update: vi.fn().mockResolvedValue(createSuccessResponse()),
        delete: vi.fn().mockResolvedValue(createSuccessResponse()),
        connect: vi.fn().mockResolvedValue(createSuccessResponse()),
        disconnect: vi.fn().mockResolvedValue(createSuccessResponse()),
        executeCommand: vi.fn().mockResolvedValue(createSuccessResponse({ stdout: '', stderr: '', code: 0 })),
        getStats: vi.fn().mockResolvedValue(createSuccessResponse({})),
        getLogs: vi.fn().mockResolvedValue(createSuccessResponse('')),
        testConnection: vi.fn().mockResolvedValue(createSuccessResponse()),
        testConnectionDetailed: vi.fn().mockResolvedValue(createSuccessResponse({
            success: true,
            host: 'example.com',
            username: 'deploy',
            authenticationType: 'key',
            osInfo: 'Ubuntu 22.04'
        })),
        directDeploy: vi.fn().mockResolvedValue(createSuccessResponse()),
        uploadPublicKey: vi.fn().mockResolvedValue(createSuccessResponse()),
        detectDeployPaths: vi.fn().mockResolvedValue(createSuccessResponse([
            { path: '/var/www/html', type: 'webroot', exists: true, writable: true, description: 'Apache default' }
        ])),
        setupPermissions: vi.fn().mockResolvedValue(createSuccessResponse()),
        createGitHooks: vi.fn().mockResolvedValue(createSuccessResponse())
    },
    sshKeys: {
        generate: vi.fn().mockResolvedValue(createSuccessResponse({
            name: 'test-key',
            type: 'ed25519',
            privateKeyPath: '/path/to/key',
            publicKeyPath: '/path/to/key.pub',
            publicKey: 'ssh-ed25519 AAAA...',
            fingerprint: 'SHA256:...',
            createdAt: new Date().toISOString(),
            hasPassphrase: false
        })),
        list: vi.fn().mockResolvedValue(createSuccessResponse([])),
        get: vi.fn().mockResolvedValue(createSuccessResponse(null)),
        delete: vi.fn().mockResolvedValue(createSuccessResponse()),
        import: vi.fn().mockResolvedValue(createSuccessResponse())
    },
    workflows: {
        listAll: vi.fn().mockResolvedValue(createSuccessResponse([])),
        listRepo: vi.fn().mockResolvedValue(createSuccessResponse([])),
        getYAML: vi.fn().mockResolvedValue(createSuccessResponse('')),
        cancel: vi.fn().mockResolvedValue(createSuccessResponse()),
        rerun: vi.fn().mockResolvedValue(createSuccessResponse()),
        openBrowser: vi.fn().mockResolvedValue(createSuccessResponse())
    },
    repos: {
        list: vi.fn().mockResolvedValue(createSuccessResponse([])),
        get: vi.fn().mockResolvedValue(createSuccessResponse({})),
        clone: vi.fn().mockResolvedValue(createSuccessResponse()),
        search: vi.fn().mockResolvedValue(createSuccessResponse([])),
        analytics: vi.fn().mockResolvedValue(createSuccessResponse({})),
        workflows: vi.fn().mockResolvedValue(createSuccessResponse([])),
        openBrowser: vi.fn().mockResolvedValue(createSuccessResponse()),
        checkLocal: vi.fn().mockResolvedValue(createSuccessResponse(false)),
        addDeployKey: vi.fn().mockResolvedValue(createSuccessResponse({
            id: 1,
            key: 'ssh-ed25519 AAAA...',
            url: 'https://api.github.com/repos/user/repo/keys/1',
            title: 'Deploy Key',
            verified: true,
            created_at: new Date().toISOString(),
            read_only: true
        })),
        listDeployKeys: vi.fn().mockResolvedValue(createSuccessResponse([])),
        deleteDeployKey: vi.fn().mockResolvedValue(createSuccessResponse())
    },
    notifications: {
        show: vi.fn().mockResolvedValue(createSuccessResponse())
    },
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    platform: 'test'
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
    value: (global as any).electronAPI,
    writable: true
});

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// Mock IntersectionObserver
(global as any).IntersectionObserver = class MockIntersectionObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
};

// Mock ResizeObserver
(global as any).ResizeObserver = class MockResizeObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
};

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
    default: vi.fn(() => null),
    Editor: vi.fn(() => null)
}));
