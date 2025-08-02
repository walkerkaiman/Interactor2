import { InteractionConfig, ModuleConfig, MessageRoute, ModuleInstance } from '@interactor/shared';
import { Logger } from './Logger';
import * as fs from 'fs-extra';
import * as path from 'path';

export class StateManager {
  private static instance: StateManager;
  private logger: Logger;
  private stateFile: string;
  private state: {
    interactions: InteractionConfig[];
    modules: ModuleInstance[];
    routes: MessageRoute[];
    settings: Record<string, any>;
  };
  private lastSaved: number;
  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor(config: {
    stateFile?: string;
  } = {}) {
    this.logger = Logger.getInstance();
    this.stateFile = config.stateFile || path.join(__dirname, '..', '..', '..', 'data', 'state.json');
    this.state = {
      interactions: [],
      modules: [],
      routes: [],
      settings: {}
    };
    this.lastSaved = Date.now();
  }

  public static getInstance(config?: {
    stateFile?: string;
  }): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager(config);
    }
    return StateManager.instance;
  }

  /**
   * Initialize the state manager
   */
  public async init(): Promise<void> {
    try {
      this.logger.info('Initializing state manager', 'StateManager');
      
      // Ensure data directory exists
      const dataDir = path.dirname(this.stateFile);
      await fs.ensureDir(dataDir);
      
      // Load existing state if it exists
      await this.loadState();
      
      this.logger.info('State manager initialized', 'StateManager');
    } catch (error) {
      this.logger.error('Failed to initialize state manager', 'StateManager', { error: String(error) });
      throw error;
    }
  }

  /**
   * Load state from file
   */
  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const stateData = await fs.readFile(this.stateFile, 'utf-8');
        const loadedState = JSON.parse(stateData);
        
        // Merge with default state
        this.state = {
          interactions: loadedState.interactions || [],
          modules: loadedState.modules || [],
          routes: loadedState.routes || [],
          settings: loadedState.settings || {}
        };
        
        this.logger.debug(`State loaded from file: ${this.state.interactions.length} interactions, ${this.state.modules.length} modules`, 'StateManager');
      } else {
        this.logger.debug('No existing state file found, using defaults', 'StateManager');
      }
    } catch (error) {
      this.logger.error('Error loading state from file', 'StateManager', { error: String(error) });
      // Continue with default state
    }
  }

  /**
   * Save state to file with debouncing to reduce disk I/O
   */
  private debouncedSaveState(): void {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Set new timeout for 500ms
    this.saveTimeout = setTimeout(async () => {
      await this.saveStateImmediate();
      this.saveTimeout = null;
    }, 500);
  }

  /**
   * Save state to file immediately (internal method)
   */
  private async saveStateImmediate(): Promise<void> {
    try {
      // Ensure the directory exists
      const dataDir = path.dirname(this.stateFile);
      await fs.ensureDir(dataDir);
      
      await fs.writeJson(this.stateFile, this.state, { spaces: 2 });
      this.lastSaved = Date.now();
      this.logger.debug('State saved to file', 'StateManager');
    } catch (error) {
      this.logger.error('Error saving state to file', 'StateManager', { error: String(error) });
      // Don't throw the error to prevent breaking WebSocket connections
      // Just log it and continue
    }
  }

  /**
   * Force immediate save (for critical operations)
   */
  private async saveState(): Promise<void> {
    // Clear any pending debounced save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.saveStateImmediate();
  }

  /**
   * Get current state
   */
  public getState(): any {
    return { ...this.state };
  }

  /**
   * Replace entire state
   */
  public async replaceState(newState: Partial<any>): Promise<void> {
    this.state = {
      ...this.state,
      ...newState
    };
    await this.saveState();
  }

  /**
   * Get interactions
   */
  public getInteractions(): InteractionConfig[] {
    return [...this.state.interactions];
  }

  /**
   * Add interaction
   */
  public async addInteraction(interaction: InteractionConfig): Promise<void> {
    this.state.interactions.push(interaction);
    this.debouncedSaveState();
  }

  /**
   * Get interaction by ID
   */
  public getInteraction(id: string): InteractionConfig | undefined {
    return this.state.interactions.find(i => i.id === id);
  }

  /**
   * Update interaction
   */
  public async updateInteraction(interaction: InteractionConfig): Promise<void> {
    const index = this.state.interactions.findIndex(i => i.id === interaction.id);
    if (index !== -1) {
      this.state.interactions[index] = interaction;
      this.debouncedSaveState();
    }
  }

  /**
   * Remove interaction
   */
  public async removeInteraction(id: string): Promise<boolean> {
    const index = this.state.interactions.findIndex(i => i.id === id);
    if (index !== -1) {
      this.state.interactions.splice(index, 1);
      this.debouncedSaveState();
      return true;
    }
    return false;
  }

  /**
   * Get module instances
   */
  public getModuleInstances(): ModuleInstance[] {
    return [...this.state.modules];
  }

  /**
   * Add module instance
   */
  public async addModuleInstance(moduleInstance: ModuleInstance): Promise<void> {
    this.state.modules.push(moduleInstance);
    this.debouncedSaveState();
  }

  /**
   * Get module instance by ID
   */
  public getModuleInstance(id: string): ModuleInstance | undefined {
    return this.state.modules.find(m => m.id === id);
  }

  /**
   * Update module instance
   */
  public async updateModuleInstance(moduleInstance: ModuleInstance): Promise<void> {
    const index = this.state.modules.findIndex(m => m.id === moduleInstance.id);
    if (index !== -1) {
      this.state.modules[index] = moduleInstance;
      this.debouncedSaveState();
    }
  }

  /**
   * Remove module instance
   */
  public async removeModuleInstance(id: string): Promise<boolean> {
    const index = this.state.modules.findIndex(m => m.id === id);
    if (index !== -1) {
      this.state.modules.splice(index, 1);
      this.debouncedSaveState();
      return true;
    }
    return false;
  }

  /**
   * Get routes
   */
  public getRoutes(): MessageRoute[] {
    return [...this.state.routes];
  }

  /**
   * Add route
   */
  public async addRoute(route: MessageRoute): Promise<void> {
    this.state.routes.push(route);
    await this.saveState();
  }

  /**
   * Get route by ID
   */
  public getRoute(id: string): MessageRoute | undefined {
    return this.state.routes.find(r => r.id === id);
  }

  /**
   * Update route
   */
  public async updateRoute(route: MessageRoute): Promise<void> {
    const index = this.state.routes.findIndex(r => r.id === route.id);
    if (index !== -1) {
      this.state.routes[index] = route;
      await this.saveState();
    }
  }

  /**
   * Remove route
   */
  public async removeRoute(id: string): Promise<boolean> {
    const index = this.state.routes.findIndex(r => r.id === id);
    if (index !== -1) {
      this.state.routes.splice(index, 1);
      await this.saveState();
      return true;
    }
    return false;
  }

  /**
   * Get settings
   */
  public getSettings(): Record<string, any> {
    return { ...this.state.settings };
  }

  /**
   * Get setting by key
   */
  public getSetting(key: string): any {
    return this.state.settings[key];
  }

  /**
   * Set setting
   */
  public async setSetting(key: string, value: any): Promise<void> {
    this.state.settings[key] = value;
    await this.saveState();
  }

  /**
   * Remove setting
   */
  public async removeSetting(key: string): Promise<boolean> {
    if (key in this.state.settings) {
      delete this.state.settings[key];
      await this.saveState();
      return true;
    }
    return false;
  }

  /**
   * Check if state is dirty (always false in simplified version)
   */
  public isStateDirty(): boolean {
    return false;
  }

  /**
   * Get last saved timestamp
   */
  public getLastSaved(): number {
    return this.lastSaved;
  }

  /**
   * Force save state
   */
  public async forceSave(): Promise<void> {
    await this.saveState();
  }

  /**
   * Reset state to defaults
   */
  public async resetState(): Promise<void> {
    this.state = {
      interactions: [],
      modules: [],
      routes: [],
      settings: {}
    };
    await this.saveState();
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    StateManager.instance = undefined as any;
  }

  /**
   * Destroy state manager
   */
  public async destroy(): Promise<void> {
    await this.saveState();
    this.logger.info('State manager destroyed', 'StateManager');
  }
}