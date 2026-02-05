import { app } from 'electron';
import { AuthService } from './auth';
import { GitHubService } from './github';
import { DatabaseService } from './database';
import { DashboardService } from './dashboard';
import { RepositoryService } from './repository';
import { WorkflowService } from './workflow';
import { DatabaseManagementService } from './databaseManagement';
import { serverManagementService } from './serverManagement';
import { AutoUpdaterService } from './AutoUpdaterService';

// Export auto updater service instance for use in main process
export const autoUpdaterService = new AutoUpdaterService();

export async function initializeServices(): Promise<void> {
    try {
        // Initialize database first
        await DatabaseService.initialize();

        // Initialize auth service
        await AuthService.initialize();

        // Initialize other services
        GitHubService.initialize();
        DashboardService.initialize();
        RepositoryService.initialize();
        WorkflowService.initialize();
        DatabaseManagementService.initialize();

        // Server management service is automatically initialized via constructor
        console.log('ServerManagementService initialized');

        // Auto updater service is initialized via constructor (IPC handlers registered)
        console.log('AutoUpdaterService initialized');

        console.log('All services initialized successfully');
    } catch (error) {
        console.error('Failed to initialize services:', error);
        app.quit();
    }
}
