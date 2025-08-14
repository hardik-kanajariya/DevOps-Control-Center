import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Electron APIs
(global as any).electronAPI = {
    auth: {
        setToken: vi.fn(),
        getToken: vi.fn(),
        clearToken: vi.fn(),
        validateToken: vi.fn()
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
    }
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
