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
        search: secureInvoke('repos:search', ([query, filters]) =>
            validators.isString(query) && (filters === undefined || validators.isObject(filters))
        ),
        analytics: secureInvoke('repos:analytics', ([repoName]) => validators.isString(repoName)),
        workflows: secureInvoke('repos:workflows', ([repoName]) => validators.isString(repoName)),
        openBrowser: secureInvoke('repos:open-browser', ([htmlUrl]) => validators.isString(htmlUrl)),
        checkLocal: secureInvoke('repos:check-local', ([localPath]) => validators.isString(localPath)),
        addDeployKey: secureInvoke('repos:add-deploy-key', ([repoName, publicKey, title, readOnly]) =>
            validators.isString(repoName) && validators.isString(publicKey) && validators.isString(title)
        ),
        listDeployKeys: secureInvoke('repos:list-deploy-keys', ([repoName]) => validators.isString(repoName)),
        deleteDeployKey: secureInvoke('repos:delete-deploy-key', ([repoName, keyId]) =>
            validators.isString(repoName) && validators.isNumber(keyId)
        ),
    },

    // Server methods
    servers: {
        list: secureInvoke('servers:list'),
        add: secureInvoke('servers:add', ([server]) => validators.isObject(server)),
        update: secureInvoke('servers:update', ([serverId, updates]) =>
            validators.isValidId(serverId) && validators.isObject(updates)),
        delete: secureInvoke('servers:delete', ([serverId]) => validators.isValidId(serverId)),
        connect: secureInvoke('servers:connect', ([serverId]) => validators.isValidId(serverId)),
        disconnect: secureInvoke('servers:disconnect', ([serverId]) => validators.isValidId(serverId)),
        executeCommand: secureInvoke('servers:execute-command', ([serverId, command]) =>
            validators.isValidId(serverId) && validators.isString(command)),
        getStats: secureInvoke('servers:get-stats', ([serverId]) => validators.isValidId(serverId)),
        getLogs: secureInvoke('servers:get-logs', ([serverId, lines]) =>
            validators.isValidId(serverId) && (lines === undefined || validators.isNumber(lines))),
        testConnection: secureInvoke('servers:test-connection', ([serverData]) => validators.isObject(serverData)),
        testConnectionDetailed: secureInvoke('servers:test-connection-detailed', ([serverId]) => validators.isValidId(serverId)),
        directDeploy: secureInvoke('servers:direct-deploy', ([payload]) => validators.isObject(payload)),
        uploadPublicKey: secureInvoke('servers:upload-public-key', ([serverId, publicKey]) =>
            validators.isValidId(serverId) && validators.isString(publicKey)),
        detectDeployPaths: secureInvoke('servers:detect-deploy-paths', ([serverId]) => validators.isValidId(serverId)),
        setupPermissions: secureInvoke('servers:setup-permissions', ([serverId, targetPath, config]) =>
            validators.isValidId(serverId) && validators.isString(targetPath) && validators.isObject(config)),
        createGitHooks: secureInvoke('servers:create-git-hooks', ([serverId, repoPath, hooks]) =>
            validators.isValidId(serverId) && validators.isString(repoPath) && Array.isArray(hooks)),
    },

    // SSH Key methods
    sshKeys: {
        generate: secureInvoke('ssh-keys:generate', ([options]) => validators.isObject(options)),
        list: secureInvoke('ssh-keys:list'),
        get: secureInvoke('ssh-keys:get', ([name]) => validators.isString(name)),
        delete: secureInvoke('ssh-keys:delete', ([name]) => validators.isString(name)),
        import: secureInvoke('ssh-keys:import', ([name, privateKeyPath]) =>
            validators.isString(name) && validators.isString(privateKeyPath)),
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

    // Dashboard methods
    dashboard: {
        getStats: secureInvoke('dashboard:get-stats'),
        getRecentActivity: secureInvoke('dashboard:get-recent-activity', ([limit]) =>
            !limit || validators.isNumber(limit)
        ),
        getSystemHealth: secureInvoke('dashboard:get-system-health'),
        refreshStats: secureInvoke('dashboard:refresh-stats'),
    },

    // Workflow methods
    workflows: {
        listAll: secureInvoke('workflows:list-all'),
        listRepo: secureInvoke('workflows:list-repo', ([owner, repo]) =>
            validators.isString(owner) && validators.isString(repo)
        ),
        getJobs: secureInvoke('workflows:get-jobs', ([owner, repo, runId]) =>
            validators.isString(owner) && validators.isString(repo) && validators.isNumber(runId)
        ),
        getYAML: secureInvoke('workflows:get-yaml', ([owner, repo, workflowId]) =>
            validators.isString(owner) && validators.isString(repo) && validators.isNumber(workflowId)
        ),
        cancel: secureInvoke('workflows:cancel', ([owner, repo, runId]) =>
            validators.isString(owner) && validators.isString(repo) && validators.isNumber(runId)
        ),
        rerun: secureInvoke('workflows:rerun', ([owner, repo, runId]) =>
            validators.isString(owner) && validators.isString(repo) && validators.isNumber(runId)
        ),
        openBrowser: secureInvoke('workflows:open-browser', ([htmlUrl]) => validators.isString(htmlUrl)),
    },

    // Database management methods
    database: {
        getConnections: secureInvoke('database:get-connections'),
        createConnection: secureInvoke('database:create-connection', ([connectionData]) => validators.isObject(connectionData)),
        testConnection: secureInvoke('database:test-connection', ([connectionId]) => validators.isString(connectionId)),
        deleteConnection: secureInvoke('database:delete-connection', ([connectionId]) => validators.isString(connectionId)),
        getTables: secureInvoke('database:get-tables', ([connectionId]) => validators.isString(connectionId)),
        executeQuery: secureInvoke('database:execute-query', ([connectionId, query]) =>
            validators.isString(connectionId) && validators.isString(query)
        ),
        getMetrics: secureInvoke('database:get-metrics'),
        getHealth: secureInvoke('database:get-health'),
        getQueryHistory: secureInvoke('database:get-query-history'),
        exportData: secureInvoke('database:export-data', ([connectionId, format]) =>
            validators.isString(connectionId) && validators.isString(format)
        ),
        openExternal: secureInvoke('database:open-external', ([connectionId]) => validators.isString(connectionId)),
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
        search: (query: string, filters?: any) => Promise<IPCResponse>;
        analytics: (repoName: string) => Promise<IPCResponse>;
        workflows: (repoName: string) => Promise<IPCResponse>;
        openBrowser: (htmlUrl: string) => Promise<IPCResponse>;
        checkLocal: (localPath: string) => Promise<IPCResponse>;
        addDeployKey: (repoName: string, publicKey: string, title: string, readOnly?: boolean) => Promise<IPCResponse>;
        listDeployKeys: (repoName: string) => Promise<IPCResponse>;
        deleteDeployKey: (repoName: string, keyId: number) => Promise<IPCResponse>;
    };
    servers: {
        list: () => Promise<IPCResponse>;
        add: (server: any) => Promise<IPCResponse>;
        update: (serverId: string, updates: any) => Promise<IPCResponse>;
        delete: (serverId: string) => Promise<IPCResponse>;
        connect: (serverId: string) => Promise<IPCResponse>;
        disconnect: (serverId: string) => Promise<IPCResponse>;
        executeCommand: (serverId: string, command: string) => Promise<IPCResponse>;
        getStats: (serverId: string) => Promise<IPCResponse>;
        getLogs: (serverId: string, lines?: number) => Promise<IPCResponse>;
        testConnection: (server: any) => Promise<IPCResponse>;
        testConnectionDetailed: (serverId: string) => Promise<IPCResponse>;
        directDeploy: (payload: any) => Promise<IPCResponse>;
        uploadPublicKey: (serverId: string, publicKey: string) => Promise<IPCResponse>;
        detectDeployPaths: (serverId: string) => Promise<IPCResponse>;
        setupPermissions: (serverId: string, targetPath: string, config: any) => Promise<IPCResponse>;
        createGitHooks: (serverId: string, repoPath: string, hooks: { name: string; script: string }[]) => Promise<IPCResponse>;
    };
    sshKeys: {
        generate: (options: any) => Promise<IPCResponse>;
        list: () => Promise<IPCResponse>;
        get: (name: string) => Promise<IPCResponse>;
        delete: (name: string) => Promise<IPCResponse>;
        import: (name: string, privateKeyPath: string) => Promise<IPCResponse>;
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
    dashboard: {
        getStats: () => Promise<IPCResponse>;
        getRecentActivity: (limit?: number) => Promise<IPCResponse>;
        getSystemHealth: () => Promise<IPCResponse>;
        refreshStats: () => Promise<IPCResponse>;
    };
    workflows: {
        listAll: () => Promise<IPCResponse>;
        listRepo: (owner: string, repo: string) => Promise<IPCResponse>;
        getJobs: (owner: string, repo: string, runId: number) => Promise<IPCResponse>;
        getYAML: (owner: string, repo: string, workflowId: number) => Promise<IPCResponse>;
        cancel: (owner: string, repo: string, runId: number) => Promise<IPCResponse>;
        rerun: (owner: string, repo: string, runId: number) => Promise<IPCResponse>;
        openBrowser: (htmlUrl: string) => Promise<IPCResponse>;
    };
    database: {
        getConnections: () => Promise<IPCResponse>;
        createConnection: (connectionData: any) => Promise<IPCResponse>;
        testConnection: (connectionId: string) => Promise<IPCResponse>;
        deleteConnection: (connectionId: string) => Promise<IPCResponse>;
        getTables: (connectionId: string) => Promise<IPCResponse>;
        executeQuery: (connectionId: string, query: string) => Promise<IPCResponse>;
        getMetrics: () => Promise<IPCResponse>;
        getHealth: () => Promise<IPCResponse>;
        getQueryHistory: () => Promise<IPCResponse>;
        exportData: (connectionId: string, format: string) => Promise<IPCResponse>;
        openExternal: (connectionId: string) => Promise<IPCResponse>;
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
