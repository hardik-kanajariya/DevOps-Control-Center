import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { WorkflowRun } from '../../../shared/types';

interface WorkflowState {
    workflows: WorkflowRun[];
    selectedWorkflow: WorkflowRun | null;
    workflowYAML: string | null;
    loading: boolean;
    yamlLoading: boolean;
    actionLoading: Record<string, boolean>;
    error: string | null;
    lastUpdated: string | null;
    filterBy: 'all' | 'success' | 'failure' | 'in_progress' | 'cancelled';
    sortBy: 'updated' | 'created' | 'name' | 'status';
    selectedRepository: string | null;
}

const initialState: WorkflowState = {
    workflows: [],
    selectedWorkflow: null,
    workflowYAML: null,
    loading: false,
    yamlLoading: false,
    actionLoading: {},
    error: null,
    lastUpdated: null,
    filterBy: 'all',
    sortBy: 'updated',
    selectedRepository: null
};

// Async thunks
export const fetchAllWorkflows = createAsyncThunk(
    'workflows/fetchAllWorkflows',
    async (_, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.workflows.listAll();
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch workflows');
        }
    }
);

export const fetchRepositoryWorkflows = createAsyncThunk(
    'workflows/fetchRepositoryWorkflows',
    async (params: { owner: string; repo: string }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.workflows.listRepo(params.owner, params.repo);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch repository workflows');
        }
    }
);

export const fetchWorkflowYAML = createAsyncThunk(
    'workflows/fetchWorkflowYAML',
    async (params: { owner: string; repo: string; workflowId: number }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.workflows.getYAML(params.owner, params.repo, params.workflowId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch workflow YAML');
        }
    }
);

export const cancelWorkflowRun = createAsyncThunk(
    'workflows/cancelWorkflowRun',
    async (params: { owner: string; repo: string; runId: number }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.workflows.cancel(params.owner, params.repo, params.runId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return params.runId;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to cancel workflow run');
        }
    }
);

export const rerunWorkflow = createAsyncThunk(
    'workflows/rerunWorkflow',
    async (params: { owner: string; repo: string; runId: number }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.workflows.rerun(params.owner, params.repo, params.runId);
            if (!response.success) {
                throw new Error(response.error);
            }
            return params.runId;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to rerun workflow');
        }
    }
);

export const openWorkflowInBrowser = createAsyncThunk(
    'workflows/openWorkflowInBrowser',
    async (url: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.workflows.openBrowser(url);
            if (!response.success) {
                throw new Error(response.error);
            }
            return url;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to open workflow in browser');
        }
    }
);

const workflowsSlice = createSlice({
    name: 'workflows',
    initialState,
    reducers: {
        setSelectedWorkflow: (state, action: PayloadAction<WorkflowRun | null>) => {
            state.selectedWorkflow = action.payload;
        },
        setFilterBy: (state, action: PayloadAction<WorkflowState['filterBy']>) => {
            state.filterBy = action.payload;
        },
        setSortBy: (state, action: PayloadAction<WorkflowState['sortBy']>) => {
            state.sortBy = action.payload;
        },
        setSelectedRepository: (state, action: PayloadAction<string | null>) => {
            state.selectedRepository = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearWorkflowYAML: (state) => {
            state.workflowYAML = null;
        },
        selectWorkflow: (state, action: PayloadAction<number>) => {
            state.selectedWorkflow = state.workflows.find(wf => wf.id === action.payload) || null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch all workflows
            .addCase(fetchAllWorkflows.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllWorkflows.fulfilled, (state, action) => {
                state.loading = false;
                state.workflows = action.payload;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(fetchAllWorkflows.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Fetch repository workflows
            .addCase(fetchRepositoryWorkflows.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRepositoryWorkflows.fulfilled, (state, action) => {
                state.loading = false;
                state.workflows = action.payload;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(fetchRepositoryWorkflows.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Fetch workflow YAML
            .addCase(fetchWorkflowYAML.pending, (state) => {
                state.yamlLoading = true;
                state.error = null;
            })
            .addCase(fetchWorkflowYAML.fulfilled, (state, action) => {
                state.yamlLoading = false;
                state.workflowYAML = action.payload;
            })
            .addCase(fetchWorkflowYAML.rejected, (state, action) => {
                state.yamlLoading = false;
                state.error = action.payload as string;
            })

            // Cancel workflow run
            .addCase(cancelWorkflowRun.pending, (state, action) => {
                const runId = action.meta.arg.runId;
                state.actionLoading[`cancel-${runId}`] = true;
                state.error = null;
            })
            .addCase(cancelWorkflowRun.fulfilled, (state, action) => {
                const runId = action.payload;
                delete state.actionLoading[`cancel-${runId}`];
                // Update workflow status in state if it exists
                const workflow = state.workflows.find(w => w.id === runId);
                if (workflow) {
                    workflow.conclusion = 'cancelled';
                }
            })
            .addCase(cancelWorkflowRun.rejected, (state, action) => {
                const runId = action.meta.arg.runId;
                delete state.actionLoading[`cancel-${runId}`];
                state.error = action.payload as string;
            })

            // Rerun workflow
            .addCase(rerunWorkflow.pending, (state, action) => {
                const runId = action.meta.arg.runId;
                state.actionLoading[`rerun-${runId}`] = true;
                state.error = null;
            })
            .addCase(rerunWorkflow.fulfilled, (state, action) => {
                const runId = action.payload;
                delete state.actionLoading[`rerun-${runId}`];
            })
            .addCase(rerunWorkflow.rejected, (state, action) => {
                const runId = action.meta.arg.runId;
                delete state.actionLoading[`rerun-${runId}`];
                state.error = action.payload as string;
            })

            // Open workflow in browser
            .addCase(openWorkflowInBrowser.fulfilled, () => {
                // Nothing special to do here
            })
            .addCase(openWorkflowInBrowser.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const {
    setSelectedWorkflow,
    setFilterBy,
    setSortBy,
    setSelectedRepository,
    clearError,
    clearWorkflowYAML,
    selectWorkflow
} = workflowsSlice.actions;

export default workflowsSlice.reducer;
