import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ModuleBase as IModuleBase,
  ModuleConfig,
  ModuleManifest,
  EventHandler,
  ModuleState,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '@interactor/shared';

import { ModuleUploadConfig } from '../services/FileUploader';
import { fileUploader } from '../services/fileUploaderInstance';

export abstract class ModuleBase extends EventEmitter implements IModuleBase {
  public readonly id: string;
  public readonly name: string;
  public config: ModuleConfig;
  public manifest: ModuleManifest;
  public state: ModuleState;

  protected logger: any;

  /**
   * Register this module's upload settings with the global FileUploader.
   */
  protected registerUploads(moduleType: string, cfg: ModuleUploadConfig): void {
    fileUploader.registerModule(moduleType, cfg);
  } // Will be injected
  protected isInitialized = false;
  protected isRunning = false;

  constructor(name: string, config: ModuleConfig, manifest: ModuleManifest, id?: string) {
    super();
    this.id = id || uuidv4();
    this.name = name;
    this.config = { ...config };
    this.manifest = manifest;
    
    this.state = {
      id: this.id,
      status: 'initializing',
      messageCount: 0,
      config: this.config
    };
  }

  /**
   * Initialize the module - called once before start
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      throw new Error(`Module ${this.name} is already initialized`);
    }

    try {
      this.logger?.info(`Initializing module: ${this.name}`);
      this.state.status = 'initializing';
      
      await this.onInit();
      
      this.isInitialized = true;
      this.state.status = 'stopped';
      this.logger?.info(`Module ${this.name} initialized successfully`);
      
      this.emit('initialized', { moduleId: this.id, moduleName: this.name });
    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = error instanceof Error ? error.message : String(error);
      this.logger?.error(`Failed to initialize module ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Start the module - called after init
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(`Module ${this.name} must be initialized before starting`);
    }
    
    if (this.isRunning) {
      throw new Error(`Module ${this.name} is already running`);
    }

    try {
      this.logger?.info(`Starting module: ${this.name}`);
      this.state.status = 'running';
      this.state.startTime = Date.now();
      
      await this.onStart();
      
      this.isRunning = true;
      this.logger?.info(`Module ${this.name} started successfully`);
      
      this.emit('started', { moduleId: this.id, moduleName: this.name });
    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = error instanceof Error ? error.message : String(error);
      this.logger?.error(`Failed to start module ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Stop the module
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return; // Already stopped
    }

    try {
      this.logger?.info(`Stopping module: ${this.name}`);
      
      await this.onStop();
      
      this.isRunning = false;
      this.state.status = 'stopped';
      this.logger?.info(`Module ${this.name} stopped successfully`);
      
      this.emit('stopped', { moduleId: this.id, moduleName: this.name });
    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = error instanceof Error ? error.message : String(error);
      this.logger?.error(`Failed to stop module ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Destroy the module - called when module is being removed
   */
  public async destroy(): Promise<void> {
    try {
      this.logger?.info(`Destroying module: ${this.name}`);
      
      if (this.isRunning) {
        await this.stop();
      }
      
      await this.onDestroy();
      
      this.isInitialized = false;
      this.state.status = 'stopped';
      this.logger?.info(`Module ${this.name} destroyed successfully`);
      
      this.emit('destroyed', { moduleId: this.id, moduleName: this.name });
    } catch (error) {
      this.logger?.error(`Failed to destroy module ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Update module configuration
   */
  public async updateConfig(newConfig: ModuleConfig): Promise<void> {
    try {
      this.logger?.info(`Updating config for module: ${this.name}`);
      
      // Validate new config against manifest schema
      const validation = this.validateConfig(newConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      const oldConfig = { ...this.config };
      this.config = { ...newConfig };
      this.state.config = this.config;
      
      await this.onConfigUpdate(oldConfig, newConfig);
      
      this.logger?.info(`Config updated for module: ${this.name}`);
      
      // Emit configuration update event
      this.emitConfigUpdate();
      
      this.emit('configUpdated', { 
        moduleId: this.id, 
        moduleName: this.name, 
        oldConfig, 
        newConfig 
      });
    } catch (error) {
      this.logger?.error(`Failed to update config for module ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Get current module state
   */
  public getState(): ModuleState {
    return { ...this.state };
  }

  /**
   * Get comprehensive module state including all possible settings
   * This ensures all settings are preserved regardless of current mode
   */
  public getComprehensiveState(): any {
    return {
      id: this.id,
      moduleName: this.name,
      status: this.state.status,
      messageCount: this.state.messageCount,
      lastUpdate: Date.now(),
      // Include the full configuration with all possible settings
      config: this.config,
      // Include any additional runtime state
      runtimeState: this.getRuntimeState(),
    };
  }

  /**
   * Get runtime state (data that changes frequently, not configuration)
   * Override in subclasses to provide module-specific runtime data
   */
  protected getRuntimeState(): Record<string, any> {
    return {
      // Default runtime state - subclasses can override
      isRunning: this.isRunning,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Get mode-specific configuration (for UI display)
   * This returns only the settings relevant to the current mode
   */
  public getModeSpecificConfig(): Record<string, any> {
    const mode = this.config.mode || 'default';
    return this.getConfigForMode(mode);
  }

  /**
   * Get configuration settings for a specific mode
   * Override in subclasses to provide mode-specific configuration filtering
   */
  protected getConfigForMode(mode: string): Record<string, any> {
    // Default implementation returns all config
    // Subclasses should override to provide mode-specific filtering
    return { ...this.config };
  }

  /**
   * Get all available modes for this module
   * Override in subclasses to provide available modes
   */
  public getAvailableModes(): string[] {
    // Default implementation - subclasses should override
    return ['default'];
  }

  /**
   * Get mode-specific UI schema (which settings to show for current mode)
   * Override in subclasses to provide mode-specific UI configuration
   */
  public getModeSpecificUISchema(): any {
    const mode = this.config.mode || 'default';
    return this.getUISchemaForMode(mode);
  }

  /**
   * Get UI schema for a specific mode
   * Override in subclasses to provide mode-specific UI schemas
   */
  protected getUISchemaForMode(mode: string): any {
    // Default implementation returns full schema
    // Subclasses should override to provide mode-specific UI schemas
    return this.manifest.configSchema;
  }

  /**
   * Emit runtime state update (excludes configuration data)
   * This prevents overwriting user's unregistered configuration changes
   */
  protected emitRuntimeStateUpdate(runtimeData: Record<string, any> = {}): void {
    const stateUpdate = {
      id: this.id,
      moduleName: this.name,
      status: this.state.status,
      messageCount: this.state.messageCount,
      lastUpdate: Date.now(),
      // Include any additional runtime data
      ...runtimeData,
      // Explicitly exclude configuration data to prevent overwriting user changes
      config: undefined,
      mode: undefined,
      enabled: undefined,
      // Add any other configuration fields that should be excluded
    };

    this.logger?.debug(`Emitting runtime state update for ${this.name}:`, stateUpdate);
    
    // Emit runtime state update event for targeted updates
    this.emit('runtimeStateUpdate', runtimeData);
    
    // Also emit stateUpdate for backward compatibility
    this.emit('stateUpdate', stateUpdate);
    
    // Also emit moduleStateChanged for real-time updates
    this.emit('moduleStateChanged', stateUpdate);
  }

  /**
   * Emit configuration update (for when configuration actually changes)
   * This should only be called when configuration is explicitly updated
   */
  protected emitConfigUpdate(): void {
    const configUpdate = {
      id: this.id,
      moduleName: this.name,
      config: this.config,
      lastUpdate: Date.now(),
    };

    this.logger?.debug(`Emitting config update for ${this.name}:`, configUpdate);
    
    // Emit config update event
    this.emit('configUpdated', configUpdate);
  }

  /**
   * Validate configuration against manifest schema
   */
  public validateConfig(config: ModuleConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation - can be extended by subclasses
    if (!config) {
      errors.push({
        field: 'config',
        message: 'Configuration is required',
        code: 'REQUIRED'
      });
      return { valid: false, errors, warnings };
    }

    // Validate required fields from manifest
    if (this.manifest.configSchema.required) {
      for (const requiredField of this.manifest.configSchema.required) {
        if (!(requiredField in config)) {
          errors.push({
            field: requiredField,
            message: `Required field '${requiredField}' is missing`,
            code: 'REQUIRED'
          });
        }
      }
    }

    // Validate field types and constraints
    for (const [fieldName, fieldSchema] of Object.entries(this.manifest.configSchema.properties)) {
      const value = config[fieldName];
      
      if (value !== undefined) {
        // Type validation
        if (fieldSchema.type === 'number' && typeof value !== 'number') {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be a number`,
            code: 'TYPE_MISMATCH'
          });
        } else if (fieldSchema.type === 'string' && typeof value !== 'string') {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be a string`,
            code: 'TYPE_MISMATCH'
          });
        } else if (fieldSchema.type === 'boolean' && typeof value !== 'boolean') {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be a boolean`,
            code: 'TYPE_MISMATCH'
          });
        }

        // Range validation for numbers
        if (fieldSchema.type === 'number' && typeof value === 'number') {
          if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
            errors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be at least ${fieldSchema.minimum}`,
              code: 'MIN_VALUE'
            });
          }
          if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
            errors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be at most ${fieldSchema.maximum}`,
              code: 'MAX_VALUE'
            });
          }
        }

        // Enum validation
        if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be one of: ${fieldSchema.enum.join(', ')}`,
            code: 'ENUM_MISMATCH'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Increment message counter
   */
  protected incrementMessageCount(): void {
    this.state.messageCount++;
  }

  /**
   * Set logger instance
   */
  public setLogger(logger: any): void {
    this.logger = logger;
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract onInit(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onDestroy(): Promise<void>;
  protected abstract onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void>;
} 