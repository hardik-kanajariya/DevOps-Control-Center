import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface DashboardStats {
    repositoriesCount: number;
    successfulDeployments: number;
    activePipelines: number;
    connectedServers: number;
    recentActivity: ActivityItem[];
    systemHealth: SystemHealth;
    deploymentMetrics: DeploymentMetrics;
}

export interface ActivityItem {
    id: string;
    type: 'deployment' | 'repository' | 'server' | 'workflow' | 'error';
    title: string;
    description: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error' | 'info';
    repository?: string;
    server?: string;
    user?: string;
}

export interface SystemHealth {
    cpu: number;
    memory: number;
    disk: number;
    network: 'online' | 'offline' | 'limited';
    services: ServiceStatus[];
}

export interface ServiceStatus {
    name: string;
    status: 'running' | 'stopped' | 'error';
    uptime: number;
    lastCheck: string;
}

export interface DeploymentMetrics {
    totalDeployments: number;
    successRate: number;
    averageDeployTime: number;
    deploymentsToday: number;
    failedDeployments: number;
}

interface DashboardState {
    stats: DashboardStats | null;
    recentActivity: ActivityItem[];
    systemHealth: SystemHealth | null;
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;
    autoRefresh: boolean;
    refreshInterval: number;
}

const initialState: DashboardState = {
    stats: null,
    recentActivity: [],
    systemHealth: null,
    loading: false,
    error: null,
    lastUpdated: null,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
};

// Async thunks
export const fetchDashboardStats = createAsyncThunk(
    'dashboard/fetchStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.dashboard.getStats();
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data as DashboardStats;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

export const fetchRecentActivity = createAsyncThunk(
    'dashboard/fetchRecentActivity',
    async (limit: number = 10, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.dashboard.getRecentActivity(limit);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data as ActivityItem[];
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

export const fetchSystemHealth = createAsyncThunk(
    'dashboard/fetchSystemHealth',
    async (_, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.dashboard.getSystemHealth();
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data as SystemHealth;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

export const refreshDashboardStats = createAsyncThunk(
    'dashboard/refresh',
    async (_, { dispatch }) => {
        const promises = [
            dispatch(fetchDashboardStats()),
            dispatch(fetchRecentActivity(10)),
            dispatch(fetchSystemHealth()),
        ];

        await Promise.all(promises);
    }
);

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setAutoRefresh: (state, action: PayloadAction<boolean>) => {
            state.autoRefresh = action.payload;
        },
        setRefreshInterval: (state, action: PayloadAction<number>) => {
            state.refreshInterval = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        addActivity: (state, action: PayloadAction<ActivityItem>) => {
            state.recentActivity.unshift(action.payload);
            // Keep only the latest 50 activities
            state.recentActivity = state.recentActivity.slice(0, 50);
        },
        updateSystemHealth: (state, action: PayloadAction<Partial<SystemHealth>>) => {
            if (state.systemHealth) {
                state.systemHealth = { ...state.systemHealth, ...action.payload };
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch dashboard stats
            .addCase(fetchDashboardStats.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.loading = false;
                state.stats = action.payload;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(fetchDashboardStats.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Fetch recent activity
            .addCase(fetchRecentActivity.fulfilled, (state, action) => {
                state.recentActivity = action.payload;
            })
            .addCase(fetchRecentActivity.rejected, (state, action) => {
                state.error = action.payload as string;
            })

            // Fetch system health
            .addCase(fetchSystemHealth.fulfilled, (state, action) => {
                state.systemHealth = action.payload;
            })
            .addCase(fetchSystemHealth.rejected, (state, action) => {
                state.error = action.payload as string;
            })

            // Refresh dashboard
            .addCase(refreshDashboardStats.pending, (state) => {
                state.loading = true;
            })
            .addCase(refreshDashboardStats.fulfilled, (state) => {
                state.loading = false;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(refreshDashboardStats.rejected, (state) => {
                state.loading = false;
            });
    },
});

export const {
    setAutoRefresh,
    setRefreshInterval,
    clearError,
    addActivity,
    updateSystemHealth,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
