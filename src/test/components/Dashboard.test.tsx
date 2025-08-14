import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../utils';
import Dashboard from '../../renderer/views/Dashboard';

// Mock the redux hooks
vi.mock('../../renderer/hooks/redux', () => ({
    useAppSelector: vi.fn(() => ({
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
    }))
}));

describe('Dashboard', () => {
    const mockOnNavigate = vi.fn();

    beforeEach(() => {
        mockOnNavigate.mockClear();
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

        // Test repository navigation
        fireEvent.click(screen.getByText('Add New Repository'));
        expect(mockOnNavigate).toHaveBeenCalledWith('repositories');

        // Test monitoring navigation
        fireEvent.click(screen.getByText('View Real-time Monitoring'));
        expect(mockOnNavigate).toHaveBeenCalledWith('monitoring');

        // Test docker navigation
        fireEvent.click(screen.getByText('Manage Docker Containers'));
        expect(mockOnNavigate).toHaveBeenCalledWith('docker');

        // Test database navigation
        fireEvent.click(screen.getByText('Database Management'));
        expect(mockOnNavigate).toHaveBeenCalledWith('database');

        // Test workflows navigation
        fireEvent.click(screen.getByText('Create Visual Workflow'));
        expect(mockOnNavigate).toHaveBeenCalledWith('workflows');
    });

    it('should render recent activity section', () => {
        render(<Dashboard onNavigate={mockOnNavigate} />);

        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });

    it('should handle user without name', () => {
        // Override the mock for this test
        vi.doMock('../../renderer/hooks/redux', () => ({
            useAppSelector: vi.fn(() => ({
                user: {
                    id: 123,
                    login: 'testuser',
                    avatar_url: 'https://github.com/avatar.jpg',
                    html_url: 'https://github.com/testuser',
                    type: 'User',
                    public_repos: 10,
                    followers: 5,
                    following: 8
                }
            }))
        }));

        render(<Dashboard onNavigate={mockOnNavigate} />);
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
        expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should handle no user', () => {
        // Override the mock for this test
        vi.doMock('../../renderer/hooks/redux', () => ({
            useAppSelector: vi.fn(() => ({
                user: null
            }))
        }));

        render(<Dashboard onNavigate={mockOnNavigate} />);
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });
});
