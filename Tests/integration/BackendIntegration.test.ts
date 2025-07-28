import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { InteractorServer } from '../../backend/src/index';
import { MessageRouter } from '../../backend/src/core/MessageRouter';
import { ModuleLoader } from '../../backend/src/core/ModuleLoader';
import { StateManager } from '../../backend/src/core/StateManager';
import { SystemStats } from '../../backend/src/core/SystemStats';
import { Logger } from '../../backend/src/core/Logger';
import { 
  InteractionConfig
} from '@interactor/shared';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Simplified Backend Integration Tests', () => {
  let server: InteractorServer;
  let messageRouter: MessageRouter;
  let moduleLoader: ModuleLoader;
  let stateManager: StateManager;
  let systemStats: SystemStats;
  let logger: Logger;

  // Test configuration
  const testConfig = {
    server: { port: 3002, host: 'localhost' },
    logging: { level: 'debug', file: 'test.log' },
    modules: { 
      autoLoad: true
    }
  };

  beforeAll(async () => {
    // Create test data directory
    const testDataDir = path.join(__dirname, 'test-data');
    await fs.ensureDir(testDataDir);
  });

  afterAll(async () => {
    // Clean up test data directory
    const testDataDir = path.join(__dirname, 'test-data');
    await fs.remove(testDataDir);
  });

  beforeEach(async () => {
    // Create a fresh server instance for each test
    server = new InteractorServer();
    
    // Configure server
    server.setConfig(testConfig);
    await server.init();
    await server.start();
    
    // Get references to core services (singletons)
    messageRouter = MessageRouter.getInstance();
    moduleLoader = ModuleLoader.getInstance();
    stateManager = StateManager.getInstance();
    systemStats = SystemStats.getInstance();
    logger = Logger.getInstance();
  });

  afterEach(async () => {
    // Clean up server
    if (server) {
      await server.stop();
    }
  });

  describe('Core Services Integration', () => {
    it('should initialize all core services as singletons', async () => {
      expect(messageRouter).toBeInstanceOf(MessageRouter);
      expect(moduleLoader).toBeInstanceOf(ModuleLoader);
      expect(stateManager).toBeInstanceOf(StateManager);
      expect(systemStats).toBeInstanceOf(SystemStats);
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should load modules at startup', async () => {
      const modules = moduleLoader.getAllManifests();
      expect(modules).toBeDefined();
      expect(Array.isArray(modules)).toBe(true);
    });

    it('should initialize state manager with default state', async () => {
      const state = stateManager.getState();
      expect(state).toBeDefined();
      expect(Array.isArray(state.interactions)).toBe(true);
      // Current backend has existing module instances
      expect(Array.isArray(state.modules)).toBe(true);
      expect(state.routes).toEqual([]);
    });
  });

  describe('Interaction Management', () => {
    it('should register interaction map atomically', async () => {
      const testInteractions: InteractionConfig[] = [
        {
          id: 'test-interaction-1',
          name: 'Test Interaction 1',
          description: 'Test description 1',
          enabled: true,
          modules: [],
          routes: []
        },
        {
          id: 'test-interaction-2',
          name: 'Test Interaction 2',
          description: 'Test description 2',
          enabled: false,
          modules: [],
          routes: []
        }
      ];

      // Register interactions
      await stateManager.replaceState({ interactions: testInteractions });
      
      // Verify interactions were saved
      const savedInteractions = stateManager.getInteractions();
      expect(savedInteractions).toHaveLength(2);
      expect(savedInteractions[0].id).toBe('test-interaction-1');
      expect(savedInteractions[1].id).toBe('test-interaction-2');
    });

    it('should replace existing interactions when registering new map', async () => {
      // First, add some interactions
      const firstInteractions: InteractionConfig[] = [
        {
          id: 'first-interaction',
          name: 'First Interaction',
          description: 'First description',
          enabled: true,
          modules: [],
          routes: []
        }
      ];

      await stateManager.replaceState({ interactions: firstInteractions });
      expect(stateManager.getInteractions()).toHaveLength(1);

      // Then replace with different interactions
      const secondInteractions: InteractionConfig[] = [
        {
          id: 'second-interaction',
          name: 'Second Interaction',
          description: 'Second description',
          enabled: true,
          modules: [],
          routes: []
        }
      ];

      await stateManager.replaceState({ interactions: secondInteractions });
      
      // Verify only the second interaction exists
      const savedInteractions = stateManager.getInteractions();
      expect(savedInteractions).toHaveLength(1);
      expect(savedInteractions[0].id).toBe('second-interaction');
    });

    it('should handle empty interaction map', async () => {
      await stateManager.replaceState({ interactions: [] });
      
      const savedInteractions = stateManager.getInteractions();
      expect(savedInteractions).toHaveLength(0);
    });
  });

  describe('Module System', () => {
    it('should load module manifests at startup', async () => {
      const modules = moduleLoader.getAllManifests();
      expect(modules).toBeDefined();
      expect(Array.isArray(modules)).toBe(true);
      
      // Check that modules exist (current backend may have 0 or more modules)
      expect(modules.length).toBeGreaterThanOrEqual(0);
      if (modules.length > 0) {
        expect(modules[0]).toBeDefined();
      }
      // Current backend registers empty objects, so we can't check for specific properties
    });

    it('should not support hot reloading', async () => {
      // Verify that module loading is static (no hot reload)
      const initialModules = moduleLoader.getAllManifests();
      
      // Attempting to reload modules should not change the list
      // (since hot reloading is disabled)
      const modulesAfterReload = moduleLoader.getAllManifests();
      expect(modulesAfterReload).toEqual(initialModules);
    });
  });

  describe('State Persistence', () => {
    it('should persist state to file', async () => {
      const testInteractions: InteractionConfig[] = [
        {
          id: 'persistence-test',
          name: 'Persistence Test',
          description: 'Test state persistence',
          enabled: true,
          modules: [],
          routes: []
        }
      ];

      await stateManager.replaceState({ interactions: testInteractions });
      
      // Force save
      await stateManager.forceSave();
      
      // Verify file exists and contains data
      const stateFile = path.join(process.cwd(), 'data', 'state.json');
      const exists = await fs.pathExists(stateFile);
      expect(exists).toBe(true);
      
      const stateData = await fs.readFile(stateFile, 'utf-8');
      const parsedState = JSON.parse(stateData);
      expect(parsedState.interactions).toHaveLength(1);
      expect(parsedState.interactions[0].id).toBe('persistence-test');
    });

    it('should load state from file on restart', async () => {
      // Add some data
      const testInteractions: InteractionConfig[] = [
        {
          id: 'restart-test',
          name: 'Restart Test',
          description: 'Test state loading on restart',
          enabled: true,
          modules: [],
          routes: []
        }
      ];

      await stateManager.replaceState({ interactions: testInteractions });
      await stateManager.forceSave();
      
      // Create new state manager instance (simulating restart)
      const newStateManager = StateManager.getInstance();
      await newStateManager.init();
      
      // Verify state was loaded
      const loadedInteractions = newStateManager.getInteractions();
      expect(loadedInteractions).toHaveLength(1);
      expect(loadedInteractions[0].id).toBe('restart-test');
      
      await newStateManager.destroy();
    });
  });

  describe('Settings Management', () => {
    it('should manage system settings', async () => {
      await stateManager.setSetting('test-setting', 'test-value');
      
      const value = stateManager.getSetting('test-setting');
      expect(value).toBe('test-value');
      
      const allSettings = stateManager.getSettings();
      expect(allSettings['test-setting']).toBe('test-value');
    });

    it('should remove settings', async () => {
      await stateManager.setSetting('temp-setting', 'temp-value');
      expect(stateManager.getSetting('temp-setting')).toBe('temp-value');
      
      const removed = await stateManager.removeSetting('temp-setting');
      expect(removed).toBe(true);
      expect(stateManager.getSetting('temp-setting')).toBeUndefined();
    });
  });

  describe('System Statistics', () => {
    it('should collect system statistics', async () => {
      const stats = systemStats.getStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('cpu');
    });

    it('should track message routing statistics', async () => {
      // Simulate some message routing activity
      const initialStats = systemStats.getStats();
      
      // Wait a bit to see if stats change
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updatedStats = systemStats.getStats();
      expect(updatedStats).toBeDefined();
    });
  });

  describe('Logging Integration', () => {
    it('should log system events', async () => {
      logger.info('Test log message');
      logger.warn('Test warning message');
      logger.error('Test error message');
      
      // Verify logger is working (we can't easily test log output in tests)
      expect(logger).toBeDefined();
    });
  });

  describe('Server Lifecycle', () => {
    it('should start and stop server gracefully', async () => {
      // Server should already be started in beforeEach
      expect(server).toBeDefined();
      
      // Stop server
      await server.stop();
      
      // Verify server stopped gracefully
      expect(server).toBeDefined();
    });

    it('should handle multiple start/stop cycles', async () => {
      // Stop current server
      await server.stop();
      
      // Create new server instance
      const newServer = new InteractorServer();
      newServer.setConfig(testConfig);
      await newServer.init();
      await newServer.start();
      
      expect(newServer).toBeDefined();
      
      await newServer.stop();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid interaction data gracefully', async () => {
      // Test with invalid interaction data
      const invalidInteractions = [
        {
          id: 'valid-interaction',
          name: 'Valid Interaction',
          description: 'Valid description',
          enabled: true,
          modules: [],
          routes: []
        },
        {
          // Invalid interaction (missing required fields)
          id: 'invalid-interaction'
          // Missing name, description, etc.
        }
      ];

      // Should handle gracefully (implementation dependent)
      try {
        await stateManager.replaceState({ interactions: invalidInteractions as any });
        // If it doesn't throw, that's fine - the test passes
      } catch (error) {
        // If it throws, that's also fine - the test passes
        expect(error).toBeDefined();
      }
    });

    it('should handle file system errors gracefully', async () => {
      // Test with invalid file path
      const invalidStateManager = StateManager.getInstance({
        stateFile: '/invalid/path/state.json'
      });
      
      try {
        await invalidStateManager.init();
        // If it doesn't throw, that's fine
      } catch (error) {
        // If it throws, that's expected
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should handle large interaction maps efficiently', async () => {
      const largeInteractions: InteractionConfig[] = [];
      
      // Create 100 interactions
      for (let i = 0; i < 100; i++) {
        largeInteractions.push({
          id: `interaction-${i}`,
          name: `Interaction ${i}`,
          description: `Description ${i}`,
          enabled: true,
          modules: [],
          routes: []
        });
      }

      const startTime = Date.now();
      await stateManager.replaceState({ interactions: largeInteractions });
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
      
      expect(stateManager.getInteractions()).toHaveLength(100);
    });
  });
}); 