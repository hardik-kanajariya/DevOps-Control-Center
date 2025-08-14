import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { store } from '../renderer/store/index';

// Custom render function that includes providers
const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );

    return render(ui, { wrapper: Wrapper, ...options });
};

// Mock data generators
export const mockRepository = {
    id: 123456789,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    private: false,
    description: 'A test repository',
    clone_url: 'https://github.com/testuser/test-repo.git',
    ssh_url: 'git@github.com:testuser/test-repo.git',
    html_url: 'https://github.com/testuser/test-repo',
    default_branch: 'main',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-08-14T00:00:00Z',
    pushed_at: '2024-08-14T00:00:00Z',
    language: 'TypeScript',
    stargazers_count: 42,
    forks_count: 5,
    open_issues_count: 3
};

export const mockWorkflow = {
    id: 987654321,
    name: 'CI/CD Pipeline',
    path: '.github/workflows/ci.yml',
    state: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-08-14T00:00:00Z',
    url: 'https://api.github.com/repos/testuser/test-repo/actions/workflows/987654321',
    html_url: 'https://github.com/testuser/test-repo/actions/workflows/ci.yml',
    badge_url: 'https://github.com/testuser/test-repo/workflows/CI%2FCD%20Pipeline/badge.svg'
};

export const mockServer = {
    id: '1',
    name: 'Production Server',
    host: '192.168.1.100',
    port: 22,
    username: 'root',
    status: 'connected' as const,
    lastConnected: '2024-08-14T10:00:00Z',
    services: [
        { name: 'nginx', status: 'running' as const, port: 80 },
        { name: 'docker', status: 'running' as const },
        { name: 'postgresql', status: 'running' as const, port: 5432 }
    ]
};

export const mockPipeline = {
    id: 456789123,
    name: 'Deploy to Production',
    status: 'success' as const,
    conclusion: 'success' as const,
    head_branch: 'main',
    head_sha: 'abc123def456',
    run_number: 42,
    created_at: '2024-08-14T10:00:00Z',
    updated_at: '2024-08-14T10:05:00Z',
    jobs_url: 'https://api.github.com/repos/testuser/test-repo/actions/runs/456789123/jobs',
    logs_url: 'https://api.github.com/repos/testuser/test-repo/actions/runs/456789123/logs'
};

export const mockMetrics = {
    cpu: Array.from({ length: 60 }, (_, i) => ({
        timestamp: Date.now() - (60 - i) * 1000,
        value: Math.random() * 100
    })),
    memory: Array.from({ length: 60 }, (_, i) => ({
        timestamp: Date.now() - (60 - i) * 1000,
        value: Math.random() * 100
    })),
    disk: Array.from({ length: 60 }, (_, i) => ({
        timestamp: Date.now() - (60 - i) * 1000,
        value: Math.random() * 100
    })),
    network: {
        upload: Array.from({ length: 60 }, (_, i) => ({
            timestamp: Date.now() - (60 - i) * 1000,
            value: Math.random() * 1000
        })),
        download: Array.from({ length: 60 }, (_, i) => ({
            timestamp: Date.now() - (60 - i) * 1000,
            value: Math.random() * 1000
        }))
    }
};

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };
