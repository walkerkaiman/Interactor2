import { useState, useEffect, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import { apiService } from './api';
import { AppState, UIState } from './types';
import { InteractionConfig } from '@interactor/shared';

import Sidebar from './components/Sidebar';
import NodeEditor from './components/NodeEditor';
import Toolbar from './components/Toolbar';
import SettingsPanel from './components/SettingsPanel';
import TriggerPanel from './components/TriggerPanel';
import Notification from './components/Notification';

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

  // UI state
  const [uiState, setUIState] = useState<UIState>({
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

  // Handle interaction updates
  const handleInteractionsUpdate = useCallback((interactions: InteractionConfig[]) => {
    setAppState(prev => ({ ...prev, interactions }));
  }, []);

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

  return (
    <div className={styles.app}>
      <ReactFlowProvider>
        {/* Main layout */}
        <div className={styles.layout}>
          {/* Sidebar */}
          {uiState.sidebarOpen && (
            <Sidebar
              modules={appState.modules}
              onClose={toggleSidebar}
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
            <NodeEditor
              interactions={appState.interactions}
              modules={appState.modules}
              onNodeSelect={handleNodeSelect}
              onInteractionsUpdate={handleInteractionsUpdate}
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

export default App; 