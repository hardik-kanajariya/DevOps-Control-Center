import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { WorkflowRun } from '../../../shared/types';

interface WorkflowState {
    workflows: WorkflowRun[];
    selectedWorkflow: WorkflowRun | null;
    workflowYAML: string | null;
    loading: boolean;
    error: string | null;
}

const initialState: WorkflowState = {
    workflows: [],
    selectedWorkflow: null,
    workflowYAML: null,
    loading: false,
    error: null,
};

export const fetchWorkflows = createAsyncThunk(
    'workflows/fetchWorkflows',
    async () => {
        const response = await window.electronAPI.repos.list();
        if (!response.success) throw new Error(response.error);
        // For demo, just return an empty array
        return [] as WorkflowRun[];
    }
);

export const fetchWorkflowYAML = createAsyncThunk(
    'workflows/fetchWorkflowYAML',
    async (workflowId: number) => {
        // IPC call to get YAML (stub)
        return 'name: Example Workflow\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest';
    }
);

const workflowsSlice = createSlice({
    name: 'workflows',
    initialState,
    reducers: {
        selectWorkflow: (state, action: PayloadAction<number>) => {
            state.selectedWorkflow = state.workflows.find(wf => wf.id === action.payload) || null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWorkflows.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchWorkflows.fulfilled, (state, action) => {
                state.loading = false;
                state.workflows = action.payload;
            })
            .addCase(fetchWorkflows.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch workflows';
            })
            .addCase(fetchWorkflowYAML.fulfilled, (state, action) => {
                state.workflowYAML = action.payload;
            });
    },
});

export const { selectWorkflow } = workflowsSlice.actions;
export default workflowsSlice.reducer;
