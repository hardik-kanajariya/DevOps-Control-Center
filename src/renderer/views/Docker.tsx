import { useState, useEffect } from 'react';

interface DockerContainer {
    id: string;
    name: string;
    image: string;
    status: 'running' | 'stopped' | 'paused' | 'restarting' | 'dead';
    state: string;
    ports: string[];
    created: string;
    uptime: string;
    cpu: number;
    memory: number;
    networkRx: number;
    networkTx: number;
    volumes: string[];
    environment: { [key: string]: string };
}

interface DockerImage {
    id: string;
    repository: string;
    tag: string;
    size: string;
    created: string;
}

interface DockerNetwork {
    id: string;
    name: string;
    driver: string;
    scope: string;
    containers: number;
}

interface DockerVolume {
    name: string;
    driver: string;
    mountpoint: string;
    size: string;
    created: string;
}

// Mock Docker data
const mockContainers: DockerContainer[] = [
    {
        id: 'web-app-prod',
        name: 'web-app-production',
        image: 'nginx:alpine',
        status: 'running',
        state: 'Up 2 days',
        ports: ['80:80', '443:443'],
        created: '2024-08-12T10:00:00Z',
        uptime: '2d 4h 15m',
        cpu: 5.2,
        memory: 64.3,
        networkRx: 125.6,
        networkTx: 89.2,
        volumes: ['/var/log/nginx:/var/log/nginx:rw'],
        environment: {
            'NGINX_HOST': 'localhost',
            'NGINX_PORT': '80'
        }
    },
    {
        id: 'api-service',
        name: 'api-backend',
        image: 'node:18-alpine',
        status: 'running',
        state: 'Up 1 day',
        ports: ['3000:3000'],
        created: '2024-08-13T08:30:00Z',
        uptime: '1d 7h 45m',
        cpu: 12.8,
        memory: 156.7,
        networkRx: 89.3,
        networkTx: 234.1,
        volumes: ['/app:/usr/src/app:rw'],
        environment: {
            'NODE_ENV': 'production',
            'PORT': '3000'
        }
    },
    {
        id: 'db-postgres',
        name: 'postgres-db',
        image: 'postgres:15',
        status: 'running',
        state: 'Up 5 days',
        ports: ['5432:5432'],
        created: '2024-08-09T15:20:00Z',
        uptime: '5d 12h 20m',
        cpu: 8.4,
        memory: 312.5,
        networkRx: 45.2,
        networkTx: 23.8,
        volumes: ['/var/lib/postgresql/data:/var/lib/postgresql/data:rw'],
        environment: {
            'POSTGRES_DB': 'appdb',
            'POSTGRES_USER': 'admin'
        }
    },
    {
        id: 'redis-cache',
        name: 'redis-server',
        image: 'redis:7-alpine',
        status: 'stopped',
        state: 'Exited (0) 2 hours ago',
        ports: ['6379:6379'],
        created: '2024-08-14T06:00:00Z',
        uptime: '-',
        cpu: 0,
        memory: 0,
        networkRx: 0,
        networkTx: 0,
        volumes: ['/data:/data:rw'],
        environment: {
            'REDIS_PASSWORD': '***'
        }
    }
];

const mockImages: DockerImage[] = [
    { id: 'nginx-alpine', repository: 'nginx', tag: 'alpine', size: '23.5MB', created: '2024-08-10' },
    { id: 'node-18', repository: 'node', tag: '18-alpine', size: '165MB', created: '2024-08-11' },
    { id: 'postgres-15', repository: 'postgres', tag: '15', size: '379MB', created: '2024-08-09' },
    { id: 'redis-7', repository: 'redis', tag: '7-alpine', size: '29.8MB', created: '2024-08-12' }
];

const mockNetworks: DockerNetwork[] = [
    { id: 'bridge', name: 'bridge', driver: 'bridge', scope: 'local', containers: 4 },
    { id: 'host', name: 'host', driver: 'host', scope: 'local', containers: 0 },
    { id: 'none', name: 'none', driver: 'null', scope: 'local', containers: 0 },
    { id: 'app-network', name: 'app-network', driver: 'bridge', scope: 'local', containers: 2 }
];

const mockVolumes: DockerVolume[] = [
    { name: 'postgres_data', driver: 'local', mountpoint: '/var/lib/docker/volumes/postgres_data/_data', size: '2.3GB', created: '2024-08-09' },
    { name: 'nginx_logs', driver: 'local', mountpoint: '/var/lib/docker/volumes/nginx_logs/_data', size: '156MB', created: '2024-08-12' },
    { name: 'redis_data', driver: 'local', mountpoint: '/var/lib/docker/volumes/redis_data/_data', size: '45MB', created: '2024-08-14' }
];

export default function Docker() {
    const [activeTab, setActiveTab] = useState<'containers' | 'images' | 'networks' | 'volumes'>('containers');
    const [containers, setContainers] = useState<DockerContainer[]>(mockContainers);
    const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);

    // Simulate real-time container updates
    useEffect(() => {
        const interval = setInterval(() => {
            setContainers(prev => prev.map(container => ({
                ...container,
                cpu: container.status === 'running' ? Math.random() * 20 : 0,
                memory: container.status === 'running' ? container.memory + (Math.random() - 0.5) * 10 : 0,
                networkRx: container.status === 'running' ? container.networkRx + Math.random() * 5 : 0,
                networkTx: container.status === 'running' ? container.networkTx + Math.random() * 3 : 0
            })));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: DockerContainer['status']) => {
        switch (status) {
            case 'running': return 'text-green-600 bg-green-100';
            case 'stopped': return 'text-gray-600 bg-gray-100';
            case 'paused': return 'text-yellow-600 bg-yellow-100';
            case 'restarting': return 'text-blue-600 bg-blue-100';
            case 'dead': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status: DockerContainer['status']) => {
        switch (status) {
            case 'running':
                return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>;
            case 'stopped':
                return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
            case 'paused':
                return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
            case 'restarting':
                return <div className="w-2 h-2 bg-blue-500 rounded-full animate-spin"></div>;
            case 'dead':
                return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
            default:
                return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
        }
    };

    const handleContainerAction = (action: string, containerId: string) => {
        console.log(`${action} container: ${containerId}`);
        // In real implementation, would send IPC message to main process
    };

    const ContainerCard = ({ container }: { container: DockerContainer }) => (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    {getStatusIcon(container.status)}
                    <div>
                        <h3 className="font-medium text-gray-900">{container.name}</h3>
                        <p className="text-sm text-gray-500">{container.image}</p>
                    </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(container.status)}`}>
                    {container.status}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <div className="text-xs text-gray-500 mb-1">CPU</div>
                    <div className="text-sm font-medium">{container.cpu.toFixed(1)}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(container.cpu, 100)}%` }}
                        ></div>
                    </div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 mb-1">Memory</div>
                    <div className="text-sm font-medium">{container.memory.toFixed(1)}MB</div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                            className="bg-green-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(container.memory / 5, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="text-xs text-gray-500 mb-3">
                <div>Ports: {container.ports.join(', ') || 'None'}</div>
                <div>Uptime: {container.uptime}</div>
            </div>

            <div className="flex space-x-2">
                <button
                    onClick={() => setSelectedContainer(container)}
                    className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                    Details
                </button>
                {container.status === 'running' ? (
                    <button
                        onClick={() => handleContainerAction('stop', container.id)}
                        className="flex-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                        Stop
                    </button>
                ) : (
                    <button
                        onClick={() => handleContainerAction('start', container.id)}
                        className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                        Start
                    </button>
                )}
                <button
                    onClick={() => setShowLogsModal(true)}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                    Logs
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-full bg-gray-50">
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Docker Management</h1>
                            <p className="text-gray-600 mt-1">Manage containers, images, networks, and volumes</p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                            >
                                Create Container
                            </button>
                            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                Pull Image
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        {[
                            { key: 'containers', label: 'Containers', count: containers.length },
                            { key: 'images', label: 'Images', count: mockImages.length },
                            { key: 'networks', label: 'Networks', count: mockNetworks.length },
                            { key: 'volumes', label: 'Volumes', count: mockVolumes.length }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.key
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'containers' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {containers.map((container) => (
                                <ContainerCard key={container.id} container={container} />
                            ))}
                        </div>
                    )}

                    {activeTab === 'images' && (
                        <div className="bg-white rounded-lg border border-gray-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Repository
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tag
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Size
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Created
                                            </th>
                                            <th className="relative px-6 py-3">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {mockImages.map((image) => (
                                            <tr key={image.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {image.repository}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {image.tag}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {image.size}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {image.created}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button className="text-primary-600 hover:text-primary-900 mr-3">
                                                        Run
                                                    </button>
                                                    <button className="text-red-600 hover:text-red-900">
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'networks' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {mockNetworks.map((network) => (
                                <div key={network.id} className="bg-white rounded-lg border border-gray-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-gray-900">{network.name}</h3>
                                        <span className="text-sm text-gray-500">{network.driver}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <div>Scope: {network.scope}</div>
                                        <div>Containers: {network.containers}</div>
                                    </div>
                                    <div className="flex space-x-2 mt-3">
                                        <button className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                                            Inspect
                                        </button>
                                        <button className="flex-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'volumes' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {mockVolumes.map((volume) => (
                                <div key={volume.name} className="bg-white rounded-lg border border-gray-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-gray-900">{volume.name}</h3>
                                        <span className="text-sm text-gray-500">{volume.size}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <div>Driver: {volume.driver}</div>
                                        <div>Created: {volume.created}</div>
                                        <div className="text-xs text-gray-500 truncate" title={volume.mountpoint}>
                                            {volume.mountpoint}
                                        </div>
                                    </div>
                                    <div className="flex space-x-2 mt-3">
                                        <button className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                                            Inspect
                                        </button>
                                        <button className="flex-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Container Details Modal */}
            {selectedContainer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{selectedContainer.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{selectedContainer.image}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedContainer(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-3">Container Info</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Status:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedContainer.status)}`}>
                                                {selectedContainer.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">State:</span>
                                            <span>{selectedContainer.state}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Created:</span>
                                            <span>{new Date(selectedContainer.created).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Uptime:</span>
                                            <span>{selectedContainer.uptime}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-3">Resource Usage</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>CPU</span>
                                                <span>{selectedContainer.cpu.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full"
                                                    style={{ width: `${Math.min(selectedContainer.cpu, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Memory</span>
                                                <span>{selectedContainer.memory.toFixed(1)}MB</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full"
                                                    style={{ width: `${Math.min(selectedContainer.memory / 5, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h4 className="font-medium text-gray-900 mb-3">Environment Variables</h4>
                                <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                                    {Object.entries(selectedContainer.environment).map(([key, value]) => (
                                        <div key={key} className="text-sm font-mono">
                                            <span className="text-blue-600">{key}</span>=<span className="text-gray-700">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Modal */}
            {showLogsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Container Logs</h3>
                                <button
                                    onClick={() => setShowLogsModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-6 overflow-hidden">
                            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 h-full overflow-y-auto font-mono text-sm">
                                <div className="text-green-400">[2024-08-14 14:15:30] Container started</div>
                                <div className="text-white">[2024-08-14 14:15:31] Initializing application...</div>
                                <div className="text-blue-400">[2024-08-14 14:15:32] Loading configuration</div>
                                <div className="text-white">[2024-08-14 14:15:33] Starting HTTP server on port 3000</div>
                                <div className="text-green-400">[2024-08-14 14:15:34] ✓ Server ready</div>
                                <div className="text-white">[2024-08-14 14:16:15] GET /api/health - 200</div>
                                <div className="text-white">[2024-08-14 14:16:45] GET /api/users - 200</div>
                                <div className="text-yellow-400">[2024-08-14 14:17:23] Warning: High memory usage detected</div>
                                <div className="text-white">[2024-08-14 14:18:01] POST /api/auth/login - 200</div>
                                <div className="text-white animate-pulse">[2024-08-14 14:18:30] GET /api/dashboard - 200</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
