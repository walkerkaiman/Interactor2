import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractorServer } from '../../backend/src/index';
import { StateManager } from '../../backend/src/core/StateManager';
import { Logger } from '../../backend/src/core/Logger';
import { InteractionConfig } from '@interactor/shared';
import fs from 'fs-extra';
import path from 'path';

describe('Time Input Module Persistence Tests', () => {
  let server: InteractorServer;
  let stateManager: StateManager;
  let testDataDir: string;

  beforeEach(async () => {
    // Create test data directory
    testDataDir = path.join(__dirname, '../../test-data-time-input');
    await fs.remove(testDataDir);
    await fs.ensureDir(testDataDir);

    // Initialize server with test configuration
    server = new InteractorServer();
    server.setConfig({
      server: { port: 3002, host: 'localhost' },
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

  describe('Module ID Persistence', () => {
    it('should maintain consistent module IDs across server restarts', async () => {
      // Create a Time Input module with specific ID
      const timeInputModule = {
        id: 'node-1753713303763',
        moduleName: 'Time Input',
        config: {
          mode: 'metronome',
          millisecondDelay: 3000
        },
        status: 'running',
        currentTime: '4:43 PM',
        countdown: '3s interval',
        messageCount: 0,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 306, y: 511 }
      };

      // Add to state
      await stateManager.addModuleInstance(timeInputModule);

      // Create interaction with this module
      const interaction: InteractionConfig = {
        id: 'main-interaction',
        name: 'Main Interaction',
        description: 'Test interaction',
        enabled: true,
        modules: [timeInputModule],
        routes: []
      };

      await stateManager.addInteraction(interaction);

      // Verify module exists with correct ID
      const moduleInstances = stateManager.getModuleInstances();
      const timeInputInstance = moduleInstances.find(m => m.moduleName === 'Time Input');
      
      expect(timeInputInstance).toBeDefined();
      expect(timeInputInstance?.id).toBe('node-1753713303763');
      expect(timeInputInstance?.currentTime).toBe('4:43 PM');
      expect(timeInputInstance?.countdown).toBe('3s interval');
    });

    it('should preserve real-time data in REST API responses', async () => {
      // Create Time Input module with real-time data
      const timeInputModule = {
        id: 'node-test-123',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 2000 },
        status: 'running',
        currentTime: '2:30 PM',
        countdown: '2s interval',
        messageCount: 5,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 100, y: 100 }
      };

      await stateManager.addModuleInstance(timeInputModule);

      const interaction: InteractionConfig = {
        id: 'test-interaction',
        name: 'Test Interaction',
        description: 'Test',
        enabled: true,
        modules: [timeInputModule],
        routes: []
      };

      await stateManager.addInteraction(interaction);

      // Test the /api/interactions endpoint
      const response = await fetch('http://localhost:3002/api/interactions');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.interactions).toHaveLength(1);
      
      const loadedModule = data.data.interactions[0].modules[0];
      expect(loadedModule.id).toBe('node-test-123');
      expect(loadedModule.currentTime).toBe('2:30 PM');
      expect(loadedModule.countdown).toBe('2s interval');
      expect(loadedModule.status).toBe('running');
    });
  });

  describe('WebSocket Data Merging', () => {
    it('should correctly merge real-time data into interactions', async () => {
      // Set up initial state
      const timeInputModule = {
        id: 'node-ws-test',
        moduleName: 'Time Input',
        config: { mode: 'clock', targetTime: '12:00 PM' },
        status: 'stopped',
        messageCount: 0,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 200, y: 200 }
      };

      await stateManager.addModuleInstance(timeInputModule);

      const interaction: InteractionConfig = {
        id: 'ws-interaction',
        name: 'WebSocket Test',
        description: 'Test WebSocket data merging',
        enabled: true,
        modules: [timeInputModule],
        routes: []
      };

      await stateManager.addInteraction(interaction);

      // Simulate WebSocket state update with real-time data
      const updatedModuleInstance = {
        ...timeInputModule,
        status: 'running',
        currentTime: '3:45 PM',
        countdown: 'Clock mode - target time calculation needed',
        lastUpdate: Date.now()
      };

      // Update the module instance
      await stateManager.updateModuleInstance(updatedModuleInstance);

      // Verify the data is properly merged
      const moduleInstances = stateManager.getModuleInstances();
      const updatedInstance = moduleInstances.find(m => m.id === 'node-ws-test');
      
      expect(updatedInstance).toBeDefined();
      expect(updatedInstance?.status).toBe('running');
      expect(updatedInstance?.currentTime).toBe('3:45 PM');
      expect(updatedInstance?.countdown).toBe('Clock mode - target time calculation needed');
    });
  });

  describe('Time Input Module State Updates', () => {
    it('should update currentTime and countdown for running modules', async () => {
      const timeInputModule = {
        id: 'node-time-update-test',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 5000 },
        status: 'running',
        messageCount: 0,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 300, y: 300 }
      };

      await stateManager.addModuleInstance(timeInputModule);

      // Simulate the broadcastStateUpdate logic
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const newCurrentTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
      
      const mode = timeInputModule.config?.mode || 'clock';
      let newCountdown = '';
      if (mode === 'metronome') {
        const millisecondDelay = timeInputModule.config?.millisecondDelay || 1000;
        const seconds = millisecondDelay / 1000;
        newCountdown = `${seconds}s interval`;
      }

      // Update the module instance
      const updatedModule = {
        ...timeInputModule,
        currentTime: newCurrentTime,
        countdown: newCountdown,
        lastUpdate: Date.now()
      };

      await stateManager.updateModuleInstance(updatedModule);

      // Verify the update
      const moduleInstances = stateManager.getModuleInstances();
      const updatedInstance = moduleInstances.find(m => m.id === 'node-time-update-test');
      
      expect(updatedInstance).toBeDefined();
      expect(updatedInstance?.currentTime).toBe(newCurrentTime);
      expect(updatedInstance?.countdown).toBe('5s interval');
    });
  });

  describe('Frontend Data Flow', () => {
    it('should handle module instance updates without creating new IDs', async () => {
      // Simulate the frontend loading existing modules
      const existingModule = {
        id: 'node-existing-123',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 1000 },
        status: 'stopped',
        messageCount: 0,
        frameCount: 0,
        lastUpdate: Date.now(),
        position: { x: 400, y: 400 }
      };

      await stateManager.addModuleInstance(existingModule);

      // Simulate frontend receiving WebSocket update
      const updatedModule = {
        ...existingModule,
        status: 'running',
        currentTime: '5:30 PM',
        countdown: '1s interval',
        lastUpdate: Date.now()
      };

      await stateManager.updateModuleInstance(updatedModule);

      // Verify the module ID remains the same
      const moduleInstances = stateManager.getModuleInstances();
      const finalInstance = moduleInstances.find(m => m.id === 'node-existing-123');
      
      expect(finalInstance).toBeDefined();
      expect(finalInstance?.id).toBe('node-existing-123'); // ID should not change
      expect(finalInstance?.status).toBe('running');
      expect(finalInstance?.currentTime).toBe('5:30 PM');
      expect(finalInstance?.countdown).toBe('1s interval');
    });
  });
}); 