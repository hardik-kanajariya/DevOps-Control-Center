import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    DirectDeploymentRequest,
    DirectDeploymentResult,
    ServerStats,
    VPSServer
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
