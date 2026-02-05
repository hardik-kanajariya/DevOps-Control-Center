import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    DirectDeploymentRequest,
    DirectDeploymentResult,
    ServerStats,
    VPSServer,
    SSHKeyGenerationOptions,
    SSHKeyInfo,
    SSHConnectionTestResult,
    SuggestedDeployPath,
    PermissionConfig,
    GitHubDeployKey
} from '../../../shared/types';

interface ServersState {
    servers: VPSServer[];
    loading: boolean;
    error: string | null;
    connectingServers: string[];
    stats: Record<string, { data: ServerStats; fetchedAt: string }>;
    logs: Record<string, { content: string; fetchedAt: string; lines: number }>;
    commandOutputs: Record<string, { command: string; stdout: string; stderr: string; code: number; executedAt: string }>;
    deployments: Record<string, {
        status: 'idle' | 'running' | 'succeeded' | 'failed';
        result?: DirectDeploymentResult;
        error?: string;
        startedAt?: string;
        finishedAt?: string;
    }>;
    // SSH Key management state
    sshKeys: SSHKeyInfo[];
    sshKeysLoading: boolean;
    sshKeysError: string | null;
    // Connection test state
    connectionTests: Record<string, {
        result?: SSHConnectionTestResult;
        loading: boolean;
        error?: string;
    }>;
    // Deploy paths detection state
    deployPaths: Record<string, {
        paths: SuggestedDeployPath[];
        loading: boolean;
        error?: string;
    }>;
    // GitHub deploy keys
    deployKeys: Record<string, {
        keys: GitHubDeployKey[];
        loading: boolean;
        error?: string;
    }>;
}

const initialState: ServersState = {
    servers: [],
    loading: false,
    error: null,
    connectingServers: [],
    stats: {},
    logs: {},
    commandOutputs: {},
    deployments: {},
    // SSH Key management
    sshKeys: [],
    sshKeysLoading: false,
    sshKeysError: null,
    // Connection tests
    connectionTests: {},
    // Deploy paths
    deployPaths: {},
    // GitHub deploy keys
    deployKeys: {},
};

// Async thunks
export const fetchServers = createAsyncThunk(
    'servers/fetchServers',
    async () => {
        const response = await window.electronAPI.servers.list();
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data as VPSServer[];
    }
);

export const addServer = createAsyncThunk(
    'servers/addServer',
    async (server: Omit<VPSServer, 'id' | 'status'>) => {
        const response = await window.electronAPI.servers.add(server);
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data as VPSServer;
    }
);

export const connectToServer = createAsyncThunk(
    'servers/connectToServer',
    async (serverId: string) => {
        const response = await window.electronAPI.servers.connect(serverId);
        if (!response.success) {
            throw new Error(response.error);
        }
        return { serverId, status: 'connected' as const };
    }
);

export const disconnectFromServer = createAsyncThunk(
    'servers/disconnectFromServer',
    async (serverId: string) => {
        const response = await window.electronAPI.servers.disconnect(serverId);
        if (!response.success) {
            throw new Error(response.error);
        }
        return { serverId, status: 'disconnected' as const };
    }
);

export const deleteServer = createAsyncThunk(
    'servers/deleteServer',
    async (serverId: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.delete(serverId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return serverId;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete server');
        }
    }
);

export const fetchServerStatsById = createAsyncThunk(
    'servers/fetchServerStats',
    async (serverId: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.getStats(serverId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return { serverId, stats: response.data as ServerStats, fetchedAt: new Date().toISOString() };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch server stats');
        }
    }
);

export const fetchServerLogs = createAsyncThunk(
    'servers/fetchServerLogs',
    async (params: { serverId: string; lines?: number }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.getLogs(params.serverId, params.lines);
            if (!response.success) {
                throw new Error(response.error);
            }
            return {
                serverId: params.serverId,
                logs: response.data as string,
                lines: params.lines ?? 200,
                fetchedAt: new Date().toISOString()
            };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch server logs');
        }
    }
);

export const executeServerCommand = createAsyncThunk(
    'servers/executeServerCommand',
    async (params: { serverId: string; command: string }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.executeCommand(params.serverId, params.command);
            if (!response.success) {
                throw new Error(response.error);
            }
            return {
                serverId: params.serverId,
                command: params.command,
                ...response.data,
                executedAt: new Date().toISOString()
            } as { serverId: string; command: string; stdout: string; stderr: string; code: number; executedAt: string };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to execute command');
        }
    }
);

export const directDeployToServer = createAsyncThunk(
    'servers/directDeploy',
    async (payload: DirectDeploymentRequest, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.directDeploy(payload);
            if (response.success && response.data) {
                return response.data as DirectDeploymentResult;
            }
            if (response.data) {
                return rejectWithValue(response.data as DirectDeploymentResult);
            }
            return rejectWithValue(response.error || 'Direct deployment failed');
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Direct deployment failed');
        }
    }
);

// =============================================================================
// SSH Key Management Thunks
// =============================================================================

export const generateSSHKey = createAsyncThunk(
    'servers/generateSSHKey',
    async (options: SSHKeyGenerationOptions, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.sshKeys.generate(options);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data as SSHKeyInfo;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to generate SSH key');
        }
    }
);

export const fetchSSHKeys = createAsyncThunk(
    'servers/fetchSSHKeys',
    async (_, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.sshKeys.list();
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data as SSHKeyInfo[];
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch SSH keys');
        }
    }
);

export const deleteSSHKey = createAsyncThunk(
    'servers/deleteSSHKey',
    async (name: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.sshKeys.delete(name);
            if (!response.success) {
                throw new Error(response.error);
            }
            return name;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete SSH key');
        }
    }
);

export const importSSHKey = createAsyncThunk(
    'servers/importSSHKey',
    async (params: { name: string; privateKeyPath: string }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.sshKeys.import(params.name, params.privateKeyPath);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data as SSHKeyInfo;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to import SSH key');
        }
    }
);

// =============================================================================
// Connection & Server Setup Thunks
// =============================================================================

export const testConnectionDetailed = createAsyncThunk(
    'servers/testConnectionDetailed',
    async (serverId: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.testConnectionDetailed(serverId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return { serverId, result: response.data as SSHConnectionTestResult };
        } catch (error) {
            return rejectWithValue({ serverId, error: error instanceof Error ? error.message : 'Connection test failed' });
        }
    }
);

export const uploadPublicKeyToServer = createAsyncThunk(
    'servers/uploadPublicKey',
    async (params: { serverId: string; publicKey: string }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.uploadPublicKey(params.serverId, params.publicKey);
            if (!response.success) {
                throw new Error(response.error);
            }
            return { serverId: params.serverId, success: true };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to upload public key');
        }
    }
);

export const detectDeployPaths = createAsyncThunk(
    'servers/detectDeployPaths',
    async (serverId: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.detectDeployPaths(serverId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return { serverId, paths: response.data as SuggestedDeployPath[] };
        } catch (error) {
            return rejectWithValue({ serverId, error: error instanceof Error ? error.message : 'Failed to detect deploy paths' });
        }
    }
);

export const setupPermissions = createAsyncThunk(
    'servers/setupPermissions',
    async (params: { serverId: string; targetPath: string; config: PermissionConfig }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.setupPermissions(
                params.serverId,
                params.targetPath,
                params.config
            );
            if (!response.success) {
                throw new Error(response.error);
            }
            return { success: true };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to setup permissions');
        }
    }
);

export const createGitHooks = createAsyncThunk(
    'servers/createGitHooks',
    async (params: { serverId: string; repoPath: string; hooks: { name: string; script: string }[] }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.servers.createGitHooks(
                params.serverId,
                params.repoPath,
                params.hooks
            );
            if (!response.success) {
                throw new Error(response.error);
            }
            return { success: true };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to create git hooks');
        }
    }
);

// =============================================================================
// GitHub Deploy Key Thunks
// =============================================================================

export const fetchDeployKeys = createAsyncThunk(
    'servers/fetchDeployKeys',
    async (repoName: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.repos.listDeployKeys(repoName);
            if (!response.success) {
                throw new Error(response.error);
            }
            return { repoName, keys: response.data as GitHubDeployKey[] };
        } catch (error) {
            return rejectWithValue({ repoName, error: error instanceof Error ? error.message : 'Failed to fetch deploy keys' });
        }
    }
);

export const addDeployKey = createAsyncThunk(
    'servers/addDeployKey',
    async (params: { repoName: string; publicKey: string; title: string; readOnly?: boolean }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.repos.addDeployKey(
                params.repoName,
                params.publicKey,
                params.title,
                params.readOnly
            );
            if (!response.success) {
                throw new Error(response.error);
            }
            return { repoName: params.repoName, key: response.data as GitHubDeployKey };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to add deploy key');
        }
    }
);

export const deleteDeployKey = createAsyncThunk(
    'servers/deleteDeployKey',
    async (params: { repoName: string; keyId: number }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.repos.deleteDeployKey(params.repoName, params.keyId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return { repoName: params.repoName, keyId: params.keyId };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete deploy key');
        }
    }
);

const serversSlice = createSlice({
    name: 'servers',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        updateServerStatus: (state, action: PayloadAction<{ serverId: string; status: VPSServer['status'] }>) => {
            const server = state.servers.find(s => s.id === action.payload.serverId);
            if (server) {
                server.status = action.payload.status;
            }
        },
        serverAdded: (state, action: PayloadAction<VPSServer>) => {
            const existingIndex = state.servers.findIndex(server => server.id === action.payload.id);
            if (existingIndex >= 0) {
                state.servers[existingIndex] = action.payload;
            } else {
                state.servers.push(action.payload);
            }
        },
        serverUpdated: (state, action: PayloadAction<VPSServer>) => {
            const serverIndex = state.servers.findIndex(server => server.id === action.payload.id);
            if (serverIndex >= 0) {
                state.servers[serverIndex] = {
                    ...state.servers[serverIndex],
                    ...action.payload
                };
            }
        },
        serverDeleted: (state, action: PayloadAction<string>) => {
            state.servers = state.servers.filter(server => server.id !== action.payload);
            delete state.stats[action.payload];
            delete state.logs[action.payload];
            delete state.commandOutputs[action.payload];
            delete state.deployments[action.payload];
            state.connectingServers = state.connectingServers.filter(id => id !== action.payload);
        },
        serverStatusChanged: (state, action: PayloadAction<{ serverId: string; status: VPSServer['status'] }>) => {
            const server = state.servers.find(s => s.id === action.payload.serverId);
            if (server) {
                server.status = action.payload.status;
                state.connectingServers = state.connectingServers.filter(id => id !== server.id);
                if (action.payload.status === 'connected') {
                    server.lastConnected = new Date();
                }
            }
        },
        serverStatsReceived: (state, action: PayloadAction<{ serverId: string; stats: ServerStats; fetchedAt: string }>) => {
            state.stats[action.payload.serverId] = {
                data: action.payload.stats,
                fetchedAt: action.payload.fetchedAt
            };

            const server = state.servers.find(s => s.id === action.payload.serverId);
            if (server) {
                server.cpu = action.payload.stats.cpu;
                server.memory = action.payload.stats.memory.percentage;
                server.disk = action.payload.stats.disk.percentage;
                server.uptimeSeconds = action.payload.stats.uptime;
                server.loadAverage = action.payload.stats.loadAverage;
                server.lastSeen = new Date(action.payload.fetchedAt);
            }
        },
        serverLogsReceived: (state, action: PayloadAction<{ serverId: string; logs: string; lines: number; fetchedAt: string }>) => {
            state.logs[action.payload.serverId] = {
                content: action.payload.logs,
                lines: action.payload.lines,
                fetchedAt: action.payload.fetchedAt
            };
        },
        serverCommandResult: (state, action: PayloadAction<{ serverId: string; command: string; stdout: string; stderr: string; code: number; executedAt: string }>) => {
            state.commandOutputs[action.payload.serverId] = action.payload;
        },
        serverDeploymentFinished: (state, action: PayloadAction<DirectDeploymentResult>) => {
            state.deployments[action.payload.serverId] = {
                status: action.payload.success ? 'succeeded' : 'failed',
                result: action.payload,
                error: action.payload.success ? undefined : action.payload.error,
                startedAt: action.payload.startedAt,
                finishedAt: action.payload.finishedAt
            };
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch servers
            .addCase(fetchServers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchServers.fulfilled, (state, action) => {
                state.loading = false;
                state.servers = action.payload;
                state.error = null;
            })
            .addCase(fetchServers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch servers';
            })
            // Add server
            .addCase(addServer.fulfilled, (state, action) => {
                state.servers.push(action.payload);
            })
            .addCase(addServer.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to add server';
            })
            // Connect to server
            .addCase(connectToServer.pending, (state, action) => {
                state.connectingServers.push(action.meta.arg);
            })
            .addCase(connectToServer.fulfilled, (state, action) => {
                const server = state.servers.find(s => s.id === action.payload.serverId);
                if (server) {
                    server.status = action.payload.status;
                    server.lastConnected = new Date();
                }
                state.connectingServers = state.connectingServers.filter(id => id !== action.payload.serverId);
            })
            .addCase(connectToServer.rejected, (state, action) => {
                state.connectingServers = state.connectingServers.filter(id => id !== action.meta.arg);
                state.error = action.error.message || 'Failed to connect to server';
            })
            // Disconnect from server
            .addCase(disconnectFromServer.fulfilled, (state, action) => {
                const server = state.servers.find(s => s.id === action.payload.serverId);
                if (server) {
                    server.status = action.payload.status;
                }
            })
            // Delete server
            .addCase(deleteServer.fulfilled, (state, action) => {
                state.servers = state.servers.filter(s => s.id !== action.payload);
                delete state.stats[action.payload];
                delete state.logs[action.payload];
                delete state.commandOutputs[action.payload];
                delete state.deployments[action.payload];
            })
            .addCase(deleteServer.rejected, (state, action) => {
                state.error = action.payload as string || action.error.message || 'Failed to delete server';
            })
            // Fetch server stats by id
            .addCase(fetchServerStatsById.fulfilled, (state, action) => {
                state.stats[action.payload.serverId] = {
                    data: action.payload.stats,
                    fetchedAt: action.payload.fetchedAt
                };

                const server = state.servers.find(s => s.id === action.payload.serverId);
                if (server) {
                    server.cpu = action.payload.stats.cpu;
                    server.memory = action.payload.stats.memory.percentage;
                    server.disk = action.payload.stats.disk.percentage;
                    server.uptimeSeconds = action.payload.stats.uptime;
                    server.loadAverage = action.payload.stats.loadAverage;
                    server.lastSeen = new Date(action.payload.fetchedAt);
                }
            })
            .addCase(fetchServerStatsById.rejected, (state, action) => {
                state.error = action.payload as string || action.error.message || 'Failed to fetch server stats';
            })
            // Fetch logs
            .addCase(fetchServerLogs.fulfilled, (state, action) => {
                state.logs[action.payload.serverId] = {
                    content: action.payload.logs,
                    lines: action.payload.lines,
                    fetchedAt: action.payload.fetchedAt
                };
            })
            .addCase(fetchServerLogs.rejected, (state, action) => {
                state.error = action.payload as string || action.error.message || 'Failed to fetch server logs';
            })
            // Execute command
            .addCase(executeServerCommand.fulfilled, (state, action) => {
                state.commandOutputs[action.payload.serverId] = {
                    command: action.payload.command,
                    stdout: action.payload.stdout,
                    stderr: action.payload.stderr,
                    code: action.payload.code,
                    executedAt: action.payload.executedAt
                };
            })
            .addCase(executeServerCommand.rejected, (state, action) => {
                state.error = action.payload as string || action.error.message || 'Failed to execute command';
            })
            // Direct deployment
            .addCase(directDeployToServer.pending, (state, action) => {
                state.deployments[action.meta.arg.serverId] = {
                    status: 'running',
                    startedAt: new Date().toISOString()
                };
            })
            .addCase(directDeployToServer.fulfilled, (state, action) => {
                state.deployments[action.payload.serverId] = {
                    status: 'succeeded',
                    result: action.payload,
                    startedAt: action.payload.startedAt,
                    finishedAt: action.payload.finishedAt
                };
            })
            .addCase(directDeployToServer.rejected, (state, action) => {
                if (action.payload && typeof action.payload === 'object' && 'serverId' in (action.payload as DirectDeploymentResult)) {
                    const result = action.payload as DirectDeploymentResult;
                    state.deployments[result.serverId] = {
                        status: 'failed',
                        result,
                        error: result.error,
                        startedAt: result.startedAt,
                        finishedAt: result.finishedAt
                    };
                } else if (action.meta?.arg?.serverId) {
                    state.deployments[action.meta.arg.serverId] = {
                        status: 'failed',
                        error: (action.payload as string) || action.error.message || 'Direct deployment failed',
                        startedAt: state.deployments[action.meta.arg.serverId]?.startedAt,
                        finishedAt: new Date().toISOString()
                    };
                }
                state.error = action.payload as string || action.error.message || 'Direct deployment failed';
            })
            // =========================================================================
            // SSH Key Management
            // =========================================================================
            .addCase(generateSSHKey.pending, (state) => {
                state.sshKeysLoading = true;
                state.sshKeysError = null;
            })
            .addCase(generateSSHKey.fulfilled, (state, action) => {
                state.sshKeysLoading = false;
                state.sshKeys.push(action.payload);
            })
            .addCase(generateSSHKey.rejected, (state, action) => {
                state.sshKeysLoading = false;
                state.sshKeysError = action.payload as string || 'Failed to generate SSH key';
            })
            .addCase(fetchSSHKeys.pending, (state) => {
                state.sshKeysLoading = true;
                state.sshKeysError = null;
            })
            .addCase(fetchSSHKeys.fulfilled, (state, action) => {
                state.sshKeysLoading = false;
                state.sshKeys = action.payload;
            })
            .addCase(fetchSSHKeys.rejected, (state, action) => {
                state.sshKeysLoading = false;
                state.sshKeysError = action.payload as string || 'Failed to fetch SSH keys';
            })
            .addCase(deleteSSHKey.fulfilled, (state, action) => {
                state.sshKeys = state.sshKeys.filter(key => key.name !== action.payload);
            })
            .addCase(deleteSSHKey.rejected, (state, action) => {
                state.sshKeysError = action.payload as string || 'Failed to delete SSH key';
            })
            .addCase(importSSHKey.pending, (state) => {
                state.sshKeysLoading = true;
                state.sshKeysError = null;
            })
            .addCase(importSSHKey.fulfilled, (state, action) => {
                state.sshKeysLoading = false;
                state.sshKeys.push(action.payload);
            })
            .addCase(importSSHKey.rejected, (state, action) => {
                state.sshKeysLoading = false;
                state.sshKeysError = action.payload as string || 'Failed to import SSH key';
            })
            // =========================================================================
            // Connection Testing
            // =========================================================================
            .addCase(testConnectionDetailed.pending, (state, action) => {
                state.connectionTests[action.meta.arg] = { loading: true };
            })
            .addCase(testConnectionDetailed.fulfilled, (state, action) => {
                state.connectionTests[action.payload.serverId] = {
                    loading: false,
                    result: action.payload.result
                };
            })
            .addCase(testConnectionDetailed.rejected, (state, action) => {
                const payload = action.payload as { serverId: string; error: string };
                state.connectionTests[payload?.serverId || action.meta.arg] = {
                    loading: false,
                    error: payload?.error || 'Connection test failed'
                };
            })
            // =========================================================================
            // Deploy Path Detection
            // =========================================================================
            .addCase(detectDeployPaths.pending, (state, action) => {
                state.deployPaths[action.meta.arg] = { paths: [], loading: true };
            })
            .addCase(detectDeployPaths.fulfilled, (state, action) => {
                state.deployPaths[action.payload.serverId] = {
                    paths: action.payload.paths,
                    loading: false
                };
            })
            .addCase(detectDeployPaths.rejected, (state, action) => {
                const payload = action.payload as { serverId: string; error: string };
                state.deployPaths[payload?.serverId || action.meta.arg] = {
                    paths: [],
                    loading: false,
                    error: payload?.error || 'Failed to detect deploy paths'
                };
            })
            // =========================================================================
            // GitHub Deploy Keys
            // =========================================================================
            .addCase(fetchDeployKeys.pending, (state, action) => {
                state.deployKeys[action.meta.arg] = { keys: [], loading: true };
            })
            .addCase(fetchDeployKeys.fulfilled, (state, action) => {
                state.deployKeys[action.payload.repoName] = {
                    keys: action.payload.keys,
                    loading: false
                };
            })
            .addCase(fetchDeployKeys.rejected, (state, action) => {
                const payload = action.payload as { repoName: string; error: string };
                state.deployKeys[payload?.repoName || action.meta.arg] = {
                    keys: [],
                    loading: false,
                    error: payload?.error || 'Failed to fetch deploy keys'
                };
            })
            .addCase(addDeployKey.fulfilled, (state, action) => {
                const repoKeys = state.deployKeys[action.payload.repoName];
                if (repoKeys) {
                    repoKeys.keys.push(action.payload.key);
                }
            })
            .addCase(addDeployKey.rejected, (state, action) => {
                state.error = action.payload as string || 'Failed to add deploy key';
            })
            .addCase(deleteDeployKey.fulfilled, (state, action) => {
                const repoKeys = state.deployKeys[action.payload.repoName];
                if (repoKeys) {
                    repoKeys.keys = repoKeys.keys.filter(key => key.id !== action.payload.keyId);
                }
            })
            .addCase(deleteDeployKey.rejected, (state, action) => {
                state.error = action.payload as string || 'Failed to delete deploy key';
            });
    },
});

export const {
    clearError,
    updateServerStatus,
    serverAdded,
    serverUpdated,
    serverDeleted,
    serverStatusChanged,
    serverStatsReceived,
    serverLogsReceived,
    serverCommandResult,
    serverDeploymentFinished
} = serversSlice.actions;
export default serversSlice.reducer;
