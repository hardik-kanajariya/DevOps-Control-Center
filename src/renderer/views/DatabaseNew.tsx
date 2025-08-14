import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
    fetchConnections,
    createConnection,
    testConnection,
    deleteConnection,
    fetchTables,
    executeQuery,
    fetchMetrics,
    fetchHealth,
    fetchQueryHistory,
    exportData,
    openExternalDatabase,
    setSelectedConnection,
    setActiveTab,
    setShowAddModal,
    clearError,
    clearQueryResult
} from '../store/slices/databaseSlice';

export default function Database() {
    const dispatch = useAppDispatch();
    const {
        connections,
        selectedConnection,
        tables,
        queryResult,
        queryHistory,
        metrics,
        health,
        loading,
        queryLoading,
        connectionLoading,
        error,
        lastUpdated,
        activeTab,
        showAddModal
    } = useAppSelector((state) => state.database);

    const [queryText, setQueryText] = useState('SELECT * FROM repositories LIMIT 10;');
    const [connectionForm, setConnectionForm] = useState({
        name: '',
        type: 'postgresql' as const,
        host: '',
        port: 5432,
        database: '',
        username: '',
        password: '',
        ssl: false
    });

    // Load connections and data on component mount
    useEffect(() => {
        dispatch(fetchConnections());
        dispatch(fetchMetrics());
        dispatch(fetchHealth());
        dispatch(fetchQueryHistory());
    }, [dispatch]);

    // Auto-refresh metrics and health every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab === 'monitoring') {
                dispatch(fetchMetrics());
                dispatch(fetchHealth());
            }
        }, 30 * 1000);

        return () => clearInterval(interval);
    }, [dispatch, activeTab]);

    // Load tables when connection changes
    useEffect(() => {
        if (selectedConnection && activeTab === 'tables') {
            dispatch(fetchTables(selectedConnection.id));
        }
    }, [selectedConnection, activeTab, dispatch]);

    const handleSelectConnection = (connection: any) => {
        dispatch(setSelectedConnection(connection));
    };

    const handleTestConnection = async (connectionId: string) => {
        await dispatch(testConnection(connectionId));
    };

    const handleDeleteConnection = async (connectionId: string) => {
        if (window.confirm('Are you sure you want to delete this connection?')) {
            await dispatch(deleteConnection(connectionId));
        }
    };

    const handleCreateConnection = async (e: React.FormEvent) => {
        e.preventDefault();
        await dispatch(createConnection(connectionForm));
        setConnectionForm({
            name: '',
            type: 'postgresql',
            host: '',
            port: 5432,
            database: '',
            username: '',
            password: '',
            ssl: false
        });
    };

    const handleExecuteQuery = async () => {
        if (!selectedConnection || !queryText.trim()) return;
        await dispatch(executeQuery({
            connectionId: selectedConnection.id,
            query: queryText.trim()
        }));
    };

    const handleExportData = async (format: string) => {
        if (!selectedConnection) return;
        try {
            const result = await dispatch(exportData({
                connectionId: selectedConnection.id,
                format
            })).unwrap();

            // Create download link
            const blob = new Blob([result], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export_${selectedConnection.name}_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const handleOpenExternal = () => {
        if (selectedConnection) {
            dispatch(openExternalDatabase(selectedConnection.id));
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'text-green-600 bg-green-100';
            case 'connecting': return 'text-blue-600 bg-blue-100';
            case 'disconnected': return 'text-gray-600 bg-gray-100';
            case 'error': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'postgresql': return '🐘';
            case 'mysql': return '🐬';
            case 'mongodb': return '🍃';
            case 'redis': return '📦';
            case 'sqlite': return '💾';
            case 'github_database': return '🐙';
            default: return '🗃️';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading && connections.length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Loading database connections...</h3>
                    <p className="mt-2 text-sm text-gray-500">Initializing database management</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-gray-50">
            {/* Connections Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Database</h1>
                        <button
                            onClick={() => dispatch(setShowAddModal(true))}
                            className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700 transition-colors"
                        >
                            Add Connection
                        </button>
                    </div>

                    {lastUpdated && (
                        <p className="text-xs text-gray-500">
                            Updated {formatDate(lastUpdated)}
                        </p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex justify-between items-start">
                                <p className="text-red-600 text-sm">{error}</p>
                                <button
                                    onClick={() => dispatch(clearError())}
                                    className="text-red-400 hover:text-red-600"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {connections.map((connection) => (
                            <div
                                key={connection.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedConnection?.id === connection.id
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                                onClick={() => handleSelectConnection(connection)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg">{getTypeIcon(connection.type)}</span>
                                            <h3 className="font-medium text-gray-900 truncate">{connection.name}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{connection.host}:{connection.port}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(connection.status)}`}>
                                                {connection.status}
                                            </span>
                                            <div className="flex space-x-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleTestConnection(connection.id);
                                                    }}
                                                    disabled={connectionLoading[connection.id]}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                                    title="Test connection"
                                                >
                                                    {connectionLoading[connection.id] ? (
                                                        <div className="animate-spin w-4 h-4 border border-blue-600 border-t-transparent rounded-full"></div>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteConnection(connection.id);
                                                    }}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                    title="Delete connection"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {connections.length === 0 && !loading && (
                            <div className="text-center py-8">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                                <h3 className="mt-4 text-sm font-medium text-gray-900">No database connections</h3>
                                <p className="mt-2 text-sm text-gray-500">Add your first database connection to get started</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {selectedConnection ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="text-2xl">{getTypeIcon(selectedConnection.type)}</span>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedConnection.name}</h2>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedConnection.status)}`}>
                                            {selectedConnection.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 mb-4">
                                        {selectedConnection.host}:{selectedConnection.port} • {selectedConnection.database}
                                    </p>
                                    {selectedConnection.lastConnected && (
                                        <p className="text-sm text-gray-500">
                                            Last connected: {formatDate(selectedConnection.lastConnected)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleExportData('json')}
                                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Export JSON
                                    </button>
                                    <button
                                        onClick={handleOpenExternal}
                                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Open External
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-200 mt-6">
                                {[
                                    { id: 'tables', label: 'Tables & Schema', icon: '📊' },
                                    { id: 'query', label: 'Query Editor', icon: '⚡' },
                                    { id: 'monitoring', label: 'Monitoring', icon: '📈' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => dispatch(setActiveTab(tab.id as any))}
                                        className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <span>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-hidden">
                            {activeTab === 'tables' && (
                                <div className="h-full overflow-y-auto p-6">
                                    <div className="bg-white rounded-lg shadow">
                                        <div className="px-6 py-4 border-b border-gray-200">
                                            <h3 className="text-lg font-medium text-gray-900">Database Schema</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rows</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schema</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {tables.map((table, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <span className="mr-2">
                                                                        {table.type === 'table' ? '📋' : table.type === 'view' ? '👁️' : table.type === 'repository' ? '📁' : '⚙️'}
                                                                    </span>
                                                                    <span className="text-sm font-medium text-gray-900">{table.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                    {table.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{table.rows.toLocaleString()}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{table.size}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{table.schema || 'N/A'}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {table.lastModified ? formatDate(table.lastModified) : 'N/A'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {tables.length === 0 && !loading && (
                                                <div className="text-center py-8">
                                                    <p className="text-gray-500">No tables found in this database</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'query' && (
                                <div className="h-full flex flex-col p-6">
                                    <div className="bg-white rounded-lg shadow flex-1 flex flex-col">
                                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                            <h3 className="text-lg font-medium text-gray-900">Query Editor</h3>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => dispatch(clearQueryResult())}
                                                    className="text-gray-500 hover:text-gray-700 text-sm"
                                                >
                                                    Clear Results
                                                </button>
                                                <button
                                                    onClick={handleExecuteQuery}
                                                    disabled={queryLoading || !queryText.trim()}
                                                    className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {queryLoading ? 'Executing...' : 'Execute Query'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <div className="p-4 border-b border-gray-200">
                                                <textarea
                                                    value={queryText}
                                                    onChange={(e) => setQueryText(e.target.value)}
                                                    placeholder="Enter your SQL query here..."
                                                    className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                                />
                                            </div>

                                            <div className="flex-1 overflow-auto p-4">
                                                {queryLoading && (
                                                    <div className="text-center py-8">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                                                        <p className="mt-2 text-sm text-gray-500">Executing query...</p>
                                                    </div>
                                                )}

                                                {queryResult && !queryLoading && (
                                                    <div>
                                                        <div className="mb-4 text-sm text-gray-600">
                                                            Query executed in {queryResult.executionTime}ms • {queryResult.rowsAffected} rows affected
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        {queryResult.columns.map((column, index) => (
                                                                            <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                                                                {column}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {queryResult.rows.map((row, rowIndex) => (
                                                                        <tr key={rowIndex} className="hover:bg-gray-50">
                                                                            {row.map((cell, cellIndex) => (
                                                                                <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 border-r border-gray-200">
                                                                                    {cell !== null ? String(cell) : <span className="text-gray-400">NULL</span>}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {!queryResult && !queryLoading && (
                                                    <div className="text-center py-8 text-gray-500">
                                                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                        </svg>
                                                        <p>Enter a query and click "Execute Query" to see results</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'monitoring' && (
                                <div className="h-full overflow-y-auto p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Health Status */}
                                        <div className="bg-white rounded-lg shadow">
                                            <div className="px-6 py-4 border-b border-gray-200">
                                                <h3 className="text-lg font-medium text-gray-900">Database Health</h3>
                                            </div>
                                            <div className="p-6">
                                                {health ? (
                                                    <div>
                                                        <div className={`text-center mb-6 p-4 rounded-lg ${health.status === 'healthy' ? 'bg-green-50 text-green-800' :
                                                                health.status === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                                                                    'bg-red-50 text-red-800'
                                                            }`}>
                                                            <div className="text-3xl font-bold">{health.score}%</div>
                                                            <div className="text-sm uppercase font-medium">{health.status}</div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {health.checks.map((check, index) => (
                                                                <div key={index} className="flex items-center justify-between">
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className={`w-2 h-2 rounded-full ${check.status === 'pass' ? 'bg-green-500' :
                                                                                check.status === 'warning' ? 'bg-yellow-500' :
                                                                                    'bg-red-500'
                                                                            }`}></span>
                                                                        <span className="text-sm font-medium">{check.name}</span>
                                                                    </div>
                                                                    <span className="text-sm text-gray-500">{check.value}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 text-gray-500">Loading health status...</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Metrics */}
                                        <div className="bg-white rounded-lg shadow">
                                            <div className="px-6 py-4 border-b border-gray-200">
                                                <h3 className="text-lg font-medium text-gray-900">Performance Metrics</h3>
                                            </div>
                                            <div className="p-6">
                                                {metrics ? (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold text-gray-900">{metrics.activeConnections}</div>
                                                            <div className="text-sm text-gray-500">Active Connections</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold text-gray-900">{metrics.totalQueries}</div>
                                                            <div className="text-sm text-gray-500">Total Queries</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold text-gray-900">{metrics.avgQueryTime.toFixed(0)}ms</div>
                                                            <div className="text-sm text-gray-500">Avg Query Time</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold text-gray-900">{metrics.uptime}</div>
                                                            <div className="text-sm text-gray-500">Uptime</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold text-gray-900">{metrics.memoryUsage.toFixed(1)}%</div>
                                                            <div className="text-sm text-gray-500">Memory Usage</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold text-gray-900">{metrics.cacheHitRatio.toFixed(1)}%</div>
                                                            <div className="text-sm text-gray-500">Cache Hit Ratio</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 text-gray-500">Loading metrics...</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Query History */}
                                    <div className="mt-6 bg-white rounded-lg shadow">
                                        <div className="px-6 py-4 border-b border-gray-200">
                                            <h3 className="text-lg font-medium text-gray-900">Recent Query History</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Execution Time</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rows</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {queryHistory.slice(0, 10).map((query, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm text-gray-900 font-mono max-w-xs truncate">
                                                                    {query.query}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {query.executionTime}ms
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {query.rowsAffected}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {formatDate(query.timestamp)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {queryHistory.length === 0 && (
                                                <div className="text-center py-8 text-gray-500">
                                                    No query history available
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Select a database connection</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose a connection from the sidebar to view its details and manage data</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Connection Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <form onSubmit={handleCreateConnection}>
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Add Database Connection</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Connection Name</label>
                                    <input
                                        type="text"
                                        value={connectionForm.name}
                                        onChange={(e) => setConnectionForm({ ...connectionForm, name: e.target.value })}
                                        placeholder="Production Database"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
                                    <select
                                        value={connectionForm.type}
                                        onChange={(e) => setConnectionForm({ ...connectionForm, type: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="postgresql">PostgreSQL</option>
                                        <option value="mysql">MySQL</option>
                                        <option value="mongodb">MongoDB</option>
                                        <option value="redis">Redis</option>
                                        <option value="sqlite">SQLite</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                                        <input
                                            type="text"
                                            value={connectionForm.host}
                                            onChange={(e) => setConnectionForm({ ...connectionForm, host: e.target.value })}
                                            placeholder="localhost"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                                        <input
                                            type="number"
                                            value={connectionForm.port}
                                            onChange={(e) => setConnectionForm({ ...connectionForm, port: parseInt(e.target.value) })}
                                            placeholder="5432"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                                    <input
                                        type="text"
                                        value={connectionForm.database}
                                        onChange={(e) => setConnectionForm({ ...connectionForm, database: e.target.value })}
                                        placeholder="mydb"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                        <input
                                            type="text"
                                            value={connectionForm.username}
                                            onChange={(e) => setConnectionForm({ ...connectionForm, username: e.target.value })}
                                            placeholder="admin"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                        <input
                                            type="password"
                                            value={connectionForm.password}
                                            onChange={(e) => setConnectionForm({ ...connectionForm, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="ssl"
                                        checked={connectionForm.ssl}
                                        onChange={(e) => setConnectionForm({ ...connectionForm, ssl: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <label htmlFor="ssl" className="text-sm text-gray-700">Use SSL connection</label>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => dispatch(setShowAddModal(false))}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'Creating...' : 'Test & Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
