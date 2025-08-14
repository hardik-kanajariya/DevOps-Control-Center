import { contextBridge, ipcRenderer } from 'electron';
import { IPCResponse } from '../shared/types';

// Input validation helpers
const validators = {
    isString: (value: any): value is string => typeof value === 'string',
    isNumber: (value: any): value is number => typeof value === 'number',
    isObject: (value: any): value is object => typeof value === 'object' && value !== null,
    isValidUrl: (url: string): boolean => {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:', 'git:', 'ssh:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    },
    isValidPath: (path: string): boolean => {
        return typeof path === 'string' && path.length > 0 && !path.includes('..');
    },
    isValidId: (id: string): boolean => {
        return typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9-_]+$/.test(id);
    }
};

// Secure wrapper for IPC calls with validation
const secureInvoke = (channel: string, validator?: (args: any[]) => boolean) => {
    return (...args: any[]) => {
        if (validator && !validator(args)) {
            throw new Error(`Invalid arguments for ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
    };
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Authentication methods
    auth: {
        setToken: secureInvoke('auth:set-token', ([token]) => validators.isString(token)),
        getToken: secureInvoke('auth:get-token'),
        validateToken: secureInvoke('auth:validate-token'),
        clear: secureInvoke('auth:clear'),
        check: secureInvoke('auth:check'),
    },

    // Repository methods
    repos: {
        list: secureInvoke('repos:list'),
        get: secureInvoke('repos:get', ([repoName]) => validators.isString(repoName)),
        clone: secureInvoke('repos:clone', ([repoUrl, localPath]) =>
            validators.isString(repoUrl) && validators.isValidUrl(repoUrl) &&
            validators.isString(localPath) && validators.isValidPath(localPath)
        ),
    },

    // Server methods
    servers: {
        list: secureInvoke('servers:list'),
        add: secureInvoke('servers:add', ([server]) => validators.isObject(server)),
        connect: secureInvoke('servers:connect', ([serverId]) => validators.isValidId(serverId)),
        disconnect: secureInvoke('servers:disconnect', ([serverId]) => validators.isValidId(serverId)),
    },

    // Deployment methods
    deploy: {
        create: secureInvoke('deploy:create', ([config]) => validators.isObject(config)),
        run: secureInvoke('deploy:run', ([deploymentId]) => validators.isValidId(deploymentId)),
        history: secureInvoke('deploy:history', ([deploymentId]) => validators.isValidId(deploymentId)),
    },

    // Settings methods
    settings: {
        get: secureInvoke('settings:get'),
        set: secureInvoke('settings:set', ([settings]) => validators.isObject(settings)),
    },

    // Auto-updater methods
    updater: {
        checkForUpdates: secureInvoke('updater:check-for-updates'),
        downloadUpdate: secureInvoke('updater:download-update'),
        installUpdate: secureInvoke('updater:install-update'),
        getCurrentVersion: secureInvoke('updater:get-current-version'),
    },

    // Security methods
    security: {
        performAudit: secureInvoke('security:perform-audit'),
        getStatus: secureInvoke('security:get-status'),
        encrypt: secureInvoke('security:encrypt', ([data]) => validators.isString(data)),
        decrypt: secureInvoke('security:decrypt', ([data]) => validators.isString(data)),
    },

    // File system methods (secure)
    fs: {
        selectFile: secureInvoke('fs:select-file'),
        selectDirectory: secureInvoke('fs:select-directory'),
        readFile: secureInvoke('fs:read-file', ([path]) => validators.isValidPath(path)),
        writeFile: secureInvoke('fs:write-file', ([path, data]) =>
            validators.isValidPath(path) && validators.isString(data)
        ),
        exists: secureInvoke('fs:exists', ([path]) => validators.isValidPath(path)),
    },

    // Notifications
    notifications: {
        show: secureInvoke('notifications:show', ([title, body]) =>
            validators.isString(title) && validators.isString(body)
        ),
    },

    // Event listener methods with channel validation
    on: (channel: string, func: (...args: any[]) => void) => {
        if (!validators.isString(channel) || !/^[a-zA-Z0-9:-]+$/.test(channel)) {
            throw new Error('Invalid channel name');
        }
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    removeAllListeners: (channel: string) => {
        if (!validators.isString(channel) || !/^[a-zA-Z0-9:-]+$/.test(channel)) {
            throw new Error('Invalid channel name');
        }
        ipcRenderer.removeAllListeners(channel);
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
    updater: {
        checkForUpdates: () => Promise<IPCResponse>;
        downloadUpdate: () => Promise<IPCResponse>;
        installUpdate: () => Promise<IPCResponse>;
        getCurrentVersion: () => Promise<IPCResponse>;
    };
    security: {
        performAudit: () => Promise<IPCResponse>;
        getStatus: () => Promise<IPCResponse>;
        encrypt: (data: string) => Promise<IPCResponse>;
        decrypt: (data: string) => Promise<IPCResponse>;
    };
    fs: {
        selectFile: () => Promise<IPCResponse>;
        selectDirectory: () => Promise<IPCResponse>;
        readFile: (path: string) => Promise<IPCResponse>;
        writeFile: (path: string, data: string) => Promise<IPCResponse>;
        exists: (path: string) => Promise<IPCResponse>;
    };
    notifications: {
        show: (title: string, body: string) => Promise<IPCResponse>;
    };
    on: (channel: string, func: (...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
    platform: string;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
