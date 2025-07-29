import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import Sidebar from './components/Sidebar';
import NodeEditorSimplified from './components/NodeEditor.simplified';
import Toolbar from './components/Toolbar';
import SettingsPanel from './components/SettingsPanel';
import TriggerPanel from './components/TriggerPanel';
import Notification from './components/Notification';
import { apiService } from './api';
import { triggerEventTracker } from './utils/triggerEventTracker';
import { useWebSocketSync } from './hooks/useWebSocketSync';
import { InteractionConfig, ModuleManifest } from '@interactor/shared';
import styles from './App.module.css';

interface AppState {
  modules: ModuleManifest[];
  interactions: InteractionConfig[];
  settings: Record<string, any>;
  selectedNodeId: string | null;
  isRegistering: boolean;
  lastError: string | null;
  lastSuccess: string | null;
}

function AppSimplified() {
  const [appState, setAppState] = useState<AppState>({
    modules: [],
    interactions: [],
    settings: {},
    selectedNodeId: null,
    isRegistering: false,
    lastError: null,
    lastSuccess: null,
  });

  const [uiState, setUIState] = useState({
    sidebarOpen: true,
    settingsPanelOpen: false,
    triggerPanelOpen: false,
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
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
        interactions,
        settings,
      }));
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        lastError: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  };

  // WebSocket synchronization
  useWebSocketSync({
    url: 'ws://localhost:3001',
    onInteractionsUpdate: useCallback((interactions: InteractionConfig[]) => {
      setAppState(prev => ({
        ...prev,
        interactions,
      }));
    }, []),
    onModuleUpdate: useCallback((moduleId: string, updates: any) => {
      setAppState(prev => ({
        ...prev,
        interactions: prev.interactions.map(interaction => ({
          ...interaction,
          modules: interaction.modules?.map(module =>
            module.id === moduleId
              ? { ...module, ...updates }
              : module
          ) || [],
        })),
      }));
    }, []),
    onTriggerEvent: useCallback((moduleId: string, type: string) => {
      triggerEventTracker.recordTriggerEvent(moduleId, type);
    }, []),
  });

  // Handle local interaction updates
  const handleInteractionsUpdate = useCallback((interactions: InteractionConfig[]) => {
    setAppState(prev => ({
      ...prev,
      interactions,
    }));
  }, []);

  // Handle registration
  const handleRegister = useCallback(async () => {
    setAppState(prev => ({ ...prev, isRegistering: true, lastError: null, lastSuccess: null }));

    try {
      await apiService.registerInteractions(appState.interactions);
      
      setAppState(prev => ({
        ...prev,
        isRegistering: false,
        lastSuccess: 'Interactions registered successfully!',
      }));
      
      // Reload to get updated state from server
      await loadInitialData();
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        isRegistering: false,
        lastError: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  }, [appState.interactions]);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setAppState(prev => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  // Handle settings update
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

  return (
    <div className={styles.app}>
      <ReactFlowProvider>
        <div className={styles.layout}>
          {/* Sidebar */}
          {uiState.sidebarOpen && (
            <Sidebar
              modules={appState.modules}
              currentPage="modules"
              onPageChange={() => {}}
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

            {/* Node Editor */}
            <NodeEditorSimplified
              interactions={appState.interactions}
              modules={appState.modules}
              selectedNodeId={appState.selectedNodeId}
              onNodeSelect={handleNodeSelect}
              onInteractionsChange={handleInteractionsUpdate}
            />
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
              interactions={appState.interactions}
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

export default AppSimplified;