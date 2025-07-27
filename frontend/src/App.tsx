
import { Toaster } from 'sonner';
import { TopBar } from './components/common/TopBar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RealTimeNotifications } from './components/common/RealTimeNotifications';
import { ModuleEditorTab } from './components/tabs/ModuleEditorTab';
import { WikiTab } from './components/tabs/WikiTab';
import { ConsoleTab } from './components/tabs/ConsoleTab';
import { PerformanceDashboardTab } from './components/tabs/PerformanceDashboardTab';
import { useWebSocket } from './hooks/useWebSocket';
import { useActiveTab } from './store';

function App() {
  // Initialize WebSocket connection
  useWebSocket();
  
  const activeTab = useActiveTab();

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
      <div className="h-screen flex flex-col bg-bg-primary text-text-primary overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary opacity-50" />
          <div className="relative z-10 h-full">
            {renderTabContent()}
          </div>
        </main>
        
        <RealTimeNotifications />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            className: 'font-sans',
            style: {
              background: 'rgba(17, 17, 17, 0.95)',
              color: '#fafafa',
              border: '1px solid #262626',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3), 0 6px 6px rgba(0, 0, 0, 0.6)',
            },
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App; 