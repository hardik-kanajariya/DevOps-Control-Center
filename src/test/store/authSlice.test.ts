import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, {
    setUser,
    clearError,
    checkAuth,
    setToken,
    clearAuth,
    validateToken
} from '../../renderer/store/slices/authSlice';
import type { GitHubUser } from '../../shared/types';

interface RootState {
    auth: ReturnType<typeof authSlice>;
}

describe('authSlice', () => {
    let store: ReturnType<typeof configureStore<RootState>>;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                auth: authSlice
            }
        });
    });

    it('should handle initial state', () => {
        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.token).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('should handle setUser', () => {
        const mockUser: GitHubUser = {
            id: 123,
            login: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            avatar_url: 'https://github.com/avatar.jpg',
            html_url: 'https://github.com/testuser',
            type: 'User',
            public_repos: 10,
            followers: 5,
            following: 8
        };

        store.dispatch(setUser(mockUser));
        const state = store.getState().auth;

        expect(state.user).toEqual(mockUser);
    });

    it('should handle clearError', () => {
        // First set an error by dispatching a rejected action
        store.dispatch({
            type: checkAuth.rejected.type,
            error: { message: 'Test error' }
        });

        // Verify error is set
        expect(store.getState().auth.error).toBe('Test error');

        // Clear the error
        store.dispatch(clearError());
        expect(store.getState().auth.error).toBeNull();
    });

    it('should handle setToken pending state', () => {
        store.dispatch({ type: setToken.pending.type });
        const state = store.getState().auth;

        expect(state.loading).toBe(true);
        expect(state.error).toBeNull();
    });

    it('should handle setToken fulfilled state', () => {
        const mockPayload = {
            token: 'ghp_test_token_123',
            isAuthenticated: true,
            user: {
                id: 123,
                login: 'testuser',
                name: 'Test User',
                email: 'test@example.com',
                avatar_url: 'https://github.com/avatar.jpg',
                html_url: 'https://github.com/testuser',
                type: 'User',
                public_repos: 10,
                followers: 5,
                following: 8
            }
        };

        store.dispatch({
            type: setToken.fulfilled.type,
            payload: mockPayload
        });

        const state = store.getState().auth;
        expect(state.loading).toBe(false);
        expect(state.isAuthenticated).toBe(true);
        expect(state.token).toBe('ghp_test_token_123');
        expect(state.user).toEqual(mockPayload.user);
        expect(state.error).toBeNull();
    });

    it('should handle setToken rejected state', () => {
        store.dispatch({
            type: setToken.rejected.type,
            error: { message: 'Invalid token' }
        });

        const state = store.getState().auth;
        expect(state.loading).toBe(false);
        expect(state.isAuthenticated).toBe(false);
        expect(state.token).toBeNull();
        expect(state.user).toBeNull();
        expect(state.error).toBe('Invalid token');
    });

    it('should handle clearAuth fulfilled state', () => {
        // First set some auth data
        store.dispatch(setUser({
            id: 123,
            login: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            avatar_url: 'https://github.com/avatar.jpg',
            html_url: 'https://github.com/testuser',
            type: 'User',
            public_repos: 10,
            followers: 5,
            following: 8
        }));

        // Then clear it
        store.dispatch({ type: clearAuth.fulfilled.type });
        const state = store.getState().auth;

        expect(state.user).toBeNull();
        expect(state.token).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBeNull();
    });

    it('should handle validateToken states', () => {
        // Test pending
        store.dispatch({ type: validateToken.pending.type });
        expect(store.getState().auth.loading).toBe(true);

        // Test fulfilled with valid token
        store.dispatch({
            type: validateToken.fulfilled.type,
            payload: { isValid: true, token: 'ghp_valid_token' }
        });

        let state = store.getState().auth;
        expect(state.loading).toBe(false);
        expect(state.isAuthenticated).toBe(true);
        expect(state.token).toBe('ghp_valid_token');

        // Test fulfilled with invalid token
        store.dispatch({
            type: validateToken.fulfilled.type,
            payload: { isValid: false, token: null }
        });

        state = store.getState().auth;
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
    });
});
