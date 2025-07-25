import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import chokidar from 'chokidar';
import {
  ModuleBase,
  ModuleConfig,
  ModuleManifest,
  ModuleFactory,
  ModuleRegistry,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '@interactor/shared';
import { InputModuleBase } from '../modules/InputModuleBase';
import { OutputModuleBase } from '../modules/OutputModuleBase';

export class ModuleLoader extends EventEmitter implements ModuleRegistry {
  private modules: Map<string, ModuleFactory> = new Map();
  private instances: Map<string, ModuleBase> = new Map();
  private manifests: Map<string, ModuleManifest> = new Map();
  private modulePaths: Map<string, string> = new Map();
  private watcher?: chokidar.FSWatcher;
  private isWatching = false;

  constructor(
    private modulesDir: string = path.join(__dirname, '../modules'),
    private logger?: any
  ) {
    super();
    
    // In development mode with ts-node-dev, __dirname points to src, not dist
    // So we don't need to convert the path
    this.logger?.debug(`ModuleLoader initialized with modules directory: ${this.modulesDir}`);
  }

  /**
   * Initialize the module loader
   */
  public async init(): Promise<void> {
    this.logger?.info('Initializing ModuleLoader');
    
    // Ensure modules directory exists
    await fs.ensureDir(this.modulesDir);
    
    // Discover and load modules
    await this.discoverModules();
    
    this.logger?.info(`ModuleLoader initialized with ${this.modules.size} modules`);
  }

  /**
   * Start watching for module changes (hot reloading)
   */
  public async startWatching(): Promise<void> {
    if (this.isWatching) {
      return;
    }

    this.logger?.info('Starting module file watcher for hot reloading');
    
    this.watcher = chokidar.watch(this.modulesDir, {
      ignored: /(^|[\/\\])\../, // Ignore hidden files
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('add', (filePath) => this.handleModuleAdded(filePath))
      .on('change', (filePath) => this.handleModuleChanged(filePath))
      .on('unlink', (filePath) => this.handleModuleRemoved(filePath));

    this.isWatching = true;
    this.logger?.info('Module file watcher started');
  }

  /**
   * Stop watching for module changes
   */
  public async stopWatching(): Promise<void> {
    if (!this.isWatching || !this.watcher) {
      return;
    }

    this.logger?.info('Stopping module file watcher');
    await this.watcher.close();
    this.watcher = undefined as any;
    this.isWatching = false;
    this.logger?.info('Module file watcher stopped');
  }

  /**
   * Discover and load all modules from the modules directory
   */
  public async discoverModules(): Promise<void> {
    this.logger?.info('Discovering modules...');
    
    try {
      const moduleDirs = await this.getModuleDirectories();
      
      for (const moduleDir of moduleDirs) {
        await this.loadModuleFromDirectory(moduleDir);
      }
      
      this.logger?.info(`Discovered ${this.modules.size} modules`);
    } catch (error) {
      this.logger?.error('Error discovering modules:', error);
      throw error;
    }
  }

  /**
   * Load a module from a directory
   */
  public async loadModuleFromDirectory(moduleDir: string): Promise<void> {
    const moduleName = path.basename(moduleDir);
    
    try {
      // Check if module directory exists
      if (!await fs.pathExists(moduleDir)) {
        this.logger?.warn(`Module directory does not exist: ${moduleDir}`);
        return;
      }

      // Load manifest
      const manifestPath = path.join(moduleDir, 'manifest.json');
      if (!await fs.pathExists(manifestPath)) {
        this.logger?.warn(`No manifest found for module: ${moduleName}`);
        return;
      }

      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: ModuleManifest = JSON.parse(manifestContent);

      // Validate manifest
      const validation = this.validateManifest(manifest);
      if (!validation.valid) {
        this.logger?.error(`Invalid manifest for module ${moduleName}:`, validation.errors);
        return;
      }

      // Load module implementation
      const modulePath = path.join(moduleDir, 'index.ts');
      if (!await fs.pathExists(modulePath)) {
        this.logger?.warn(`No index.ts found for module: ${moduleName}`);
        return;
      }

      // Create module factory
      const factory = await this.createModuleFactory(modulePath, manifest);
      
      // Register module
      this.register(moduleName, factory);
      this.manifests.set(moduleName, manifest);
      this.modulePaths.set(moduleName, moduleDir);
      
      this.logger?.info(`Loaded module: ${moduleName} (${manifest.type})`);
      this.emit('moduleLoaded', { name: moduleName, manifest });
      
    } catch (error) {
      this.logger?.error(`Error loading module ${moduleName}:`, error);
      this.emit('moduleLoadError', { name: moduleName, error });
    }
  }

  /**
   * Create a module instance
   */
  public async createInstance(moduleName: string, config: ModuleConfig): Promise<ModuleBase> {
    const factory = this.modules.get(moduleName);
    if (!factory) {
      throw new Error(`Module not found: ${moduleName}`);
    }

    try {
      const instance = await factory.create(config);
      const instanceId = `${moduleName}_${Date.now()}`;
      
      this.instances.set(instanceId, instance);
      
      this.logger?.info(`Created instance: ${instanceId} of module: ${moduleName}`);
      this.emit('instanceCreated', { instanceId, moduleName, instance });
      
      return instance;
    } catch (error) {
      this.logger?.error(`Error creating instance of module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Get all available module names
   */
  public list(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Get module factory by name
   */
  public get(name: string): ModuleFactory | undefined {
    return this.modules.get(name);
  }

  /**
   * Get module manifest by name
   */
  public getManifest(name: string): ModuleManifest | undefined {
    return this.manifests.get(name);
  }

  /**
   * Get all manifests
   */
  public getAllManifests(): ModuleManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Register a module factory
   */
  public register(name: string, factory: ModuleFactory): void {
    this.modules.set(name, factory);
    this.emit('moduleRegistered', { name, factory });
  }

  /**
   * Unregister a module
   */
  public unregister(name: string): void {
    this.modules.delete(name);
    this.manifests.delete(name);
    this.modulePaths.delete(name);
    this.emit('moduleUnregistered', { name });
  }

  /**
   * Get module directories
   */
  private async getModuleDirectories(): Promise<string[]> {
    const moduleDirs: string[] = [];
    
    // Recursively search for module directories (those containing manifest.json)
    const searchForModules = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subDir = path.join(dir, entry.name);
            
            // Check if this directory contains a manifest.json (it's a module)
            const manifestPath = path.join(subDir, 'manifest.json');
            if (await fs.pathExists(manifestPath)) {
              moduleDirs.push(subDir);
            } else {
              // Recursively search subdirectories
              await searchForModules(subDir);
            }
          }
        }
      } catch (error) {
        this.logger?.warn(`Error reading directory ${dir}:`, error);
      }
    };
    
    await searchForModules(this.modulesDir);
    return moduleDirs;
  }

  /**
   * Create a module factory from a module file
   */
  private async createModuleFactory(modulePath: string, manifest: ModuleManifest): Promise<ModuleFactory> {
    // In a real implementation, this would dynamically import the module
    // For now, we'll create a factory that can instantiate the module
    return {
      create: async (config: ModuleConfig): Promise<ModuleBase> => {
        // This is a placeholder - in reality, you'd dynamically import the module
        // and instantiate the appropriate class (InputModuleBase or OutputModuleBase)
        
        if (manifest.type === 'input') {
          return new (class extends InputModuleBase {
            protected async onInit(): Promise<void> {
              // Module-specific initialization
            }
            protected async onStart(): Promise<void> {
              // Module-specific start logic
            }
            protected async onStop(): Promise<void> {
              // Module-specific stop logic
            }
            protected async onDestroy(): Promise<void> {
              // Module-specific cleanup
            }
            protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
              // Handle config updates
            }
            protected handleInput(data: any): void {
              // Handle input data
            }
            protected async onStartListening(): Promise<void> {
              // Start listening for input
            }
            protected async onStopListening(): Promise<void> {
              // Stop listening for input
            }
          })(manifest.name, config, manifest);
        } else {
          return new (class extends OutputModuleBase {
            protected async onInit(): Promise<void> {
              // Module-specific initialization
            }
            protected async onStart(): Promise<void> {
              // Module-specific start logic
            }
            protected async onStop(): Promise<void> {
              // Module-specific stop logic
            }
            protected async onDestroy(): Promise<void> {
              // Module-specific cleanup
            }
            protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
              // Handle config updates
            }
            protected async onSend(data: any): Promise<void> {
              // Send data to output
            }
            protected async handleTriggerEvent(event: any): Promise<void> {
              // Handle trigger events
            }
            protected async handleStreamingEvent(event: any): Promise<void> {
              // Handle streaming events
            }
            protected async onManualTrigger(): Promise<void> {
              // Handle manual trigger
            }
          })(manifest.name, config, manifest);
        }
      },
      getManifest: () => manifest
    };
  }

  /**
   * Validate a module manifest
   */
  private validateManifest(manifest: ModuleManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    if (!manifest.name) {
      errors.push({ field: 'name', message: 'Module name is required', code: 'REQUIRED' });
    }
    
    if (!manifest.type || !['input', 'output'].includes(manifest.type)) {
      errors.push({ field: 'type', message: 'Module type must be "input" or "output"', code: 'INVALID_TYPE' });
    }
    

    
    if (!manifest.version) {
      errors.push({ field: 'version', message: 'Module version is required', code: 'REQUIRED' });
    }
    
    if (!manifest.description) {
      warnings.push({ field: 'description', message: 'Module description is recommended', code: 'MISSING_DESCRIPTION' });
    }
    
    if (!manifest.author) {
      warnings.push({ field: 'author', message: 'Module author is recommended', code: 'MISSING_AUTHOR' });
    }

    // Validate config schema
    if (!manifest.configSchema || typeof manifest.configSchema !== 'object') {
      errors.push({ field: 'configSchema', message: 'Config schema is required', code: 'REQUIRED' });
    }

    // Validate events
    if (!manifest.events || !Array.isArray(manifest.events)) {
      errors.push({ field: 'events', message: 'Events array is required', code: 'REQUIRED' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Handle module file added
   */
  private async handleModuleAdded(filePath: string): Promise<void> {
    this.logger?.info(`Module file added: ${filePath}`);
    
    if (filePath.endsWith('manifest.json')) {
      const moduleDir = path.dirname(filePath);
      const moduleName = path.basename(moduleDir);
      
      // Reload the module
      await this.loadModuleFromDirectory(moduleDir);
    }
  }

  /**
   * Handle module file changed
   */
  private async handleModuleChanged(filePath: string): Promise<void> {
    this.logger?.info(`Module file changed: ${filePath}`);
    
    if (filePath.endsWith('manifest.json') || filePath.endsWith('index.ts')) {
      const moduleDir = path.dirname(filePath);
      const moduleName = path.basename(moduleDir);
      
      // Reload the module
      await this.loadModuleFromDirectory(moduleDir);
    }
  }

  /**
   * Handle module file removed
   */
  private async handleModuleRemoved(filePath: string): Promise<void> {
    this.logger?.info(`Module file removed: ${filePath}`);
    
    if (filePath.endsWith('manifest.json')) {
      const moduleDir = path.dirname(filePath);
      const moduleName = path.basename(moduleDir);
      
      // Unregister the module
      this.unregister(moduleName);
    }
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    this.logger?.info('Destroying ModuleLoader');
    
    // Stop watching
    await this.stopWatching();
    
    // Stop all module instances
    for (const [instanceId, instance] of this.instances) {
      try {
        await instance.destroy();
      } catch (error) {
        this.logger?.error(`Error destroying instance ${instanceId}:`, error);
      }
    }
    
    this.instances.clear();
    this.modules.clear();
    this.manifests.clear();
    this.modulePaths.clear();
    
    this.logger?.info('ModuleLoader destroyed');
  }
} 