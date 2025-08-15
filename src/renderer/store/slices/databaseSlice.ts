import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface DatabaseConnection {
    id: string;
    name: string;
    type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';
    host: string;
    port: number;
    database: string;
    username: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    lastConnected?: string;
    ssl: boolean;
    connectionString?: string;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

interface TableInfo {
    name: string;
    rows: number;
    size: string;
    type: 'table' | 'view' | 'collection' | 'key';
    schema?: string;
    lastModified?: string;
    columns?: { name: string; type: string; nullable: boolean; key: boolean }[];
}

interface QueryResult {
    columns: string[];
    rows: any[][];
    executionTime: number;
    rowsAffected: number;
    query: string;
    timestamp: string;
    error?: string;
}

interface DatabaseMetrics {
    totalConnections: number;
    activeConnections: number;
    totalQueries: number;
    avgQueryTime: number;
    errorRate: number;
    uptime: string;
    memoryUsage: number;
    diskUsage: number;
    cacheHitRatio: number;
    lastUpdated: string;
}

interface DatabaseHealth {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    checks: {
        name: string;
        status: 'pass' | 'fail' | 'warning';
        message: string;
        value?: string;
    }[];
    lastCheck: string;
}

interface DatabaseState {
    connections: DatabaseConnection[];
    selectedConnection: DatabaseConnection | null;
    tables: TableInfo[];
    queryResult: QueryResult | null;
    queryHistory: QueryResult[];
    metrics: DatabaseMetrics | null;
    health: DatabaseHealth | null;
    loading: boolean;
    queryLoading: boolean;
    connectionLoading: Record<string, boolean>;
    error: string | null;
    lastUpdated: string | null;
    activeTab: 'tables' | 'query' | 'monitoring';
    showAddModal: boolean;
}

const initialState: DatabaseState = {
    connections: [],
    selectedConnection: null,
    tables: [],
    queryResult: null,
    queryHistory: [],
    metrics: null,
    health: null,
    loading: false,
    queryLoading: false,
    connectionLoading: {},
    error: null,
    lastUpdated: null,
    activeTab: 'tables',
    showAddModal: false
};

// Async thunks
export const fetchConnections = createAsyncThunk(
    'database/fetchConnections',
    async (_, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.getConnections();
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch connections');
        }
    }
);

export const createConnection = createAsyncThunk(
    'database/createConnection',
    async (connectionData: Omit<DatabaseConnection, 'id' | 'status' | 'lastConnected' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.createConnection(connectionData);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to create connection');
        }
    }
);

export const testConnection = createAsyncThunk(
    'database/testConnection',
    async (connectionId: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.testConnection(connectionId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return { connectionId, data: response.data };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Connection test failed');
        }
    }
);

export const deleteConnection = createAsyncThunk(
    'database/deleteConnection',
    async (connectionId: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.deleteConnection(connectionId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return connectionId;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete connection');
        }
    }
);

export const fetchTables = createAsyncThunk(
    'database/fetchTables',
    async (connectionId: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.getTables(connectionId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tables');
        }
    }
);

export const executeQuery = createAsyncThunk(
    'database/executeQuery',
    async (params: { connectionId: string; query: string }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.executeQuery(params.connectionId, params.query);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Query execution failed');
        }
    }
);

export const fetchMetrics = createAsyncThunk(
    'database/fetchMetrics',
    async (_, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.getMetrics();
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch metrics');
        }
    }
);

export const fetchHealth = createAsyncThunk(
    'database/fetchHealth',
    async (_, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.getHealth();
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch health status');
        }
    }
);

export const fetchQueryHistory = createAsyncThunk(
    'database/fetchQueryHistory',
    async (_, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.getQueryHistory();
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch query history');
        }
    }
);

export const exportData = createAsyncThunk(
    'database/exportData',
    async (params: { connectionId: string; format: string }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.exportData(params.connectionId, params.format);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Export failed');
        }
    }
);

export const openExternalDatabase = createAsyncThunk(
    'database/openExternal',
    async (connectionId: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.database.openExternal(connectionId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return connectionId;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to open external database tool');
        }
    }
);

const databaseSlice = createSlice({
    name: 'database',
    initialState,
    reducers: {
        setSelectedConnection: (state, action: PayloadAction<DatabaseConnection | null>) => {
            state.selectedConnection = action.payload;
            // Clear tables when changing connection
            if (action.payload?.id !== state.selectedConnection?.id) {
                state.tables = [];
                state.queryResult = null;
            }
        },
        setActiveTab: (state, action: PayloadAction<DatabaseState['activeTab']>) => {
            state.activeTab = action.payload;
        },
        setShowAddModal: (state, action: PayloadAction<boolean>) => {
            state.showAddModal = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearQueryResult: (state) => {
            state.queryResult = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch connections
            .addCase(fetchConnections.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchConnections.fulfilled, (state, action) => {
                state.loading = false;
                state.connections = action.payload;
                state.lastUpdated = new Date().toISOString();
                // Auto-select first connection if none selected
                if (!state.selectedConnection && action.payload.length > 0) {
                    state.selectedConnection = action.payload[0];
                }
            })
            .addCase(fetchConnections.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Create connection
            .addCase(createConnection.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createConnection.fulfilled, (state, action) => {
                state.loading = false;
                state.connections.push(action.payload);
                state.showAddModal = false;
            })
            .addCase(createConnection.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Test connection
            .addCase(testConnection.pending, (state, action) => {
                const connectionId = action.meta.arg;
                state.connectionLoading[connectionId] = true;
                state.error = null;
            })
            .addCase(testConnection.fulfilled, (state, action) => {
                const { connectionId, data } = action.payload;
                delete state.connectionLoading[connectionId];
                // Update connection status in state
                const connection = state.connections.find(c => c.id === connectionId);
                if (connection && data) {
                    Object.assign(connection, data);
                }
                // Update selected connection if it's the same one
                if (state.selectedConnection?.id === connectionId && data) {
                    state.selectedConnection = data;
                }
            })
            .addCase(testConnection.rejected, (state, action) => {
                const connectionId = action.meta.arg;
                delete state.connectionLoading[connectionId];
                state.error = action.payload as string;
            })

            // Delete connection
            .addCase(deleteConnection.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteConnection.fulfilled, (state, action) => {
                state.loading = false;
                const connectionId = action.payload;
                state.connections = state.connections.filter(c => c.id !== connectionId);
                // Clear selected connection if it was deleted
                if (state.selectedConnection?.id === connectionId) {
                    state.selectedConnection = state.connections[0] || null;
                    state.tables = [];
                    state.queryResult = null;
                }
            })
            .addCase(deleteConnection.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Fetch tables
            .addCase(fetchTables.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTables.fulfilled, (state, action) => {
                state.loading = false;
                state.tables = action.payload;
            })
            .addCase(fetchTables.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Execute query
            .addCase(executeQuery.pending, (state) => {
                state.queryLoading = true;
                state.error = null;
            })
            .addCase(executeQuery.fulfilled, (state, action) => {
                state.queryLoading = false;
                state.queryResult = action.payload;
                // Add to history (keep last 50)
                state.queryHistory.unshift(action.payload);
                if (state.queryHistory.length > 50) {
                    state.queryHistory = state.queryHistory.slice(0, 50);
                }
            })
            .addCase(executeQuery.rejected, (state, action) => {
                state.queryLoading = false;
                state.error = action.payload as string;
            })

            // Fetch metrics
            .addCase(fetchMetrics.fulfilled, (state, action) => {
                state.metrics = action.payload;
            })
            .addCase(fetchMetrics.rejected, (state, action) => {
                state.error = action.payload as string;
            })

            // Fetch health
            .addCase(fetchHealth.fulfilled, (state, action) => {
                state.health = action.payload;
            })
            .addCase(fetchHealth.rejected, (state, action) => {
                state.error = action.payload as string;
            })

            // Fetch query history
            .addCase(fetchQueryHistory.fulfilled, (state, action) => {
                state.queryHistory = action.payload;
            })
            .addCase(fetchQueryHistory.rejected, (state, action) => {
                state.error = action.payload as string;
            })

            // Export data
            .addCase(exportData.fulfilled, () => {
                // Export completed successfully
            })
            .addCase(exportData.rejected, (state, action) => {
                state.error = action.payload as string;
            })

            // Open external database
            .addCase(openExternalDatabase.fulfilled, () => {
                // Opened successfully
            })
            .addCase(openExternalDatabase.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const {
    setSelectedConnection,
    setActiveTab,
    setShowAddModal,
    clearError,
    clearQueryResult
} = databaseSlice.actions;

export default databaseSlice.reducer;
