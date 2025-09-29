import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
    fetchServers,
    addServer,
    connectToServer,
    disconnectFromServer,
    deleteServer,
    fetchServerStatsById,
    fetchServerLogs,
    executeServerCommand,
    directDeployToServer,
    serverStatusChanged,
    serverStatsReceived,
    serverAdded,
    serverUpdated,
    serverDeleted,
    serverDeploymentFinished
} from '../store/slices/serversSlice';
import { fetchRepositories } from '../store/slices/repositoriesSlice';
import { DirectDeploymentRequest, DirectDeploymentResult, ServerStats, VPSServer } from '../../shared/types';

type EnvVarRow = { id: string; key: string; value: string };

const DEFAULT_LOG_LINES = 200;

const initialNewServerState = {
    name: '',
    hostname: '',
    ip: '',
    port: 22,
    username: '',
    password: '',
    privateKeyPath: '',
    environment: 'development' as VPSServer['environment'],
    tags: '',
    authType: 'password' as 'password' | 'key'
};

const initialDeployConfig = {
    repositoryFullName: '',
    branch: '',
    targetPath: '',
    clean: false,
    useGitHubPat: true,
    preDeployScript: '',
    postDeployScript: ''
};

const generateRowId = (): string => {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID();
    }
    return Math.random().toString(36).slice(2, 10);
};

const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes <= 0) {
        return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    const precision = size >= 10 || unitIndex === 0 ? 0 : 1;
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const formatDuration = (seconds?: number): string => {
    if (!seconds || seconds <= 0) {
        return '0s';
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (parts.length === 0) {
        parts.push(`${secs}s`);
    }
    return parts.join(' ');
};

const formatLastSeen = (value?: Date | string): string => {
    if (!value) {
        return 'Never';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) {
        return 'Just now';
    }
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const getStatusColor = (status: VPSServer['status']): string => {
    switch (status) {
        case 'connected':
            return 'bg-green-500';
        case 'connecting':
            return 'bg-blue-500';
        case 'error':
            return 'bg-red-500';
        default:
            return 'bg-gray-400';
    }
};

const getEnvironmentColor = (environment: VPSServer['environment']): string => {
    switch (environment) {
        case 'production':
            return 'bg-red-100 text-red-800';
        case 'staging':
            return 'bg-yellow-100 text-yellow-800';
        case 'development':
            return 'bg-green-100 text-green-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const getUsageBarColor = (value: number): string => {
    if (value > 80) return 'bg-red-500';
    if (value > 60) return 'bg-yellow-500';
    return 'bg-green-500';
};

const formatLoadAverage = (loadAverage?: number[]): string => {
    if (!loadAverage || loadAverage.length === 0) {
        return 'n/a';
    }
    return loadAverage.map(value => value.toFixed(2)).join(', ');
};

const formatDateTime = (value?: Date | string): string => {
    if (!value) {
        return 'n/a';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'n/a';
    }
    return date.toLocaleString();
};

export default function Servers() {
    const dispatch = useAppDispatch();
    const {
        servers,
        loading,
        error,
        connectingServers,
        stats: statsMap,
        logs: logsMap,
        commandOutputs,
        deployments
    } = useAppSelector((state) => state.servers);
    const repositoriesState = useAppSelector((state) => state.repositories);

    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showDeployModal, setShowDeployModal] = useState(false);
    const [logLines, setLogLines] = useState(DEFAULT_LOG_LINES);
    const [commandInput, setCommandInput] = useState('');
    const [isCommandRunning, setIsCommandRunning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [newServer, setNewServer] = useState({ ...initialNewServerState });
    const [deployConfig, setDeployConfig] = useState({ ...initialDeployConfig });
    const [envVars, setEnvVars] = useState<EnvVarRow[]>([]);

    const selectedServer = useMemo(() => servers.find(server => server.id === selectedServerId) ?? null, [servers, selectedServerId]);
    const selectedServerIdentifier = selectedServer?.id;
    const selectedServerStatus = selectedServer?.status;
    const currentStats = selectedServerIdentifier ? statsMap[selectedServerIdentifier]?.data : undefined;
    const serverLogs = selectedServerIdentifier ? logsMap[selectedServerIdentifier] : undefined;
    const commandResult = selectedServerIdentifier ? commandOutputs[selectedServerIdentifier] : undefined;
    const deploymentInfo = selectedServerIdentifier ? deployments[selectedServerIdentifier] : undefined;
    const isDeploymentRunning = deploymentInfo?.status === 'running';

    const filteredServers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return servers;
        }
        return servers.filter(server => {
            const values = [server.name, server.hostname, server.ip, server.tags?.join(' ')];
            return values.some(value => value && value.toLowerCase().includes(query));
        });
    }, [servers, searchTerm]);

    useEffect(() => {
        dispatch(fetchServers());
    }, [dispatch]);

    useEffect(() => {
        if (servers.length === 0) {
            setSelectedServerId(null);
            return;
        }
        if (!selectedServerId || !servers.some(server => server.id === selectedServerId)) {
            setSelectedServerId(servers[0].id);
        }
    }, [servers, selectedServerId]);

    useEffect(() => {
        const statusHandler = (payload: { serverId: string; status: VPSServer['status'] }) => {
            dispatch(serverStatusChanged(payload));
        };
        const statsHandler = (payload: { serverId: string; stats: ServerStats; receivedAt?: string }) => {
            dispatch(serverStatsReceived({
                serverId: payload.serverId,
                stats: payload.stats,
                fetchedAt: payload.receivedAt || new Date().toISOString()
            }));
        };
        const addedHandler = (server: VPSServer) => dispatch(serverAdded(server));
        const updatedHandler = (server: VPSServer) => dispatch(serverUpdated(server));
        const deletedHandler = (serverId: string) => {
            dispatch(serverDeleted(serverId));
            setSelectedServerId((prev) => (prev === serverId ? null : prev));
        };
        const deploymentHandler = (result: DirectDeploymentResult) => {
            dispatch(serverDeploymentFinished(result));
        };

        window.electronAPI.on('servers:status-changed', statusHandler);
        window.electronAPI.on('servers:stats', statsHandler);
        window.electronAPI.on('servers:added', addedHandler);
        window.electronAPI.on('servers:updated', updatedHandler);
        window.electronAPI.on('servers:deleted', deletedHandler);
        window.electronAPI.on('servers:deployment-finished', deploymentHandler);

        return () => {
            window.electronAPI.removeAllListeners('servers:status-changed');
            window.electronAPI.removeAllListeners('servers:stats');
            window.electronAPI.removeAllListeners('servers:added');
            window.electronAPI.removeAllListeners('servers:updated');
            window.electronAPI.removeAllListeners('servers:deleted');
            window.electronAPI.removeAllListeners('servers:deployment-finished');
        };
    }, [dispatch]);

    useEffect(() => {
        if (!selectedServerIdentifier || selectedServerStatus !== 'connected') {
            return;
        }

        dispatch(fetchServerStatsById(selectedServerIdentifier));
        const interval = setInterval(() => {
            dispatch(fetchServerStatsById(selectedServerIdentifier));
        }, 20000);

        return () => {
            clearInterval(interval);
        };
    }, [dispatch, selectedServerIdentifier, selectedServerStatus]);

    const handleRefreshLogs = useCallback(() => {
        if (!selectedServerIdentifier) {
            return;
        }
        dispatch(fetchServerLogs({ serverId: selectedServerIdentifier, lines: logLines }));
    }, [dispatch, selectedServerIdentifier, logLines]);

    useEffect(() => {
        if (!selectedServerIdentifier || selectedServerStatus !== 'connected') {
            return;
        }
        handleRefreshLogs();
    }, [selectedServerIdentifier, selectedServerStatus, handleRefreshLogs]);

    useEffect(() => {
        if (showDeployModal) {
            if (envVars.length === 0) {
                setEnvVars([{ id: generateRowId(), key: '', value: '' }]);
            }
            if (repositoriesState.repositories.length === 0 && !repositoriesState.loading) {
                dispatch(fetchRepositories());
            }
        } else {
            setDeployConfig({ ...initialDeployConfig });
            setEnvVars([]);
        }
    }, [showDeployModal, envVars.length, repositoriesState.repositories.length, repositoriesState.loading, dispatch]);

    useEffect(() => {
        if (!showDeployModal || !deployConfig.repositoryFullName) {
            return;
        }
        const repository = repositoriesState.repositories.find(repo => repo.full_name === deployConfig.repositoryFullName);
        if (!repository) {
            return;
        }
        setDeployConfig((prev) => ({
            ...prev,
            branch: prev.branch || repository.default_branch,
            targetPath: prev.targetPath || `/var/www/${repository.name}`
        }));
    }, [showDeployModal, deployConfig.repositoryFullName, repositoriesState.repositories]);

    const handleSelectServer = useCallback((server: VPSServer) => {
        setSelectedServerId(server.id);
    }, []);

    const handleAddServer = async () => {
        const host = newServer.hostname || newServer.ip;
        if (!host) {
            return;
        }

        const serverData: Omit<VPSServer, 'id' | 'status'> = {
            name: newServer.name,
            host,
            hostname: newServer.hostname || host,
            ip: newServer.ip,
            port: newServer.port,
            username: newServer.username,
            password: newServer.authType === 'password' && newServer.password ? newServer.password : undefined,
            privateKeyPath: newServer.authType === 'key' && newServer.privateKeyPath ? newServer.privateKeyPath : undefined,
            environment: newServer.environment,
            os: 'Unknown',
            tags: newServer.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        };

        const resultAction = await dispatch(addServer(serverData));
        if (addServer.fulfilled.match(resultAction)) {
            setShowAddModal(false);
            setNewServer({ ...initialNewServerState });
            setSelectedServerId(resultAction.payload.id);
        }
    };

    const handleConnectServer = async () => {
        if (!selectedServerIdentifier) {
            return;
        }
        await dispatch(connectToServer(selectedServerIdentifier));
        setShowConnectModal(false);
    };

    const handleDisconnectServer = async () => {
        if (!selectedServerIdentifier) {
            return;
        }
        await dispatch(disconnectFromServer(selectedServerIdentifier));
    };

    const handleDeleteSelectedServer = async () => {
        if (!selectedServer) {
            return;
        }
        const confirmed = window.confirm(`Are you sure you want to remove ${selectedServer.name}?`);
        if (!confirmed) {
            return;
        }
        setIsDeleting(true);
        const result = await dispatch(deleteServer(selectedServer.id));
        setIsDeleting(false);
        if (deleteServer.fulfilled.match(result)) {
            setSelectedServerId((prev) => (prev === selectedServer.id ? null : prev));
        }
    };

    const handleRefreshStats = useCallback(() => {
        if (!selectedServerIdentifier) {
            return;
        }
        dispatch(fetchServerStatsById(selectedServerIdentifier));
    }, [dispatch, selectedServerIdentifier]);

    const handleRunCommand = async () => {
        if (!selectedServerIdentifier || !commandInput.trim()) {
            return;
        }
        setIsCommandRunning(true);
        await dispatch(executeServerCommand({ serverId: selectedServerIdentifier, command: commandInput }));
        setIsCommandRunning(false);
    };

    const handleEnvVarChange = (id: string, field: 'key' | 'value', value: string) => {
        setEnvVars((prev) => prev.map(row => (row.id === id ? { ...row, [field]: value } : row)));
    };

    const handleAddEnvVarRow = () => {
        setEnvVars((prev) => [...prev, { id: generateRowId(), key: '', value: '' }]);
    };

    const handleRemoveEnvVarRow = (id: string) => {
        setEnvVars((prev) => prev.filter(row => row.id !== id));
    };

    const handleDirectDeploy = async () => {
        if (!selectedServerIdentifier) {
            return;
        }
        const repository = repositoriesState.repositories.find(repo => repo.full_name === deployConfig.repositoryFullName);
        if (!repository) {
            return;
        }
        const targetPath = deployConfig.targetPath.trim();
        if (!targetPath) {
            return;
        }

        const environmentVariables = envVars.reduce<Record<string, string>>((acc, row) => {
            if (row.key.trim()) {
                acc[row.key.trim()] = row.value;
            }
            return acc;
        }, {});

        const payload: DirectDeploymentRequest = {
            serverId: selectedServerIdentifier,
            repository: {
                name: repository.name,
                fullName: repository.full_name,
                cloneUrl: repository.clone_url,
                defaultBranch: repository.default_branch
            },
            branch: deployConfig.branch || repository.default_branch,
            targetPath,
            clean: deployConfig.clean,
            useGitHubPat: deployConfig.useGitHubPat,
            preDeployScript: deployConfig.preDeployScript.trim() ? deployConfig.preDeployScript : undefined,
            postDeployScript: deployConfig.postDeployScript.trim() ? deployConfig.postDeployScript : undefined,
            environmentVariables: Object.keys(environmentVariables).length ? environmentVariables : undefined
        };

        const result = await dispatch(directDeployToServer(payload));
        if (directDeployToServer.fulfilled.match(result)) {
            setShowDeployModal(false);
        }
    };

    const cpuUsage = currentStats?.cpu ?? selectedServer?.cpu ?? 0;
    const memoryUsage = currentStats?.memory.percentage ?? selectedServer?.memory ?? 0;
    const diskUsage = currentStats?.disk.percentage ?? selectedServer?.disk ?? 0;
    const memoryDetails = currentStats ? `${formatBytes(currentStats.memory.used)} / ${formatBytes(currentStats.memory.total)}` : 'n/a';
    const diskDetails = currentStats ? `${formatBytes(currentStats.disk.used)} / ${formatBytes(currentStats.disk.total)}` : 'n/a';
    const uptimeText = formatDuration(currentStats?.uptime ?? selectedServer?.uptimeSeconds);
    const loadAverageText = formatLoadAverage(currentStats?.loadAverage ?? selectedServer?.loadAverage);

    const canAddServer = Boolean(
        newServer.name &&
        newServer.hostname &&
        newServer.username &&
        (newServer.authType === 'password' ? newServer.password : newServer.privateKeyPath)
    );

    return (
        <div className="flex h-full bg-gray-50">
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
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading && (
                        <p className="text-sm text-gray-500">Loading servers...</p>
                    )}
                    {!loading && filteredServers.length === 0 && (
                        <p className="text-sm text-gray-500">No servers found. Add one to get started.</p>
                    )}
                    <div className="space-y-2">
                        {filteredServers.map((server) => (
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
                                    <span>{server.ip || 'n/a'}</span>
                                    <span>{formatLastSeen(server.lastSeen)}</span>
                                </div>
                                {server.tags && server.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {server.tags.slice(0, 3).map((tag) => (
                                            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                                {tag}
                                            </span>
                                        ))}
                                        {server.tags.length > 3 && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                                +{server.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                {selectedServer ? (
                    <>
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
                                        <span>{selectedServer.ip || selectedServer.hostname}:{selectedServer.port}</span>
                                        <span>{selectedServer.os || 'Unknown OS'}</span>
                                        <span>Last seen {formatLastSeen(selectedServer.lastSeen)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setShowConnectModal(true)}
                                        disabled={selectedServerStatus === 'connected' || connectingServers.includes(selectedServer.id)}
                                        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {selectedServerStatus === 'connected' ? 'Connected' : connectingServers.includes(selectedServer.id) ? 'Connecting...' : 'Connect SSH'}
                                    </button>
                                    {selectedServerStatus === 'connected' && (
                                        <button
                                            onClick={handleDisconnectServer}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    )}
                                    <button
                                        onClick={handleRefreshStats}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Refresh Stats
                                    </button>
                                    <button
                                        onClick={handleDeleteSelectedServer}
                                        disabled={isDeleting}
                                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isDeleting ? 'Removing...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {error && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Server Status</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">CPU Usage</span>
                                                    <span className="font-medium">{cpuUsage.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${getUsageBarColor(cpuUsage)}`}
                                                        style={{ width: `${Math.min(Math.max(cpuUsage, 0), 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Memory Usage</span>
                                                    <span className="font-medium">{memoryUsage.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${getUsageBarColor(memoryUsage)}`}
                                                        style={{ width: `${Math.min(Math.max(memoryUsage, 0), 100)}%` }}
                                                    ></div>
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">{memoryDetails}</p>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Disk Usage</span>
                                                    <span className="font-medium">{diskUsage.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${getUsageBarColor(diskUsage)}`}
                                                        style={{ width: `${Math.min(Math.max(diskUsage, 0), 100)}%` }}
                                                    ></div>
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">{diskDetails}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-500">Uptime</p>
                                                    <p className="font-medium text-gray-900">{uptimeText}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Load Average</p>
                                                    <p className="font-medium text-gray-900">{loadAverageText}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Details</h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Address</span>
                                                <span className="font-medium text-gray-900">{selectedServer.hostname}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">IP Address</span>
                                                <span className="font-medium text-gray-900">{selectedServer.ip || 'n/a'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">SSH Port</span>
                                                <span className="font-medium text-gray-900">{selectedServer.port}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Username</span>
                                                <span className="font-medium text-gray-900">{selectedServer.username}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Status</span>
                                                <span className="font-medium text-gray-900 capitalize">{selectedServer.status}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Last Connected</span>
                                                <span className="font-medium text-gray-900">{formatDateTime(selectedServer.lastConnected)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                                        {selectedServer.tags && selectedServer.tags.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedServer.tags.map((tag) => (
                                                    <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">No tags yet.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="card">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">Direct Deployment</h3>
                                            <button
                                                onClick={() => setShowDeployModal(true)}
                                                className="px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                                            >
                                                Configure
                                            </button>
                                        </div>
                                        {isDeploymentRunning && (
                                            <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                                                Deployment in progress...
                                            </div>
                                        )}
                                        {deploymentInfo?.status === 'failed' && deploymentInfo.error && (
                                            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                                {deploymentInfo.error}
                                            </div>
                                        )}
                                        <div className="flex items-center space-x-2 text-sm">
                                            <span className="text-gray-500">Status:</span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${deploymentInfo?.status === 'succeeded'
                                                ? 'bg-green-100 text-green-800'
                                                : deploymentInfo?.status === 'failed'
                                                    ? 'bg-red-100 text-red-800'
                                                    : deploymentInfo?.status === 'running'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {deploymentInfo?.status ? deploymentInfo.status : 'idle'}
                                            </span>
                                            {deploymentInfo?.result?.finishedAt && (
                                                <span className="text-gray-500">Last run: {formatDateTime(deploymentInfo.result.finishedAt)}</span>
                                            )}
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            {deploymentInfo?.result?.steps && deploymentInfo.result.steps.length > 0 ? (
                                                deploymentInfo.result.steps.map((step) => (
                                                    <div key={step.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-gray-900">{step.name}</span>
                                                            <span className={`text-xs font-semibold ${step.success ? 'text-green-600' : 'text-red-600'}`}>
                                                                {step.success ? 'Success' : 'Failed'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-gray-500 break-all">
                                                            Command: <code>{step.command}</code>
                                                        </p>
                                                        {step.stdout && (
                                                            <pre className="mt-2 max-h-32 overflow-y-auto rounded-md bg-gray-900 p-3 text-xs text-green-200 whitespace-pre-wrap">{step.stdout.trim()}</pre>
                                                        )}
                                                        {step.stderr && (
                                                            <pre className="mt-2 max-h-32 overflow-y-auto rounded-md bg-gray-900 p-3 text-xs text-red-200 whitespace-pre-wrap">{step.stderr.trim()}</pre>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-500">No deployments executed yet.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Run Command</h3>
                                        <div className="space-y-3">
                                            <textarea
                                                value={commandInput}
                                                onChange={(e) => setCommandInput(e.target.value)}
                                                rows={3}
                                                placeholder="Enter command to execute on the server"
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            />
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={handleRunCommand}
                                                    disabled={isCommandRunning || selectedServerStatus !== 'connected'}
                                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {isCommandRunning ? 'Executing...' : 'Run Command'}
                                                </button>
                                                {commandResult && (
                                                    <span className="text-xs text-gray-500">Last executed: {formatDateTime(commandResult.executedAt)}</span>
                                                )}
                                            </div>
                                            {commandResult && (
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex space-x-4 text-xs text-gray-600">
                                                        <span>Exit code: <span className="font-semibold text-gray-900">{commandResult.code}</span></span>
                                                        <span>Command: <code className="text-gray-800">{commandResult.command}</code></span>
                                                    </div>
                                                    {commandResult.stdout && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-500 mb-1">STDOUT</p>
                                                            <pre className="max-h-48 overflow-y-auto rounded-md bg-gray-900 p-3 text-xs text-green-200 whitespace-pre-wrap">{commandResult.stdout.trim()}</pre>
                                                        </div>
                                                    )}
                                                    {commandResult.stderr && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-500 mb-1">STDERR</p>
                                                            <pre className="max-h-48 overflow-y-auto rounded-md bg-gray-900 p-3 text-xs text-red-200 whitespace-pre-wrap">{commandResult.stderr.trim()}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">Recent Logs</h3>
                                            <div className="flex items-center space-x-2">
                                                <select
                                                    value={logLines}
                                                    onChange={(e) => setLogLines(Number(e.target.value))}
                                                    className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                >
                                                    {[100, 200, 500, 1000].map(value => (
                                                        <option key={value} value={value}>{value} lines</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={handleRefreshLogs}
                                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    Refresh
                                                </button>
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-gray-900 p-4 text-xs text-green-200 max-h-72 overflow-y-auto whitespace-pre-wrap">
                                            {serverLogs?.content ? serverLogs.content : 'No log data available.'}
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            {serverLogs?.fetchedAt ? `Updated ${formatDateTime(serverLogs.fetchedAt)} (${serverLogs.lines} lines)` : 'Logs will appear after connecting.'}
                                        </p>
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
                            <p className="mt-2 text-sm text-gray-500">Choose a server from the sidebar to view its details and manage settings.</p>
                        </div>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Add New Server</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                                <span className="sr-only">Close</span>
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
                                        onChange={(e) => setNewServer({ ...newServer, environment: e.target.value as VPSServer['environment'] })}
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
                                    placeholder="server.example.com"
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
                                        onChange={(e) => setNewServer({ ...newServer, port: Number(e.target.value) || 22 })}
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Authentication Method</label>
                                <div className="flex items-center space-x-4">
                                    <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                                        <input
                                            type="radio"
                                            checked={newServer.authType === 'password'}
                                            onChange={() => setNewServer({ ...newServer, authType: 'password' })}
                                        />
                                        <span>Password</span>
                                    </label>
                                    <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                                        <input
                                            type="radio"
                                            checked={newServer.authType === 'key'}
                                            onChange={() => setNewServer({ ...newServer, authType: 'key' })}
                                        />
                                        <span>Private Key</span>
                                    </label>
                                </div>
                            </div>
                            {newServer.authType === 'password' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SSH Password</label>
                                    <input
                                        type="password"
                                        value={newServer.password}
                                        onChange={(e) => setNewServer({ ...newServer, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Private Key Path</label>
                                    <input
                                        type="text"
                                        value={newServer.privateKeyPath}
                                        onChange={(e) => setNewServer({ ...newServer, privateKeyPath: e.target.value })}
                                        placeholder="C:\\Users\\you\\.ssh\\id_rsa"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Ensure the private key is accessible from this machine.</p>
                                </div>
                            )}
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
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewServer({ ...initialNewServerState });
                                }}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddServer}
                                disabled={!canAddServer}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Add Server
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConnectModal && selectedServer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Connect to Server</h3>
                                <p className="text-sm text-gray-500 mt-1">{selectedServer.name}</p>
                            </div>
                            <button onClick={() => setShowConnectModal(false)} className="text-gray-500 hover:text-gray-700">
                                <span className="sr-only">Close</span>
                                ✕
                            </button>
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
                                        <span className="text-gray-500">IP:</span>
                                        <span className="font-mono">{selectedServer.ip || 'n/a'}</span>
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
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                Establishes an SSH connection so you can monitor resources, tail logs, and deploy repositories directly from this interface.
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
                                disabled={connectingServers.includes(selectedServer.id)}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {connectingServers.includes(selectedServer.id) ? 'Connecting...' : 'Connect SSH'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeployModal && selectedServer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Direct Deploy to {selectedServer.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">Clone and update a repository directly on the server.</p>
                            </div>
                            <button onClick={() => setShowDeployModal(false)} className="text-gray-500 hover:text-gray-700">
                                <span className="sr-only">Close</span>
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
                                <select
                                    value={deployConfig.repositoryFullName}
                                    onChange={(e) => setDeployConfig({ ...deployConfig, repositoryFullName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Select a repository...</option>
                                    {repositoriesState.repositories.map(repo => (
                                        <option key={repo.id} value={repo.full_name}>
                                            {repo.full_name}
                                        </option>
                                    ))}
                                </select>
                                {repositoriesState.loading && (
                                    <p className="mt-1 text-xs text-gray-500">Loading repositories...</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                    <input
                                        type="text"
                                        value={deployConfig.branch}
                                        onChange={(e) => setDeployConfig({ ...deployConfig, branch: e.target.value })}
                                        placeholder="main"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Deployment Path</label>
                                    <input
                                        type="text"
                                        value={deployConfig.targetPath}
                                        onChange={(e) => setDeployConfig({ ...deployConfig, targetPath: e.target.value })}
                                        placeholder="/var/www/project"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-6">
                                <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={deployConfig.clean}
                                        onChange={(e) => setDeployConfig({ ...deployConfig, clean: e.target.checked })}
                                    />
                                    <span>Clean target directory before deploy</span>
                                </label>
                                <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={deployConfig.useGitHubPat}
                                        onChange={(e) => setDeployConfig({ ...deployConfig, useGitHubPat: e.target.checked })}
                                    />
                                    <span>Use stored GitHub PAT</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pre-deploy Script</label>
                                    <textarea
                                        rows={3}
                                        value={deployConfig.preDeployScript}
                                        onChange={(e) => setDeployConfig({ ...deployConfig, preDeployScript: e.target.value })}
                                        placeholder="#!/bin/bash\nsudo systemctl stop app"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Post-deploy Script</label>
                                    <textarea
                                        rows={3}
                                        value={deployConfig.postDeployScript}
                                        onChange={(e) => setDeployConfig({ ...deployConfig, postDeployScript: e.target.value })}
                                        placeholder="#!/bin/bash\nnpm install\nnpm run build"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Environment Variables</label>
                                    <button
                                        type="button"
                                        onClick={handleAddEnvVarRow}
                                        className="text-sm text-primary-600 hover:text-primary-700"
                                    >
                                        + Add variable
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {envVars.map((row) => (
                                        <div key={row.id} className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                placeholder="KEY"
                                                value={row.key}
                                                onChange={(e) => handleEnvVarChange(row.id, 'key', e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            />
                                            <div className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    placeholder="value"
                                                    value={row.value}
                                                    onChange={(e) => handleEnvVarChange(row.id, 'value', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveEnvVarRow(row.id)}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700">
                                Make sure the server has Git installed and network access to GitHub. Using the stored PAT avoids interactive prompts during clone and fetch operations.
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeployModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDirectDeploy}
                                disabled={isDeploymentRunning || !deployConfig.repositoryFullName || !deployConfig.targetPath.trim()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isDeploymentRunning ? 'Deploying...' : 'Start Deployment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
