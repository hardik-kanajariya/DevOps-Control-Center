import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from '../../views/Dashboard';
import Workflows from '../../views/Workflows';
import Repositories from '../../views/Repositories';
import Servers from '../../views/Servers';
import Pipelines from '../../views/Pipelines';
import Settings from '../../views/Settings';
import Monitoring from '../../views/Monitoring';
import Docker from '../../views/Docker';
import Database from '../../views/Database';
import AutoUpdater from '../AutoUpdater';

export default function MainLayout() {
    const [currentView, setCurrentView] = useState<string>('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard onNavigate={setCurrentView} />;
            case 'repositories':
                return <Repositories />;
            case 'workflows':
                return <Workflows />;
            case 'pipelines':
                return <Pipelines />;
            case 'servers':
                return <Servers />;
            case 'monitoring':
                return <Monitoring />;
            case 'docker':
                return <Docker />;
            case 'database':
                return <Database />;
            case 'settings':
                return <Settings />;
            default:
                return <Dashboard onNavigate={setCurrentView} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar
                currentView={currentView}
                onViewChange={setCurrentView}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                />

                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    {renderView()}
                </main>
            </div>

            {/* Auto-updater component */}
            <AutoUpdater />
        </div>
    );
}
