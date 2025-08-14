import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../utils';
import Sidebar from '../../renderer/components/layout/Sidebar';

describe('Sidebar', () => {
    const mockOnViewChange = vi.fn();
    const mockOnToggleCollapse = vi.fn();

    const defaultProps = {
        currentView: 'dashboard',
        onViewChange: mockOnViewChange,
        collapsed: false,
        onToggleCollapse: mockOnToggleCollapse
    };

    beforeEach(() => {
        mockOnViewChange.mockClear();
        mockOnToggleCollapse.mockClear();
    });

    it('should render all menu items', () => {
        render(<Sidebar {...defaultProps} />);

        // Check that all navigation items are present via aria-label
        expect(screen.getByLabelText('Dashboard')).toBeInTheDocument();
        expect(screen.getByLabelText('Repositories')).toBeInTheDocument();
        expect(screen.getByLabelText('Workflows')).toBeInTheDocument();
        expect(screen.getByLabelText('Pipelines')).toBeInTheDocument();
        expect(screen.getByLabelText('Servers')).toBeInTheDocument();
        expect(screen.getByLabelText('Monitoring')).toBeInTheDocument();
        expect(screen.getByLabelText('Docker')).toBeInTheDocument();
        expect(screen.getByLabelText('Database')).toBeInTheDocument();
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('should highlight current view', () => {
        render(<Sidebar {...defaultProps} currentView="monitoring" />);

        const monitoringButton = screen.getByLabelText('Monitoring');
        expect(monitoringButton).toHaveClass('bg-primary-100', 'text-primary-600');
    });

    it('should handle menu item clicks', () => {
        render(<Sidebar {...defaultProps} />);

        fireEvent.click(screen.getByLabelText('Repositories'));
        expect(mockOnViewChange).toHaveBeenCalledWith('repositories');

        fireEvent.click(screen.getByLabelText('Monitoring'));
        expect(mockOnViewChange).toHaveBeenCalledWith('monitoring');

        fireEvent.click(screen.getByLabelText('Docker'));
        expect(mockOnViewChange).toHaveBeenCalledWith('docker');

        fireEvent.click(screen.getByLabelText('Database'));
        expect(mockOnViewChange).toHaveBeenCalledWith('database');
    });

    it('should render in collapsed state', () => {
        render(<Sidebar {...defaultProps} collapsed={true} />);

        // In collapsed state, sidebar should be narrow
        const sidebar = screen.getByLabelText('Main navigation');
        expect(sidebar).toHaveClass('w-16');

        // Text should be hidden in collapsed state
        expect(screen.queryByText('DevOps')).not.toBeInTheDocument();
        expect(screen.queryByText('Control Center')).not.toBeInTheDocument();
    });

    it('should render in expanded state', () => {
        render(<Sidebar {...defaultProps} collapsed={false} />);

        // In expanded state, sidebar should be wider
        const sidebar = screen.getByLabelText('Main navigation');
        expect(sidebar).toHaveClass('w-64');

        // Text should be visible in expanded state
        expect(screen.getByText('DevOps')).toBeInTheDocument();
        expect(screen.getByText('Control Center')).toBeInTheDocument();
    });

    it('should show tooltips in collapsed state', () => {
        render(<Sidebar {...defaultProps} collapsed={true} />);

        // Tooltips should be present for collapsed state
        const dashboardButton = screen.getByLabelText('Dashboard');
        expect(dashboardButton).toHaveAttribute('title', 'Dashboard');

        const repositoriesButton = screen.getByLabelText('Repositories');
        expect(repositoriesButton).toHaveAttribute('title', 'Repositories');
    });

    it('should not show tooltips in expanded state', () => {
        render(<Sidebar {...defaultProps} collapsed={false} />);

        // Tooltips should not be present for expanded state
        const dashboardButton = screen.getByLabelText('Dashboard');
        expect(dashboardButton).not.toHaveAttribute('title');
    });

    it('should maintain active state styling', () => {
        render(<Sidebar {...defaultProps} currentView="workflows" />);

        const workflowsButton = screen.getByLabelText('Workflows');
        expect(workflowsButton).toHaveClass('bg-primary-100', 'text-primary-600');

        // Other items should not have active styling
        const repositoriesButton = screen.getByLabelText('Repositories');
        expect(repositoriesButton).not.toHaveClass('bg-primary-100');
        expect(repositoriesButton).toHaveClass('text-gray-600');
    });
});
