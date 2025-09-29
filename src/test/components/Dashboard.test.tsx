import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../utils';
import Dashboard from '../../renderer/views/Dashboard';

type MockServiceStatus = {
    name: string;
    status: 'running' | 'stopped' | 'error';
    uptime: number;
    lastCheck: string;
};

type MockSystemHealth = {
    cpu: number;
    memory: number;
    disk: number;
    network: 'online' | 'offline' | 'limited';
    services: MockServiceStatus[];
};

type MockState = {
    auth: {
        user: {
            id: number;
            login: string;
            name?: string;
            email?: string;
            avatar_url: string;
            html_url: string;
            type: string;
            public_repos: number;
            followers: number;
            following: number;
        } | null;
    };
    dashboard: {
        stats: {
            repositoriesCount: number;
            successfulDeployments: number;
            activePipelines: number;
            connectedServers: number;
            recentActivity: any[];
            systemHealth: MockSystemHealth;
            deploymentMetrics: {
                totalDeployments: number;
                successRate: number;
                averageDeployTime: number;
                deploymentsToday: number;
                failedDeployments: number;
            };
        } | null;
        recentActivity: any[];
        systemHealth: MockSystemHealth | null;
        loading: boolean;
        error: string | null;
        lastUpdated: string | null;
        autoRefresh: boolean;
        refreshInterval: number;
    };
};

const mockDispatch = vi.fn();
const mockUseAppSelector = vi.fn();

vi.mock('../../renderer/hooks/redux', () => ({
    useAppDispatch: () => mockDispatch,
    useAppSelector: (selector: (state: MockState) => unknown) => mockUseAppSelector(selector)
}));

const baseState: MockState = {
    auth: {
        user: {
            id: 123,
            login: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            avatar_url: 'https://github.com/avatar.jpg',
            html_url: 'https://github.com/testuser',
            type: 'User',
            public_repos: 10,
            followers: 5,
            following: 8
        }
    },
    dashboard: {
        stats: {
            repositoriesCount: 8,
            successfulDeployments: 25,
            activePipelines: 4,
            connectedServers: 3,
            recentActivity: [],
            systemHealth: {
                cpu: 38,
                memory: 62,
                disk: 71,
                network: 'online',
                services: [
                    { name: 'GitHub API', status: 'running', uptime: 7200000, lastCheck: '2024-09-01T12:00:00.000Z' }
                ]
            },
            deploymentMetrics: {
                totalDeployments: 30,
                successRate: 91.3,
                averageDeployTime: 185,
                deploymentsToday: 3,
                failedDeployments: 2
            }
        },
        recentActivity: [],
        systemHealth: {
            cpu: 38,
            memory: 62,
            disk: 71,
            network: 'online',
            services: [
                { name: 'GitHub API', status: 'running', uptime: 7200000, lastCheck: '2024-09-01T12:00:00.000Z' }
            ]
        },
        loading: false,
        error: null,
        lastUpdated: '2024-09-01T12:00:00.000Z',
        autoRefresh: true,
        refreshInterval: 30000
    }
};

let currentState: MockState;

const resetMockState = () => {
    currentState = JSON.parse(JSON.stringify(baseState));
};

describe('Dashboard', () => {
    const mockOnNavigate = vi.fn();

    beforeEach(() => {
        mockOnNavigate.mockClear();
        mockDispatch.mockReset();
        mockDispatch.mockReturnValue(Promise.resolve());
        resetMockState();
        mockUseAppSelector.mockReset();
        mockUseAppSelector.mockImplementation((selector: (state: MockState) => unknown) => selector(currentState));
    });

    it('should render welcome message with user name', () => {
        render(<Dashboard onNavigate={mockOnNavigate} />);

        expect(screen.getByText(/Welcome back, Test User!/)).toBeInTheDocument();
        expect(screen.getByText(/Here's what's happening with your projects today/)).toBeInTheDocument();
    });

    it('should render stats cards', () => {
        render(<Dashboard onNavigate={mockOnNavigate} />);

        expect(screen.getByText('Repositories')).toBeInTheDocument();
        expect(screen.getByText('Successful Deployments')).toBeInTheDocument();
        expect(screen.getByText('Active Pipelines')).toBeInTheDocument();
        expect(screen.getByText('Connected Servers')).toBeInTheDocument();
    });

    it('should render quick actions', () => {
        render(<Dashboard onNavigate={mockOnNavigate} />);

        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
        expect(screen.getByText('Add New Repository')).toBeInTheDocument();
        expect(screen.getByText('View Real-time Monitoring')).toBeInTheDocument();
        expect(screen.getByText('Manage Docker Containers')).toBeInTheDocument();
        expect(screen.getByText('Database Management')).toBeInTheDocument();
        expect(screen.getByText('Create Visual Workflow')).toBeInTheDocument();
    });

    it('should handle navigation clicks', () => {
        render(<Dashboard onNavigate={mockOnNavigate} />);

        fireEvent.click(screen.getByText('Add New Repository'));
        expect(mockOnNavigate).toHaveBeenCalledWith('repositories');

        fireEvent.click(screen.getByText('View Real-time Monitoring'));
        expect(mockOnNavigate).toHaveBeenCalledWith('monitoring');

        fireEvent.click(screen.getByText('Manage Docker Containers'));
        expect(mockOnNavigate).toHaveBeenCalledWith('docker');

        fireEvent.click(screen.getByText('Database Management'));
        expect(mockOnNavigate).toHaveBeenCalledWith('database');

        fireEvent.click(screen.getByText('Create Visual Workflow'));
        expect(mockOnNavigate).toHaveBeenCalledWith('workflows');
    });

    it('should render recent activity section', () => {
        render(<Dashboard onNavigate={mockOnNavigate} />);

        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });

    it('should handle user without name', () => {
        if (currentState.auth.user) {
            currentState.auth.user.name = undefined;
        }

        render(<Dashboard onNavigate={mockOnNavigate} />);

        expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
        expect(screen.getByText(/testuser/)).toBeInTheDocument();
    });

    it('should handle no user', () => {
        currentState.auth.user = null;

        render(<Dashboard onNavigate={mockOnNavigate} />);

        expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
    });
});
