import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GitHubRepository } from '../../../shared/types';

interface RepositoriesState {
    repositories: GitHubRepository[];
    loading: boolean;
    error: string | null;
    searchTerm: string;
    sortBy: 'updated' | 'created' | 'name' | 'stars';
    filterBy: 'all' | 'public' | 'private';
}

const initialState: RepositoriesState = {
    repositories: [],
    loading: false,
    error: null,
    searchTerm: '',
    sortBy: 'updated',
    filterBy: 'all',
};

// Async thunks
export const fetchRepositories = createAsyncThunk(
    'repositories/fetchRepositories',
    async () => {
        const response = await window.electronAPI.repos.list();
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data as GitHubRepository[];
    }
);

export const fetchRepository = createAsyncThunk(
    'repositories/fetchRepository',
    async (repoName: string) => {
        const response = await window.electronAPI.repos.get(repoName);
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data as GitHubRepository;
    }
);

const repositoriesSlice = createSlice({
    name: 'repositories',
    initialState,
    reducers: {
        setSearchTerm: (state, action: PayloadAction<string>) => {
            state.searchTerm = action.payload;
        },
        setSortBy: (state, action: PayloadAction<RepositoriesState['sortBy']>) => {
            state.sortBy = action.payload;
        },
        setFilterBy: (state, action: PayloadAction<RepositoriesState['filterBy']>) => {
            state.filterBy = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch repositories
            .addCase(fetchRepositories.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRepositories.fulfilled, (state, action) => {
                state.loading = false;
                state.repositories = action.payload;
                state.error = null;
            })
            .addCase(fetchRepositories.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch repositories';
            })
            // Fetch single repository
            .addCase(fetchRepository.fulfilled, (state, action) => {
                const index = state.repositories.findIndex(repo => repo.id === action.payload.id);
                if (index !== -1) {
                    state.repositories[index] = action.payload;
                } else {
                    state.repositories.push(action.payload);
                }
            });
    },
});

export const { setSearchTerm, setSortBy, setFilterBy, clearError } = repositoriesSlice.actions;
export default repositoriesSlice.reducer;
