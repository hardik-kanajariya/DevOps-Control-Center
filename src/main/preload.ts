import { contextBridge, ipcRenderer } from 'electron';
import { IPCResponse } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Authentication methods
    auth: {
        setToken: (token: string): Promise<IPCResponse> =>
            ipcRenderer.invoke('auth:set-token', token),
        getToken: (): Promise<IPCResponse<string | null>> =>
            ipcRenderer.invoke('auth:get-token'),
        validateToken: (): Promise<IPCResponse<boolean>> =>
            ipcRenderer.invoke('auth:validate-token'),
        clear: (): Promise<IPCResponse> =>
            ipcRenderer.invoke('auth:clear'),
        check: (): Promise<IPCResponse<{ isAuthenticated: boolean; user?: any }>> =>
            ipcRenderer.invoke('auth:check'),
    },

    // Repository methods
    repos: {
        list: (): Promise<IPCResponse> =>
            ipcRenderer.invoke('repos:list'),
        get: (repoName: string): Promise<IPCResponse> =>
            ipcRenderer.invoke('repos:get', repoName),
        clone: (repoUrl: string, localPath: string): Promise<IPCResponse> =>
            ipcRenderer.invoke('repos:clone', repoUrl, localPath),
    },

    // Server methods
    servers: {
        list: (): Promise<IPCResponse> =>
            ipcRenderer.invoke('servers:list'),
        add: (server: any): Promise<IPCResponse> =>
            ipcRenderer.invoke('servers:add', server),
        connect: (serverId: string): Promise<IPCResponse> =>
            ipcRenderer.invoke('servers:connect', serverId),
        disconnect: (serverId: string): Promise<IPCResponse> =>
            ipcRenderer.invoke('servers:disconnect', serverId),
    },

    // Deployment methods
    deploy: {
        create: (config: any): Promise<IPCResponse> =>
            ipcRenderer.invoke('deploy:create', config),
        run: (deploymentId: string): Promise<IPCResponse> =>
            ipcRenderer.invoke('deploy:run', deploymentId),
        history: (deploymentId: string): Promise<IPCResponse> =>
            ipcRenderer.invoke('deploy:history', deploymentId),
    },

    // Settings methods
    settings: {
        get: (): Promise<IPCResponse> =>
            ipcRenderer.invoke('settings:get'),
        set: (settings: any): Promise<IPCResponse> =>
            ipcRenderer.invoke('settings:set', settings),
    },

    // Utility methods
    platform: process.platform,
});

// Define the type for the exposed API
export interface ElectronAPI {
    auth: {
        setToken: (token: string) => Promise<IPCResponse>;
        getToken: () => Promise<IPCResponse<string | null>>;
        validateToken: () => Promise<IPCResponse<boolean>>;
        clear: () => Promise<IPCResponse>;
        check: () => Promise<IPCResponse<{ isAuthenticated: boolean; user?: any }>>;
    };
    repos: {
        list: () => Promise<IPCResponse>;
        get: (repoName: string) => Promise<IPCResponse>;
        clone: (repoUrl: string, localPath: string) => Promise<IPCResponse>;
    };
    servers: {
        list: () => Promise<IPCResponse>;
        add: (server: any) => Promise<IPCResponse>;
        connect: (serverId: string) => Promise<IPCResponse>;
        disconnect: (serverId: string) => Promise<IPCResponse>;
    };
    deploy: {
        create: (config: any) => Promise<IPCResponse>;
        run: (deploymentId: string) => Promise<IPCResponse>;
        history: (deploymentId: string) => Promise<IPCResponse>;
    };
    settings: {
        get: () => Promise<IPCResponse>;
        set: (settings: any) => Promise<IPCResponse>;
    };
    platform: string;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
