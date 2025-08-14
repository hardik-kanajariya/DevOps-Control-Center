import { useState } from 'react';

interface DatabaseConnection {
    id: string;
    name: string;
    type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';
    host: string;
    port: number;
    database: string;
    username: string;
    status: 'connected' | 'disconnected' | 'error';
    lastConnected?: string;
    ssl: boolean;
}

interface TableInfo {
    name: string;
    rows: number;
    size: string;
    type: 'table' | 'view';
}

interface QueryResult {
    columns: string[];
    rows: any[][];
    executionTime: number;
    rowsAffected: number;
}

// Mock database connections
const mockConnections: DatabaseConnection[] = [
    {
        id: 'prod-postgres',
        name: 'Production Database',
        type: 'postgresql',
        host: 'db-prod.company.com',
        port: 5432,
        database: 'appdb',
        username: 'admin',
        status: 'connected',
        lastConnected: '2024-08-14T14:15:30Z',
        ssl: true
    },
    {
        id: 'staging-mysql',
        name: 'Staging MySQL',
        type: 'mysql',
        host: 'mysql-staging.company.com',
        port: 3306,
        database: 'staging_db',
        username: 'developer',
        status: 'connected',
        lastConnected: '2024-08-14T14:10:15Z',
        ssl: false
    },
    {
        id: 'mongo-analytics',
        name: 'Analytics MongoDB',
        type: 'mongodb',
        host: 'mongo.company.com',
        port: 27017,
        database: 'analytics',
        username: 'analyst',
        status: 'disconnected',
        ssl: true
    },
    {
        id: 'redis-cache',
        name: 'Redis Cache',
        type: 'redis',
        host: 'redis.company.com',
        port: 6379,
        database: '0',
        username: 'default',
        status: 'error',
        lastConnected: '2024-08-14T13:45:22Z',
        ssl: false
    }
];

const mockTables: TableInfo[] = [
    { name: 'users', rows: 15342, size: '2.3 MB', type: 'table' },
    { name: 'orders', rows: 48721, size: '8.7 MB', type: 'table' },
    { name: 'products', rows: 2847, size: '1.1 MB', type: 'table' },
    { name: 'user_sessions', rows: 98456, size: '15.2 MB', type: 'table' },
    { name: 'order_items', rows: 156789, size: '22.4 MB', type: 'table' },
    { name: 'active_users_view', rows: 8923, size: '0 MB', type: 'view' },
    { name: 'monthly_sales_view', rows: 120, size: '0 MB', type: 'view' }
];

export default function Database() {
    const [connections] = useState<DatabaseConnection[]>(mockConnections);
    const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(connections[0]);
    const [activeTab, setActiveTab] = useState<'tables' | 'query' | 'monitoring'>('tables');
    const [showAddModal, setShowAddModal] = useState(false);
    const [queryText, setQueryText] = useState('SELECT * FROM users LIMIT 10;');
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    const getStatusColor = (status: DatabaseConnection['status']) => {
        switch (status) {
            case 'connected': return 'text-green-600 bg-green-100';
            case 'disconnected': return 'text-gray-600 bg-gray-100';
            case 'error': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getTypeIcon = (type: DatabaseConnection['type']) => {
        switch (type) {
            case 'postgresql': return '🐘';
            case 'mysql': return '🐬';
            case 'mongodb': return '🍃';
            case 'redis': return '📦';
            case 'sqlite': return '💾';
            default: return '🗃️';
        }
    };

    const executeQuery = async () => {
        setIsExecuting(true);

        // Simulate query execution
        setTimeout(() => {
            const mockResult: QueryResult = {
                columns: ['id', 'name', 'email', 'created_at'],
                rows: [
                    [1, 'John Doe', 'john@example.com', '2024-01-15 10:30:00'],
                    [2, 'Jane Smith', 'jane@example.com', '2024-01-16 14:22:15'],
                    [3, 'Bob Johnson', 'bob@example.com', '2024-01-17 09:45:30'],
                    [4, 'Alice Wilson', 'alice@example.com', '2024-01-18 16:18:45'],
                    [5, 'Charlie Brown', 'charlie@example.com', '2024-01-19 11:55:22']
                ],
                executionTime: 42.5,
                rowsAffected: 5
            };
            setQueryResult(mockResult);
            setIsExecuting(false);
        }, 1500);
    };

    const handleConnectionAction = (action: string, connectionId: string) => {
        console.log(`${action} connection: ${connectionId}`);
        // In real implementation, would send IPC message to main process
    };

    return (
        <div className="flex h-full bg-gray-50">
            {/* Connections Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Databases</h1>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                        >
                            Add Connection
                        </button>
                    </div>
                </div>

                {/* Connection List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {connections.map((connection) => (
                            <button
                                key={connection.id}
                                onClick={() => setSelectedConnection(connection)}
                                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedConnection?.id === connection.id
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">{getTypeIcon(connection.type)}</span>
                                        <h3 className="font-medium text-gray-900 text-sm">{connection.name}</h3>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}>
                                        {connection.status}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <div>{connection.type.toUpperCase()} • {connection.host}:{connection.port}</div>
                                    <div>Database: {connection.database}</div>
                                    {connection.lastConnected && (
                                        <div>Last: {new Date(connection.lastConnected).toLocaleTimeString()}</div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {selectedConnection ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className="text-2xl">{getTypeIcon(selectedConnection.type)}</span>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedConnection.name}</h2>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedConnection.status)}`}>
                                            {selectedConnection.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-600">
                                        {selectedConnection.host}:{selectedConnection.port} • {selectedConnection.database}
                                        {selectedConnection.ssl && <span className="ml-2 text-green-600">🔒 SSL</span>}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    {selectedConnection.status === 'connected' ? (
                                        <button
                                            onClick={() => handleConnectionAction('disconnect', selectedConnection.id)}
                                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleConnectionAction('connect', selectedConnection.id)}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                        >
                                            Connect
                                        </button>
                                    )}
                                    <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                        Edit Connection
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="bg-white border-b border-gray-200">
                            <nav className="flex space-x-8 px-6">
                                {[
                                    { key: 'tables', label: 'Tables & Views' },
                                    { key: 'query', label: 'Query Editor' },
                                    { key: 'monitoring', label: 'Monitoring' }
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key as any)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.key
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'tables' && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Tables & Views</h3>
                                        <div className="flex space-x-2">
                                            <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                                                Refresh
                                            </button>
                                            <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors">
                                                Create Table
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-200">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Name
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Type
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Rows
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Size
                                                        </th>
                                                        <th className="relative px-6 py-3">
                                                            <span className="sr-only">Actions</span>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {mockTables.map((table) => (
                                                        <tr key={table.name} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <span className="mr-2">
                                                                        {table.type === 'table' ? '📋' : '👁️'}
                                                                    </span>
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        {table.name}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${table.type === 'table'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-purple-100 text-purple-800'
                                                                    }`}>
                                                                    {table.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {table.rows.toLocaleString()}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {table.size}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <button className="text-primary-600 hover:text-primary-900 mr-3">
                                                                    Browse
                                                                </button>
                                                                <button className="text-gray-600 hover:text-gray-900 mr-3">
                                                                    Structure
                                                                </button>
                                                                <button className="text-red-600 hover:text-red-900">
                                                                    Drop
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'query' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900">Query Editor</h3>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={executeQuery}
                                                disabled={isExecuting}
                                                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {isExecuting ? 'Executing...' : 'Execute Query'}
                                            </button>
                                            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg border border-gray-200">
                                        <textarea
                                            value={queryText}
                                            onChange={(e) => setQueryText(e.target.value)}
                                            className="w-full h-40 p-4 font-mono text-sm border-none resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
                                            placeholder="Enter your SQL query here..."
                                        />
                                    </div>

                                    {queryResult && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-gray-900">Query Results</h4>
                                                <div className="text-sm text-gray-500">
                                                    {queryResult.rowsAffected} rows • {queryResult.executionTime}ms
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                {queryResult.columns.map((column) => (
                                                                    <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                        {column}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {queryResult.rows.map((row, index) => (
                                                                <tr key={index} className="hover:bg-gray-50">
                                                                    {row.map((cell, cellIndex) => (
                                                                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                            {cell}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isExecuting && (
                                        <div className="bg-white rounded-lg border border-gray-200 p-8">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                                <span className="ml-3 text-gray-600">Executing query...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'monitoring' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Database Monitoring</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-gray-900">Active Connections</p>
                                                    <p className="text-2xl font-bold text-gray-900">23</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-gray-900">Queries/sec</p>
                                                    <p className="text-2xl font-bold text-gray-900">145</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-gray-900">Slow Queries</p>
                                                    <p className="text-2xl font-bold text-gray-900">3</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-gray-900">DB Size</p>
                                                    <p className="text-2xl font-bold text-gray-900">2.4GB</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                                        <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Slow Queries</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <div className="flex-1">
                                                    <code className="text-sm text-gray-800">
                                                        SELECT * FROM orders o JOIN users u ON o.user_id = u.id WHERE o.created_at &gt; '2024-01-01'
                                                    </code>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Execution time: 2.3s • Rows: 45,231
                                                    </div>
                                                </div>
                                                <button className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200">
                                                    Optimize
                                                </button>
                                            </div>
                                            <div className="flex items-start justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <div className="flex-1">
                                                    <code className="text-sm text-gray-800">
                                                        SELECT COUNT(*) FROM user_sessions WHERE last_activity &lt; NOW() - INTERVAL 30 DAY
                                                    </code>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Execution time: 5.7s • Rows: 1
                                                    </div>
                                                </div>
                                                <button className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">
                                                    Critical
                                                </button>
                                            </div>
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
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Select a database</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose a database connection from the sidebar to start managing your data</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Connection Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Add Database Connection</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Connection Name</label>
                                <input
                                    type="text"
                                    placeholder="My Database"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
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
                                        placeholder="localhost"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                                    <input
                                        type="number"
                                        placeholder="5432"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                                <input
                                    type="text"
                                    placeholder="mydb"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                    <input
                                        type="text"
                                        placeholder="admin"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="ssl" className="mr-2" />
                                <label htmlFor="ssl" className="text-sm text-gray-700">Use SSL connection</label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                Test & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
