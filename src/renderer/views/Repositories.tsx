import { useState } from 'react';

// Mock repository data
const mockRepositories = [
    {
        id: 1,
        name: 'awesome-web-app',
        full_name: 'user/awesome-web-app',
        description: 'A modern web application built with React and Node.js',
        private: false,
        language: 'TypeScript',
        stars: 142,
        forks: 28,
        updated_at: '2024-08-14T10:30:00Z',
        default_branch: 'main',
        clone_url: 'https://github.com/user/awesome-web-app.git',
        ssh_url: 'git@github.com:user/awesome-web-app.git'
    },
    {
        id: 2,
        name: 'api-service',
        full_name: 'user/api-service',
        description: 'RESTful API service with PostgreSQL database',
        private: true,
        language: 'Python',
        stars: 89,
        forks: 12,
        updated_at: '2024-08-13T15:45:00Z',
        default_branch: 'main',
        clone_url: 'https://github.com/user/api-service.git',
        ssh_url: 'git@github.com:user/api-service.git'
    },
    {
        id: 3,
        name: 'mobile-client',
        full_name: 'user/mobile-client',
        description: 'Cross-platform mobile app built with React Native',
        private: false,
        language: 'JavaScript',
        stars: 67,
        forks: 18,
        updated_at: '2024-08-12T09:20:00Z',
        default_branch: 'develop',
        clone_url: 'https://github.com/user/mobile-client.git',
        ssh_url: 'git@github.com:user/mobile-client.git'
    }
];

export default function Repositories() {
    const [repositories] = useState(mockRepositories);
    const [selectedRepo, setSelectedRepo] = useState<typeof mockRepositories[0] | null>(null);
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [clonePath, setClonePath] = useState('');
    const [cloneMethod, setCloneMethod] = useState<'https' | 'ssh'>('https');

    const handleSelectRepository = (repo: typeof mockRepositories[0]) => {
        setSelectedRepo(repo);
    };

    const handleCloneRepository = () => {
        if (selectedRepo && clonePath) {
            const url = cloneMethod === 'https' ? selectedRepo.clone_url : selectedRepo.ssh_url;
            // In real implementation, would trigger clone via IPC
            console.log(`Cloning ${url} to ${clonePath}`);
            setShowCloneModal(false);
            setClonePath('');
        }
    };

    const getLanguageColor = (language: string) => {
        const colors: Record<string, string> = {
            'TypeScript': 'bg-blue-500',
            'JavaScript': 'bg-yellow-500',
            'Python': 'bg-green-500',
            'Java': 'bg-orange-500',
            'Go': 'bg-cyan-500',
        };
        return colors[language] || 'bg-gray-500';
    };

    return (
        <div className="flex h-full bg-gray-50">
            {/* Repository List */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">Repositories</h1>
                        <button
                            onClick={() => setShowCloneModal(true)}
                            disabled={!selectedRepo}
                            className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Clone
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search repositories..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {repositories.map((repo) => (
                            <button
                                key={repo.id}
                                onClick={() => handleSelectRepository(repo)}
                                className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedRepo?.id === repo.id
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
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{repo.description}</p>
                                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                            <div className="flex items-center space-x-1">
                                                <span className={`w-3 h-3 rounded-full ${getLanguageColor(repo.language)}`}></span>
                                                <span>{repo.language}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span>{repo.stars}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7a2 2 0 010-2.828l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                <span>{repo.forks}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Repository Details */}
            <div className="flex-1 flex flex-col">
                {selectedRepo ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedRepo.name}</h2>
                                        {selectedRepo.private && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                Private
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-600 mb-4">{selectedRepo.description}</p>
                                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                                        <div className="flex items-center space-x-1">
                                            <span className={`w-3 h-3 rounded-full ${getLanguageColor(selectedRepo.language)}`}></span>
                                            <span>{selectedRepo.language}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            <span>{selectedRepo.stars} stars</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7a2 2 0 010-2.828l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            <span>{selectedRepo.forks} forks</span>
                                        </div>
                                        <div>
                                            Updated {new Date(selectedRepo.updated_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowCloneModal(true)}
                                        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                    >
                                        Clone
                                    </button>
                                    <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
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
                                                <span className="text-sm font-medium">{selectedRepo.full_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Default Branch:</span>
                                                <span className="text-sm font-medium">{selectedRepo.default_branch}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Visibility:</span>
                                                <span className="text-sm font-medium">{selectedRepo.private ? 'Private' : 'Public'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Language:</span>
                                                <span className="text-sm font-medium">{selectedRepo.language}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Clone URLs</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">HTTPS</label>
                                                <div className="flex">
                                                    <input
                                                        type="text"
                                                        value={selectedRepo.clone_url}
                                                        readOnly
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                                                    />
                                                    <button className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors">
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
                                                        value={selectedRepo.ssh_url}
                                                        readOnly
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                                                    />
                                                    <button className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002 2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
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
                                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                                            >
                                                <div className="flex items-center">
                                                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-sm font-medium">Clone Repository</span>
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-3H5m14 6H5" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Select a repository</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose a repository from the sidebar to view its details and manage settings</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Clone Modal */}
            {showCloneModal && selectedRepo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Clone Repository</h3>
                            <p className="text-sm text-gray-500 mt-1">{selectedRepo.full_name}</p>
                        </div>
                        <div className="p-6 space-y-4">
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
                                    {cloneMethod === 'https' ? selectedRepo.clone_url : selectedRepo.ssh_url}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCloneModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCloneRepository}
                                disabled={!clonePath}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Clone Repository
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
