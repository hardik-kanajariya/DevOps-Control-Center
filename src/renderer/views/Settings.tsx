import { useState } from 'react';

interface Settings {
    general: {
        theme: 'light' | 'dark' | 'system';
        autoLaunch: boolean;
        minimizeToTray: boolean;
        notifications: boolean;
    };
    github: {
        defaultBranch: string;
        autoFetch: boolean;
        fetchInterval: number;
    };
    deployment: {
        defaultEnvironment: 'development' | 'staging' | 'production';
        confirmDeployments: boolean;
        maxConcurrentJobs: number;
    };
    security: {
        requireAuth: boolean;
        sessionTimeout: number;
        encryptLogs: boolean;
    };
}

const defaultSettings: Settings = {
    general: {
        theme: 'light',
        autoLaunch: false,
        minimizeToTray: true,
        notifications: true,
    },
    github: {
        defaultBranch: 'main',
        autoFetch: true,
        fetchInterval: 300,
    },
    deployment: {
        defaultEnvironment: 'development',
        confirmDeployments: true,
        maxConcurrentJobs: 3,
    },
    security: {
        requireAuth: true,
        sessionTimeout: 3600,
        encryptLogs: true,
    },
};

export default function Settings() {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [activeTab, setActiveTab] = useState<keyof Settings>('general');
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    const updateSetting = <T extends keyof Settings, K extends keyof Settings[T]>(
        section: T,
        key: K,
        value: Settings[T][K]
    ) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value,
            },
        }));
        setUnsavedChanges(true);
    };

    const handleSave = () => {
        // In real implementation, would save via IPC
        console.log('Saving settings:', settings);
        setUnsavedChanges(false);
    };

    const handleReset = () => {
        setSettings(defaultSettings);
        setUnsavedChanges(true);
    };

    const tabs: { key: keyof Settings; label: string; icon: string }[] = [
        { key: 'general', label: 'General', icon: '⚙️' },
        { key: 'github', label: 'GitHub', icon: '🐙' },
        { key: 'deployment', label: 'Deployment', icon: '🚀' },
        { key: 'security', label: 'Security', icon: '🔒' },
    ];

    return (
        <div className="flex h-full bg-gray-50">
            {/* Settings Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                </div>
                <nav className="p-4">
                    <div className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <span className="mr-3">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>
            </div>

            {/* Settings Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab} Settings</h2>
                            <p className="text-gray-600 mt-1">Configure your {activeTab} preferences</p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Reset to Defaults
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!unsavedChanges}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                    {unsavedChanges && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex">
                                <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-yellow-800">You have unsaved changes. Don't forget to save!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Settings Form */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-2xl">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="card">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                                            <select
                                                value={settings.general.theme}
                                                onChange={(e) => updateSetting('general', 'theme', e.target.value as Settings['general']['theme'])}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            >
                                                <option value="light">Light</option>
                                                <option value="dark">Dark</option>
                                                <option value="system">System</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="card">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Behavior</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-gray-900">Auto Launch</label>
                                                <p className="text-sm text-gray-500">Start DevOps Control Center when system boots</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.general.autoLaunch}
                                                    onChange={(e) => updateSetting('general', 'autoLaunch', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-gray-900">Minimize to Tray</label>
                                                <p className="text-sm text-gray-500">Keep running in system tray when minimized</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.general.minimizeToTray}
                                                    onChange={(e) => updateSetting('general', 'minimizeToTray', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-gray-900">Notifications</label>
                                                <p className="text-sm text-gray-500">Show desktop notifications for important events</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.general.notifications}
                                                    onChange={(e) => updateSetting('general', 'notifications', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'github' && (
                            <div className="space-y-6">
                                <div className="card">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Repository Settings</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Branch</label>
                                            <input
                                                type="text"
                                                value={settings.github.defaultBranch}
                                                onChange={(e) => updateSetting('github', 'defaultBranch', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            />
                                            <p className="text-sm text-gray-500 mt-1">Default branch name for new repositories</p>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-gray-900">Auto Fetch</label>
                                                <p className="text-sm text-gray-500">Automatically fetch repository updates</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.github.autoFetch}
                                                    onChange={(e) => updateSetting('github', 'autoFetch', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        {settings.github.autoFetch && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Fetch Interval (seconds)</label>
                                                <input
                                                    type="number"
                                                    min="60"
                                                    max="3600"
                                                    value={settings.github.fetchInterval}
                                                    onChange={(e) => updateSetting('github', 'fetchInterval', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'deployment' && (
                            <div className="space-y-6">
                                <div className="card">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Deployment Preferences</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Environment</label>
                                            <select
                                                value={settings.deployment.defaultEnvironment}
                                                onChange={(e) => updateSetting('deployment', 'defaultEnvironment', e.target.value as Settings['deployment']['defaultEnvironment'])}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            >
                                                <option value="development">Development</option>
                                                <option value="staging">Staging</option>
                                                <option value="production">Production</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-gray-900">Confirm Deployments</label>
                                                <p className="text-sm text-gray-500">Require confirmation before deploying</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.deployment.confirmDeployments}
                                                    onChange={(e) => updateSetting('deployment', 'confirmDeployments', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Jobs</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={settings.deployment.maxConcurrentJobs}
                                                onChange={(e) => updateSetting('deployment', 'maxConcurrentJobs', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            />
                                            <p className="text-sm text-gray-500 mt-1">Maximum number of concurrent deployment jobs</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <div className="card">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication & Security</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-gray-900">Require Authentication</label>
                                                <p className="text-sm text-gray-500">Require GitHub authentication to use the app</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.security.requireAuth}
                                                    onChange={(e) => updateSetting('security', 'requireAuth', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>

                                        {settings.security.requireAuth && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (seconds)</label>
                                                <input
                                                    type="number"
                                                    min="300"
                                                    max="86400"
                                                    value={settings.security.sessionTimeout}
                                                    onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                />
                                                <p className="text-sm text-gray-500 mt-1">Automatically logout after this period of inactivity</p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-gray-900">Encrypt Logs</label>
                                                <p className="text-sm text-gray-500">Encrypt application logs for security</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.security.encryptLogs}
                                                    onChange={(e) => updateSetting('security', 'encryptLogs', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="card">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Danger Zone</h3>
                                    <div className="space-y-4">
                                        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                                            <h4 className="text-sm font-medium text-red-900 mb-2">Clear All Data</h4>
                                            <p className="text-sm text-red-700 mb-3">
                                                This will remove all stored data including authentication tokens, cached repositories, and application settings.
                                            </p>
                                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                                                Clear All Data
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
