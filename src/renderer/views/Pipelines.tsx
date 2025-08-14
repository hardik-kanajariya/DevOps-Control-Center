import { useState } from 'react';

interface Pipeline {
    id: number;
    name: string;
    description: string;
    repository: string;
    branch: string;
    status: 'success' | 'failed' | 'running' | 'pending';
    trigger: 'push' | 'manual' | 'schedule' | 'pull_request';
    lastRun: string;
    duration: number;
    environment: 'production' | 'staging' | 'development';
    steps: PipelineStep[];
}

interface PipelineStep {
    id: number;
    name: string;
    status: 'success' | 'failed' | 'running' | 'pending' | 'skipped';
    duration?: number;
    logs?: string[];
}

// Mock pipeline data
const mockPipelines: Pipeline[] = [
    {
        id: 1,
        name: 'Web App CI/CD',
        description: 'Build, test, and deploy web application',
        repository: 'user/awesome-web-app',
        branch: 'main',
        status: 'success',
        trigger: 'push',
        lastRun: '2024-08-14T10:30:00Z',
        duration: 180,
        environment: 'production',
        steps: [
            { id: 1, name: 'Checkout Code', status: 'success', duration: 15 },
            { id: 2, name: 'Install Dependencies', status: 'success', duration: 45 },
            { id: 3, name: 'Run Tests', status: 'success', duration: 60 },
            { id: 4, name: 'Build Application', status: 'success', duration: 30 },
            { id: 5, name: 'Deploy to Production', status: 'success', duration: 30 }
        ]
    },
    {
        id: 2,
        name: 'API Service Pipeline',
        description: 'Build and deploy API service with database migrations',
        repository: 'user/api-service',
        branch: 'develop',
        status: 'running',
        trigger: 'push',
        lastRun: '2024-08-14T11:15:00Z',
        duration: 0,
        environment: 'staging',
        steps: [
            { id: 1, name: 'Checkout Code', status: 'success', duration: 12 },
            { id: 2, name: 'Setup Python Environment', status: 'success', duration: 25 },
            { id: 3, name: 'Run Unit Tests', status: 'running' },
            { id: 4, name: 'Run Integration Tests', status: 'pending' },
            { id: 5, name: 'Build Docker Image', status: 'pending' },
            { id: 6, name: 'Deploy to Staging', status: 'pending' }
        ]
    },
    {
        id: 3,
        name: 'Mobile App Build',
        description: 'Build and test mobile application',
        repository: 'user/mobile-client',
        branch: 'feature/new-ui',
        status: 'failed',
        trigger: 'pull_request',
        lastRun: '2024-08-14T09:45:00Z',
        duration: 95,
        environment: 'development',
        steps: [
            { id: 1, name: 'Checkout Code', status: 'success', duration: 10 },
            { id: 2, name: 'Install Node.js', status: 'success', duration: 20 },
            { id: 3, name: 'Install Dependencies', status: 'success', duration: 35 },
            { id: 4, name: 'Run Linting', status: 'failed', duration: 15 },
            { id: 5, name: 'Run Tests', status: 'skipped' },
            { id: 6, name: 'Build App', status: 'skipped' }
        ]
    }
];

export default function Pipelines() {
    const [pipelines] = useState(mockPipelines);
    const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [selectedStep, setSelectedStep] = useState<PipelineStep | null>(null);

    const handleSelectPipeline = (pipeline: Pipeline) => {
        setSelectedPipeline(pipeline);
    };

    const handleRunPipeline = (pipeline: Pipeline) => {
        // In real implementation, would trigger pipeline via IPC
        console.log(`Running pipeline: ${pipeline.name}`);
    };

    const handleStepClick = (step: PipelineStep) => {
        setSelectedStep(step);
        setShowLogsModal(true);
    };

    const getStatusColor = (status: Pipeline['status'] | PipelineStep['status']) => {
        switch (status) {
            case 'success': return 'text-green-600 bg-green-100';
            case 'failed': return 'text-red-600 bg-red-100';
            case 'running': return 'text-blue-600 bg-blue-100';
            case 'pending': return 'text-gray-600 bg-gray-100';
            case 'skipped': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status: Pipeline['status'] | PipelineStep['status']) => {
        switch (status) {
            case 'success':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                );
            case 'failed':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                );
            case 'running':
                return (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                );
            case 'pending':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                );
            case 'skipped':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getEnvironmentColor = (environment: Pipeline['environment']) => {
        switch (environment) {
            case 'production': return 'bg-red-100 text-red-800';
            case 'staging': return 'bg-yellow-100 text-yellow-800';
            case 'development': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const formatLastRun = (lastRun: string) => {
        const date = new Date(lastRun);
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
            {/* Pipeline List */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Pipelines</h1>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                        >
                            Create Pipeline
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search pipelines..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {pipelines.map((pipeline) => (
                            <button
                                key={pipeline.id}
                                onClick={() => handleSelectPipeline(pipeline)}
                                className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedPipeline?.id === pipeline.id
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pipeline.status)}`}>
                                                <span className="mr-1">{getStatusIcon(pipeline.status)}</span>
                                                {pipeline.status}
                                            </div>
                                        </div>
                                        <h3 className="font-medium text-gray-900 mt-1 truncate">{pipeline.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pipeline.description}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(pipeline.environment)}`}>
                                        {pipeline.environment}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{pipeline.repository}</span>
                                    <span>{formatLastRun(pipeline.lastRun)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                    <span>Branch: {pipeline.branch}</span>
                                    {pipeline.duration > 0 && <span>{formatDuration(pipeline.duration)}</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pipeline Details */}
            <div className="flex-1 flex flex-col">
                {selectedPipeline ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedPipeline.status)}`}>
                                            <span className="mr-2">{getStatusIcon(selectedPipeline.status)}</span>
                                            {selectedPipeline.status}
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(selectedPipeline.environment)}`}>
                                            {selectedPipeline.environment}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedPipeline.name}</h2>
                                    <p className="text-gray-600 mb-2">{selectedPipeline.description}</p>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>{selectedPipeline.repository}</span>
                                        <span>Branch: {selectedPipeline.branch}</span>
                                        <span>Trigger: {selectedPipeline.trigger}</span>
                                        <span>Last run: {formatLastRun(selectedPipeline.lastRun)}</span>
                                        {selectedPipeline.duration > 0 && <span>Duration: {formatDuration(selectedPipeline.duration)}</span>}
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleRunPipeline(selectedPipeline)}
                                        disabled={selectedPipeline.status === 'running'}
                                        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {selectedPipeline.status === 'running' ? 'Running...' : 'Run Pipeline'}
                                    </button>
                                    <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                                        Edit Pipeline
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Pipeline Steps */}
                        <div className="flex-1 p-6">
                            <div className="max-w-4xl">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Steps</h3>
                                <div className="space-y-4">
                                    {selectedPipeline.steps.map((step, index) => (
                                        <div key={step.id} className="flex items-start space-x-4">
                                            {/* Step Number and Connector */}
                                            <div className="flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${step.status === 'success' ? 'border-green-500 bg-green-500 text-white' :
                                                        step.status === 'failed' ? 'border-red-500 bg-red-500 text-white' :
                                                            step.status === 'running' ? 'border-blue-500 bg-blue-500 text-white' :
                                                                step.status === 'skipped' ? 'border-yellow-500 bg-yellow-500 text-white' :
                                                                    'border-gray-300 bg-white text-gray-500'
                                                    }`}>
                                                    {step.status === 'running' ? (
                                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    ) : (
                                                        index + 1
                                                    )}
                                                </div>
                                                {index < selectedPipeline.steps.length - 1 && (
                                                    <div className={`w-0.5 h-8 mt-2 ${step.status === 'success' || step.status === 'failed' || step.status === 'skipped' ? 'bg-gray-300' : 'bg-gray-200'
                                                        }`}></div>
                                                )}
                                            </div>

                                            {/* Step Content */}
                                            <div className="flex-1 min-w-0">
                                                <button
                                                    onClick={() => handleStepClick(step)}
                                                    className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <h4 className="font-medium text-gray-900">{step.name}</h4>
                                                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                                                                <span className="mr-1">{getStatusIcon(step.status)}</span>
                                                                {step.status}
                                                            </div>
                                                        </div>
                                                        {step.duration && (
                                                            <span className="text-sm text-gray-500">
                                                                {formatDuration(step.duration)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
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
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Select a pipeline</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose a pipeline from the sidebar to view its details and execution history</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Pipeline Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Create New Pipeline</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline Name</label>
                                    <input
                                        type="text"
                                        placeholder="My CI/CD Pipeline"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                                        <option value="development">Development</option>
                                        <option value="staging">Staging</option>
                                        <option value="production">Production</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    placeholder="Describe what this pipeline does..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                                        <option value="">Select repository...</option>
                                        <option value="user/awesome-web-app">user/awesome-web-app</option>
                                        <option value="user/api-service">user/api-service</option>
                                        <option value="user/mobile-client">user/mobile-client</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                    <input
                                        type="text"
                                        placeholder="main"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Trigger</label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input type="checkbox" className="mr-2" />
                                        <span className="text-sm">On push to branch</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="checkbox" className="mr-2" />
                                        <span className="text-sm">On pull request</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="checkbox" className="mr-2" />
                                        <span className="text-sm">Manual trigger</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="checkbox" className="mr-2" />
                                        <span className="text-sm">Scheduled (cron)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                Create Pipeline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step Logs Modal */}
            {showLogsModal && selectedStep && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{selectedStep.name}</h3>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedStep.status)}`}>
                                            <span className="mr-1">{getStatusIcon(selectedStep.status)}</span>
                                            {selectedStep.status}
                                        </div>
                                        {selectedStep.duration && (
                                            <span className="text-sm text-gray-500">
                                                Duration: {formatDuration(selectedStep.duration)}
                                            </span>
                                        )}
                                    </div>
                                </div>
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
                                {selectedStep.status === 'pending' ? (
                                    <div className="text-gray-400">Step has not started yet...</div>
                                ) : selectedStep.status === 'running' ? (
                                    <div>
                                        <div className="text-green-400">[2024-08-14 11:30:15] Starting {selectedStep.name}...</div>
                                        <div className="text-blue-400">[2024-08-14 11:30:16] Setting up environment...</div>
                                        <div className="text-white">[2024-08-14 11:30:18] Processing...</div>
                                        <div className="text-yellow-400 animate-pulse">[2024-08-14 11:30:20] Running...</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-green-400">[2024-08-14 10:30:15] Starting {selectedStep.name}...</div>
                                        <div className="text-blue-400">[2024-08-14 10:30:16] Setting up environment...</div>
                                        <div className="text-white">[2024-08-14 10:30:18] Installing dependencies...</div>
                                        <div className="text-white">[2024-08-14 10:30:25] Running tests...</div>
                                        {selectedStep.status === 'success' ? (
                                            <div className="text-green-400">[2024-08-14 10:30:45] ✓ {selectedStep.name} completed successfully</div>
                                        ) : selectedStep.status === 'failed' ? (
                                            <div>
                                                <div className="text-red-400">[2024-08-14 10:30:35] ✗ Error: Test suite failed</div>
                                                <div className="text-red-400">[2024-08-14 10:30:35] ✗ 3 tests failed, 7 passed</div>
                                                <div className="text-red-400">[2024-08-14 10:30:35] ✗ {selectedStep.name} failed</div>
                                            </div>
                                        ) : (
                                            <div className="text-yellow-400">[2024-08-14 10:30:35] - {selectedStep.name} was skipped</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
