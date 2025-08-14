import { useEffect, useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
    fetchRepositories,
    fetchRepository,
    cloneRepository,
    fetchRepositoryAnalytics,
    openRepositoryInBrowser,
    setSearchTerm,
    setSortBy,
    setFilterBy,
    setSelectedRepository,
    clearError
} from '../store/slices/repositoriesSlice';
import { GitHubRepository } from '../../shared/types';

export default function Repositories() {
    const dispatch = useAppDispatch();
    const {
        repositories,
        selectedRepository,
        analytics,
        loading,
        cloning,
        error,
        searchTerm,
        sortBy,
        filterBy,
        lastUpdated
    } = useAppSelector((state) => state.repositories);

    const [showCloneModal, setShowCloneModal] = useState(false);
    const [clonePath, setClonePath] = useState('');
    const [cloneMethod, setCloneMethod] = useState<'https' | 'ssh'>('https');
    const [cloneError, setCloneError] = useState<string | null>(null);

    // Load repositories on component mount
    useEffect(() => {
        dispatch(fetchRepositories());
    }, [dispatch]);

    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            dispatch(fetchRepositories());
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [dispatch]);

    // Load analytics for selected repository
    useEffect(() => {
        if (selectedRepository && !analytics[selectedRepository.name]) {
            dispatch(fetchRepositoryAnalytics(selectedRepository.name));
        }
    }, [selectedRepository, analytics, dispatch]);

    // Filter and sort repositories
    const filteredRepositories = useMemo(() => {
        let filtered = [...repositories];

        // Apply search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(repo =>
                repo.name.toLowerCase().includes(searchLower) ||
                repo.description?.toLowerCase().includes(searchLower) ||
                repo.language?.toLowerCase().includes(searchLower)
            );
        }

        // Apply visibility filter
        if (filterBy !== 'all') {
            filtered = filtered.filter(repo =>
                filterBy === 'private' ? repo.private : !repo.private
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'stars':
                    return b.stargazers_count - a.stargazers_count;
                case 'created':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'updated':
                default:
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            }
        });

        return filtered;
    }, [repositories, searchTerm, filterBy, sortBy]);

    const handleSelectRepository = (repo: GitHubRepository) => {
        dispatch(setSelectedRepository(repo));
    };

    const handleRefresh = () => {
        dispatch(fetchRepositories());
        if (selectedRepository) {
            dispatch(fetchRepository(selectedRepository.name));
        }
    };

    const handleSearch = (value: string) => {
        dispatch(setSearchTerm(value));
    };

    const handleCloneRepository = async () => {
        if (!selectedRepository || !clonePath.trim()) return;

        setCloneError(null);
        const url = cloneMethod === 'https' ? selectedRepository.clone_url : selectedRepository.ssh_url;

        try {
            await dispatch(cloneRepository({ repoUrl: url, localPath: clonePath.trim() })).unwrap();
            setShowCloneModal(false);
            setClonePath('');
            setCloneError(null);
        } catch (error) {
            setCloneError(error as string);
        }
    };

    const handleOpenInBrowser = (repo: GitHubRepository) => {
        dispatch(openRepositoryInBrowser(repo.html_url));
    };

    const getLanguageColor = (language: string) => {
        const colors: Record<string, string> = {
            'TypeScript': 'bg-blue-500',
            'JavaScript': 'bg-yellow-500',
            'Python': 'bg-green-500',
            'Java': 'bg-orange-500',
            'Go': 'bg-cyan-500',
            'C#': 'bg-purple-500',
            'PHP': 'bg-indigo-500',
            'Ruby': 'bg-red-500',
            'Swift': 'bg-orange-400',
            'Kotlin': 'bg-purple-400',
        };
        return colors[language] || 'bg-gray-500';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatFileSize = (size: string) => {
        return size.replace('MB', ' MB').replace('KB', ' KB').replace('GB', ' GB');
    };

    if (loading && repositories.length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Loading repositories...</h3>
                    <p className="mt-2 text-sm text-gray-500">Fetching your GitHub repositories</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-gray-50">
            {/* Repository List */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Repositories</h1>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Refresh repositories"
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
                            <button
                                onClick={() => setShowCloneModal(true)}
                                disabled={!selectedRepository}
                                className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Clone
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Search repositories..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
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
                            <option value="all">All repos</option>
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => dispatch(setSortBy(e.target.value as any))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="updated">Last updated</option>
                            <option value="created">Recently created</option>
                            <option value="name">Name</option>
                            <option value="stars">Most stars</option>
                        </select>
                    </div>

                    {/* Repository count and last updated */}
                    <div className="text-sm text-gray-500">
                        {filteredRepositories.length} {filteredRepositories.length === 1 ? 'repository' : 'repositories'}
                        {lastUpdated && (
                            <span className="block mt-1">
                                Updated {formatDate(lastUpdated)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Repository List */}
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
                        {filteredRepositories.map((repo) => (
                            <button
                                key={repo.id}
                                onClick={() => handleSelectRepository(repo)}
                                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                                    selectedRepository?.id === repo.id
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-medium text-gray-900 truncate">{repo.name}</h3>
                                            {repo.private && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                    Private
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{repo.description || 'No description available'}</p>
                                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                            {repo.language && (
                                                <div className="flex items-center space-x-1">
                                                    <span className={`w-3 h-3 rounded-full ${getLanguageColor(repo.language)}`}></span>
                                                    <span>{repo.language}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span>{repo.stargazers_count}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7a2 2 0 010-2.828l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                <span>{repo.forks_count}</span>
                                            </div>
                                            <span>Updated {formatDate(repo.updated_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {filteredRepositories.length === 0 && !loading && (
                            <div className="text-center py-8">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <h3 className="mt-4 text-sm font-medium text-gray-900">No repositories found</h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    {searchTerm ? 'Try adjusting your search or filters' : 'No repositories available'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Repository Details */}
            <div className="flex-1 flex flex-col">
                {selectedRepository ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedRepository.name}</h2>
                                        {selectedRepository.private && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                Private
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-600 mb-4">{selectedRepository.description || 'No description available'}</p>
                                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                                        {selectedRepository.language && (
                                            <div className="flex items-center space-x-1">
                                                <span className={`w-3 h-3 rounded-full ${getLanguageColor(selectedRepository.language)}`}></span>
                                                <span>{selectedRepository.language}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center space-x-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            <span>{selectedRepository.stargazers_count} stars</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7a2 2 0 010-2.828l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            <span>{selectedRepository.forks_count} forks</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            <span>{selectedRepository.open_issues_count} issues</span>
                                        </div>
                                        <div>
                                            Updated {formatDate(selectedRepository.updated_at)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowCloneModal(true)}
                                        disabled={cloning[selectedRepository.name]}
                                        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center"
                                    >
                                        {cloning[selectedRepository.name] && (
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        {cloning[selectedRepository.name] ? 'Cloning...' : 'Clone'}
                                    </button>
                                    <button 
                                        onClick={() => handleOpenInBrowser(selectedRepository)}
                                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        View on GitHub
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Repository Content */}
                        <div className="flex-1 p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Repository Info */}
                                <div className="space-y-6">
                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Repository Details</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Full Name:</span>
                                                <span className="text-sm font-medium">{selectedRepository.full_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Default Branch:</span>
                                                <span className="text-sm font-medium">{selectedRepository.default_branch}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Visibility:</span>
                                                <span className="text-sm font-medium">{selectedRepository.private ? 'Private' : 'Public'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Language:</span>
                                                <span className="text-sm font-medium">{selectedRepository.language || 'Not specified'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Created:</span>
                                                <span className="text-sm font-medium">{formatDate(selectedRepository.created_at)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Last Push:</span>
                                                <span className="text-sm font-medium">{formatDate(selectedRepository.pushed_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Analytics */}
                                    {analytics[selectedRepository.name] && (
                                        <div className="card">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Repository Analytics</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">Total Commits:</span>
                                                    <span className="text-sm font-medium">{analytics[selectedRepository.name].totalCommits}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">Contributors:</span>
                                                    <span className="text-sm font-medium">{analytics[selectedRepository.name].contributors}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">File Count:</span>
                                                    <span className="text-sm font-medium">{analytics[selectedRepository.name].fileCount}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">Repository Size:</span>
                                                    <span className="text-sm font-medium">{formatFileSize(analytics[selectedRepository.name].size)}</span>
                                                </div>
                                            </div>

                                            {/* Language breakdown */}
                                            <div className="mt-4">
                                                <h4 className="text-sm font-medium text-gray-900 mb-2">Language Breakdown</h4>
                                                <div className="space-y-2">
                                                    {Object.entries(analytics[selectedRepository.name].languages).map(([lang, percentage]) => (
                                                        <div key={lang} className="flex items-center">
                                                            <span className={`w-3 h-3 rounded-full ${getLanguageColor(lang)} mr-2`}></span>
                                                            <span className="text-xs text-gray-600 flex-1">{lang}</span>
                                                            <span className="text-xs text-gray-500">{percentage}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Clone URLs</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">HTTPS</label>
                                                <div className="flex">
                                                    <input
                                                        type="text"
                                                        value={selectedRepository.clone_url}
                                                        readOnly
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                                                    />
                                                    <button 
                                                        onClick={() => navigator.clipboard.writeText(selectedRepository.clone_url)}
                                                        className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">SSH</label>
                                                <div className="flex">
                                                    <input
                                                        type="text"
                                                        value={selectedRepository.ssh_url}
                                                        readOnly
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                                                    />
                                                    <button 
                                                        onClick={() => navigator.clipboard.writeText(selectedRepository.ssh_url)}
                                                        className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-6">
                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => setShowCloneModal(true)}
                                                disabled={cloning[selectedRepository.name]}
                                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50"
                                            >
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-sm font-medium">
                                                        {cloning[selectedRepository.name] ? 'Cloning Repository...' : 'Clone Repository'}
                                                    </span>
                                                </div>
                                            </button>

                                            <button 
                                                onClick={() => handleOpenInBrowser(selectedRepository)}
                                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                                            >
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    <span className="text-sm font-medium">Open in GitHub</span>
                                                </div>
                                            </button>

                                            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="text-sm font-medium">Configure Webhooks</span>
                                                </div>
                                            </button>

                                            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                    <span className="text-sm font-medium">View Workflows</span>
                                                </div>
                                            </button>
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Select a repository</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose a repository from the sidebar to view its details and manage settings</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Clone Modal */}
            {showCloneModal && selectedRepository && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Clone Repository</h3>
                            <p className="text-sm text-gray-500 mt-1">{selectedRepository.full_name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {cloneError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-sm">{cloneError}</p>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Clone Method</label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="https"
                                            checked={cloneMethod === 'https'}
                                            onChange={(e) => setCloneMethod(e.target.value as 'https' | 'ssh')}
                                            className="mr-2"
                                        />
                                        HTTPS
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="ssh"
                                            checked={cloneMethod === 'ssh'}
                                            onChange={(e) => setCloneMethod(e.target.value as 'https' | 'ssh')}
                                            className="mr-2"
                                        />
                                        SSH
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Local Path</label>
                                <input
                                    type="text"
                                    value={clonePath}
                                    onChange={(e) => setClonePath(e.target.value)}
                                    placeholder="e.g., C:\projects\my-repo"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm text-gray-600">
                                    <strong>Repository URL:</strong><br />
                                    {cloneMethod === 'https' ? selectedRepository.clone_url : selectedRepository.ssh_url}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowCloneModal(false);
                                    setCloneError(null);
                                    setClonePath('');
                                }}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCloneRepository}
                                disabled={!clonePath.trim() || cloning[selectedRepository.name]}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                            >
                                {cloning[selectedRepository.name] && (
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {cloning[selectedRepository.name] ? 'Cloning...' : 'Clone Repository'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
