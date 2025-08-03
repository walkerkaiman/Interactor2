import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

import { 
  AppState, 
  UIState, 
  AppPage, 
  WikisPageState, 
  PerformancePageState, 
  ConsolePageState, 
  ModulesPageState 
} from './types';
import { ModuleManifest } from '@interactor/shared';
import { InteractionConfig } from '@interactor/shared';

import { webSocketService } from './services/WebSocketService';

import styles from './App.module.css';

function App() {
  // Application state
  // Store a stable copy of module manifests keyed by module name
  const moduleManifestMapRef = useRef<Map<string, ModuleManifest>>(new Map());

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
  const [originalRegisteredInteractions, setOriginalRegisteredInteractions] = useState<InteractionConfig[]>([]);
  const [originalRegisteredIds, setOriginalRegisteredIds] = useState<Set<string>>(new Set());
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  // Simple state for tracking changes (removed duplicate declaration)



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

  // WebSocket connection (simplified - only for real-time data, not state changes)
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
    
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:3001');
      
      ws.onopen = () => {
        // WebSocket connected successfully
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          if (message.type === 'state_update') {
            console.log('Processing state update:', message.data);
            
            // Update module instances in app state
            setAppState(prev => {
              // Always start from the immutable manifest list stored in the ref
              const manifestMap = new Map(moduleManifestMapRef.current);
              const enrichedModules: any[] = [];

              // Merge / add runtime instances that arrived via WebSocket
              message.data.moduleInstances?.forEach((instance: any) => {
                const manifest = manifestMap.get(instance.moduleName);
                if (manifest) {
                  enrichedModules.push({ ...manifest, ...instance });
                } else {
                  // Fallback – if somehow the manifest is missing, keep the instance as-is so the UI still updates
                  enrichedModules.push(instance);
                }
              });

              // Always keep the original manifest list in case some module has no running instance yet
              const finalModules = [
                ...Array.from(manifestMap.values()),
                ...enrichedModules,
              ];

              return {
                ...prev,
                modules: finalModules,
              };
            });
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onclose = () => {
        // Attempt to reconnect after 5 seconds
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return () => {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        ws.close();
      };
    };

    connectWebSocket();
    
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
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

      // Store a copy of module manifests for later look-ups during WebSocket updates
      moduleManifestMapRef.current = new Map(modules.map(m => [m.name, m]));

      setAppState(prev => ({
        ...prev,
        modules,
        settings,
      }));
      
      // Set up interaction tracking with proper original state
      setRegisteredInteractions(interactions);
      setOriginalRegisteredInteractions(JSON.parse(JSON.stringify(interactions))); // Deep copy as immutable snapshot
      
      // Track the original registered interaction IDs
      const originalIds = new Set(interactions.map(interaction => interaction.id));
      setOriginalRegisteredIds(originalIds);
      
      setInitialDataLoaded(true);
    } catch (error) {
      console.error('App: Failed to load initial data:', error);
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
      // Edge registration now handled directly in NodeEditor
      
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
    
    // No longer need WebSocket locks since we simplified the approach
    
    // Determine which interactions are local vs registered based on original IDs
    const local: InteractionConfig[] = [];
    const registered: InteractionConfig[] = [];
    
    interactions.forEach(interaction => {
      // Check if this interaction was originally loaded from backend
      const isRegistered = originalRegisteredIds.has(interaction.id);
      
      if (isRegistered) {
        // Check if this registered interaction has been modified
        // Compare against the original interaction state from the backend
        const originalInteractionFromBackend = originalRegisteredInteractions.find(i => i.id === interaction.id);
        if (originalInteractionFromBackend) {
          const originalModuleCount = originalInteractionFromBackend.modules?.length || 0;
          const currentModuleCount = interaction.modules?.length || 0;
          const moduleCountChanged = originalModuleCount !== currentModuleCount;
          
          // Deep compare to see if anything changed, but exclude position data
          const originalWithoutPosition = JSON.parse(JSON.stringify(originalInteractionFromBackend));
          const currentWithoutPosition = JSON.parse(JSON.stringify(interaction));
          
          // Remove position data from modules for comparison
          originalWithoutPosition.modules?.forEach((module: any) => {
            delete module.position;
          });
          currentWithoutPosition.modules?.forEach((module: any) => {
            delete module.position;
          });
          
          const hasChanges = JSON.stringify(originalWithoutPosition) !== JSON.stringify(currentWithoutPosition);
          
          if (hasChanges || moduleCountChanged) {
            // Modified registered interaction should be treated as local
            local.push(interaction);
          } else {
            // Unchanged registered interaction
            registered.push(interaction);
          }
        } else {
          // This shouldn't happen, but treat as registered
          registered.push(interaction);
        }
      } else {
        // New interaction (not in originalRegisteredIds)
        // Always treat new interactions as local, regardless of originalRegisteredIds size
        local.push(interaction);
      }
    });
    
    // Update local interactions with any new local changes
    setLocalInteractions(local);
    setRegisteredInteractions(registered);
    
  }, [originalRegisteredIds, originalRegisteredInteractions, initialDataLoaded]);

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
  
  // Check if current interactions differ from registered interactions
  const hasUnregisteredChanges = useMemo(() => {
    
    // If there are local interactions, there are unregistered changes
    if (localInteractions.length > 0) {
      return true;
    }
    
    // Check if any registered interactions have been modified
    const originalRegisteredInteractions = Array.from(originalRegisteredIds).map(id => 
      registeredInteractions.find(interaction => interaction.id === id)
    ).filter(Boolean);
    
    // Compare current registered interactions with original ones
    if (originalRegisteredInteractions.length !== registeredInteractions.length) {
      return true;
    }
    
    return false;
  }, [localInteractions, registeredInteractions, originalRegisteredIds, initialDataLoaded]);
  
  // Track state changes (minimal logging)
  useEffect(() => {
    if (hasUnregisteredChanges) {
      // console.log('Unregistered changes detected'); // Removed debugging log
    }
  }, [hasUnregisteredChanges]);

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
              hasUnregisteredChanges={hasUnregisteredChanges}
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