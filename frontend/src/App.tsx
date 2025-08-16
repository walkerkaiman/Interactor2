import { useState, useCallback, useMemo, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import Sidebar from './components/Sidebar';
import NodeEditor from './components/NodeEditor';
import Toolbar from './components/Toolbar';
import SettingsPanel from './components/SettingsPanel';
import TriggerPanel from './components/TriggerPanel';
import Notification from './components/Notification';
import WikisPage from './components/WikisPage';
import PerformancePage from './components/PerformancePage';
import ConsolePage from './components/ConsolePage';
import { apiService } from './api';
import { useBackendSync } from './state/useBackendSync';
import { useUnregisteredChanges } from './state/useUnregisteredChanges';


import { 
  UIState, 
  AppPage, 
  WikisPageState, 
  PerformancePageState, 
  ConsolePageState, 
  ModulesPageState 
} from './types';
import { InteractionConfig } from '@interactor/shared';

import styles from './App.module.css';

function App() {
  // Backend sync
  const { modules, interactions: backendInteractions, settings, refresh } = useBackendSync();
  // Persistent client id for origin filtering
  useEffect(() => {
    try {
      const key = 'interactorClientId';
      let id = localStorage.getItem(key);
      if (!id && (window as any).crypto?.randomUUID) {
        id = (window as any).crypto.randomUUID();
        if (id) localStorage.setItem(key, id);
      }
    } catch {}
  }, []);
  
  // Local interactions state for unregistered changes
  const [localInteractions, setLocalInteractions] = useState<InteractionConfig[]>([]);
  
  // The canvas renders exactly what we intend to register: local draft if present, else backend
  const interactions = useMemo(() => (localInteractions.length > 0 ? localInteractions : backendInteractions), [backendInteractions, localInteractions]);
  
  // Unregistered changes management
  const { hasChanges, clearAllChanges, applyChangesToInteractions } = useUnregisteredChanges();
  
  // Registration state
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);
  




  // UI state
  const [uiState, setUIState] = useState<UIState>({
    sidebarOpen: true,
    settingsPanelOpen: false,
    triggerPanelOpen: false,
    currentPage: 'modules',
    pageStates: {
      modules: {
        selectedNodeId: null,
        zoom: 1,
        pan: { x: 0, y: 0 },
      },
      wikis: {
        selectedModule: null,
        wikiContent: '',
        loading: false,
      },
      performance: {
        stats: null,
        loading: true,
        error: null,
        lastRefresh: null,
      },
      console: {
        logs: [],
        loading: true,
        error: null,
        autoScroll: true,
        filterLevel: 'all',
        lastRefresh: null,
      },
    },
  });







  // Handle registration
  const handleRegister = useCallback(async () => {
    setIsRegistering(true);
    setLastError(null);
    setLastSuccess(null);

    try {
      // Apply unregistered changes to interactions before registering
      const interactionsWithChanges = applyChangesToInteractions(interactions);
      // Keep the current draft visible to avoid flicker while backend refresh completes
      setLocalInteractions(interactionsWithChanges);
      const clientId = (() => {
        try { return localStorage.getItem('interactorClientId') || undefined; } catch { return undefined; }
      })();
      await apiService.registerInteractions(interactionsWithChanges, clientId);
      // Refresh structural state from backend, then clear local draft only if backend is non-empty
      const refreshed = await refresh();
      if ((refreshed?.interactions?.length || 0) > 0) {
        clearAllChanges();
        setLocalInteractions([]);
      } else {
        console.warn('Refresh returned empty interactions; preserving local draft to avoid flicker');
      }
      setLastSuccess('Interactions registered successfully!');
    } catch (error) {
      setLastError(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  }, [interactions, applyChangesToInteractions, clearAllChanges, refresh]);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setUIState(prev => ({
      ...prev,
      pageStates: {
        ...prev.pageStates,
        modules: { ...prev.pageStates.modules, selectedNodeId: nodeId }
      }
    }));
  }, []);



  // Handle settings updates
  const handleSettingsUpdate = useCallback(async (key: string, value: any) => {
    try {
      await apiService.updateSetting(key, value);
    } catch (error) {
      setLastError(`Failed to update setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Handle interactions updates (for new modules)
  const handleInteractionsUpdate = useCallback((updatedInteractions: InteractionConfig[]) => {
    setLocalInteractions(updatedInteractions);
  }, []);

  // Clear notifications
  const clearNotification = useCallback(() => {
    setLastError(null);
    setLastSuccess(null);
  }, []);

  // Toggle UI panels
  const toggleSidebar = useCallback(() => {
    setUIState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const toggleSettingsPanel = useCallback(() => {
    setUIState(prev => ({ ...prev, settingsPanelOpen: !prev.settingsPanelOpen }));
  }, []);

  const toggleTriggerPanel = useCallback(() => {
    setUIState(prev => ({ ...prev, triggerPanelOpen: !prev.triggerPanelOpen }));
  }, []);

  // Handle page changes
  const handlePageChange = useCallback((page: AppPage) => {
    setUIState(prev => ({ ...prev, currentPage: page }));
  }, []);



  // Handle page state updates
  const updateWikisPageState = useCallback((updates: Partial<WikisPageState>) => {
    setUIState(prev => ({
      ...prev,
      pageStates: {
        ...prev.pageStates,
        wikis: { ...prev.pageStates.wikis, ...updates },
      },
    }));
  }, []);

  const updatePerformancePageState = useCallback((updates: Partial<PerformancePageState>) => {
    setUIState(prev => ({
      ...prev,
      pageStates: {
        ...prev.pageStates,
        performance: { ...prev.pageStates.performance, ...updates },
      },
    }));
  }, []);

  const updateConsolePageState = useCallback((updates: Partial<ConsolePageState>) => {
    setUIState(prev => ({
      ...prev,
      pageStates: {
        ...prev.pageStates,
        console: { ...prev.pageStates.console, ...updates },
      },
    }));
  }, []);

  const updateModulesPageState = useCallback((updates: Partial<ModulesPageState>) => {
    setUIState(prev => ({
      ...prev,
      pageStates: {
        ...prev.pageStates,
        modules: { ...prev.pageStates.modules, ...updates },
      },
    }));
  }, []);



  return (
    <div className={styles.app}>
      <ReactFlowProvider>
        {/* Main layout */}
        <div className={styles.layout}>
          {/* Sidebar */}
          {uiState.sidebarOpen && (
            <Sidebar
              modules={modules}
              currentPage={uiState.currentPage}
              onPageChange={handlePageChange}
            />
          )}

          {/* Main content */}
          <div className={styles.mainContent}>
            {/* Toolbar */}
            <Toolbar
              onRegister={handleRegister}
              isRegistering={isRegistering}
              onToggleSidebar={toggleSidebar}
              onToggleSettings={toggleSettingsPanel}
              onToggleTrigger={toggleTriggerPanel}
              sidebarOpen={uiState.sidebarOpen}
              hasUnregisteredChanges={hasChanges}
            />

            {/* Page Content */}
            {uiState.currentPage === 'modules' && (
              <NodeEditor
                interactions={interactions}
                modules={modules}
                selectedNodeId={uiState.pageStates.modules.selectedNodeId}
                onNodeSelect={(nodeId) => {
                  handleNodeSelect(nodeId);
                  updateModulesPageState({ selectedNodeId: nodeId });
                }}
                onInteractionsUpdate={handleInteractionsUpdate}
              />
            )}
            
            {uiState.currentPage === 'wikis' && (
              <WikisPage 
                modules={modules}
                state={uiState.pageStates.wikis}
                onStateUpdate={updateWikisPageState}
              />
            )}
            
            {uiState.currentPage === 'performance' && (
              <PerformancePage 
                state={uiState.pageStates.performance}
                onStateUpdate={updatePerformancePageState}
              />
            )}
            
            {uiState.currentPage === 'console' && (
              <ConsolePage 
                state={uiState.pageStates.console}
                onStateUpdate={updateConsolePageState}
              />
            )}
          </div>

                      {/* Settings Panel */}
            {uiState.settingsPanelOpen && (
              <SettingsPanel
                settings={settings}
                onUpdate={handleSettingsUpdate}
                onClose={toggleSettingsPanel}
              />
            )}

                      {/* Trigger Panel */}
            {uiState.triggerPanelOpen && (
              <TriggerPanel
                interactions={interactions}
                onClose={toggleTriggerPanel}
              />
            )}
        </div>

        {/* Notifications */}
        {(lastError || lastSuccess) && (
          <Notification
            type={lastError ? 'error' : 'success'}
            message={lastError || lastSuccess || ''}
            onClose={clearNotification}
          />
        )}
      </ReactFlowProvider>
    </div>
  );
}

export default App; 