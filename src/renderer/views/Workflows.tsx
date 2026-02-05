import { useEffect, useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
    fetchAllWorkflows,
    fetchRepositoryWorkflows,
    fetchWorkflowYAML,
    cancelWorkflowRun,
    rerunWorkflow,
    openWorkflowInBrowser,
    setSelectedWorkflow,
    setFilterBy,
    setSortBy,
    clearError,
    clearWorkflowYAML
} from '../store/slices/workflowsSlice';
import { WorkflowRun } from '../../shared/types';

export default function Workflows() {
    const dispatch = useAppDispatch();
    const {
        workflows,
        selectedWorkflow,
        workflowYAML,
        loading,
        yamlLoading,
        actionLoading,
        error,
        lastUpdated,
        filterBy,
        sortBy,
        selectedRepository
    } = useAppSelector((state) => state.workflows);

    const [isEditing, setIsEditing] = useState(false);
    const [editedYAML, setEditedYAML] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Load workflows on component mount
    useEffect(() => {
        dispatch(fetchAllWorkflows());
    }, [dispatch]);

    // Auto-refresh every 2 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            if (selectedRepository) {
                const [owner, repo] = selectedRepository.split('/');
                dispatch(fetchRepositoryWorkflows({ owner, repo }));
            } else {
                dispatch(fetchAllWorkflows());
            }
        }, 2 * 60 * 1000);

        return () => clearInterval(interval);
    }, [dispatch, selectedRepository]);

    // Load YAML when workflow is selected
    useEffect(() => {
        if (selectedWorkflow && selectedWorkflow.workflow_id && !workflowYAML) {
            // Extract owner/repo from workflow data
            const repository = selectedWorkflow.repository;
            if (repository && repository.owner && repository.name) {
                dispatch(fetchWorkflowYAML({
                    owner: repository.owner,
                    repo: repository.name,
                    workflowId: selectedWorkflow.workflow_id
                }));
            }
        }
    }, [selectedWorkflow, workflowYAML, dispatch]);

    // Filter and sort workflows
    const filteredWorkflows = useMemo(() => {
        let filtered = [...workflows];

        // Apply search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(workflow =>
                workflow.name.toLowerCase().includes(searchLower) ||
                workflow.head_branch.toLowerCase().includes(searchLower) ||
                workflow.repository?.name?.toLowerCase().includes(searchLower)
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

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'created':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'status':
                    return a.status.localeCompare(b.status);
                case 'updated':
                default:
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            }
        });

        return filtered;
    }, [workflows, searchTerm, filterBy, sortBy]);

    const handleSelectWorkflow = (workflow: WorkflowRun) => {
        dispatch(setSelectedWorkflow(workflow));
        dispatch(clearWorkflowYAML()); // Clear previous YAML
        setIsEditing(false);
    };

    const handleRefresh = () => {
        if (selectedRepository) {
            const [owner, repo] = selectedRepository.split('/');
            dispatch(fetchRepositoryWorkflows({ owner, repo }));
        } else {
            dispatch(fetchAllWorkflows());
        }
    };

    const handleCancelWorkflow = async () => {
        if (!selectedWorkflow) return;

        const repository = selectedWorkflow.repository;
        if (repository && repository.owner && repository.name) {
            await dispatch(cancelWorkflowRun({
                owner: repository.owner,
                repo: repository.name,
                runId: selectedWorkflow.id
            }));
            // Refresh after action
            handleRefresh();
        }
    };

    const handleRerunWorkflow = async () => {
        if (!selectedWorkflow) return;

        const repository = selectedWorkflow.repository;
        if (repository && repository.owner && repository.name) {
            await dispatch(rerunWorkflow({
                owner: repository.owner,
                repo: repository.name,
                runId: selectedWorkflow.id
            }));
            // Refresh after action
            setTimeout(handleRefresh, 2000); // Delay to allow GitHub to process
        }
    };

    const handleOpenInBrowser = () => {
        if (selectedWorkflow?.html_url) {
            dispatch(openWorkflowInBrowser(selectedWorkflow.html_url));
        }
    };

    const handleEditWorkflow = () => {
        setEditedYAML(workflowYAML || '');
        setIsEditing(true);
    };

    const handleSaveWorkflow = () => {
        // For now, just exit edit mode
        // In a real implementation, you'd save the YAML back to GitHub
        setIsEditing(false);
        setEditedYAML('');
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedYAML('');
    };

    const getStatusColor = (status: string, conclusion?: string) => {
        if (status === 'completed') {
            if (conclusion === 'success') return 'bg-green-100 text-green-800';
            if (conclusion === 'failure') return 'bg-red-100 text-red-800';
            if (conclusion === 'cancelled') return 'bg-gray-100 text-gray-800';
            if (conclusion === 'skipped') return 'bg-yellow-100 text-yellow-800';
        }
        if (status === 'in_progress') return 'bg-blue-100 text-blue-800';
        if (status === 'queued') return 'bg-purple-100 text-purple-800';
        if (status === 'waiting') return 'bg-orange-100 text-orange-800';
        return 'bg-gray-100 text-gray-800';
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

    const formatDuration = (startDate: string, endDate: string) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const duration = Math.round((end - start) / 1000); // seconds

        if (duration < 60) return `${duration}s`;
        if (duration < 3600) return `${Math.round(duration / 60)}m`;
        return `${Math.round(duration / 3600)}h`;
    };

    if (loading && workflows.length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Loading workflows...</h3>
                    <p className="mt-2 text-sm text-gray-500">Fetching GitHub Actions workflows</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-gray-50">
            {/* Sidebar */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Workflows</h1>
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Refresh workflows"
                        >
                            <svg
                                className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Search workflows..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Filters and Sort */}
                    <div className="flex space-x-2 mb-4">
                        <select
                            value={filterBy}
                            onChange={(e) => dispatch(setFilterBy(e.target.value as any))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="all">All status</option>
                            <option value="success">Success</option>
                            <option value="failure">Failure</option>
                            <option value="in_progress">In Progress</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => dispatch(setSortBy(e.target.value as any))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="updated">Last updated</option>
                            <option value="created">Recently created</option>
                            <option value="name">Name</option>
                            <option value="status">Status</option>
                        </select>
                    </div>

                    {/* Workflow count and last updated */}
                    <div className="text-sm text-gray-500">
                        {filteredWorkflows.length} {filteredWorkflows.length === 1 ? 'workflow' : 'workflows'}
                        {lastUpdated && (
                            <span className="block mt-1">
                                Updated {formatDate(lastUpdated)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Workflow List */}
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
                        {filteredWorkflows.map((workflow) => (
                            <button
                                key={workflow.id}
                                onClick={() => handleSelectWorkflow(workflow)}
                                className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedWorkflow?.id === workflow.id
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-medium text-gray-900 truncate">{workflow.name}</h3>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(workflow.status, workflow.conclusion)}`}>
                                                {workflow.conclusion || workflow.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {workflow.repository?.full_name || 'Unknown Repository'} • {workflow.head_branch}
                                        </p>
                                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                            <span>#{workflow.run_number || workflow.id}</span>
                                            <span>{formatDate(workflow.created_at)}</span>
                                            {workflow.status === 'completed' && (
                                                <span>{formatDuration(workflow.created_at, workflow.updated_at)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {filteredWorkflows.length === 0 && !loading && (
                            <div className="text-center py-8">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h3 className="mt-4 text-sm font-medium text-gray-900">No workflows found</h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    {searchTerm ? 'Try adjusting your search or filters' : 'No GitHub Actions workflows available'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {selectedWorkflow ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedWorkflow.name}</h2>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedWorkflow.status, selectedWorkflow.conclusion)}`}>
                                            {selectedWorkflow.conclusion || selectedWorkflow.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 mb-4">
                                        {selectedWorkflow.repository?.full_name || 'Unknown Repository'} • Run #{selectedWorkflow.run_number || selectedWorkflow.id}
                                    </p>
                                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                                        <div className="flex items-center space-x-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                            </svg>
                                            <span>Started {formatDate(selectedWorkflow.created_at)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            <span>Branch: {selectedWorkflow.head_branch}</span>
                                        </div>
                                        {selectedWorkflow.status === 'completed' && (
                                            <div className="flex items-center space-x-1">
                                                <span>Duration: {formatDuration(selectedWorkflow.created_at, selectedWorkflow.updated_at)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    {selectedWorkflow.status === 'in_progress' && (
                                        <button
                                            onClick={handleCancelWorkflow}
                                            disabled={actionLoading[`cancel-${selectedWorkflow.id}`]}
                                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                                        >
                                            {actionLoading[`cancel-${selectedWorkflow.id}`] ? 'Cancelling...' : 'Cancel'}
                                        </button>
                                    )}
                                    {(selectedWorkflow.status === 'completed' && selectedWorkflow.conclusion !== 'success') && (
                                        <button
                                            onClick={handleRerunWorkflow}
                                            disabled={actionLoading[`rerun-${selectedWorkflow.id}`]}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                        >
                                            {actionLoading[`rerun-${selectedWorkflow.id}`] ? 'Re-running...' : 'Re-run'}
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

                        {/* Content */}
                        <div className="flex-1">
                            {yamlLoading ? (
                                <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                                        <p className="mt-4 text-sm text-gray-500">Loading workflow configuration...</p>
                                    </div>
                                </div>
                            ) : workflowYAML ? (
                                <div className="h-full border-t border-gray-200">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                                        <h3 className="text-sm font-medium text-gray-900">Workflow Configuration</h3>
                                        <div className="flex space-x-2">
                                            {!isEditing ? (
                                                <button
                                                    onClick={handleEditWorkflow}
                                                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveWorkflow}
                                                        className="bg-primary-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-primary-700 transition-colors"
                                                    >
                                                        Save
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-full p-4 bg-gray-900 text-green-400 font-mono text-sm overflow-auto">
                                        <pre className="whitespace-pre-wrap">{isEditing ? editedYAML : workflowYAML}</pre>
                                        {isEditing && (
                                            <textarea
                                                value={editedYAML}
                                                onChange={(e) => setEditedYAML(e.target.value)}
                                                className="w-full h-96 mt-4 p-2 bg-gray-800 text-green-400 font-mono text-sm border border-gray-700 rounded"
                                                placeholder="Edit workflow YAML..."
                                            />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h3 className="mt-4 text-lg font-medium text-gray-900">Workflow configuration unavailable</h3>
                                        <p className="mt-2 text-sm text-gray-500">Unable to load the workflow YAML file</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Select a workflow</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose a workflow from the sidebar to view its details and configuration</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
