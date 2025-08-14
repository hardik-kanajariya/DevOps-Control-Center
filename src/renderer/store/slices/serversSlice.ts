import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { VPSServer } from '../../../shared/types';

interface ServersState {
    servers: VPSServer[];
    loading: boolean;
    error: string | null;
    connectingServers: string[];
}

const initialState: ServersState = {
    servers: [],
    loading: false,
    error: null,
    connectingServers: [],
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
            });
    },
});

export const { clearError, updateServerStatus } = serversSlice.actions;
export default serversSlice.reducer;
