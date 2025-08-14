import { useState } from 'react';

interface Server {
    id: number;
    name: string;
    hostname: string;
    ip: string;
    port: number;
    username: string;
    environment: 'production' | 'staging' | 'development';
    os: string;
    status: 'online' | 'offline' | 'maintenance';
    lastSeen: string;
    cpu: number;
    memory: number;
    disk: number;
    tags: string[];
}

// Mock server data
const mockServers: Server[] = [
    {
        id: 1,
        name: 'web-prod-01',
        hostname: 'web-prod-01.company.com',
        ip: '192.168.1.10',
        port: 22,
        username: 'deploy',
        environment: 'production',
        os: 'Ubuntu 22.04',
        status: 'online',
        lastSeen: '2024-08-14T11:30:00Z',
        cpu: 45,
        memory: 78,
        disk: 65,
        tags: ['web', 'nginx', 'docker']
    },
    {
        id: 2,
        name: 'api-staging',
        hostname: 'api-staging.company.com',
        ip: '192.168.1.20',
        port: 22,
        username: 'deploy',
        environment: 'staging',
        os: 'Ubuntu 22.04',
        status: 'online',
        lastSeen: '2024-08-14T11:25:00Z',
        cpu: 23,
        memory: 45,
        disk: 32,
        tags: ['api', 'nodejs', 'pm2']
    },
    {
        id: 3,
        name: 'db-prod-primary',
        hostname: 'db-prod-primary.company.com',
        ip: '192.168.1.30',
        port: 22,
        username: 'admin',
        environment: 'production',
        os: 'Ubuntu 20.04',
        status: 'maintenance',
        lastSeen: '2024-08-14T10:45:00Z',
        cpu: 12,
        memory: 89,
        disk: 76,
        tags: ['database', 'postgresql', 'primary']
    }
];

export default function Servers() {
    const [servers] = useState(mockServers);
    const [selectedServer, setSelectedServer] = useState<Server | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [newServer, setNewServer] = useState({
        name: '',
        hostname: '',
        ip: '',
        port: 22,
        username: '',
        environment: 'development' as Server['environment'],
        tags: ''
    });

    const handleSelectServer = (server: Server) => {
        setSelectedServer(server);
    };

    const handleAddServer = () => {
        // In real implementation, would add server via IPC
        console.log('Adding server:', newServer);
        setShowAddModal(false);
        setNewServer({
            name: '',
            hostname: '',
            ip: '',
            port: 22,
            username: '',
            environment: 'development',
            tags: ''
        });
    };

    const handleConnectServer = () => {
        if (selectedServer) {
            // In real implementation, would initiate SSH connection via IPC
            console.log(`Connecting to ${selectedServer.hostname}:${selectedServer.port}`);
            setShowConnectModal(false);
        }
    };

    const getStatusColor = (status: Server['status']) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'offline': return 'bg-red-500';
            case 'maintenance': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const getEnvironmentColor = (environment: Server['environment']) => {
        switch (environment) {
            case 'production': return 'bg-red-100 text-red-800';
            case 'staging': return 'bg-yellow-100 text-yellow-800';
            case 'development': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatLastSeen = (lastSeen: string) => {
        const date = new Date(lastSeen);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / (1000 * 60));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="flex h-full bg-gray-50">
            {/* Server List */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Servers</h1>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                        >
                            Add Server
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search servers..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {servers.map((server) => (
                            <button
                                key={server.id}
                                onClick={() => handleSelectServer(server)}
                                className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedServer?.id === server.id
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)}`}></div>
                                            <h3 className="font-medium text-gray-900 truncate">{server.name}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{server.hostname}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(server.environment)}`}>
                                        {server.environment}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{server.ip}</span>
                                    <span>{formatLastSeen(server.lastSeen)}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {server.tags.slice(0, 2).map((tag) => (
                                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                            {tag}
                                        </span>
                                    ))}
                                    {server.tags.length > 2 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                            +{server.tags.length - 2}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Server Details */}
            <div className="flex-1 flex flex-col">
                {selectedServer ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className={`w-4 h-4 rounded-full ${getStatusColor(selectedServer.status)}`}></div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedServer.name}</h2>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(selectedServer.environment)}`}>
                                            {selectedServer.environment}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 mb-2">{selectedServer.hostname}</p>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>{selectedServer.ip}:{selectedServer.port}</span>
                                        <span>{selectedServer.os}</span>
                                        <span>Last seen {formatLastSeen(selectedServer.lastSeen)}</span>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowConnectModal(true)}
                                        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                    >
                                        Connect SSH
                                    </button>
                                    <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                        Edit Server
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Server Content */}
                        <div className="flex-1 p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Server Status */}
                                <div className="space-y-6">
                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Server Status</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">CPU Usage</span>
                                                    <span className="font-medium">{selectedServer.cpu}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${selectedServer.cpu > 80 ? 'bg-red-500' : selectedServer.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                        style={{ width: `${selectedServer.cpu}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Memory Usage</span>
                                                    <span className="font-medium">{selectedServer.memory}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${selectedServer.memory > 80 ? 'bg-red-500' : selectedServer.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                        style={{ width: `${selectedServer.memory}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Disk Usage</span>
                                                    <span className="font-medium">{selectedServer.disk}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${selectedServer.disk > 80 ? 'bg-red-500' : selectedServer.disk > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                        style={{ width: `${selectedServer.disk}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Details</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Hostname:</span>
                                                <span className="text-sm font-medium">{selectedServer.hostname}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">IP Address:</span>
                                                <span className="text-sm font-medium">{selectedServer.ip}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">SSH Port:</span>
                                                <span className="text-sm font-medium">{selectedServer.port}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Username:</span>
                                                <span className="text-sm font-medium">{selectedServer.username}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Operating System:</span>
                                                <span className="text-sm font-medium">{selectedServer.os}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions and Tags */}
                                <div className="space-y-6">
                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => setShowConnectModal(true)}
                                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                                            >
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-sm font-medium">Open SSH Terminal</span>
                                                </div>
                                            </button>

                                            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    <span className="text-sm font-medium">Deploy to Server</span>
                                                </div>
                                            </button>

                                            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                    <span className="text-sm font-medium">View Logs</span>
                                                </div>
                                            </button>

                                            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    <span className="text-sm font-medium">Restart Services</span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedServer.tags.map((tag) => (
                                                <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-3H5m14 6H5" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Select a server</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose a server from the sidebar to view its details and manage settings</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Server Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Add New Server</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Server Name</label>
                                    <input
                                        type="text"
                                        value={newServer.name}
                                        onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                                        placeholder="web-prod-01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                                    <select
                                        value={newServer.environment}
                                        onChange={(e) => setNewServer({ ...newServer, environment: e.target.value as Server['environment'] })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="development">Development</option>
                                        <option value="staging">Staging</option>
                                        <option value="production">Production</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hostname</label>
                                <input
                                    type="text"
                                    value={newServer.hostname}
                                    onChange={(e) => setNewServer({ ...newServer, hostname: e.target.value })}
                                    placeholder="server.company.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                                    <input
                                        type="text"
                                        value={newServer.ip}
                                        onChange={(e) => setNewServer({ ...newServer, ip: e.target.value })}
                                        placeholder="192.168.1.10"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SSH Port</label>
                                    <input
                                        type="number"
                                        value={newServer.port}
                                        onChange={(e) => setNewServer({ ...newServer, port: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={newServer.username}
                                    onChange={(e) => setNewServer({ ...newServer, username: e.target.value })}
                                    placeholder="deploy"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    value={newServer.tags}
                                    onChange={(e) => setNewServer({ ...newServer, tags: e.target.value })}
                                    placeholder="web, nginx, docker"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddServer}
                                disabled={!newServer.name || !newServer.hostname || !newServer.ip || !newServer.username}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Add Server
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connect Modal */}
            {showConnectModal && selectedServer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Connect to Server</h3>
                            <p className="text-sm text-gray-500 mt-1">{selectedServer.name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Connection Details</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Host:</span>
                                        <span className="font-mono">{selectedServer.hostname}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Port:</span>
                                        <span className="font-mono">{selectedServer.port}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">User:</span>
                                        <span className="font-mono">{selectedServer.username}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex">
                                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <p className="text-sm text-blue-800">
                                            This will open a new SSH terminal window connected to the server.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConnectModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConnectServer}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Connect SSH
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
