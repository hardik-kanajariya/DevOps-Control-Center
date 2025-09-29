import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import repositoriesSlice from './slices/repositoriesSlice';
import serversSlice from './slices/serversSlice';
import workflowsSlice from './slices/workflowsSlice';
import dashboardSlice from './slices/dashboardSlice';
import databaseSlice from './slices/databaseSlice';

export const store = configureStore({
    reducer: {
        auth: authSlice,
        repositories: repositoriesSlice,
        servers: serversSlice,
        workflows: workflowsSlice,
        dashboard: dashboardSlice,
        database: databaseSlice,
    },
    devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
