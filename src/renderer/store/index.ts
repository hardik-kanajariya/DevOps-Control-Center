import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import repositoriesSlice from './slices/repositoriesSlice';
import serversSlice from './slices/serversSlice';
import workflowsSlice from './slices/workflowsSlice';
import dashboardSlice from './slices/dashboardSlice';

export const store = configureStore({
    reducer: {
        auth: authSlice,
        repositories: repositoriesSlice,
        servers: serversSlice,
        workflows: workflowsSlice,
        dashboard: dashboardSlice,
    },
    devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Debug: Log the store state shape
console.log('Store initialized with state:', store.getState());
