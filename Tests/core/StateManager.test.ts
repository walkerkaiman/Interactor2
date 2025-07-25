import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager } from '@/core/StateManager';
import { SystemState, ModuleConfig, InteractionConfig } from '@interactor/shared';
import fs from 'fs-extra';
import path from 'path';

describe('StateManager', () => {
  let stateManager: StateManager;
  const testStateDir = path.join(__dirname, '../../test-state');

  beforeEach(async () => {
    // Clean up test directory
    await fs.remove(testStateDir);
    await fs.ensureDir(testStateDir);
    
    stateManager = new StateManager({
      stateFile: path.join(testStateDir, 'state.json'),
      backupDir: path.join(testStateDir, 'backups'),
      autoSaveInterval: 1000,
      maxBackups: 5
    });
  });

  afterEach(async () => {
    await stateManager.shutdown();
    await fs.remove(testStateDir);
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      const defaultManager = new StateManager();
      expect(defaultManager).toBeInstanceOf(StateManager);
      await defaultManager.shutdown();
    });

    it('should initialize with custom configuration', async () => {
      const customManager = new StateManager({
        stateFile: path.join(testStateDir, 'custom-state.json'),
        backupDir: path.join(testStateDir, 'custom-backups'),
        autoSaveInterval: 5000,
        maxBackups: 10
      });
      expect(customManager).toBeInstanceOf(StateManager);
      await customManager.shutdown();
    });

    it('should initialize successfully', async () => {
      await expect(stateManager.init()).resolves.not.toThrow();
      const state = await stateManager.getState();
      expect(state).toBeDefined();
    });

    it('should create state file if it does not exist', async () => {
      await stateManager.init();
      
      const stateFileExists = await fs.pathExists(path.join(testStateDir, 'state.json'));
      expect(stateFileExists).toBe(true);
    });
  });

  describe('State Loading', () => {
    it('should load existing state from file', async () => {
      const existingState: SystemState = {
        modules: {
          'test-module': {
            id: 'test-module',
            name: 'Test Module',
            type: 'input',
            enabled: true,
            config: { testProperty: 'test value' }
          }
        },
        interactions: {
          'test-interaction': {
            id: 'test-interaction',
            name: 'Test Interaction',
            enabled: true,
            triggers: [],
            actions: []
          }
        },
        routes: [],
        settings: {
          server: { port: 3000 },
          logging: { level: 'info' },
          modules: { autoLoad: true },
          interactions: { autoStart: false },
          security: { enabled: false }
        }
      };

      await fs.writeJson(path.join(testStateDir, 'state.json'), existingState);
      
      await stateManager.init();
      
      const loadedState = await stateManager.getState();
      expect(loadedState.modules['test-module']).toBeDefined();
      expect(loadedState.modules['test-module'].name).toBe('Test Module');
    });

    it('should handle corrupted state file gracefully', async () => {
      // Write invalid JSON
      await fs.writeFile(path.join(testStateDir, 'state.json'), 'invalid json content');
      
      await expect(stateManager.init()).resolves.not.toThrow();
      
      const state = await stateManager.getState();
      expect(state).toBeDefined();
      expect(state.modules).toEqual({});
    });

    it('should handle missing state file', async () => {
      await expect(stateManager.init()).resolves.not.toThrow();
      
      const state = await stateManager.getState();
      expect(state).toBeDefined();
      expect(state.modules).toEqual({});
    });
  });

  describe('State Updates', () => {
    it('should update state successfully', async () => {
      await stateManager.init();
      
      const newState: SystemState = {
        modules: {
          'new-module': {
            id: 'new-module',
            name: 'New Module',
            type: 'output',
            enabled: true,
            config: { outputProperty: 'output value' }
          }
        },
        interactions: {},
        routes: [],
        settings: {
          server: { port: 3000 },
          logging: { level: 'info' },
          modules: { autoLoad: true },
          interactions: { autoStart: false },
          security: { enabled: false }
        }
      };

      await stateManager.setState(newState);
      
      const updatedState = await stateManager.getState();
      expect(updatedState.modules['new-module']).toBeDefined();
      expect(updatedState.modules['new-module'].name).toBe('New Module');
    });

    it('should handle concurrent state updates', async () => {
      await stateManager.init();
      
      const updatePromises = [];
      
      for (let i = 0; i < 10; i++) {
        const stateUpdate = {
          modules: {
            [`module-${i}`]: {
              id: `module-${i}`,
              name: `Module ${i}`,
              type: 'input' as const,
              enabled: true,
              config: { index: i }
            }
          },
          interactions: {},
          routes: [],
          settings: {
            server: { port: 3000 },
            logging: { level: 'info' },
            modules: { autoLoad: true },
            interactions: { autoStart: false },
            security: { enabled: false }
          }
        };
        
        updatePromises.push(stateManager.setState(stateUpdate));
      }

      await Promise.all(updatePromises);
      
      const finalState = await stateManager.getState();
      expect(Object.keys(finalState.modules).length).toBeGreaterThan(0);
    });

    it('should update specific state sections', async () => {
      await stateManager.init();
      
      // Update modules
      await stateManager.updateModules({
        'test-module': {
          id: 'test-module',
          name: 'Test Module',
          type: 'input',
          enabled: true,
          config: { testProperty: 'test value' }
        }
      });
      
      let state = await stateManager.getState();
      expect(state.modules['test-module']).toBeDefined();
      
      // Update interactions
      await stateManager.updateInteractions({
        'test-interaction': {
          id: 'test-interaction',
          name: 'Test Interaction',
          enabled: true,
          triggers: [],
          actions: []
        }
      });
      
      state = await stateManager.getState();
      expect(state.interactions['test-interaction']).toBeDefined();
      
      // Update settings
      await stateManager.updateSettings({
        server: { port: 8080 },
        logging: { level: 'debug' },
        modules: { autoLoad: false },
        interactions: { autoStart: true },
        security: { enabled: true }
      });
      
      state = await stateManager.getState();
      expect(state.settings.server.port).toBe(8080);
      expect(state.settings.logging.level).toBe('debug');
    });
  });

  describe('State Persistence', () => {
    it('should save state to file', async () => {
      await stateManager.init();
      
      const testState: SystemState = {
        modules: {
          'persist-test': {
            id: 'persist-test',
            name: 'Persist Test',
            type: 'input',
            enabled: true,
            config: { persistProperty: 'persist value' }
          }
        },
        interactions: {},
        routes: [],
        settings: {
          server: { port: 3000 },
          logging: { level: 'info' },
          modules: { autoLoad: true },
          interactions: { autoStart: false },
          security: { enabled: false }
        }
      };

      await stateManager.setState(testState);
      await stateManager.save();
      
      // Verify file was written
      const savedContent = await fs.readJson(path.join(testStateDir, 'state.json'));
      expect(savedContent.modules['persist-test']).toBeDefined();
      expect(savedContent.modules['persist-test'].name).toBe('Persist Test');
    });

    it('should handle save errors gracefully', async () => {
      await stateManager.init();
      
      // Create a state manager with invalid file path
      const invalidManager = new StateManager({
        stateFile: '/invalid/path/state.json',
        backupDir: path.join(testStateDir, 'backups'),
        autoSaveInterval: 1000,
        maxBackups: 5
      });
      
      await invalidManager.init();
      
      const testState: SystemState = {
        modules: {},
        interactions: {},
        routes: [],
        settings: {
          server: { port: 3000 },
          logging: { level: 'info' },
          modules: { autoLoad: true },
          interactions: { autoStart: false },
          security: { enabled: false }
        }
      };

      // Should not throw error
      await expect(invalidManager.setState(testState)).resolves.not.toThrow();
      await expect(invalidManager.save()).resolves.not.toThrow();
      
      await invalidManager.shutdown();
    });
  });

  describe('Auto-Save', () => {
    it('should auto-save state periodically', async () => {
      const autoSaveManager = new StateManager({
        stateFile: path.join(testStateDir, 'autosave-state.json'),
        backupDir: path.join(testStateDir, 'backups'),
        autoSaveInterval: 100, // Very short interval for testing
        maxBackups: 5
      });

      await autoSaveManager.init();
      
      const testState: SystemState = {
        modules: {
          'autosave-test': {
            id: 'autosave-test',
            name: 'AutoSave Test',
            type: 'input',
            enabled: true,
            config: { autoSaveProperty: 'auto save value' }
          }
        },
        interactions: {},
        routes: [],
        settings: {
          server: { port: 3000 },
          logging: { level: 'info' },
          modules: { autoLoad: true },
          interactions: { autoStart: false },
          security: { enabled: false }
        }
      };

      await autoSaveManager.setState(testState);
      
      // Wait for auto-save
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify file was auto-saved
      const savedContent = await fs.readJson(path.join(testStateDir, 'autosave-state.json'));
      expect(savedContent.modules['autosave-test']).toBeDefined();
      
      await autoSaveManager.shutdown();
    });

    it('should stop auto-save on shutdown', async () => {
      const autoSaveManager = new StateManager({
        stateFile: path.join(testStateDir, 'stop-autosave.json'),
        backupDir: path.join(testStateDir, 'backups'),
        autoSaveInterval: 50,
        maxBackups: 5
      });

      await autoSaveManager.init();
      await autoSaveManager.shutdown();
      
      // Should not throw error
      expect(() => autoSaveManager.shutdown()).not.toThrow();
    });
  });

  describe('Backup Management', () => {
    it('should create backups on save', async () => {
      const backupManager = new StateManager({
        stateFile: path.join(testStateDir, 'backup-state.json'),
        backupDir: path.join(testStateDir, 'backups'),
        autoSaveInterval: 1000,
        maxBackups: 3
      });

      await backupManager.init();
      
      const testState: SystemState = {
        modules: {
          'backup-test': {
            id: 'backup-test',
            name: 'Backup Test',
            type: 'input',
            enabled: true,
            config: { backupProperty: 'backup value' }
          }
        },
        interactions: {},
        routes: [],
        settings: {
          server: { port: 3000 },
          logging: { level: 'info' },
          modules: { autoLoad: true },
          interactions: { autoStart: false },
          security: { enabled: false }
        }
      };

      await backupManager.setState(testState);
      await backupManager.save();
      
      // Wait for backup creation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const backupFiles = await fs.readdir(path.join(testStateDir, 'backups'));
      expect(backupFiles.length).toBeGreaterThan(0);
      
      await backupManager.shutdown();
    });

    it('should limit number of backups', async () => {
      const limitedBackupManager = new StateManager({
        stateFile: path.join(testStateDir, 'limited-backup.json'),
        backupDir: path.join(testStateDir, 'limited-backups'),
        autoSaveInterval: 50,
        maxBackups: 2
      });

      await limitedBackupManager.init();
      
      // Create multiple saves to trigger backup rotation
      for (let i = 0; i < 5; i++) {
        const testState: SystemState = {
          modules: {
            [`backup-${i}`]: {
              id: `backup-${i}`,
              name: `Backup ${i}`,
              type: 'input',
              enabled: true,
              config: { index: i }
            }
          },
          interactions: {},
          routes: [],
          settings: {
            server: { port: 3000 },
            logging: { level: 'info' },
            modules: { autoLoad: true },
            interactions: { autoStart: false },
            security: { enabled: false }
          }
        };
        
        await limitedBackupManager.setState(testState);
        await limitedBackupManager.save();
        
        // Wait between saves
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const backupFiles = await fs.readdir(path.join(testStateDir, 'limited-backups'));
      expect(backupFiles.length).toBeLessThanOrEqual(2);
      
      await limitedBackupManager.shutdown();
    });

    it('should restore from backup', async () => {
      const restoreManager = new StateManager({
        stateFile: path.join(testStateDir, 'restore-state.json'),
        backupDir: path.join(testStateDir, 'restore-backups'),
        autoSaveInterval: 1000,
        maxBackups: 5
      });

      await restoreManager.init();
      
      const testState: SystemState = {
        modules: {
          'restore-test': {
            id: 'restore-test',
            name: 'Restore Test',
            type: 'input',
            enabled: true,
            config: { restoreProperty: 'restore value' }
          }
        },
        interactions: {},
        routes: [],
        settings: {
          server: { port: 3000 },
          logging: { level: 'info' },
          modules: { autoLoad: true },
          interactions: { autoStart: false },
          security: { enabled: false }
        }
      };

      await restoreManager.setState(testState);
      await restoreManager.save();
      
      // Wait for backup creation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const backups = await restoreManager.getBackups();
      expect(backups.length).toBeGreaterThan(0);
      
      if (backups.length > 0) {
        await restoreManager.restoreFromBackup(backups[0].path);
        
        const restoredState = await restoreManager.getState();
        expect(restoredState.modules['restore-test']).toBeDefined();
      }
      
      await restoreManager.shutdown();
    });
  });

  describe('State Events', () => {
    it('should emit state change events', async () => {
      await stateManager.init();
      
      const stateChanges: string[] = [];
      
      stateManager.on('state:changed', (section: string) => {
        stateChanges.push(section);
      });
      
      await stateManager.updateModules({
        'event-test': {
          id: 'event-test',
          name: 'Event Test',
          type: 'input',
          enabled: true,
          config: { eventProperty: 'event value' }
        }
      });
      
      expect(stateChanges).toContain('modules');
    });

    it('should emit save events', async () => {
      await stateManager.init();
      
      const saveEvents: string[] = [];
      
      stateManager.on('state:saved', (filePath: string) => {
        saveEvents.push(filePath);
      });
      
      await stateManager.save();
      
      expect(saveEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle concurrent operations gracefully', async () => {
      await stateManager.init();
      
      const operationPromises = [];
      
      for (let i = 0; i < 20; i++) {
        operationPromises.push(stateManager.getState());
        operationPromises.push(stateManager.save());
      }
      
      await Promise.all(operationPromises);
      // Should not throw errors
    });

    it('should handle invalid state data', async () => {
      await stateManager.init();
      
      // Try to set invalid state
      const invalidState = {
        modules: 'invalid modules data',
        interactions: {},
        routes: [],
        settings: {}
      } as any;
      
      // Should not throw error
      await expect(stateManager.setState(invalidState)).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large state efficiently', async () => {
      await stateManager.init();
      
      const startTime = Date.now();
      
      // Create large state
      const largeState: SystemState = {
        modules: {},
        interactions: {},
        routes: [],
        settings: {
          server: { port: 3000 },
          logging: { level: 'info' },
          modules: { autoLoad: true },
          interactions: { autoStart: false },
          security: { enabled: false }
        }
      };
      
      // Add many modules
      for (let i = 0; i < 100; i++) {
        largeState.modules[`large-module-${i}`] = {
          id: `large-module-${i}`,
          name: `Large Module ${i}`,
          type: 'input',
          enabled: true,
          config: { 
            property1: `value1-${i}`,
            property2: `value2-${i}`,
            property3: `value3-${i}`,
            property4: `value4-${i}`,
            property5: `value5-${i}`
          }
        };
      }
      
      await stateManager.setState(largeState);
      await stateManager.save();
      
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      
      const loadedState = await stateManager.getState();
      expect(Object.keys(loadedState.modules).length).toBe(100);
    });
  });
}); 