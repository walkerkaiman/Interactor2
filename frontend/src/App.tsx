import React from 'react';
import { Toaster } from 'sonner';
import { TopBar } from './components/common/TopBar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ModuleEditorTab } from './components/tabs/ModuleEditorTab';
import { WikiTab } from './components/tabs/WikiTab';
import { ConsoleTab } from './components/tabs/ConsoleTab';
import { PerformanceDashboardTab } from './components/tabs/PerformanceDashboardTab';
import { useWebSocket } from './hooks/useWebSocket';
import { useActiveTab } from './store';
import { useAppActions } from './store';
import { RealTimeNotifications } from './components/common/RealTimeNotifications';

function App() {
  // Initialize WebSocket connection
  useWebSocket();
  
  const activeTab = useActiveTab();
  const { loadModules, loadSystemStats, loadLogs } = useAppActions();

  // Load initial data
  React.useEffect(() => {
    loadModules();
    loadSystemStats();
    loadLogs();
  }, [loadModules, loadSystemStats, loadLogs]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'editor':
        return <ModuleEditorTab />;
      case 'wiki':
        return <WikiTab />;
      case 'console':
        return <ConsoleTab />;
      case 'dashboard':
        return <PerformanceDashboardTab />;
      default:
        return <ModuleEditorTab />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50">
        <TopBar />
        
        <main className="flex-1 overflow-hidden">
          {renderTabContent()}
        </main>
        
        <RealTimeNotifications />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid #374151'
            }
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App; 