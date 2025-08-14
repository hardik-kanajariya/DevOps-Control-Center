import { useState, useEffect } from 'react';

interface MetricData {
    timestamp: number;
    value: number;
}

interface SystemMetrics {
    cpu: MetricData[];
    memory: MetricData[];
    disk: MetricData[];
    network: {
        upload: MetricData[];
        download: MetricData[];
    };
}

interface ServerMetrics {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'warning' | 'critical';
    metrics: SystemMetrics;
    uptime: number;
    services: ServiceStatus[];
}

interface ServiceStatus {
    name: string;
    status: 'running' | 'stopped' | 'error';
    port?: number;
    cpu: number;
    memory: number;
}

// Mock real-time data generation
const generateMockMetrics = (): SystemMetrics => {
    const now = Date.now();
    const generateValues = (count: number) =>
        Array.from({ length: count }, (_, i) => ({
            timestamp: now - (count - 1 - i) * 1000,
            value: Math.random() * 100
        }));

    return {
        cpu: generateValues(60),
        memory: generateValues(60),
        disk: generateValues(60),
        network: {
            upload: generateValues(60),
            download: generateValues(60)
        }
    };
};

const mockServers: ServerMetrics[] = [
    {
        id: 'web-prod-01',
        name: 'Web Production Server',
        status: 'online',
        metrics: generateMockMetrics(),
        uptime: 2592000, // 30 days
        services: [
            { name: 'nginx', status: 'running', port: 80, cpu: 2.5, memory: 15.2 },
            { name: 'node-app', status: 'running', port: 3000, cpu: 8.3, memory: 45.7 },
            { name: 'redis', status: 'running', port: 6379, cpu: 1.2, memory: 8.4 }
        ]
    },
    {
        id: 'api-staging',
        name: 'API Staging Server',
        status: 'warning',
        metrics: generateMockMetrics(),
        uptime: 604800, // 7 days
        services: [
            { name: 'nginx', status: 'running', port: 80, cpu: 1.8, memory: 12.1 },
            { name: 'api-service', status: 'error', port: 8080, cpu: 0, memory: 0 },
            { name: 'postgresql', status: 'running', port: 5432, cpu: 3.2, memory: 68.9 }
        ]
    },
    {
        id: 'db-primary',
        name: 'Database Primary',
        status: 'critical',
        metrics: generateMockMetrics(),
        uptime: 86400, // 1 day
        services: [
            { name: 'postgresql', status: 'running', port: 5432, cpu: 15.7, memory: 89.2 },
            { name: 'redis', status: 'stopped', port: 6379, cpu: 0, memory: 0 }
        ]
    }
];

export default function Monitoring() {
    const [servers, setServers] = useState<ServerMetrics[]>(mockServers);
    const [selectedServer, setSelectedServer] = useState<ServerMetrics | null>(servers[0]);
    const [refreshInterval, setRefreshInterval] = useState(5); // seconds
    const [isLiveMode, setIsLiveMode] = useState(true);

    // Simulate real-time updates
    useEffect(() => {
        if (!isLiveMode) return;

        const interval = setInterval(() => {
            setServers(prevServers =>
                prevServers.map(server => ({
                    ...server,
                    metrics: generateMockMetrics(),
                    services: server.services.map(service => ({
                        ...service,
                        cpu: service.status === 'running' ? Math.random() * 20 : 0,
                        memory: service.status === 'running' ? service.memory + (Math.random() - 0.5) * 10 : 0
                    }))
                }))
            );
        }, refreshInterval * 1000);

        return () => clearInterval(interval);
    }, [refreshInterval, isLiveMode]);

    const getStatusColor = (status: ServerMetrics['status']) => {
        switch (status) {
            case 'online': return 'text-green-600 bg-green-100';
            case 'warning': return 'text-yellow-600 bg-yellow-100';
            case 'critical': return 'text-red-600 bg-red-100';
            case 'offline': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getServiceStatusColor = (status: ServiceStatus['status']) => {
        switch (status) {
            case 'running': return 'text-green-600 bg-green-100';
            case 'error': return 'text-red-600 bg-red-100';
            case 'stopped': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const MetricChart = ({ data, label, unit = '%', color = 'blue' }: {
        data: MetricData[];
        label: string;
        unit?: string;
        color?: string;
    }) => {
        const latest = data[data.length - 1]?.value || 0;
        const max = Math.max(...data.map(d => d.value));
        const points = data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - (point.value / 100) * 100;
            return `${x},${y}`;
        }).join(' ');

        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{label}</h4>
                    <span className="text-lg font-bold text-gray-900">
                        {latest.toFixed(1)}{unit}
                    </span>
                </div>
                <div className="relative h-20">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polyline
                            fill="none"
                            stroke={color === 'blue' ? '#3B82F6' : color === 'green' ? '#10B981' : '#EF4444'}
                            strokeWidth="2"
                            points={points}
                        />
                        <defs>
                            <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={color === 'blue' ? '#3B82F6' : color === 'green' ? '#10B981' : '#EF4444'} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={color === 'blue' ? '#3B82F6' : color === 'green' ? '#10B981' : '#EF4444'} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <polygon
                            fill={`url(#gradient-${label})`}
                            points={`0,100 ${points} 100,100`}
                        />
                    </svg>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Peak: {max.toFixed(1)}{unit}</span>
                    <span className={`px-2 py-1 rounded ${latest > 80 ? 'bg-red-100 text-red-700' :
                            latest > 60 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                        }`}>
                        {latest > 80 ? 'High' : latest > 60 ? 'Medium' : 'Normal'}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-gray-50">
            {/* Server List Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Monitoring</h1>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setIsLiveMode(!isLiveMode)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${isLiveMode
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                            >
                                {isLiveMode ? '● Live' : '○ Paused'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Refresh Interval
                            </label>
                            <select
                                value={refreshInterval}
                                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value={1}>1 second</option>
                                <option value={5}>5 seconds</option>
                                <option value={10}>10 seconds</option>
                                <option value={30}>30 seconds</option>
                                <option value={60}>1 minute</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Server List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {servers.map((server) => (
                            <button
                                key={server.id}
                                onClick={() => setSelectedServer(server)}
                                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedServer?.id === server.id
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium text-gray-900 text-sm">{server.name}</h3>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(server.status)}`}>
                                        {server.status}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    Uptime: {formatUptime(server.uptime)}
                                </div>
                                <div className="flex items-center space-x-2 mt-2">
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500 mb-1">CPU</div>
                                        <div className="w-full bg-gray-200 rounded-full h-1">
                                            <div
                                                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                                style={{ width: `${server.metrics.cpu[server.metrics.cpu.length - 1]?.value || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500 mb-1">Memory</div>
                                        <div className="w-full bg-gray-200 rounded-full h-1">
                                            <div
                                                className="bg-green-500 h-1 rounded-full transition-all duration-300"
                                                style={{ width: `${server.metrics.memory[server.metrics.memory.length - 1]?.value || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {selectedServer ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedServer.name}</h2>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedServer.status)}`}>
                                            {selectedServer.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-600">
                                        Uptime: {formatUptime(selectedServer.uptime)} •
                                        Last updated: {new Date().toLocaleTimeString()}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                                        View Logs
                                    </button>
                                    <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                        SSH Connect
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Dashboard */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {/* System Metrics */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <MetricChart
                                            data={selectedServer.metrics.cpu}
                                            label="CPU Usage"
                                            color="blue"
                                        />
                                        <MetricChart
                                            data={selectedServer.metrics.memory}
                                            label="Memory Usage"
                                            color="green"
                                        />
                                        <MetricChart
                                            data={selectedServer.metrics.disk}
                                            label="Disk Usage"
                                            color="red"
                                        />
                                        <MetricChart
                                            data={selectedServer.metrics.network.download}
                                            label="Network"
                                            unit=" MB/s"
                                            color="blue"
                                        />
                                    </div>
                                </div>

                                {/* Services */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {selectedServer.services.map((service) => (
                                            <div key={service.name} className="bg-white rounded-lg border border-gray-200 p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="font-medium text-gray-900">{service.name}</h4>
                                                        {service.port && (
                                                            <span className="text-xs text-gray-500">:{service.port}</span>
                                                        )}
                                                    </div>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getServiceStatusColor(service.status)}`}>
                                                        {service.status}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-500">CPU</span>
                                                        <span className="text-sm font-medium">{service.cpu.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${Math.min(service.cpu, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-500">Memory</span>
                                                        <span className="text-sm font-medium">{service.memory.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${Math.min(service.memory, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2 mt-3">
                                                    <button className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                                                        Restart
                                                    </button>
                                                    <button className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                                                        Logs
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Alerts */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
                                    <div className="space-y-2">
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex items-start">
                                                <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                <div>
                                                    <h4 className="text-sm font-medium text-red-900">High Memory Usage</h4>
                                                    <p className="text-sm text-red-700 mt-1">
                                                        PostgreSQL service is using 89.2% memory on {selectedServer.name}
                                                    </p>
                                                    <span className="text-xs text-red-600">2 minutes ago</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-start">
                                                <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <div>
                                                    <h4 className="text-sm font-medium text-yellow-900">Service Error</h4>
                                                    <p className="text-sm text-yellow-700 mt-1">
                                                        API service failed to start on port 8080
                                                    </p>
                                                    <span className="text-xs text-yellow-600">5 minutes ago</span>
                                                </div>
                                            </div>
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Select a server</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose a server from the sidebar to view real-time monitoring data</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
