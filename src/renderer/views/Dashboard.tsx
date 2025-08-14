import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { fetchDashboardStats, fetchRecentActivity, fetchSystemHealth, refreshDashboardStats } from '../store/slices/dashboardSlice';
import { ActivityItem } from '../../shared/types';

interface DashboardProps {
    onNavigate: (view: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const {
        stats,
        recentActivity,
        systemHealth,
        loading,
        error,
        lastUpdated
    } = useAppSelector((state) => state.dashboard);

    useEffect(() => {
        // Fetch initial dashboard data
        dispatch(fetchDashboardStats());
        dispatch(fetchRecentActivity(5));
        dispatch(fetchSystemHealth());

        // Set up auto-refresh every 30 seconds
        const interval = setInterval(() => {
            dispatch(refreshDashboardStats());
        }, 30000);

        return () => clearInterval(interval);
    }, [dispatch]);

    const handleRefresh = () => {
        dispatch(refreshDashboardStats());
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-600 bg-green-100';
            case 'error': return 'text-red-600 bg-red-100';
            case 'warning': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-blue-600 bg-blue-100';
        }
    };

    const getServiceStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'text-green-600';
            case 'stopped': return 'text-gray-600';
            case 'error': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    if (loading && !stats) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome back{user ? `, ${user.name || user.login}` : ''}!
                    </h1>
                    <p className="text-gray-600">Here's what's happening with your projects today.</p>
                    {lastUpdated && (
                        <p className="text-sm text-gray-500 mt-1">
                            Last updated: {formatTime(lastUpdated)}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="btn-primary flex items-center"
                >
                    <svg
                        className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card">
                    <div className="flex items-center">
                        <div className="p-2 bg-primary-100 rounded-lg">
                            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Repositories</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.repositoriesCount || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Successful Deployments</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.successfulDeployments || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Active Pipelines</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.activePipelines || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Connected Servers</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.connectedServers || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Deployment Metrics */}
            {stats?.deploymentMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Success Rate</p>
                            <p className="text-3xl font-bold text-green-600">{stats.deploymentMetrics.successRate.toFixed(1)}%</p>
                            <p className="text-xs text-gray-500">of {stats.deploymentMetrics.totalDeployments} deployments</p>
                        </div>
                    </div>
                    <div className="card">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Avg Deploy Time</p>
                            <p className="text-3xl font-bold text-blue-600">{formatDuration(stats.deploymentMetrics.averageDeployTime)}</p>
                            <p className="text-xs text-gray-500">average duration</p>
                        </div>
                    </div>
                    <div className="card">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Today</p>
                            <p className="text-3xl font-bold text-purple-600">{stats.deploymentMetrics.deploymentsToday}</p>
                            <p className="text-xs text-gray-500">deployments today</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                        {recentActivity && recentActivity.length > 0 ? (
                            recentActivity.map((activity: ActivityItem) => (
                                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100">
                                    <div className={`p-1 rounded-full ${getStatusColor(activity.status)}`}>
                                        <div className="w-2 h-2 rounded-full bg-current"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                                        <p className="text-sm text-gray-600">{activity.description}</p>
                                        <div className="flex items-center mt-1 space-x-2 text-xs text-gray-500">
                                            <span>{formatTime(activity.timestamp)}</span>
                                            {activity.repository && (
                                                <>
                                                    <span>•</span>
                                                    <span>{activity.repository}</span>
                                                </>
                                            )}
                                            {activity.server && (
                                                <>
                                                    <span>•</span>
                                                    <span>{activity.server}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-8">No recent activity</p>
                        )}
                    </div>
                </div>

                {/* System Health & Quick Actions */}
                <div className="space-y-6">
                    {/* System Health */}
                    {systemHealth && (
                        <div className="card">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">CPU Usage</span>
                                    <span className="text-sm font-medium">{systemHealth.cpu.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${systemHealth.cpu}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Memory Usage</span>
                                    <span className="text-sm font-medium">{systemHealth.memory}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-600 h-2 rounded-full"
                                        style={{ width: `${systemHealth.memory}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Disk Usage</span>
                                    <span className="text-sm font-medium">{systemHealth.disk}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-yellow-600 h-2 rounded-full"
                                        style={{ width: `${systemHealth.disk}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Network</span>
                                    <span className={`text-sm font-medium ${systemHealth.network === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                                        {systemHealth.network}
                                    </span>
                                </div>

                                {/* Services Status */}
                                <div className="mt-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Services</h4>
                                    <div className="space-y-2">
                                        {systemHealth.services.map((service, index) => (
                                            <div key={index} className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{service.name}</span>
                                                <span className={`text-xs font-medium ${getServiceStatusColor(service.status)}`}>
                                                    {service.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => onNavigate('repositories')}
                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                            >
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span className="text-sm font-medium">Add New Repository</span>
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('monitoring')}
                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                            >
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <span className="text-sm font-medium">View Real-time Monitoring</span>
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('docker')}
                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                            >
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                    </svg>
                                    <span className="text-sm font-medium">Manage Docker Containers</span>
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('database')}
                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                            >
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                    </svg>
                                    <span className="text-sm font-medium">Database Management</span>
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('workflows')}
                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                            >
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <span className="text-sm font-medium">Create Visual Workflow</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}