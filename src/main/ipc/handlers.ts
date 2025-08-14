import { ipcMain } from 'electron';
import { AuthService } from '../services/auth';
import { GitHubService } from '../services/github';
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
            const repos = await GitHubService.getRepositories();
            return { success: true, data: repos };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('repos:get', async (_, repoName: string): Promise<IPCResponse> => {
        try {
            const repo = await GitHubService.getRepository(repoName);
            return { success: true, data: repo };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    console.log('IPC handlers registered');
}
