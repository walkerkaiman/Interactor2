import { EventEmitter } from 'events';
import { Logger } from '../core/Logger';
import { MessageRouter } from '../core/MessageRouter';
import { ModuleLoader } from '../core/ModuleLoader';
import { StateManager } from '../core/StateManager';
import { moduleRegistry } from './ModuleRegistry';
import { InteractionConfig, ModuleInstance } from '@interactor/shared';
import { configNormalizer, UnifiedModuleConfig } from '../core/ConfigNormalizer';

export class InteractorApp extends EventEmitter {
  private static instance: InteractorApp;
  private logger: Logger;
  private messageRouter: MessageRouter;
  private moduleLoader: ModuleLoader;
  private stateManager: StateManager;
  private moduleInstances: Map<string, any> = new Map();
  
  // Runtime update throttling
  private runtimeUpdateBuffer: Map<string, any> = new Map();
  private runtimeUpdateTimer: NodeJS.Timeout | null = null;
  private readonly RUNTIME_UPDATE_INTERVAL = 1000; // 1 second
  
  // State change tracking
  private hasInteractionChanges: boolean = false;

  private constructor() {
    super();
    this.logger = Logger.getInstance();
    this.messageRouter = MessageRouter.getInstance();
    this.moduleLoader = ModuleLoader.getInstance();
    this.stateManager = StateManager.getInstance();
    
    // Start periodic runtime updates to ensure frontend always receives messages
    // this.startPeriodicRuntimeUpdates(); // Removed - now handled by flushRuntimeUpdates
    
    // Ensure runtime updates are sent periodically even when no modules are active
    setInterval(() => {
      this.flushRuntimeUpdates();
    }, this.RUNTIME_UPDATE_INTERVAL);
  }

  public static getInstance(): InteractorApp {
    if (!InteractorApp.instance) InteractorApp.instance = new InteractorApp();
    return InteractorApp.instance;
  }

  public getLiveInstanceMap(): Map<string, any> {
    return this.moduleInstances;
  }

  public getStateSnapshot(): { interactions: any[]; moduleInstances: any[] } {
    return {
      interactions: this.stateManager.getInteractions(),
      moduleInstances: this.stateManager.getModuleInstances(),
    };
  }

  public async restoreModuleInstances(): Promise<void> {
    const moduleInstances = this.stateManager.getModuleInstances();
    this.logger.info(`Restoring ${moduleInstances.length} module instances from data store`);
    for (const moduleInstance of moduleInstances) {
      try {
        const liveInstance = await this.createModuleInstance(moduleInstance);
        if (liveInstance && moduleInstance.status === 'running') {
          await liveInstance.start();
        }
      } catch (error) {
        this.logger.error(`Failed to restore live module instance for ${moduleInstance.moduleName} (${moduleInstance.id}):`, String(error));
      }
    }
    this.setupTriggerEventListeners();
    this.emitStateUpdate();
  }

  public async createModuleInstance(moduleData: any): Promise<any> {
    const { id, moduleName, config } = moduleData;
    this.logger.info(`Creating module instance: ${moduleName} with ID: ${id}`);
    const manifest = this.moduleLoader.getManifest(moduleName) || this.moduleLoader.getModule(moduleName as any);
    const displayName = manifest?.name || moduleName;
    const moduleInstance = moduleRegistry.has(displayName)
      ? await moduleRegistry.create(displayName, config, id)
      : await this.createModuleInstanceFallback(displayName, config, id);

    this.logger.info(`Created module instance with final ID: ${moduleInstance.id}`);
    moduleInstance.setLogger(this.logger);

    moduleInstance.on('stateUpdate', (stateData: any) => {
      this.handleModuleStateUpdate(moduleInstance.id, stateData);
    });
    moduleInstance.on('configUpdated', (configData: any) => {
      this.handleModuleConfigUpdate(moduleInstance.id, configData);
    });
    moduleInstance.on('runtimeStateUpdate', (runtimeData: any) => {
      const modules = this.stateManager.getModuleInstances();
      const stateModuleInstance = modules.find(m => m.id === moduleInstance.id);
      if (stateModuleInstance) {
        const runtimeFields = ['currentTime', 'countdown', 'status', 'isRunning', 'isInitialized', 'isListening', 'lastUpdate'] as const;
        runtimeFields.forEach(field => {
          if ((runtimeData as any)[field] !== undefined) (stateModuleInstance as any)[field] = (runtimeData as any)[field];
        });
        stateModuleInstance.lastUpdate = Date.now();
        
        // Buffer runtime updates and emit them throttled
        this.bufferRuntimeUpdate(moduleInstance.id, runtimeData);
      }
    });
    moduleInstance.on('trigger', (triggerEvent: any) => {
      const message = {
        id: `msg_${Date.now()}_${Math.random()}`,
        source: moduleInstance.id,
        target: '',
        event: triggerEvent.event,
        payload: triggerEvent.payload,
        timestamp: Date.now()
      };
      this.messageRouter.routeMessage(message);
    });

    await moduleInstance.init();
    this.moduleInstances.set(moduleInstance.id, moduleInstance);
    this.logger.info(`Created live instance for ${moduleName} (${moduleInstance.id})`);
    return moduleInstance;
  }

  private async createModuleInstanceFallback(displayName: string, config: any, id?: string): Promise<any> {
    if (displayName === 'Time Input') {
      const { TimeInputModule } = await import('../modules/input/time_input/index');
      return new TimeInputModule(config, id);
    }
    if (displayName === 'Audio Output') {
      const { AudioOutputModule } = await import('../modules/output/audio_output/index');
      return new AudioOutputModule(config, id);
    }
    throw new Error(`No factory available for module: ${displayName}`);
  }

  public async handleModuleStateUpdate(moduleId: string, stateData: any): Promise<void> {
    const modules = this.stateManager.getModuleInstances();
    const moduleInstance = modules.find(m => m.id === moduleId);
    if (!moduleInstance) return;
    const runtimeFields = ['currentTime', 'countdown', 'status', 'isRunning', 'isInitialized', 'isListening', 'lastUpdate'];
    runtimeFields.forEach(field => { if (stateData[field] !== undefined) (moduleInstance as any)[field] = stateData[field]; });
    (moduleInstance as any).lastUpdate = Date.now();
    
    // DO NOT save state here - state should only be saved when register button is pressed
    // Only save state if this is a configuration change, not a runtime update
    // const hasConfigChanges = Object.keys(stateData).some(key => !runtimeFields.includes(key));
    // if (hasConfigChanges) {
    //   await this.stateManager.replaceState({ modules });
    // }
    
    this.emitStateUpdate();
  }

  public async handleModuleConfigUpdate(moduleId: string, configData: any): Promise<void> {
    const modules = this.stateManager.getModuleInstances();
    const moduleInstance = modules.find(m => m.id === moduleId);
    if (!moduleInstance) return;
    (moduleInstance as any).config = configData.newConfig;
    (moduleInstance as any).lastUpdate = Date.now();
    
    // DO NOT save state here - state should only be saved when register button is pressed
    // await this.stateManager.replaceState({ modules });
    
    this.emitStateUpdate();
  }

  public setupTriggerEventListeners(): void {
    this.messageRouter.removeAllListeners();
    const moduleInstances = this.stateManager.getModuleInstances();
    moduleInstances.forEach(instance => {
      const manifest = this.moduleLoader.getManifest(instance.moduleName);
      if (manifest?.type === 'output') {
        const liveInstance = this.moduleInstances.get(instance.id);
        if (!liveInstance) {
          this.logger.warn(`No live instance for output module ${instance.moduleName} (${instance.id})`);
          return;
        }
        this.messageRouter.on(instance.id, (message: any) => {
          if (message.event === 'trigger' || message.event === 'timeTrigger' || message.event === 'manualTrigger') {
            const triggerEvent = { moduleId: message.source, moduleName: 'Input Module', event: message.event, payload: message.payload, timestamp: message.timestamp };
            if (typeof liveInstance.onTriggerEvent === 'function') liveInstance.onTriggerEvent(triggerEvent);
          } else if (message.event === 'stream') {
            const streamEvent = { moduleId: message.source, moduleName: 'Input Module', value: message.payload, timestamp: message.timestamp };
            if (typeof liveInstance.onStreamingEvent === 'function') liveInstance.onStreamingEvent(streamEvent);
          }
        });
      }
    });
  }

  public emitStateUpdate(originClientId?: string): void {
    const data = {
      interactions: this.stateManager.getInteractions(),
      moduleInstances: this.stateManager.getModuleInstances(),
      ...(originClientId ? { originClientId } : {})
    };
    this.emit('state_update', data);
  }

  public emitTriggerEvent(moduleId: string, type: 'manual' | 'auto'): void {
    this.emit('trigger_event', { moduleId, type });
  }

  public async syncInteractionsWithModules(): Promise<void> {
    const interactions = this.stateManager.getInteractions();
    const moduleInstances = this.stateManager.getModuleInstances();
    let updated = false;
    interactions.forEach(interaction => {
      interaction.modules?.forEach((m: any) => {
        const inst = moduleInstances.find(i => i.id === m.id);
        if (inst && JSON.stringify(m.config) !== JSON.stringify(inst.config)) {
          m.config = inst.config;
          updated = true;
        }
      });
    });
    if (updated) await this.stateManager.replaceState({ interactions });
  }

  // Get current complete state
  public async getCurrentState(): Promise<any> {
    const state = this.stateManager.getState();
    
    return {
      timestamp: new Date().toISOString(),
      interactions: state.interactions || [],
      // Runtime data is only sent via WebSocket, not in the state endpoint
    };
  }

  public async registerInteractions(interactions: InteractionConfig[], originClientId?: string): Promise<any> {
    this.logger.info(`[REGISTER] Received registration request`, 'InteractorApp', {
      interactionsCount: interactions.length,
      originClientId,
      firstInteraction: interactions[0] ? {
        modulesCount: interactions[0].modules?.length || 0,
        firstModule: interactions[0].modules?.[0] ? {
          id: interactions[0].modules[0].id,
          moduleName: interactions[0].modules[0].moduleName,
          config: JSON.stringify(interactions[0].modules[0].config)
        } : null
      } : null
    });

    // Clear all existing routes
    this.messageRouter.clearRoutes();

    // Process interactions and normalize configurations
    const instances: ModuleInstance[] = [];
    const normalizedInteractions = interactions.map(interaction => ({
      ...interaction,
      modules: interaction.modules?.map(module => {
        // Clean any nested configurations first
        const cleanedConfig = configNormalizer.cleanNestedConfig(module.config);
        
        // Normalize the configuration to unified structure
        const normalizedConfig = configNormalizer.normalizeConfig(module.moduleName, cleanedConfig);
        
        return {
          ...module,
          config: normalizedConfig // Use unified config structure
        };
      }) || []
    }));
    
    normalizedInteractions.forEach(interaction => {
      // Add routes for this interaction
      interaction.routes?.forEach(route => {
        const routeId = route.id || `r_${Date.now()}`;
        this.messageRouter.addRoute({ id: routeId, source: route.source, target: route.target, event: route.event });
      });

      // Process modules and create instances
      interaction.modules?.forEach(module => {
        // Create module instance with normalized config
        const instance: ModuleInstance = {
          id: module.id,
          moduleName: module.moduleName,
          config: module.config, // Already normalized above
          status: 'stopped',
          lastUpdate: Date.now()
        };
        
        instances.push(instance);
      });
    });
    
    await this.stateManager.replaceState({ interactions: normalizedInteractions, modules: instances });
    
    // Mark that interactions have changed
    this.hasInteractionChanges = true;
    
    // Process each module instance - update existing or create new
    this.logger.info(`Current live instances: ${Array.from(this.moduleInstances.keys()).join(', ')}`);
    for (const inst of instances) {
      try {
        const existingLive = this.moduleInstances.get(inst.id);
        
        if (existingLive) {
          // Update existing live instance with new configuration
          this.logger.info(`Updating existing live instance for ${inst.moduleName} (${inst.id}) with new config`);
          // Extract module-specific config for the live instance
          const moduleSpecificConfig = configNormalizer.extractModuleConfig(inst.moduleName, inst.config as UnifiedModuleConfig);
          await existingLive.updateConfig(moduleSpecificConfig);
        } else {
          // Create new live instance
          this.logger.info(`Creating new live instance for ${inst.moduleName} (${inst.id}) - no existing instance found`);
          // Extract module-specific config for the live instance
          const moduleSpecificConfig = configNormalizer.extractModuleConfig(inst.moduleName, inst.config as UnifiedModuleConfig);
          const live = await this.createModuleInstance({ ...inst, config: moduleSpecificConfig });
          if (live?.start) await live.start();
        }
      } catch (err) {
        this.logger.error(`Failed to process module instance for ${inst.moduleName} (${inst.id}):`, err as any);
      }
    }
    
    this.setupTriggerEventListeners();
    this.emitStateUpdate(originClientId);
    return { moduleInstances: instances };
  }

  private bufferRuntimeUpdate(moduleId: string, runtimeData: any): void {
    // Buffer the runtime update
    this.runtimeUpdateBuffer.set(moduleId, runtimeData);
    
    // Start the timer if it's not already running
    if (!this.runtimeUpdateTimer) {
      this.runtimeUpdateTimer = setTimeout(() => {
        this.flushRuntimeUpdates();
      }, this.RUNTIME_UPDATE_INTERVAL);
    }
  }

  private flushRuntimeUpdates(): void {
    // Clear the timer
    this.runtimeUpdateTimer = null;
    
    // Combine all runtime data into a single update
    const combinedRuntimeData: Record<string, any> = {};
    
    // Add module updates
    this.runtimeUpdateBuffer.forEach((runtimeData, moduleId) => {
      combinedRuntimeData[moduleId] = runtimeData;
    });
    
    // Always add system current time
    combinedRuntimeData.system = { currentTime: new Date().toISOString() };
    
    // Send a single combined runtime update
    this.emit('module_runtime_update', { 
      moduleId: 'combined', 
      runtimeData: combinedRuntimeData,
      newChanges: this.hasInteractionChanges 
    });
    
    // Clear the buffer
    this.runtimeUpdateBuffer.clear();
    
    // Reset the changes flag
    this.hasInteractionChanges = false;
  }
}

export const interactorApp = InteractorApp.getInstance();


