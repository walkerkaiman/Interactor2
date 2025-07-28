import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractorServer } from '../../backend/src/index';
import { StateManager } from '../../backend/src/core/StateManager';
import { InteractionConfig } from '@interactor/shared';
import fs from 'fs-extra';
import path from 'path';

describe('WebSocket Data Flow Tests', () => {
  let server: InteractorServer;
  let stateManager: StateManager;
  let testDataDir: string;

  beforeEach(async () => {
    testDataDir = path.join(__dirname, '../../test-data-websocket');
    await fs.remove(testDataDir);
    await fs.ensureDir(testDataDir);

    server = new InteractorServer();
    server.setConfig({
      server: { port: 3003, host: 'localhost' },
      logging: { level: 'error', file: 'logs/test.log' },
      modules: { autoLoad: true }
    });

    await server.init();
    await server.start();

    stateManager = StateManager.getInstance({
      stateFile: path.join(testDataDir, 'state.json')
    });
    await stateManager.init();
  });

  afterEach(async () => {
    await server.stop();
    await fs.remove(testDataDir);
  });

  describe('WebSocket State Updates', () => {
    it('should not overwrite real-time data when interactions structure changes', async () => {
      // Set up initial state with Time Input module
      const timeInputModule = {
        id: 'node-ws-test-123',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 2000 },
        status: 'running',
        currentTime: '1:00 PM',
        countdown: '2s interval',
        messageCount: 5,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 100, y: 100 }
      };

      await stateManager.addModuleInstance(timeInputModule);

      const initialInteraction: InteractionConfig = {
        id: 'ws-interaction-1',
        name: 'WebSocket Test 1',
        description: 'Initial interaction',
        enabled: true,
        modules: [timeInputModule],
        routes: []
      };

      await stateManager.addInteraction(initialInteraction);

      // Simulate WebSocket message with updated real-time data
      const updatedModuleInstance = {
        ...timeInputModule,
        currentTime: '1:05 PM',
        countdown: '2s interval',
        messageCount: 10,
        lastUpdate: Date.now()
      };

      await stateManager.updateModuleInstance(updatedModuleInstance);

      // Verify that real-time data is preserved
      const moduleInstances = stateManager.getModuleInstances();
      const updatedInstance = moduleInstances.find(m => m.id === 'node-ws-test-123');
      
      expect(updatedInstance).toBeDefined();
      expect(updatedInstance?.currentTime).toBe('1:05 PM');
      expect(updatedInstance?.countdown).toBe('2s interval');
      expect(updatedInstance?.messageCount).toBe(10);
    });

    it('should merge real-time data into existing interactions correctly', async () => {
      // Create initial interaction with basic module data
      const basicModule = {
        id: 'node-merge-test',
        moduleName: 'Time Input',
        config: { mode: 'clock', targetTime: '12:00 PM' },
        status: 'stopped',
        messageCount: 0,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 200, y: 200 }
      };

      await stateManager.addModuleInstance(basicModule);

      const interaction: InteractionConfig = {
        id: 'merge-interaction',
        name: 'Merge Test',
        description: 'Test data merging',
        enabled: true,
        modules: [basicModule],
        routes: []
      };

      await stateManager.addInteraction(interaction);

      // Simulate WebSocket update with real-time data
      const realTimeData = {
        ...basicModule,
        status: 'running',
        currentTime: '2:30 PM',
        countdown: 'Clock mode - target time calculation needed',
        messageCount: 15,
        lastUpdate: Date.now()
      };

      await stateManager.updateModuleInstance(realTimeData);

      // Test the /api/interactions endpoint to verify merging
      const response = await fetch('http://localhost:3003/api/interactions');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.interactions).toHaveLength(1);
      
      const mergedModule = data.data.interactions[0].modules[0];
      expect(mergedModule.id).toBe('node-merge-test');
      expect(mergedModule.status).toBe('running');
      expect(mergedModule.currentTime).toBe('2:30 PM');
      expect(mergedModule.countdown).toBe('Clock mode - target time calculation needed');
      expect(mergedModule.messageCount).toBe(15);
    });
  });

  describe('Module Instance Updates', () => {
    it('should update module instances without affecting interaction structure', async () => {
      const moduleInstance = {
        id: 'node-update-test',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 1000 },
        status: 'stopped',
        messageCount: 0,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 300, y: 300 }
      };

      await stateManager.addModuleInstance(moduleInstance);

      const interaction: InteractionConfig = {
        id: 'update-interaction',
        name: 'Update Test',
        description: 'Test module updates',
        enabled: true,
        modules: [moduleInstance],
        routes: []
      };

      await stateManager.addInteraction(interaction);

      // Update the module instance
      const updatedInstance = {
        ...moduleInstance,
        status: 'running',
        currentTime: '3:45 PM',
        countdown: '1s interval',
        messageCount: 25,
        lastUpdate: Date.now()
      };

      await stateManager.updateModuleInstance(updatedInstance);

      // Verify the update
      const moduleInstances = stateManager.getModuleInstances();
      const finalInstance = moduleInstances.find(m => m.id === 'node-update-test');
      
      expect(finalInstance).toBeDefined();
      expect(finalInstance?.status).toBe('running');
      expect(finalInstance?.currentTime).toBe('3:45 PM');
      expect(finalInstance?.countdown).toBe('1s interval');
      expect(finalInstance?.messageCount).toBe(25);

      // Verify interaction structure remains intact
      const interactions = stateManager.getInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].id).toBe('update-interaction');
      expect(interactions[0].modules).toHaveLength(1);
      expect(interactions[0].modules[0].id).toBe('node-update-test');
    });
  });

  describe('State Persistence Across Restarts', () => {
    it('should maintain module data across server restarts', async () => {
      // Create module with real-time data
      const moduleWithData = {
        id: 'node-persist-test',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 4000 },
        status: 'running',
        currentTime: '4:20 PM',
        countdown: '4s interval',
        messageCount: 42,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 400, y: 400 }
      };

      await stateManager.addModuleInstance(moduleWithData);

      const interaction: InteractionConfig = {
        id: 'persist-interaction',
        name: 'Persistence Test',
        description: 'Test data persistence',
        enabled: true,
        modules: [moduleWithData],
        routes: []
      };

      await stateManager.addInteraction(interaction);

      // Force save state
      await stateManager.forceSave();

      // Create new server instance (simulating restart)
      const newServer = new InteractorServer();
      newServer.setConfig({
        server: { port: 3004, host: 'localhost' },
        logging: { level: 'error', file: 'logs/test.log' },
        modules: { autoLoad: true }
      });

      await newServer.init();
      await newServer.start();

      const newStateManager = StateManager.getInstance({
        stateFile: path.join(testDataDir, 'state.json')
      });
      await newStateManager.init();

      // Verify data was preserved
      const loadedModuleInstances = newStateManager.getModuleInstances();
      const loadedInstance = loadedModuleInstances.find(m => m.id === 'node-persist-test');
      
      expect(loadedInstance).toBeDefined();
      expect(loadedInstance?.currentTime).toBe('4:20 PM');
      expect(loadedInstance?.countdown).toBe('4s interval');
      expect(loadedInstance?.status).toBe('running');
      expect(loadedInstance?.messageCount).toBe(42);

      await newServer.stop();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing module instances gracefully', async () => {
      // Create interaction without corresponding module instance
      const orphanedModule = {
        id: 'node-orphaned',
        moduleName: 'Time Input',
        config: { mode: 'clock', targetTime: '12:00 PM' },
        status: 'stopped',
        messageCount: 0,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 500, y: 500 }
      };

      const interaction: InteractionConfig = {
        id: 'orphaned-interaction',
        name: 'Orphaned Test',
        description: 'Test orphaned modules',
        enabled: true,
        modules: [orphanedModule],
        routes: []
      };

      await stateManager.addInteraction(interaction);

      // Test /api/interactions endpoint with orphaned module
      const response = await fetch('http://localhost:3003/api/interactions');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.interactions).toHaveLength(1);
      
      // Should return the original module data without real-time updates
      const orphanedModuleData = data.data.interactions[0].modules[0];
      expect(orphanedModuleData.id).toBe('node-orphaned');
      expect(orphanedModuleData.status).toBe('stopped');
      // Should not have real-time data since no module instance exists
      expect(orphanedModuleData.currentTime).toBeUndefined();
      expect(orphanedModuleData.countdown).toBeUndefined();
    });
  });
}); 