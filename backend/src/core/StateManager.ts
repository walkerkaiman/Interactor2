import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  InteractionConfig,
  ModuleInstance,
  MessageRoute,
  SystemStats
} from '@interactor/shared';

export interface SystemState {
  interactions: InteractionConfig[];
  modules: ModuleInstance[];
  routes: MessageRoute[];
  settings: Record<string, any>;
  lastSaved: number;
  version: string;
}

export class StateManager extends EventEmitter {
  private state: SystemState;
  private stateFile: string;
  private autoSaveInterval: number;
  private autoSaveTimer?: NodeJS.Timeout;
  private isDirty = false;
  private isSaving = false;

  constructor(
    private config: {
      stateFile?: string;
      autoSave?: boolean;
      autoSaveInterval?: number;
      backupCount?: number;
    } = {},
    private logger?: any
  ) {
    super();

    this.stateFile = config.stateFile || path.join(process.cwd(), 'data', 'state.json');
    this.autoSaveInterval = config.autoSaveInterval || 30000; // 30 seconds

    // Initialize default state
    this.state = {
      interactions: [],
      modules: [],
      routes: [],
      settings: {},
      lastSaved: 0,
      version: '1.0.0'
    };
  }

  /**
   * Initialize the state manager
   */
  public async init(): Promise<void> {
    this.logger?.info('Initializing StateManager');
    
    try {
      // Ensure data directory exists
      await fs.ensureDir(path.dirname(this.stateFile));
      
      // Load existing state if available
      await this.loadState();
      
      // Start auto-save if enabled
      if (this.config.autoSave !== false) {
        this.startAutoSave();
      }
      
      this.logger?.info('StateManager initialized');
    } catch (error) {
      this.logger?.error('Error initializing StateManager:', error);
      throw error;
    }
  }

  /**
   * Load state from file
   */
  public async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const stateData = await fs.readFile(this.stateFile, 'utf-8');
        const loadedState = JSON.parse(stateData);
        
        // Merge with default state to ensure all fields exist
        this.state = {
          ...this.state,
          ...loadedState,
          lastSaved: Date.now()
        };
        
        this.logger?.info('State loaded from file');
        this.emit('stateLoaded', this.state);
      } else {
        this.logger?.info('No existing state file found, using default state');
        await this.saveState();
      }
    } catch (error) {
      this.logger?.error('Error loading state:', error);
      throw error;
    }
  }

  /**
   * Save state to file
   */
  public async saveState(): Promise<void> {
    if (this.isSaving) {
      return; // Prevent concurrent saves
    }

    this.isSaving = true;
    
    try {
      // Update last saved timestamp
      this.state.lastSaved = Date.now();
      
      // Create backup before saving
      await this.createBackup();
      
      // Save current state
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
      
      this.isDirty = false;
      this.logger?.debug('State saved to file');
      this.emit('stateSaved', this.state);
    } catch (error) {
      this.logger?.error('Error saving state:', error);
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Create a backup of the current state
   */
  private async createBackup(): Promise<void> {
    const backupDir = path.join(path.dirname(this.stateFile), 'backups');
    await fs.ensureDir(backupDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `state-${timestamp}.json`);
    
    if (await fs.pathExists(this.stateFile)) {
      await fs.copy(this.stateFile, backupFile);
    }
    
    // Clean up old backups
    await this.cleanupBackups(backupDir);
  }

  /**
   * Clean up old backup files
   */
  private async cleanupBackups(backupDir: string): Promise<void> {
    const maxBackups = this.config.backupCount || 5;
    
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('state-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      // Remove old backups
      for (let i = maxBackups; i < backupFiles.length; i++) {
        const backupFile = backupFiles[i];
        if (backupFile?.path) {
          await fs.remove(backupFile.path);
        }
      }
    } catch (error) {
      this.logger?.warn('Error cleaning up backups:', error);
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(async () => {
      if (this.isDirty && !this.isSaving) {
        try {
          await this.saveState();
        } catch (error) {
          this.logger?.error('Auto-save failed:', error);
        }
      }
    }, this.autoSaveInterval);
    
    this.logger?.info(`Auto-save started with ${this.autoSaveInterval}ms interval`);
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined as any;
      this.logger?.info('Auto-save stopped');
    }
  }

  /**
   * Mark state as dirty (needs saving)
   */
  private markDirty(): void {
    this.isDirty = true;
    this.emit('stateChanged');
  }

  // Interaction management
  public getInteractions(): InteractionConfig[] {
    return [...this.state.interactions];
  }

  public getInteraction(id: string): InteractionConfig | undefined {
    return this.state.interactions.find(interaction => interaction.id === id);
  }

  public async addInteraction(interaction: InteractionConfig): Promise<void> {
    this.state.interactions.push(interaction);
    this.markDirty();
    this.emit('interactionAdded', interaction);
  }

  public async updateInteraction(interaction: InteractionConfig): Promise<void> {
    const index = this.state.interactions.findIndex(i => i.id === interaction.id);
    if (index !== -1) {
      this.state.interactions[index] = interaction;
      this.markDirty();
      this.emit('interactionUpdated', interaction);
    }
  }

  public async removeInteraction(id: string): Promise<boolean> {
    const index = this.state.interactions.findIndex(i => i.id === id);
    if (index !== -1) {
      const removed = this.state.interactions.splice(index, 1)[0];
      this.markDirty();
      this.emit('interactionRemoved', removed);
      return true;
    }
    return false;
  }

  // Module instance management
  public getModuleInstances(): ModuleInstance[] {
    return [...this.state.modules];
  }

  public getModuleInstance(id: string): ModuleInstance | undefined {
    return this.state.modules.find(module => module.id === id);
  }

  public async addModuleInstance(module: ModuleInstance): Promise<void> {
    this.state.modules.push(module);
    this.markDirty();
    this.emit('moduleInstanceAdded', module);
  }

  public async updateModuleInstance(module: ModuleInstance): Promise<void> {
    const index = this.state.modules.findIndex(m => m.id === module.id);
    if (index !== -1) {
      this.state.modules[index] = module;
      this.markDirty();
      this.emit('moduleInstanceUpdated', module);
    }
  }

  public async removeModuleInstance(id: string): Promise<boolean> {
    const index = this.state.modules.findIndex(m => m.id === id);
    if (index !== -1) {
      const removed = this.state.modules.splice(index, 1)[0];
      this.markDirty();
      this.emit('moduleInstanceRemoved', removed);
      return true;
    }
    return false;
  }

  // Route management
  public getRoutes(): MessageRoute[] {
    return [...this.state.routes];
  }

  public getRoute(id: string): MessageRoute | undefined {
    return this.state.routes.find(route => route.id === id);
  }

  public async addRoute(route: MessageRoute): Promise<void> {
    this.state.routes.push(route);
    this.markDirty();
    this.emit('routeAdded', route);
  }

  public async updateRoute(route: MessageRoute): Promise<void> {
    const index = this.state.routes.findIndex(r => r.id === route.id);
    if (index !== -1) {
      this.state.routes[index] = route;
      this.markDirty();
      this.emit('routeUpdated', route);
    }
  }

  public async removeRoute(id: string): Promise<boolean> {
    const index = this.state.routes.findIndex(r => r.id === id);
    if (index !== -1) {
      const removed = this.state.routes.splice(index, 1)[0];
      this.markDirty();
      this.emit('routeRemoved', removed);
      return true;
    }
    return false;
  }

  // Settings management
  public getSettings(): Record<string, any> {
    return { ...this.state.settings };
  }

  public getSetting(key: string): any {
    return this.state.settings[key];
  }

  public async setSetting(key: string, value: any): Promise<void> {
    this.state.settings[key] = value;
    this.markDirty();
    this.emit('settingChanged', { key, value });
  }

  public async removeSetting(key: string): Promise<boolean> {
    if (key in this.state.settings) {
      delete this.state.settings[key];
      this.markDirty();
      this.emit('settingRemoved', { key });
      return true;
    }
    return false;
  }

  // System state
  public getState(): SystemState {
    return { ...this.state };
  }

  public isStateDirty(): boolean {
    return this.isDirty;
  }

  public getLastSaved(): number {
    return this.state.lastSaved;
  }

  /**
   * Force save state immediately
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
      settings: {},
      lastSaved: Date.now(),
      version: '1.0.0'
    };
    
    this.isDirty = true;
    await this.saveState();
    this.emit('stateReset');
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    this.logger?.info('Destroying StateManager');
    
    // Stop auto-save
    this.stopAutoSave();
    
    // Save any pending changes
    if (this.isDirty) {
      await this.saveState();
    }
    
    this.logger?.info('StateManager destroyed');
  }
} 