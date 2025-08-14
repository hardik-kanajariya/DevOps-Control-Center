import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GitHubRepository } from '../../../shared/types';

interface RepositoryAnalytics {
    totalCommits: number;
    contributors: number;
    lastActivity: string;
    fileCount: number;
    size: string;
    mainLanguage: string;
    languages: Record<string, number>;
}

interface RepositoriesState {
    repositories: GitHubRepository[];
    selectedRepository: GitHubRepository | null;
    analytics: Record<string, RepositoryAnalytics>;
    loading: boolean;
    cloning: Record<string, boolean>;
    searchLoading: boolean;
    error: string | null;
    searchTerm: string;
    sortBy: 'updated' | 'created' | 'name' | 'stars';
    filterBy: 'all' | 'public' | 'private';
    lastUpdated: string | null;
}

const initialState: RepositoriesState = {
    repositories: [],
    selectedRepository: null,
    analytics: {},
    loading: false,
    cloning: {},
    searchLoading: false,
    error: null,
    searchTerm: '',
    sortBy: 'updated',
    filterBy: 'all',
    lastUpdated: null,
};

// Async thunks
export const fetchRepositories = createAsyncThunk(
    'repositories/fetchRepositories',
    async (_, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.repos.list();
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data as GitHubRepository[];
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

export const fetchRepository = createAsyncThunk(
    'repositories/fetchRepository',
    async (repoName: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.repos.get(repoName);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data as GitHubRepository;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

export const searchRepositories = createAsyncThunk(
    'repositories/searchRepositories',
    async (params: { query: string; filters?: any }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.repos.search(params.query, params.filters);
            if (!response.success) {
                throw new Error(response.error);
            }
            return response.data as GitHubRepository[];
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

export const cloneRepository = createAsyncThunk(
    'repositories/cloneRepository',
    async (params: { repoUrl: string; localPath: string }, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.repos.clone(params.repoUrl, params.localPath);
            if (!response.success) {
                throw new Error(response.error);
            }
            return params;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

export const fetchRepositoryAnalytics = createAsyncThunk(
    'repositories/fetchAnalytics',
    async (repoName: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.repos.analytics(repoName);
            if (!response.success) {
                throw new Error(response.error);
            }
            return { repoName, analytics: response.data as RepositoryAnalytics };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
    }
);

export const openRepositoryInBrowser = createAsyncThunk(
    'repositories/openInBrowser',
    async (htmlUrl: string, { rejectWithValue }) => {
        try {
            const response = await window.electronAPI.repos.openBrowser(htmlUrl);
            if (!response.success) {
                throw new Error(response.error);
            }
            return htmlUrl;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
        }
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
        setSelectedRepository: (state, action: PayloadAction<GitHubRepository | null>) => {
            state.selectedRepository = action.payload;
        },
        setCloning: (state, action: PayloadAction<{ repoName: string; isCloning: boolean }>) => {
            state.cloning[action.payload.repoName] = action.payload.isCloning;
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
                state.lastUpdated = new Date().toISOString();
                state.error = null;
            })
            .addCase(fetchRepositories.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Fetch single repository
            .addCase(fetchRepository.fulfilled, (state, action) => {
                const index = state.repositories.findIndex(repo => repo.id === action.payload.id);
                if (index !== -1) {
                    state.repositories[index] = action.payload;
                } else {
                    state.repositories.push(action.payload);
                }
                state.selectedRepository = action.payload;
            })
            .addCase(fetchRepository.rejected, (state, action) => {
                state.error = action.payload as string;
            })

            // Search repositories
            .addCase(searchRepositories.pending, (state) => {
                state.searchLoading = true;
                state.error = null;
            })
            .addCase(searchRepositories.fulfilled, (state, action) => {
                state.searchLoading = false;
                state.repositories = action.payload;
            })
            .addCase(searchRepositories.rejected, (state, action) => {
                state.searchLoading = false;
                state.error = action.payload as string;
            })

            // Clone repository
            .addCase(cloneRepository.pending, (state, action) => {
                const repoName = action.meta.arg.repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
                state.cloning[repoName] = true;
            })
            .addCase(cloneRepository.fulfilled, (state, action) => {
                const repoName = action.payload.repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
                state.cloning[repoName] = false;
            })
            .addCase(cloneRepository.rejected, (state, action) => {
                const repoName = action.meta.arg.repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
                state.cloning[repoName] = false;
                state.error = action.payload as string;
            })

            // Fetch repository analytics
            .addCase(fetchRepositoryAnalytics.fulfilled, (state, action) => {
                state.analytics[action.payload.repoName] = action.payload.analytics;
            })
            .addCase(fetchRepositoryAnalytics.rejected, (state, action) => {
                state.error = action.payload as string;
            })

            // Open repository in browser
            .addCase(openRepositoryInBrowser.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const {
    setSearchTerm,
    setSortBy,
    setFilterBy,
    setSelectedRepository,
    setCloning,
    clearError,
} = repositoriesSlice.actions;

export default repositoriesSlice.reducer;
