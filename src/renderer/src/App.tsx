import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { validateToken } from './store/slices/authSlice';
import LoginScreen from './views/LoginScreen';
import MainLayout from './components/layout/MainLayout';
import LoadingScreen from './components/common/LoadingScreen';

function App() {
    const dispatch = useDispatch<AppDispatch>();
    const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        // Check for existing token on app start
        dispatch(validateToken());
    }, [dispatch]);

    if (loading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    return <MainLayout />;
}

export default App;
