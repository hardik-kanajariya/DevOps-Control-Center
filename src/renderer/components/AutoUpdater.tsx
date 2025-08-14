import { useState, useEffect } from 'react';

interface UpdateInfo {
    version: string;
    releaseDate?: string;
    releaseName?: string;
    releaseNotes?: string;
}

interface DownloadProgress {
    percent: number;
    bytesPerSecond: number;
    total: number;
    transferred: number;
}

export default function AutoUpdater() {
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
    const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Get current version
        getCurrentVersion();

        // Set up event listeners
        const removeListeners = setupEventListeners();

        return () => {
            removeListeners();
        };
    }, []);

    const getCurrentVersion = async () => {
        try {
            const response = await window.electronAPI.updater.getCurrentVersion();
            if (response.success) {
                setCurrentVersion(response.data.version);
            }
        } catch (error) {
            console.error('Failed to get current version:', error);
        }
    };

    const setupEventListeners = () => {
        const handleUpdateChecking = () => {
            setIsChecking(true);
            setError(null);
        };

        const handleUpdateAvailable = (info: UpdateInfo) => {
            setIsChecking(false);
            setUpdateAvailable(info);
        };

        const handleUpdateNotAvailable = () => {
            setIsChecking(false);
            setUpdateAvailable(null);
        };

        const handleDownloadProgress = (progress: DownloadProgress) => {
            setDownloadProgress(progress);
        };

        const handleUpdateDownloaded = (info: UpdateInfo) => {
            setIsDownloading(false);
            setDownloadProgress(null);
            setUpdateDownloaded(info);
        };

        const handleUpdateError = (errorInfo: { message: string; stack?: string }) => {
            setIsChecking(false);
            setIsDownloading(false);
            setError(errorInfo.message);
        };

        // Register listeners
        window.electronAPI.on('updater:update-checking', handleUpdateChecking);
        window.electronAPI.on('updater:update-available', handleUpdateAvailable);
        window.electronAPI.on('updater:update-not-available', handleUpdateNotAvailable);
        window.electronAPI.on('updater:update-download-progress', handleDownloadProgress);
        window.electronAPI.on('updater:update-downloaded', handleUpdateDownloaded);
        window.electronAPI.on('updater:update-error', handleUpdateError);

        // Return cleanup function
        return () => {
            window.electronAPI.removeAllListeners('updater:update-checking');
            window.electronAPI.removeAllListeners('updater:update-available');
            window.electronAPI.removeAllListeners('updater:update-not-available');
            window.electronAPI.removeAllListeners('updater:update-download-progress');
            window.electronAPI.removeAllListeners('updater:update-downloaded');
            window.electronAPI.removeAllListeners('updater:update-error');
        };
    };

    const checkForUpdates = async () => {
        try {
            setError(null);
            const response = await window.electronAPI.updater.checkForUpdates();
            if (!response.success) {
                setError(response.error);
            }
        } catch (error: any) {
            setError(error.message);
        }
    };

    const downloadUpdate = async () => {
        try {
            setIsDownloading(true);
            setError(null);
            const response = await window.electronAPI.updater.downloadUpdate();
            if (!response.success) {
                setError(response.error);
                setIsDownloading(false);
            }
        } catch (error: any) {
            setError(error.message);
            setIsDownloading(false);
        }
    };

    const installUpdate = async () => {
        try {
            const response = await window.electronAPI.updater.installUpdate();
            if (!response.success) {
                setError(response.error);
            }
        } catch (error: any) {
            setError(error.message);
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSecond: number): string => {
        return formatBytes(bytesPerSecond) + '/s';
    };

    // Don't render anything if no update available and not checking
    if (!updateAvailable && !updateDownloaded && !isChecking && !error) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
            {/* Checking for updates */}
            {isChecking && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
                    <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                        <div>
                            <h4 className="text-sm font-medium text-blue-900">Checking for Updates</h4>
                            <p className="text-xs text-blue-700">Please wait...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Update available */}
            {updateAvailable && !updateDownloaded && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h4 className="text-sm font-medium text-green-900">Update Available</h4>
                            <p className="text-xs text-green-700 mt-1">
                                Version {updateAvailable.version} is available
                            </p>
                            {updateAvailable.releaseName && (
                                <p className="text-xs text-green-600 mt-1">{updateAvailable.releaseName}</p>
                            )}
                            <div className="mt-3 flex space-x-2">
                                <button
                                    onClick={downloadUpdate}
                                    disabled={isDownloading}
                                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isDownloading ? 'Downloading...' : 'Download'}
                                </button>
                                <button
                                    onClick={() => setUpdateAvailable(null)}
                                    className="text-xs bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Download progress */}
            {downloadProgress && isDownloading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
                    <div className="flex items-start">
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-900">Downloading Update</h4>
                            <div className="mt-2">
                                <div className="bg-blue-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${downloadProgress.percent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-1 text-xs text-blue-700">
                                    <span>{Math.round(downloadProgress.percent)}%</span>
                                    <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                    {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Update downloaded */}
            {updateDownloaded && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 shadow-lg">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h4 className="text-sm font-medium text-purple-900">Update Ready</h4>
                            <p className="text-xs text-purple-700 mt-1">
                                Version {updateDownloaded.version} is ready to install
                            </p>
                            <div className="mt-3 flex space-x-2">
                                <button
                                    onClick={installUpdate}
                                    className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                                >
                                    Restart & Install
                                </button>
                                <button
                                    onClick={() => setUpdateDownloaded(null)}
                                    className="text-xs bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h4 className="text-sm font-medium text-red-900">Update Error</h4>
                            <p className="text-xs text-red-700 mt-1">{error}</p>
                            <div className="mt-3">
                                <button
                                    onClick={() => setError(null)}
                                    className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual check button */}
            <div className="mt-4">
                <button
                    onClick={checkForUpdates}
                    disabled={isChecking}
                    className="w-full text-xs bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
                >
                    {isChecking ? 'Checking...' : 'Check for Updates'}
                </button>
                <div className="text-center text-xs text-gray-500 mt-1">
                    Current: v{currentVersion}
                </div>
            </div>
        </div>
    );
}
