import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleLoader } from '@/core/ModuleLoader';
import { ModuleManifest, ModuleConfig, ValidationResult } from '@interactor/shared';
import fs from 'fs-extra';
import path from 'path';

// Mock modules for testing
const mockInputModule = {
  id: 'test-input',
  name: 'Test Input Module',
  type: 'input' as const,
  version: '1.0.0',
  description: 'A test input module',
  author: 'Test Author',
  config: {
    properties: {
      testProperty: {
        type: 'string',
        title: 'Test Property',
        default: 'default value'
      }
    }
  },
  events: {
    output: [
      {
        name: 'test-event',
        description: 'Test event',
        payload: {
          type: 'object',
          properties: {
            data: { type: 'string' }
          }
        }
      }
    ]
  }
};

const mockOutputModule = {
  id: 'test-output',
  name: 'Test Output Module',
  type: 'output' as const,
  version: '1.0.0',
  description: 'A test output module',
  author: 'Test Author',
  config: {
    properties: {
      outputProperty: {
        type: 'string',
        title: 'Output Property',
        default: 'output default'
      }
    }
  },
  events: {
    input: [
      {
        name: 'input-event',
        description: 'Input event',
        payload: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    ]
  }
};

describe('ModuleLoader', () => {
  let moduleLoader: ModuleLoader;
  const testModulesDir = path.join(__dirname, '../../test-modules');

  beforeEach(async () => {
    // Clean up test directory
    await fs.remove(testModulesDir);
    await fs.ensureDir(testModulesDir);
    
    moduleLoader = new ModuleLoader({
      modulesDir: testModulesDir,
      enableHotReload: false
    });
  });

  afterEach(async () => {
    await moduleLoader.shutdown();
    await fs.remove(testModulesDir);
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      const defaultLoader = new ModuleLoader();
      expect(defaultLoader).toBeInstanceOf(ModuleLoader);
      await defaultLoader.shutdown();
    });

    it('should initialize with custom configuration', async () => {
      const customLoader = new ModuleLoader({
        modulesDir: testModulesDir,
        enableHotReload: true,
        maxModules: 100
      });
      expect(customLoader).toBeInstanceOf(ModuleLoader);
      await customLoader.shutdown();
    });

    it('should initialize successfully', async () => {
      await expect(moduleLoader.init()).resolves.not.toThrow();
      expect(moduleLoader.getModules()).toEqual([]);
    });
  });

  describe('Module Discovery', () => {
    it('should discover modules in directory', async () => {
      // Create test module structure
      const inputModuleDir = path.join(testModulesDir, 'input', 'test-input');
      await fs.ensureDir(inputModuleDir);
      
      await fs.writeJson(path.join(inputModuleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(inputModuleDir, 'index.js'), 'module.exports = {};');

      await moduleLoader.init();
      
      const modules = moduleLoader.getModules();
      expect(modules).toHaveLength(1);
      expect(modules[0].id).toBe('test-input');
    });

    it('should handle concurrent module discovery', async () => {
      const discoveryPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const moduleDir = path.join(testModulesDir, 'input', `module-${i}`);
        await fs.ensureDir(moduleDir);
        
        const manifest = { ...mockInputModule, id: `module-${i}` };
        await fs.writeJson(path.join(moduleDir, 'manifest.json'), manifest);
        await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};');
        
        discoveryPromises.push(moduleLoader.discoverModules());
      }

      await moduleLoader.init();
      await Promise.all(discoveryPromises);
      
      const modules = moduleLoader.getModules();
      expect(modules.length).toBeGreaterThanOrEqual(5);
    });

    it('should skip invalid module directories', async () => {
      // Create invalid module (no manifest)
      const invalidModuleDir = path.join(testModulesDir, 'input', 'invalid-module');
      await fs.ensureDir(invalidModuleDir);
      await fs.writeFile(path.join(invalidModuleDir, 'index.js'), 'module.exports = {};');

      // Create valid module
      const validModuleDir = path.join(testModulesDir, 'input', 'valid-module');
      await fs.ensureDir(validModuleDir);
      await fs.writeJson(path.join(validModuleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(validModuleDir, 'index.js'), 'module.exports = {};');

      await moduleLoader.init();
      
      const modules = moduleLoader.getModules();
      expect(modules).toHaveLength(1);
      expect(modules[0].id).toBe('test-input');
    });
  });

  describe('Module Loading', () => {
    it('should load module successfully', async () => {
      const moduleDir = path.join(testModulesDir, 'input', 'test-input');
      await fs.ensureDir(moduleDir);
      
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};');

      await moduleLoader.init();
      
      const module = moduleLoader.getModule('test-input');
      expect(module).toBeDefined();
      expect(module?.manifest.id).toBe('test-input');
    });

    it('should handle module loading errors gracefully', async () => {
      const moduleDir = path.join(testModulesDir, 'input', 'error-module');
      await fs.ensureDir(moduleDir);
      
      // Invalid manifest
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), { invalid: 'manifest' });
      await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};');

      await expect(moduleLoader.init()).resolves.not.toThrow();
      
      const modules = moduleLoader.getModules();
      expect(modules).toHaveLength(0);
    });

    it('should load multiple module types', async () => {
      // Create input module
      const inputModuleDir = path.join(testModulesDir, 'input', 'test-input');
      await fs.ensureDir(inputModuleDir);
      await fs.writeJson(path.join(inputModuleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(inputModuleDir, 'index.js'), 'module.exports = {};');

      // Create output module
      const outputModuleDir = path.join(testModulesDir, 'output', 'test-output');
      await fs.ensureDir(outputModuleDir);
      await fs.writeJson(path.join(outputModuleDir, 'manifest.json'), mockOutputModule);
      await fs.writeFile(path.join(outputModuleDir, 'index.js'), 'module.exports = {};');

      await moduleLoader.init();
      
      const modules = moduleLoader.getModules();
      expect(modules).toHaveLength(2);
      
      const inputModules = modules.filter(m => m.manifest.type === 'input');
      const outputModules = modules.filter(m => m.manifest.type === 'output');
      
      expect(inputModules).toHaveLength(1);
      expect(outputModules).toHaveLength(1);
    });
  });

  describe('Module Validation', () => {
    it('should validate module manifest', async () => {
      const validManifest: ModuleManifest = {
        id: 'valid-module',
        name: 'Valid Module',
        type: 'input',
        version: '1.0.0',
        description: 'A valid module',
        author: 'Test Author',
        config: { properties: {} },
        events: { output: [] }
      };

      const result = await moduleLoader.validateModule(validManifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid module manifest', async () => {
      const invalidManifest = {
        id: '', // Invalid: empty ID
        name: '', // Invalid: empty name
        type: 'invalid-type', // Invalid: not 'input' or 'output'
        version: 'invalid-version', // Invalid: not semver
        description: 'Test module',
        author: 'Test Author',
        config: { properties: {} },
        events: { output: [] }
      } as ModuleManifest;

      const result = await moduleLoader.validateModule(invalidManifest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate module configuration', async () => {
      const manifest: ModuleManifest = {
        id: 'config-test',
        name: 'Config Test',
        type: 'input',
        version: '1.0.0',
        description: 'Config test module',
        author: 'Test Author',
        config: {
          properties: {
            requiredField: {
              type: 'string',
              title: 'Required Field'
            },
            optionalField: {
              type: 'number',
              title: 'Optional Field',
              default: 42
            }
          },
          required: ['requiredField']
        },
        events: { output: [] }
      };

      const validConfig: ModuleConfig = {
        requiredField: 'test value',
        optionalField: 100
      };

      const invalidConfig: ModuleConfig = {
        // Missing requiredField
        optionalField: 'invalid type' // Wrong type
      };

      const validResult = await moduleLoader.validateModuleConfig(manifest, validConfig);
      expect(validResult.valid).toBe(true);

      const invalidResult = await moduleLoader.validateModuleConfig(manifest, invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Module Lifecycle', () => {
    it('should handle module lifecycle events', async () => {
      const lifecycleEvents: string[] = [];
      
      moduleLoader.on('module:loaded', (moduleId: string) => {
        lifecycleEvents.push(`loaded:${moduleId}`);
      });
      
      moduleLoader.on('module:unloaded', (moduleId: string) => {
        lifecycleEvents.push(`unloaded:${moduleId}`);
      });

      const moduleDir = path.join(testModulesDir, 'input', 'lifecycle-test');
      await fs.ensureDir(moduleDir);
      
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};');

      await moduleLoader.init();
      
      expect(lifecycleEvents).toContain('loaded:test-input');
    });

    it('should handle module reloading', async () => {
      const moduleDir = path.join(testModulesDir, 'input', 'reload-test');
      await fs.ensureDir(moduleDir);
      
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};');

      await moduleLoader.init();
      
      // Update manifest
      const updatedManifest = { ...mockInputModule, description: 'Updated description' };
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), updatedManifest);
      
      await moduleLoader.reloadModule('test-input');
      
      const module = moduleLoader.getModule('test-input');
      expect(module?.manifest.description).toBe('Updated description');
    });
  });

  describe('Hot Reloading', () => {
    it('should watch for file changes when enabled', async () => {
      const hotReloadLoader = new ModuleLoader({
        modulesDir: testModulesDir,
        enableHotReload: true
      });

      const moduleDir = path.join(testModulesDir, 'input', 'hot-reload-test');
      await fs.ensureDir(moduleDir);
      
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};');

      await hotReloadLoader.init();
      
      // Wait for file watcher to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update manifest file
      const updatedManifest = { ...mockInputModule, description: 'Hot reloaded' };
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), updatedManifest);
      
      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const module = hotReloadLoader.getModule('test-input');
      expect(module?.manifest.description).toBe('Hot reloaded');
      
      await hotReloadLoader.shutdown();
    });

    it('should handle concurrent file changes', async () => {
      const hotReloadLoader = new ModuleLoader({
        modulesDir: testModulesDir,
        enableHotReload: true
      });

      const moduleDir = path.join(testModulesDir, 'input', 'concurrent-reload');
      await fs.ensureDir(moduleDir);
      
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};');

      await hotReloadLoader.init();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Make multiple concurrent changes
      const changePromises = [];
      for (let i = 0; i < 5; i++) {
        const updatedManifest = { ...mockInputModule, description: `Change ${i}` };
        changePromises.push(fs.writeJson(path.join(moduleDir, 'manifest.json'), updatedManifest));
      }
      
      await Promise.all(changePromises);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const module = hotReloadLoader.getModule('test-input');
      expect(module).toBeDefined();
      
      await hotReloadLoader.shutdown();
    });
  });

  describe('Module Registry', () => {
    it('should register and unregister modules', async () => {
      const moduleDir = path.join(testModulesDir, 'input', 'registry-test');
      await fs.ensureDir(moduleDir);
      
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};');

      await moduleLoader.init();
      
      expect(moduleLoader.getModule('test-input')).toBeDefined();
      
      await moduleLoader.unregisterModule('test-input');
      expect(moduleLoader.getModule('test-input')).toBeUndefined();
    });

    it('should handle duplicate module registration', async () => {
      const moduleDir = path.join(testModulesDir, 'input', 'duplicate-test');
      await fs.ensureDir(moduleDir);
      
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), mockInputModule);
      await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};');

      await moduleLoader.init();
      
      // Try to register the same module again
      await expect(moduleLoader.registerModule(moduleDir)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle module loading failures gracefully', async () => {
      const moduleDir = path.join(testModulesDir, 'input', 'failure-test');
      await fs.ensureDir(moduleDir);
      
      // Create manifest but no implementation file
      await fs.writeJson(path.join(moduleDir, 'manifest.json'), mockInputModule);

      await expect(moduleLoader.init()).resolves.not.toThrow();
      
      const modules = moduleLoader.getModules();
      expect(modules).toHaveLength(0);
    });

    it('should handle invalid module paths', async () => {
      await expect(moduleLoader.loadModule('/invalid/path')).rejects.toThrow();
    });

    it('should handle concurrent module operations', async () => {
      const operationPromises = [];
      
      for (let i = 0; i < 10; i++) {
        operationPromises.push(moduleLoader.discoverModules());
      }
      
      await Promise.all(operationPromises);
      // Should not throw errors
    });
  });

  describe('Performance', () => {
    it('should handle loading many modules efficiently', async () => {
      const startTime = Date.now();
      
      // Create many test modules
      const modulePromises = [];
      for (let i = 0; i < 50; i++) {
        const moduleDir = path.join(testModulesDir, 'input', `perf-module-${i}`);
        await fs.ensureDir(moduleDir);
        
        const manifest = { ...mockInputModule, id: `perf-module-${i}` };
        modulePromises.push(fs.writeJson(path.join(moduleDir, 'manifest.json'), manifest));
        modulePromises.push(fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports = {};'));
      }
      
      await Promise.all(modulePromises);
      await moduleLoader.init();
      
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000);
      
      const modules = moduleLoader.getModules();
      expect(modules.length).toBeGreaterThanOrEqual(50);
    });
  });
}); 