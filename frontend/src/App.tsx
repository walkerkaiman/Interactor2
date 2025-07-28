import { useState, useEffect, useCallback } from 'react';
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
import { triggerEventTracker } from './utils/triggerEventTracker';
import { 
  AppState, 
  UIState, 
  AppPage, 
  WikisPageState, 
  PerformancePageState, 
  ConsolePageState, 
  ModulesPageState 
} from './types';
import { InteractionConfig } from '@interactor/shared';
import { edgeRegistrationTracker } from './utils/edgeRegistrationTracker';
import { webSocketService } from './services/WebSocketService';

import styles from './App.module.css';

function App() {
  // Application state
  const [appState, setAppState] = useState<AppState>({
    modules: [],
    interactions: [],
    settings: {},
    selectedNodeId: null,
    isRegistering: false,
    lastError: null,
    lastSuccess: null,
  });

  // Local state for unregistered interactions
  const [localInteractions, setLocalInteractions] = useState<InteractionConfig[]>([]);
  const [registeredInteractions, setRegisteredInteractions] = useState<InteractionConfig[]>([]);
  const [originalRegisteredIds, setOriginalRegisteredIds] = useState<Set<string>>(new Set());

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

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:3001');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'state_update') {
            // Update module instances with real-time data
            const moduleInstances = message.data.moduleInstances || [];
            if (moduleInstances.length > 0) {
              setRegisteredInteractions(prev => {
                return prev.map(interaction => ({
                  ...interaction,
                  modules: interaction.modules?.map(module => {
                    // Find matching module instance update
                    const instanceUpdate = moduleInstances.find((instance: any) => instance.id === module.id);
                    if (instanceUpdate) {
                      return {
                        ...module,
                        ...instanceUpdate, // Merge in the real-time data
                      };
                    }
                    return module;
                  }) || []
                }));
              });
            }

            // Only update registered interactions if we're not in the middle of local changes
            // This prevents WebSocket updates from interfering with drag and drop operations
            const newRegisteredInteractions = message.data.interactions || [];
            const newOriginalIds = new Set<string>(newRegisteredInteractions.map((i: InteractionConfig) => i.id));
            
            // Only update if the registered interactions have actually changed
            // and we're not in the middle of local operations
            setRegisteredInteractions((prev: InteractionConfig[]) => {
              // Check if the interactions have actually changed
              const prevIds = new Set(prev.map((i: InteractionConfig) => i.id));
              const newIds = new Set(newRegisteredInteractions.map((i: InteractionConfig) => i.id));
              
              if (prevIds.size !== newIds.size || 
                  !Array.from(prevIds).every(id => newIds.has(id))) {
                return newRegisteredInteractions;
              }
              
              // If no change, preserve current state to prevent unnecessary re-renders
              return prev;
            });
            
            setOriginalRegisteredIds(newOriginalIds);
          } else if (message.type === 'trigger_event') {
            // Handle trigger events from backend
            const { moduleId, type } = message.data;
            console.log(`Received trigger event for module ${moduleId} of type ${type}`);
            
            // Record the trigger event to trigger pulse animation
            triggerEventTracker.recordTriggerEvent(moduleId, type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        // Attempt to reconnect after a delay
        setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          connectWebSocket();
        }, 1000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      return ws;
    };
    
    const ws = connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);



  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Cleanup WebSocket service on unmount
  useEffect(() => {
    return () => {
      webSocketService.shutdown();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [modules, interactions, settings] = await Promise.all([
        apiService.getModules(),
        apiService.getInteractions(),
        apiService.getSettings(),
      ]);

      setAppState(prev => ({
        ...prev,
        modules,
        settings,
      }));
      
      // Only update registered interactions, preserve local ones
      setRegisteredInteractions(interactions);
      
      // Track the original registered interaction IDs
      const originalIds = new Set(interactions.map(interaction => interaction.id));
      setOriginalRegisteredIds(originalIds);
      
      // Update edge registration tracker on initial load only
      edgeRegistrationTracker.updateFromInteractions(interactions, localInteractions);
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        lastError: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  };

  // Handle registration
  const handleRegister = useCallback(async () => {
    setAppState(prev => ({ ...prev, isRegistering: true, lastError: null, lastSuccess: null }));

    try {
      // Combine local and registered interactions for registration
      const allInteractions = [...localInteractions, ...registeredInteractions];
      await apiService.registerInteractions(allInteractions);
      
      // Move local interactions to registered after successful registration
      setRegisteredInteractions(prev => [...prev, ...localInteractions]);
      setLocalInteractions([]);
      
      // Update original registered IDs to include the newly registered interactions
      setOriginalRegisteredIds(prev => {
        const newSet = new Set(prev);
        localInteractions.forEach(interaction => newSet.add(interaction.id));
        return newSet;
      });
      
      // Update edge registration tracker after registration - all interactions are now registered
      const allRegisteredInteractions = [...registeredInteractions, ...localInteractions];
      edgeRegistrationTracker.updateFromInteractions(allRegisteredInteractions, []);
      
      setAppState(prev => ({
        ...prev,
        isRegistering: false,
        lastSuccess: 'Interactions registered successfully!',
      }));
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        isRegistering: false,
        lastError: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  }, [localInteractions, registeredInteractions]);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setAppState(prev => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  // Handle interaction updates (local changes)
  const handleInteractionsUpdate = useCallback((interactions: InteractionConfig[]) => {
    
    // Determine which interactions are local vs registered based on original IDs
    const local: InteractionConfig[] = [];
    const registered: InteractionConfig[] = [];
    
    interactions.forEach(interaction => {
      // Check if this interaction was originally loaded from backend
      const isRegistered = originalRegisteredIds.has(interaction.id);
      
      if (isRegistered) {
        registered.push(interaction);
      } else {
        local.push(interaction);
      }
    });
    
    // Update local interactions with any new local changes
    setLocalInteractions(local);
    setRegisteredInteractions(registered);
    
    // Update edge registration tracker - but preserve individual edge registration states
    // Don't call updateFromInteractions here as it would override individual edge states
    // Instead, let the tracker maintain its current state for existing edges
  }, [originalRegisteredIds]);

  // Handle settings updates
  const handleSettingsUpdate = useCallback(async (key: string, value: any) => {
    try {
      await apiService.updateSetting(key, value);
      setAppState(prev => ({
        ...prev,
        settings: { ...prev.settings, [key]: value },
      }));
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        lastError: `Failed to update setting: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  }, []);

  // Clear notifications
  const clearNotification = useCallback(() => {
    setAppState(prev => ({ ...prev, lastError: null, lastSuccess: null }));
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
  }, [uiState.currentPage]);

  // Compute all interactions (local + registered)
  const allInteractions = [...localInteractions, ...registeredInteractions];

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
              modules={appState.modules}
              currentPage={uiState.currentPage}
              onPageChange={handlePageChange}
            />
          )}

          {/* Main content */}
          <div className={styles.mainContent}>
            {/* Toolbar */}
            <Toolbar
              onRegister={handleRegister}
              isRegistering={appState.isRegistering}
              onToggleSidebar={toggleSidebar}
              onToggleSettings={toggleSettingsPanel}
              onToggleTrigger={toggleTriggerPanel}
              sidebarOpen={uiState.sidebarOpen}
            />

            {/* Page Content */}
            {uiState.currentPage === 'modules' && (
              <NodeEditor
                interactions={allInteractions}
                modules={appState.modules}
                selectedNodeId={uiState.pageStates.modules.selectedNodeId}
                onNodeSelect={(nodeId) => {
                  handleNodeSelect(nodeId);
                  updateModulesPageState({ selectedNodeId: nodeId });
                }}
                onInteractionsChange={handleInteractionsUpdate}
              />
            )}
            
            {uiState.currentPage === 'wikis' && (
              <WikisPage 
                modules={appState.modules}
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
              settings={appState.settings}
              onUpdate={handleSettingsUpdate}
              onClose={toggleSettingsPanel}
            />
          )}

          {/* Trigger Panel */}
          {uiState.triggerPanelOpen && (
            <TriggerPanel
              interactions={allInteractions}
              onClose={toggleTriggerPanel}
            />
          )}
        </div>

        {/* Notifications */}
        {(appState.lastError || appState.lastSuccess) && (
          <Notification
            type={appState.lastError ? 'error' : 'success'}
            message={appState.lastError || appState.lastSuccess || ''}
            onClose={clearNotification}
          />
        )}
      </ReactFlowProvider>
    </div>
  );
}

export default App; 