import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { checkAuth } from './store/slices/authSlice';
import LoginScreen from './views/LoginScreen';
import MainLayout from './components/layout/MainLayout';
import LoadingScreen from './components/common/LoadingScreen';

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Check for existing authentication on app start
    dispatch(checkAuth());
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
