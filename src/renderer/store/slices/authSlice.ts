import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GitHubUser } from '../../../shared/types';

interface AuthState {
    isAuthenticated: boolean;
    token: string | null;
    user: GitHubUser | null;
    loading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    isAuthenticated: false,
    token: null,
    user: null,
    loading: false,
    error: null,
};

// Async thunks
export const checkAuth = createAsyncThunk(
    'auth/checkAuth',
    async () => {
        const response = await window.electronAPI.auth.check();
        if (!response.success) {
            throw new Error(response.error);
        }
        return response.data;
    }
);

export const setToken = createAsyncThunk(
    'auth/setToken',
    async (token: string) => {
        const response = await window.electronAPI.auth.setToken(token);
        if (!response.success) {
            throw new Error(response.error);
        }
        // After setting token, check auth to get user data
        const checkResponse = await window.electronAPI.auth.check();
        if (!checkResponse.success) {
            throw new Error(checkResponse.error);
        }
        return { token, ...checkResponse.data };
    }
);

export const validateToken = createAsyncThunk(
    'auth/validateToken',
    async () => {
        const tokenResponse = await window.electronAPI.auth.getToken();
        if (!tokenResponse.success || !tokenResponse.data) {
            return { isValid: false, token: null };
        }

        const validResponse = await window.electronAPI.auth.validateToken();
        if (!validResponse.success) {
            throw new Error(validResponse.error);
        }

        return {
            isValid: validResponse.data || false,
            token: tokenResponse.data,
        };
    }
);

export const clearAuth = createAsyncThunk(
    'auth/clearAuth',
    async () => {
        const response = await window.electronAPI.auth.clear();
        if (!response.success) {
            throw new Error(response.error);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setUser: (state, action: PayloadAction<GitHubUser>) => {
            state.user = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Check auth
            .addCase(checkAuth.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(checkAuth.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    state.isAuthenticated = action.payload.isAuthenticated;
                    state.user = action.payload.user || null;
                }
                state.error = null;
            })
            .addCase(checkAuth.rejected, (state, action) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.error = action.error.message || 'Failed to check auth';
            })
            // Set token
            .addCase(setToken.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(setToken.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    state.isAuthenticated = action.payload.isAuthenticated || false;
                    state.token = action.payload.token || null;
                    state.user = action.payload.user || null;
                }
                state.error = null;
            })
            .addCase(setToken.rejected, (state, action) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.token = null;
                state.user = null;
                state.error = action.error.message || 'Failed to set token';
            })
            // Validate token
            .addCase(validateToken.pending, (state) => {
                state.loading = true;
            })
            .addCase(validateToken.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = action.payload.isValid;
                state.token = action.payload.token;
                if (!action.payload.isValid) {
                    state.user = null;
                }
            })
            .addCase(validateToken.rejected, (state, action) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.token = null;
                state.user = null;
                state.error = action.error.message || 'Token validation failed';
            })
            // Clear auth
            .addCase(clearAuth.fulfilled, (state) => {
                state.isAuthenticated = false;
                state.token = null;
                state.user = null;
                state.error = null;
            });
    },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
