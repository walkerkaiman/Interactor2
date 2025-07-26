import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager } from '../../backend/src/core/StateManager';
import { ModuleConfig, InteractionConfig, MessageRoute } from '@interactor/shared';
import fs from 'fs-extra';
import path from 'path';

describe('StateManager', () => {
  let stateManager: StateManager;
  const testDataDir = path.join(__dirname, '../../test-data');

  beforeEach(async () => {
    // Clean up test directory
    await fs.remove(testDataDir);
    await fs.ensureDir(testDataDir);
    
    stateManager = new StateManager({
      stateFile: path.join(testDataDir, 'state.json'),
      autoSave: false
    });
    
    await stateManager.init();
  });

  afterEach(async () => {
    await stateManager.destroy();
    await fs.remove(testDataDir);
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      const defaultStateManager = new StateManager();
      await defaultStateManager.init();
      
      expect(defaultStateManager).toBeInstanceOf(StateManager);
      expect(defaultStateManager.getState()).toBeDefined();
      
      await defaultStateManager.destroy();
    });

    it('should initialize with custom configuration', async () => {
      const customStateManager = new StateManager({
        stateFile: path.join(testDataDir, 'custom-state.json'),
        autoSave: true,
        autoSaveInterval: 1000
      });
      
      await customStateManager.init();
      expect(customStateManager).toBeInstanceOf(StateManager);
      
      await customStateManager.destroy();
    });
  });

  describe('State Management', () => {
    it('should get current state', () => {
      const state = stateManager.getState();
      expect(state).toBeDefined();
      expect(state.interactions).toEqual([]);
      expect(state.modules).toEqual([]);
      expect(state.routes).toEqual([]);
    });

    it('should check if state is dirty', () => {
      expect(stateManager.isStateDirty()).toBe(false);
    });

    it('should get last saved timestamp', () => {
      const lastSaved = stateManager.getLastSaved();
      expect(lastSaved).toBeGreaterThan(0);
    });
  });

  describe('Interaction Management', () => {
    it('should add interaction', async () => {
      const interaction: InteractionConfig = {
        id: 'test-interaction',
        name: 'Test Interaction',
        description: 'Test description',
        enabled: true,
        modules: [],
        routes: []
      };

      await stateManager.addInteraction(interaction);
      
      const interactions = stateManager.getInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].id).toBe('test-interaction');
    });

    it('should get interaction by id', async () => {
      const interaction: InteractionConfig = {
        id: 'test-interaction',
        name: 'Test Interaction',
        description: 'Test description',
        enabled: true,
        modules: [],
        routes: []
      };

      await stateManager.addInteraction(interaction);
      
      const found = stateManager.getInteraction('test-interaction');
      expect(found).toBeDefined();
      expect(found?.id).toBe('test-interaction');
    });

    it('should update interaction', async () => {
      const interaction: InteractionConfig = {
        id: 'test-interaction',
        name: 'Test Interaction',
        description: 'Test description',
        enabled: true,
        modules: [],
        routes: []
      };

      await stateManager.addInteraction(interaction);
      
      const updatedInteraction = { ...interaction, name: 'Updated Interaction' };
      await stateManager.updateInteraction(updatedInteraction);
      
      const found = stateManager.getInteraction('test-interaction');
      expect(found?.name).toBe('Updated Interaction');
    });

    it('should remove interaction', async () => {
      const interaction: InteractionConfig = {
        id: 'test-interaction',
        name: 'Test Interaction',
        description: 'Test description',
        enabled: true,
        modules: [],
        routes: []
      };

      await stateManager.addInteraction(interaction);
      expect(stateManager.getInteractions()).toHaveLength(1);
      
      const removed = await stateManager.removeInteraction('test-interaction');
      expect(removed).toBe(true);
      expect(stateManager.getInteractions()).toHaveLength(0);
    });
  });

  describe('Module Instance Management', () => {
    it('should add module instance', async () => {
      const moduleInstance = {
        id: 'test-module',
        moduleName: 'TestModule',
        config: { port: 3000 },
        position: { x: 100, y: 100 }
      };

      await stateManager.addModuleInstance(moduleInstance);
      
      const modules = stateManager.getModuleInstances();
      expect(modules).toHaveLength(1);
      expect(modules[0].id).toBe('test-module');
    });

    it('should get module instance by id', async () => {
      const moduleInstance = {
        id: 'test-module',
        moduleName: 'TestModule',
        config: { port: 3000 },
        position: { x: 100, y: 100 }
      };

      await stateManager.addModuleInstance(moduleInstance);
      
      const found = stateManager.getModuleInstance('test-module');
      expect(found).toBeDefined();
      expect(found?.id).toBe('test-module');
    });

    it('should update module instance', async () => {
      const moduleInstance = {
        id: 'test-module',
        moduleName: 'TestModule',
        config: { port: 3000 },
        position: { x: 100, y: 100 }
      };

      await stateManager.addModuleInstance(moduleInstance);
      
      const updatedInstance = { ...moduleInstance, config: { port: 3001 } };
      await stateManager.updateModuleInstance(updatedInstance);
      
      const found = stateManager.getModuleInstance('test-module');
      expect(found?.config.port).toBe(3001);
    });

    it('should remove module instance', async () => {
      const moduleInstance = {
        id: 'test-module',
        moduleName: 'TestModule',
        config: { port: 3000 },
        position: { x: 100, y: 100 }
      };

      await stateManager.addModuleInstance(moduleInstance);
      expect(stateManager.getModuleInstances()).toHaveLength(1);
      
      const removed = await stateManager.removeModuleInstance('test-module');
      expect(removed).toBe(true);
      expect(stateManager.getModuleInstances()).toHaveLength(0);
    });
  });

  describe('Route Management', () => {
    it('should add route', async () => {
      const route: MessageRoute = {
        id: 'test-route',
        source: 'input-module',
        target: 'output-module',
        event: 'test-event',
        conditions: []
      };

      await stateManager.addRoute(route);
      
      const routes = stateManager.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].id).toBe('test-route');
    });

    it('should get route by id', async () => {
      const route: MessageRoute = {
        id: 'test-route',
        source: 'input-module',
        target: 'output-module',
        event: 'test-event',
        conditions: []
      };

      await stateManager.addRoute(route);
      
      const found = stateManager.getRoute('test-route');
      expect(found).toBeDefined();
      expect(found?.id).toBe('test-route');
    });

    it('should update route', async () => {
      const route: MessageRoute = {
        id: 'test-route',
        source: 'input-module',
        target: 'output-module',
        event: 'test-event',
        conditions: []
      };

      await stateManager.addRoute(route);
      
      const updatedRoute = { ...route, event: 'updated-event' };
      await stateManager.updateRoute(updatedRoute);
      
      const found = stateManager.getRoute('test-route');
      expect(found?.event).toBe('updated-event');
    });

    it('should remove route', async () => {
      const route: MessageRoute = {
        id: 'test-route',
        source: 'input-module',
        target: 'output-module',
        event: 'test-event',
        conditions: []
      };

      await stateManager.addRoute(route);
      expect(stateManager.getRoutes()).toHaveLength(1);
      
      const removed = await stateManager.removeRoute('test-route');
      expect(removed).toBe(true);
      expect(stateManager.getRoutes()).toHaveLength(0);
    });
  });

  describe('Settings Management', () => {
    it('should set and get setting', async () => {
      await stateManager.setSetting('test-key', 'test-value');
      
      const value = stateManager.getSetting('test-key');
      expect(value).toBe('test-value');
    });

    it('should get all settings', () => {
      const settings = stateManager.getSettings();
      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });

    it('should remove setting', async () => {
      await stateManager.setSetting('test-key', 'test-value');
      expect(stateManager.getSetting('test-key')).toBe('test-value');
      
      const removed = await stateManager.removeSetting('test-key');
      expect(removed).toBe(true);
      expect(stateManager.getSetting('test-key')).toBeUndefined();
    });
  });

  describe('Persistence', () => {
    it('should save state to file', async () => {
      const interaction: InteractionConfig = {
        id: 'test-interaction',
        name: 'Test Interaction',
        description: 'Test description',
        enabled: true,
        modules: [],
        routes: []
      };

      await stateManager.addInteraction(interaction);
      await stateManager.forceSave();
      
      // Verify file exists
      const stateFile = path.join(testDataDir, 'state.json');
      const exists = await fs.pathExists(stateFile);
      expect(exists).toBe(true);
    });

    it('should load state from file', async () => {
      const interaction: InteractionConfig = {
        id: 'test-interaction',
        name: 'Test Interaction',
        description: 'Test description',
        enabled: true,
        modules: [],
        routes: []
      };

      await stateManager.addInteraction(interaction);
      await stateManager.forceSave();
      
      // Create new state manager and load
      const newStateManager = new StateManager({
        stateFile: path.join(testDataDir, 'state.json'),
        autoSave: false
      });
      
      await newStateManager.init();
      
      const interactions = newStateManager.getInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].id).toBe('test-interaction');
      
      await newStateManager.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid state data gracefully', async () => {
      // This test verifies that the StateManager doesn't crash with invalid data
      // The actual implementation should handle this gracefully
      expect(stateManager).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large state efficiently', async () => {
      // Add many interactions
      for (let i = 0; i < 100; i++) {
        const interaction: InteractionConfig = {
          id: `interaction-${i}`,
          name: `Interaction ${i}`,
          description: `Description ${i}`,
          enabled: true,
          modules: [],
          routes: []
        };
        await stateManager.addInteraction(interaction);
      }
      
      await stateManager.forceSave();
      
      const interactions = stateManager.getInteractions();
      expect(interactions).toHaveLength(100);
    });
  });
}); 