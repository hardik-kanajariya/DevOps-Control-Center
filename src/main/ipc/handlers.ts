import { BrowserWindow, ipcMain } from 'electron';
import { AuthService } from '../services/auth';
import { GitHubService } from '../services/github';
import { DashboardService } from '../services/dashboard';
import { RepositoryService } from '../services/repository';
import { WorkflowService } from '../services/workflow';
import { DatabaseManagementService } from '../services/databaseManagement';
import { serverManagementService } from '../services/serverManagement';
import { sshKeyService } from '../services/sshKeyService';
import {
    DirectDeploymentRequest,
    DirectDeploymentResult,
    IPCResponse,
    ServerStats,
    ServerStatusPayload,
    VPSServer,
    SSHKeyGenerationOptions,
    SSHKeyInfo,
    SSHConnectionTestResult,
    SuggestedDeployPath,
    PermissionConfig,
    GitHubDeployKey
} from '../../shared/types';

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

    ipcMain.handle('workflows:get-jobs', async (_, owner: string, repo: string, runId: number): Promise<IPCResponse> => {
        try {
            const jobs = await WorkflowService.getInstance().getWorkflowJobs(owner, repo, runId);
            return { success: true, data: jobs };
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

    // Server Management handlers
    ipcMain.handle('servers:list', async (): Promise<IPCResponse<VPSServer[]>> => {
        try {
            const servers = await serverManagementService.getServers();
            return { success: true, data: servers };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:add', async (_, serverData: Omit<VPSServer, 'id' | 'status'>): Promise<IPCResponse<VPSServer>> => {
        try {
            const server = await serverManagementService.addServer(serverData);
            return { success: true, data: server };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:update', async (_, serverId: string, updates: Partial<VPSServer>): Promise<IPCResponse<VPSServer>> => {
        try {
            const server = await serverManagementService.updateServer(serverId, updates);
            return { success: true, data: server };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:delete', async (_, serverId: string): Promise<IPCResponse> => {
        try {
            await serverManagementService.deleteServer(serverId);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:connect', async (_, serverId: string): Promise<IPCResponse> => {
        try {
            const result = await serverManagementService.connectToServer(serverId);
            return result.success ? { success: true } : { success: false, error: result.error };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:disconnect', async (_, serverId: string): Promise<IPCResponse> => {
        try {
            await serverManagementService.disconnectFromServer(serverId);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:execute-command', async (_, serverId: string, command: string): Promise<IPCResponse<{ stdout: string; stderr: string; code: number }>> => {
        try {
            const result = await serverManagementService.executeCommand(serverId, command);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:get-stats', async (_, serverId: string): Promise<IPCResponse<any>> => {
        try {
            const stats = await serverManagementService.getServerStats(serverId);
            return { success: true, data: stats };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:get-logs', async (_, serverId: string, lines?: number): Promise<IPCResponse<string>> => {
        try {
            const logs = await serverManagementService.getServerLogs(serverId, lines);
            return { success: true, data: logs };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:test-connection', async (_, serverData: Omit<VPSServer, 'id' | 'status'>): Promise<IPCResponse> => {
        try {
            const result = await serverManagementService.testConnection(serverData);
            return result.success ? { success: true } : { success: false, error: result.error };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:direct-deploy', async (_, payload: DirectDeploymentRequest): Promise<IPCResponse<DirectDeploymentResult>> => {
        try {
            const result = await serverManagementService.directDeploy(payload);
            if (result.success) {
                return { success: true, data: result };
            }
            return { success: false, data: result, error: result.error };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // New Server Management handlers for SSH & Git Setup
    ipcMain.handle('servers:test-connection-detailed', async (_, serverId: string): Promise<IPCResponse<SSHConnectionTestResult>> => {
        try {
            const result = await serverManagementService.testConnectionDetailed(serverId);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:upload-public-key', async (_, serverId: string, publicKey: string): Promise<IPCResponse> => {
        try {
            const result = await serverManagementService.uploadPublicKeyToServer(serverId, publicKey);
            return result.success ? { success: true } : { success: false, error: result.error };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:detect-deploy-paths', async (_, serverId: string): Promise<IPCResponse<SuggestedDeployPath[]>> => {
        try {
            const paths = await serverManagementService.detectDeployPaths(serverId);
            return { success: true, data: paths };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:setup-permissions', async (_, serverId: string, targetPath: string, config: PermissionConfig): Promise<IPCResponse> => {
        try {
            const result = await serverManagementService.setupPermissions(serverId, targetPath, config);
            return result.success ? { success: true } : { success: false, error: result.error };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('servers:create-git-hooks', async (_, serverId: string, repoPath: string, hooks: { name: string; script: string }[]): Promise<IPCResponse> => {
        try {
            const result = await serverManagementService.createGitHooks(serverId, repoPath, hooks);
            return result.success ? { success: true } : { success: false, error: result.error };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // SSH Key Management handlers
    ipcMain.handle('ssh-keys:generate', async (_, options: SSHKeyGenerationOptions): Promise<IPCResponse<SSHKeyInfo>> => {
        try {
            await sshKeyService.initialize();
            const keyPair = await sshKeyService.generateKeyPair(options);
            return { success: true, data: keyPair };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('ssh-keys:list', async (): Promise<IPCResponse<SSHKeyInfo[]>> => {
        try {
            await sshKeyService.initialize();
            const keys = await sshKeyService.listKeys();
            return { success: true, data: keys };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('ssh-keys:get', async (_, name: string): Promise<IPCResponse<SSHKeyInfo | null>> => {
        try {
            await sshKeyService.initialize();
            const key = await sshKeyService.getKey(name);
            return { success: true, data: key };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('ssh-keys:delete', async (_, name: string): Promise<IPCResponse> => {
        try {
            await sshKeyService.initialize();
            await sshKeyService.deleteKey(name);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('ssh-keys:import', async (_, name: string, privateKeyPath: string): Promise<IPCResponse<SSHKeyInfo>> => {
        try {
            await sshKeyService.initialize();
            const keyInfo = await sshKeyService.importKey(name, privateKeyPath);
            return { success: true, data: keyInfo };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // GitHub Deploy Key handlers
    ipcMain.handle('repos:add-deploy-key', async (_, repoName: string, publicKey: string, title: string, readOnly?: boolean): Promise<IPCResponse<GitHubDeployKey>> => {
        try {
            const deployKey = await GitHubService.addDeployKey(repoName, publicKey, title, readOnly);
            return { success: true, data: deployKey };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:list-deploy-keys', async (_, repoName: string): Promise<IPCResponse<GitHubDeployKey[]>> => {
        try {
            const deployKeys = await GitHubService.listDeployKeys(repoName);
            return { success: true, data: deployKeys };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:delete-deploy-key', async (_, repoName: string, keyId: number): Promise<IPCResponse> => {
        try {
            await GitHubService.deleteDeployKey(repoName, keyId);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    const broadcast = (channel: string, payload: any) => {
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send(channel, payload);
        });
    };

    serverManagementService.on('server-status-changed', (payload: ServerStatusPayload) => {
        broadcast('servers:status-changed', payload);
    });

    serverManagementService.on('server-stats', (payload: { serverId: string; stats: ServerStats }) => {
        broadcast('servers:stats', {
            ...payload,
            receivedAt: new Date().toISOString()
        });
    });

    serverManagementService.on('server-added', (server: VPSServer) => {
        broadcast('servers:added', server);
    });

    serverManagementService.on('server-updated', (server: VPSServer) => {
        broadcast('servers:updated', server);
    });

    serverManagementService.on('server-deleted', (serverId: string) => {
        broadcast('servers:deleted', serverId);
    });

    serverManagementService.on('server-deployment-finished', (payload: DirectDeploymentResult) => {
        broadcast('servers:deployment-finished', payload);
    });

    console.log('IPC handlers registered');
}
