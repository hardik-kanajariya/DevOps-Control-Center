import { ipcMain } from 'electron';
import { AuthService } from '../services/auth';
import { GitHubService } from '../services/github';
import { DashboardService } from '../services/dashboard';
import { RepositoryService } from '../services/repository';
import { WorkflowService } from '../services/workflow';
import { DatabaseManagementService } from '../services/databaseManagement';
import { IPCResponse } from '../../shared/types';

export function registerIPCHandlers(): void {
    // Authentication handlers
    ipcMain.handle('auth:set-token', async (_, token: string): Promise<IPCResponse> => {
        try {
            await AuthService.setToken(token);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('auth:get-token', async (): Promise<IPCResponse<string | null>> => {
        try {
            const token = await AuthService.getToken();
            return { success: true, data: token };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('auth:validate-token', async (): Promise<IPCResponse<boolean>> => {
        try {
            const isValid = await AuthService.validateToken();
            return { success: true, data: isValid };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('auth:clear', async (): Promise<IPCResponse> => {
        try {
            await AuthService.clearAuth();
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('auth:check', async (): Promise<IPCResponse<{ isAuthenticated: boolean; user?: any }>> => {
        try {
            const isValid = await AuthService.validateToken();
            if (isValid) {
                const user = await AuthService.getCurrentUser();
                return { success: true, data: { isAuthenticated: true, user } };
            }
            return { success: true, data: { isAuthenticated: false } };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Repository handlers
    ipcMain.handle('repos:list', async (): Promise<IPCResponse> => {
        try {
            const repos = await RepositoryService.getRepositories();
            return { success: true, data: repos };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:get', async (_, repoName: string): Promise<IPCResponse> => {
        try {
            const repo = await RepositoryService.getRepository(repoName);
            return { success: true, data: repo };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:clone', async (_, repoUrl: string, localPath: string): Promise<IPCResponse> => {
        try {
            await RepositoryService.cloneRepository(repoUrl, localPath);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:search', async (_, query: string, filters?: any): Promise<IPCResponse> => {
        try {
            const repos = await RepositoryService.searchRepositories(query, filters);
            return { success: true, data: repos };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:analytics', async (_, repoName: string): Promise<IPCResponse> => {
        try {
            const analytics = await RepositoryService.getRepositoryAnalytics(repoName);
            return { success: true, data: analytics };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:workflows', async (_, repoName: string): Promise<IPCResponse> => {
        try {
            const workflows = await RepositoryService.getRepositoryWorkflows(repoName);
            return { success: true, data: workflows };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:open-browser', async (_, htmlUrl: string): Promise<IPCResponse> => {
        try {
            await RepositoryService.openRepositoryInBrowser(htmlUrl);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:check-local', async (_, localPath: string): Promise<IPCResponse> => {
        try {
            const exists = await RepositoryService.checkLocalRepository(localPath);
            return { success: true, data: exists };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Dashboard handlers
    ipcMain.handle('dashboard:get-stats', async (): Promise<IPCResponse> => {
        try {
            const stats = await DashboardService.getDashboardStats();
            return { success: true, data: stats };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('dashboard:get-recent-activity', async (_, limit?: number): Promise<IPCResponse> => {
        try {
            const activity = DashboardService.getRecentActivity(limit);
            return { success: true, data: activity };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('dashboard:get-system-health', async (): Promise<IPCResponse> => {
        try {
            const health = await DashboardService.getSystemHealth();
            return { success: true, data: health };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('dashboard:refresh-stats', async (): Promise<IPCResponse> => {
        try {
            const stats = await DashboardService.refreshStats();
            return { success: true, data: stats };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Workflow handlers
    ipcMain.handle('workflows:list-all', async (): Promise<IPCResponse> => {
        try {
            const workflows = await WorkflowService.getInstance().getAllWorkflowRuns();
            return { success: true, data: workflows };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('workflows:list-repo', async (_, owner: string, repo: string): Promise<IPCResponse> => {
        try {
            const workflows = await WorkflowService.getInstance().getRepositoryWorkflowRuns(owner, repo);
            return { success: true, data: workflows };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('workflows:get-yaml', async (_, owner: string, repo: string, workflowId: number): Promise<IPCResponse> => {
        try {
            const yaml = await WorkflowService.getInstance().getWorkflowYAML(owner, repo, workflowId);
            return { success: true, data: yaml };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('workflows:cancel', async (_, owner: string, repo: string, runId: number): Promise<IPCResponse> => {
        try {
            await WorkflowService.getInstance().cancelWorkflowRun(owner, repo, runId);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('workflows:rerun', async (_, owner: string, repo: string, runId: number): Promise<IPCResponse> => {
        try {
            await WorkflowService.getInstance().rerunWorkflow(owner, repo, runId);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('workflows:open-browser', async (_, htmlUrl: string): Promise<IPCResponse> => {
        try {
            await WorkflowService.getInstance().openWorkflowInBrowser(htmlUrl);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Database Management handlers
    ipcMain.handle('database:get-connections', async (): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().getAllConnections();
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:create-connection', async (_, connectionData: any): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().createConnection(connectionData);
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:test-connection', async (_, connectionId: string): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().testConnection(connectionId);
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:delete-connection', async (_, connectionId: string): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().deleteConnection(connectionId);
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:get-tables', async (_, connectionId: string): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().getConnectionTables(connectionId);
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:execute-query', async (_, connectionId: string, query: string): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().executeQuery(connectionId, query);
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:get-metrics', async (): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().getDatabaseMetrics();
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:get-health', async (): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().getDatabaseHealth();
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:get-query-history', async (): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().getQueryHistory();
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:export-data', async (_, connectionId: string, format: string): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().exportData(connectionId, format as 'sql' | 'json' | 'csv');
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('database:open-external', async (_, connectionId: string): Promise<IPCResponse> => {
        try {
            const result = await DatabaseManagementService.getInstance().openDatabaseInExternal(connectionId);
            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    console.log('IPC handlers registered');
}
