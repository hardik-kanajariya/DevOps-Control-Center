import { useEffect, useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
    fetchAllWorkflows,
    fetchWorkflowJobs,
    cancelWorkflowRun,
    rerunWorkflow,
    openWorkflowInBrowser,
    setSelectedWorkflow,
    setFilterBy,
    clearWorkflowJobs
} from '../store/slices/workflowsSlice';
import { WorkflowRun, WorkflowJob, WorkflowStep } from '../../shared/types';

export default function Pipelines() {
    const dispatch = useAppDispatch();
    const {
        workflows,
        selectedWorkflow,
        workflowJobs,
        loading,
        jobsLoading,
        actionLoading,
        error,
        lastUpdated,
        filterBy
    } = useAppSelector((state) => state.workflows);

    const [searchTerm, setSearchTerm] = useState('');
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
    const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null);

    // Load workflows on component mount
    useEffect(() => {
        dispatch(fetchAllWorkflows());
    }, [dispatch]);

    // Auto-refresh every 2 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            dispatch(fetchAllWorkflows());
        }, 2 * 60 * 1000);

        return () => clearInterval(interval);
    }, [dispatch]);

    // Load jobs when workflow is selected
    useEffect(() => {
        if (selectedWorkflow && selectedWorkflow.repository) {
            dispatch(fetchWorkflowJobs({
                owner: selectedWorkflow.repository.owner,
                repo: selectedWorkflow.repository.name,
                runId: selectedWorkflow.id
            }));
        }
    }, [selectedWorkflow, dispatch]);

    // Filter and sort workflows
    const filteredWorkflows = useMemo(() => {
        let filtered = [...workflows];

        // Apply search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(workflow =>
                workflow.name.toLowerCase().includes(searchLower) ||
                workflow.head_branch.toLowerCase().includes(searchLower) ||
                workflow.repository?.full_name?.toLowerCase().includes(searchLower)
            );
        }

        // Apply status filter
        if (filterBy !== 'all') {
            if (filterBy === 'success') {
                filtered = filtered.filter(w => w.conclusion === 'success');
            } else if (filterBy === 'failure') {
                filtered = filtered.filter(w => w.conclusion === 'failure');
            } else if (filterBy === 'in_progress') {
                filtered = filtered.filter(w => w.status === 'in_progress');
            } else if (filterBy === 'cancelled') {
                filtered = filtered.filter(w => w.conclusion === 'cancelled');
            }
        }

        // Sort by updated_at desc
        filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        return filtered;
    }, [workflows, searchTerm, filterBy]);

    const handleSelectPipeline = (workflow: WorkflowRun) => {
        dispatch(setSelectedWorkflow(workflow));
        dispatch(clearWorkflowJobs());
    };

    const handleRefresh = () => {
        dispatch(fetchAllWorkflows());
    };

    const handleRunPipeline = async () => {
        if (!selectedWorkflow || !selectedWorkflow.repository) return;

        await dispatch(rerunWorkflow({
            owner: selectedWorkflow.repository.owner,
            repo: selectedWorkflow.repository.name,
            runId: selectedWorkflow.id
        }));
        handleRefresh();
    };

    const handleCancelPipeline = async () => {
        if (!selectedWorkflow || !selectedWorkflow.repository) return;

        await dispatch(cancelWorkflowRun({
            owner: selectedWorkflow.repository.owner,
            repo: selectedWorkflow.repository.name,
            runId: selectedWorkflow.id
        }));
        handleRefresh();
    };

    const handleOpenInBrowser = () => {
        if (selectedWorkflow?.html_url) {
            dispatch(openWorkflowInBrowser(selectedWorkflow.html_url));
        }
    };

    const handleStepClick = (step: WorkflowStep, job: WorkflowJob) => {
        setSelectedStep(step);
        setSelectedJob(job);
        setShowLogsModal(true);
    };

    const getStatusFromWorkflow = (workflow: WorkflowRun): 'success' | 'failed' | 'running' | 'pending' | 'cancelled' => {
        if (workflow.status === 'in_progress' || workflow.status === 'queued') {
            return workflow.status === 'in_progress' ? 'running' : 'pending';
        }
        if (workflow.conclusion === 'success') return 'success';
        if (workflow.conclusion === 'failure') return 'failed';
        if (workflow.conclusion === 'cancelled') return 'cancelled';
        return 'pending';
    };

    const getStepStatus = (step: WorkflowStep): 'success' | 'failed' | 'running' | 'pending' | 'skipped' => {
        if (step.status === 'in_progress') return 'running';
        if (step.status === 'queued') return 'pending';
        if (step.conclusion === 'success') return 'success';
        if (step.conclusion === 'failure') return 'failed';
        if (step.conclusion === 'skipped') return 'skipped';
        if (step.conclusion === 'cancelled') return 'skipped';
        return 'pending';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-600 bg-green-100';
            case 'failed': return 'text-red-600 bg-red-100';
            case 'running': return 'text-blue-600 bg-blue-100';
            case 'pending': return 'text-gray-600 bg-gray-100';
            case 'skipped': return 'text-yellow-600 bg-yellow-100';
            case 'cancelled': return 'text-orange-600 bg-orange-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
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
            case 'cancelled':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getEnvironmentFromBranch = (branch: string): 'production' | 'staging' | 'development' => {
        const branchLower = branch.toLowerCase();
        if (branchLower === 'main' || branchLower === 'master' || branchLower.includes('prod')) {
            return 'production';
        }
        if (branchLower.includes('stag') || branchLower.includes('release')) {
            return 'staging';
        }
        return 'development';
    };

    const getEnvironmentColor = (environment: string) => {
        switch (environment) {
            case 'production': return 'bg-red-100 text-red-800';
            case 'staging': return 'bg-yellow-100 text-yellow-800';
            case 'development': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDuration = (startedAt?: string, completedAt?: string): string => {
        if (!startedAt) return '-';
        const start = new Date(startedAt).getTime();
        const end = completedAt ? new Date(completedAt).getTime() : Date.now();
        const diff = Math.floor((end - start) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        return `${minutes}m ${seconds}s`;
    };

    const formatLastRun = (dateStr: string) => {
        const date = new Date(dateStr);
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

    const getTotalDuration = (): string => {
        if (!workflowJobs.length) return '-';
        
        const startTimes = workflowJobs
            .filter(job => job.started_at)
            .map(job => new Date(job.started_at!).getTime());
        const endTimes = workflowJobs
            .filter(job => job.completed_at)
            .map(job => new Date(job.completed_at!).getTime());

        if (!startTimes.length) return '-';
        
        const start = Math.min(...startTimes);
        const end = endTimes.length ? Math.max(...endTimes) : Date.now();
        const diff = Math.floor((end - start) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        return `${minutes}m ${seconds}s`;
    };

    const isRerunLoading = selectedWorkflow ? actionLoading[`rerun-${selectedWorkflow.id}`] : false;
    const isCancelLoading = selectedWorkflow ? actionLoading[`cancel-${selectedWorkflow.id}`] : false;

    return (
        <div className="flex h-full bg-gray-50">
            {/* Pipeline List */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Pipelines</h1>
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                    <div className="relative mb-3">
                        <input
                            type="text"
                            placeholder="Search pipelines..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    {/* Filter buttons */}
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'success', 'failure', 'in_progress', 'cancelled'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => dispatch(setFilterBy(filter))}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    filterBy === filter
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {filter === 'all' ? 'All' : filter === 'in_progress' ? 'Running' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading && filteredWorkflows.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : filteredWorkflows.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            {searchTerm || filterBy !== 'all' ? 'No pipelines match your filter' : 'No pipelines found'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredWorkflows.map((workflow) => {
                                const status = getStatusFromWorkflow(workflow);
                                const environment = getEnvironmentFromBranch(workflow.head_branch);
                                
                                return (
                                    <button
                                        key={workflow.id}
                                        onClick={() => handleSelectPipeline(workflow)}
                                        className={`w-full text-left p-4 rounded-lg border transition-colors ${
                                            selectedWorkflow?.id === workflow.id
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                                        <span className="mr-1">{getStatusIcon(status)}</span>
                                                        {status}
                                                    </div>
                                                </div>
                                                <h3 className="font-medium text-gray-900 mt-1 truncate">{workflow.name}</h3>
                                                <p className="text-sm text-gray-500 mt-1 truncate">
                                                    #{workflow.run_number || workflow.id}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(environment)}`}>
                                                {environment}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="truncate">{workflow.repository?.full_name || 'Unknown'}</span>
                                            <span>{formatLastRun(workflow.updated_at)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                            <span>Branch: {workflow.head_branch}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {lastUpdated && (
                    <div className="p-2 border-t border-gray-200 text-xs text-gray-500 text-center">
                        Last updated: {formatLastRun(lastUpdated)}
                    </div>
                )}
            </div>

            {/* Pipeline Details */}
            <div className="flex-1 flex flex-col">
                {selectedWorkflow ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getStatusFromWorkflow(selectedWorkflow))}`}>
                                            <span className="mr-2">{getStatusIcon(getStatusFromWorkflow(selectedWorkflow))}</span>
                                            {getStatusFromWorkflow(selectedWorkflow)}
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnvironmentColor(getEnvironmentFromBranch(selectedWorkflow.head_branch))}`}>
                                            {getEnvironmentFromBranch(selectedWorkflow.head_branch)}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedWorkflow.name}</h2>
                                    <p className="text-gray-600 mb-2">Run #{selectedWorkflow.run_number || selectedWorkflow.id}</p>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>{selectedWorkflow.repository?.full_name}</span>
                                        <span>Branch: {selectedWorkflow.head_branch}</span>
                                        <span>Last run: {formatLastRun(selectedWorkflow.updated_at)}</span>
                                        <span>Duration: {getTotalDuration()}</span>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    {selectedWorkflow.status === 'in_progress' ? (
                                        <button
                                            onClick={handleCancelPipeline}
                                            disabled={isCancelLoading}
                                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isCancelLoading ? 'Cancelling...' : 'Cancel'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleRunPipeline}
                                            disabled={isRerunLoading}
                                            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isRerunLoading ? 'Re-running...' : 'Re-run Pipeline'}
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleOpenInBrowser}
                                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        View on GitHub
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Pipeline Jobs/Steps */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            {jobsLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                    <span className="ml-3 text-gray-600">Loading pipeline steps...</span>
                                </div>
                            ) : workflowJobs.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    No jobs found for this pipeline run
                                </div>
                            ) : (
                                <div className="max-w-4xl space-y-6">
                                    {workflowJobs.map((job) => (
                                        <div key={job.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                            {/* Job Header */}
                                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getStepStatus({ ...job, number: 0 } as WorkflowStep))}`}>
                                                        <span className="mr-1">{getStatusIcon(getStepStatus({ ...job, number: 0 } as WorkflowStep))}</span>
                                                        {job.status === 'completed' ? job.conclusion : job.status}
                                                    </div>
                                                    <h3 className="font-semibold text-gray-900">{job.name}</h3>
                                                </div>
                                                <span className="text-sm text-gray-500">
                                                    {formatDuration(job.started_at, job.completed_at)}
                                                </span>
                                            </div>

                                            {/* Job Steps */}
                                            <div className="p-4">
                                                <div className="space-y-3">
                                                    {job.steps.map((step, index) => {
                                                        const stepStatus = getStepStatus(step);
                                                        return (
                                                            <div key={step.number} className="flex items-start space-x-4">
                                                                {/* Step Number and Connector */}
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                                                                        stepStatus === 'success' ? 'border-green-500 bg-green-500 text-white' :
                                                                        stepStatus === 'failed' ? 'border-red-500 bg-red-500 text-white' :
                                                                        stepStatus === 'running' ? 'border-blue-500 bg-blue-500 text-white' :
                                                                        stepStatus === 'skipped' ? 'border-yellow-500 bg-yellow-500 text-white' :
                                                                        'border-gray-300 bg-white text-gray-500'
                                                                    }`}>
                                                                        {stepStatus === 'running' ? (
                                                                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                        ) : (
                                                                            step.number
                                                                        )}
                                                                    </div>
                                                                    {index < job.steps.length - 1 && (
                                                                        <div className={`w-0.5 h-6 mt-1 ${
                                                                            stepStatus === 'success' || stepStatus === 'failed' || stepStatus === 'skipped' ? 'bg-gray-300' : 'bg-gray-200'
                                                                        }`}></div>
                                                                    )}
                                                                </div>

                                                                {/* Step Content */}
                                                                <div className="flex-1 min-w-0">
                                                                    <button
                                                                        onClick={() => handleStepClick(step, job)}
                                                                        className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center space-x-2">
                                                                                <span className="font-medium text-gray-900 text-sm">{step.name}</span>
                                                                                <div className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(stepStatus)}`}>
                                                                                    {stepStatus}
                                                                                </div>
                                                                            </div>
                                                                            {step.started_at && (
                                                                                <span className="text-xs text-gray-500">
                                                                                    {formatDuration(step.started_at, step.completed_at)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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

            {/* Step Logs Modal */}
            {showLogsModal && selectedStep && selectedJob && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{selectedStep.name}</h3>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-sm text-gray-500">Job: {selectedJob.name}</span>
                                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getStepStatus(selectedStep))}`}>
                                            <span className="mr-1">{getStatusIcon(getStepStatus(selectedStep))}</span>
                                            {getStepStatus(selectedStep)}
                                        </div>
                                        {selectedStep.started_at && (
                                            <span className="text-sm text-gray-500">
                                                Duration: {formatDuration(selectedStep.started_at, selectedStep.completed_at)}
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
                                {getStepStatus(selectedStep) === 'pending' ? (
                                    <div className="text-gray-400">Step has not started yet...</div>
                                ) : getStepStatus(selectedStep) === 'running' ? (
                                    <div>
                                        <div className="text-green-400">[{selectedStep.started_at}] Starting {selectedStep.name}...</div>
                                        <div className="text-yellow-400 animate-pulse">Running...</div>
                                        <div className="text-gray-400 mt-4">
                                            View detailed logs on GitHub for real-time output.
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-blue-400">[{selectedStep.started_at}] Started {selectedStep.name}</div>
                                        {getStepStatus(selectedStep) === 'success' ? (
                                            <>
                                                <div className="text-green-400">[{selectedStep.completed_at}] Completed {selectedStep.name} successfully</div>
                                                <div className="text-gray-400 mt-4">
                                                    Detailed logs are available on GitHub Actions.
                                                    <br />
                                                    Click "View Logs on GitHub" to see full output.
                                                </div>
                                            </>
                                        ) : getStepStatus(selectedStep) === 'failed' ? (
                                            <>
                                                <div className="text-red-400">[{selectedStep.completed_at}] {selectedStep.name} failed</div>
                                                <div className="text-gray-400 mt-4">
                                                    View detailed error logs on GitHub Actions for troubleshooting.
                                                    <br />
                                                    Click "View Logs on GitHub" to see full error output.
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-yellow-400">[{selectedStep.completed_at}] - {selectedStep.name} was skipped</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowLogsModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedJob.html_url) {
                                        dispatch(openWorkflowInBrowser(selectedJob.html_url));
                                    }
                                }}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                View Logs on GitHub
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
