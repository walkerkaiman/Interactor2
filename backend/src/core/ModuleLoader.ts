import { ModuleConfig, ModuleManifest } from '@interactor/shared';
import { Logger } from './Logger';
import * as path from 'path';
import * as fs from 'fs-extra';
import { InteractorError } from './ErrorHandler';
import { AudioOutputModule } from '../modules/output/audio_output/index';

export class ModuleLoader {
  private static instance: ModuleLoader;
  private modules: Map<string, ModuleManifest> = new Map();
  private logger: Logger;
  private modulesPath: string;
  private audioOutputInstance: AudioOutputModule | undefined;

  private constructor() {
    this.logger = Logger.getInstance();
    this.modulesPath = path.join(__dirname, '../modules');
  }

  public static getInstance(): ModuleLoader {
    if (!ModuleLoader.instance) {
      ModuleLoader.instance = new ModuleLoader();
    }
    return ModuleLoader.instance;
  }

  /**
   * Initialize the module loader
   */
  public async init(): Promise<void> {
    try {
      this.logger.info('Initializing module loader', 'ModuleLoader');
      await this.loadModules();
      this.logger.info(`Module loader initialized with ${this.modules.size} modules`, 'ModuleLoader');
    } catch (error) {
      this.logger.error('Failed to initialize module loader', 'ModuleLoader', { error: String(error) });
      throw error;
    }
  }

  /**
   * Load all available modules
   */
  private async loadModules(): Promise<void> {
    try {
      if (!await fs.pathExists(this.modulesPath)) {
        this.logger.warn(`Modules path does not exist: ${this.modulesPath}`, 'ModuleLoader');
        return;
      }

      // Recursively search for modules in subdirectories
      await this.loadModulesRecursive(this.modulesPath);
    } catch (error) {
      this.logger.error('Error loading modules', 'ModuleLoader', { error: String(error) });
    }
  }

  /**
   * Recursively load modules from a directory
   */
  private async loadModulesRecursive(dirPath: string): Promise<void> {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          // Check if this directory contains a manifest.json (it's a module)
          const manifestPath = path.join(itemPath, 'manifest.json');
          if (await fs.pathExists(manifestPath)) {
            // This is a module directory, load it
            await this.loadModule(item, itemPath);
          } else {
            // This is a subdirectory, search recursively
            await this.loadModulesRecursive(itemPath);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error loading modules from directory: ${dirPath}`, 'ModuleLoader', { error: String(error) });
    }
  }

  /**
   * Load a single module
   */
  private async loadModule(moduleName: string, modulePath: string): Promise<void> {
    try {
      const manifestPath = path.join(modulePath, 'manifest.json');
      
      if (!await fs.pathExists(manifestPath)) {
        this.logger.warn(`No manifest found for module: ${moduleName}`, 'ModuleLoader');
        return;
      }

      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: ModuleManifest = JSON.parse(manifestContent);

      // Validate manifest
      if (!this.validateManifest(manifest)) {
        this.logger.warn(`Invalid manifest for module: ${moduleName}`, 'ModuleLoader');
        return;
      }

      this.modules.set(manifest.name, manifest);
      this.logger.debug(`Module loaded: ${manifest.name}`, 'ModuleLoader');

      // Attempt to import module API to register its factory with ModuleRegistry
      try {
        const apiIndex = path.join(modulePath, 'api', 'index');
        this.logger.debug(`Attempting to import API for module: ${manifest.name} from ${apiIndex}`, 'ModuleLoader');
        // Dynamic import without extension resolves to compiled JS in dist
        await import(apiIndex);
        this.logger.debug(`Registered API for module: ${manifest.name}`, 'ModuleLoader');
      } catch (apiErr) {
        this.logger.warn(`No API registration found for module: ${manifest.name}`, 'ModuleLoader', { error: String(apiErr) });
      }
    } catch (error) {
      this.logger.error(`Error loading module: ${moduleName}`, 'ModuleLoader', { error: String(error), stack: error.stack });
    }
  }

  /**
   * Validate a module manifest
   */
  private validateManifest(manifest: any): boolean {
    const requiredFields = ['name', 'type', 'version', 'description'];
    
    for (const field of requiredFields) {
      if (!manifest[field]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all available modules
   */
  public getAvailableModules(): ModuleManifest[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get a specific module by name
   */
  public getModule(name: string): ModuleManifest | undefined {
    return this.modules.get(name);
  }

  /**
   * Check if a module exists
   */
  public hasModule(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Get modules by type
   */
  public getModulesByType(type: string): ModuleManifest[] {
    return Array.from(this.modules.values()).filter(module => module.type === type);
  }

  /**
   * Register a module (for compatibility with tests)
   */
  public register(name: string, manifest: ModuleManifest): void {
    this.modules.set(name, manifest);
  }

  /**
   * Get all manifests (for compatibility with tests)
   */
  public getAllManifests(): ModuleManifest[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get manifest by name (for compatibility with tests)
   */
  public getManifest(name: string): ModuleManifest | undefined {
    return this.modules.get(name);
  }

  /**
   * Get instance by ID (for compatibility with tests)
   */
  public getInstance(id: string): any {
    // Simplified implementation - return undefined since we don't track instances
    return undefined;
  }

  /**
   * Initialize a specific module by its ID
   */
  public initializeModule(moduleId: string): void {
    this.logger?.debug('Initializing module:', moduleId);
    
    try {
      const module = this.getModule(moduleId);
      this.logger?.debug('Module found:', {moduleExists: !!module});
      
      if (!module) {
        this.logger?.error(`Module ${moduleId} not found`);
        throw new InteractorError(`Module ${moduleId} not found`, { statusCode: 404 });
      }
      
      // Special handling for audio output
      if (moduleId === 'audio-output') {
        this.logger?.debug('Initializing audio output module');
        this.ensureAudioOutputInitialized();
      }
      
      this.logger?.debug('Calling module.initialize()');
      module.initialize();
      this.logger?.debug('Module initialized successfully:', moduleId);
    } catch (error) {
      this.logger?.error(`Module initialization failed for ${moduleId}:`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  private ensureAudioOutputInitialized(): void {
    this.logger?.debug('Checking audio output initialization', {
      existingInstance: !!this.audioOutputInstance
    });

    if (!this.audioOutputInstance) {
      try {
        const config = this.getConfig('audio-output');
        this.logger?.debug('Creating new AudioOutput instance with config:', config);
        this.audioOutputInstance = new AudioOutputModule(config);
        this.logger?.debug('AudioOutput instance created successfully');
      } catch (error) {
        this.logger?.error('Failed to initialize audio output:', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    }
  }

  /**
   * Destroy the module loader
   */
  public destroy(): void {
    this.modules.clear();
    this.logger.info('Module loader destroyed', 'ModuleLoader');
  }
} 