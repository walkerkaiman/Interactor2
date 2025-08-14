import { EventEmitter } from 'events';
import { Logger } from '../core/Logger';
import { MessageRouter } from '../core/MessageRouter';
import { ModuleLoader } from '../core/ModuleLoader';
import { StateManager } from '../core/StateManager';
import { moduleRegistry } from './ModuleRegistry';
import { InteractionConfig, ModuleInstance } from '@interactor/shared';

export class InteractorApp extends EventEmitter {
  private static instance: InteractorApp;
  private logger: Logger;
  private messageRouter: MessageRouter;
  private moduleLoader: ModuleLoader;
  private stateManager: StateManager;
  private moduleInstances: Map<string, any> = new Map();

  private constructor() {
    super();
    this.logger = Logger.getInstance();
    this.messageRouter = MessageRouter.getInstance();
    this.moduleLoader = ModuleLoader.getInstance();
    this.stateManager = StateManager.getInstance();
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
    const manifest = this.moduleLoader.getManifest(moduleName) || this.moduleLoader.getModule(moduleName as any);
    const displayName = manifest?.name || moduleName;
    const moduleInstance = moduleRegistry.has(displayName)
      ? await moduleRegistry.create(displayName, config, id)
      : await this.createModuleInstanceFallback(displayName, config, id);

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
        this.stateManager.replaceState({ modules }).then(() => {
          this.emit('module_runtime_update', { moduleId: moduleInstance.id, runtimeData });
        }).catch(error => this.logger.error(`Failed to save runtime state update for module ${moduleInstance.id}:`, error));
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
    await this.stateManager.replaceState({ modules });
    this.emitStateUpdate();
  }

  public async handleModuleConfigUpdate(moduleId: string, configData: any): Promise<void> {
    const modules = this.stateManager.getModuleInstances();
    const moduleInstance = modules.find(m => m.id === moduleId);
    if (!moduleInstance) return;
    (moduleInstance as any).config = configData.newConfig;
    (moduleInstance as any).lastUpdate = Date.now();
    await this.stateManager.replaceState({ modules });
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

  public async registerInteractions(interactions: InteractionConfig[], originClientId?: string): Promise<{ moduleInstances: ModuleInstance[] }>{
    const messageRouter = MessageRouter.getInstance();
    messageRouter.clearRoutes();
    interactions.forEach(interaction => {
      interaction.routes?.forEach(route => {
        const ensured = { ...route } as any;
        if (!ensured.id) ensured.id = `route_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        messageRouter.addRoute(ensured);
      });
    });
    const instances: any[] = [];
    interactions.forEach(interaction => {
      interaction.modules.forEach(moduleInstance => {
        instances.push({
          id: moduleInstance.id,
          moduleName: moduleInstance.moduleName,
          config: moduleInstance.config,
          status: 'stopped',
          messageCount: 0,
          currentFrame: undefined,
          frameCount: 0,
          lastUpdate: Date.now()
        });
      });
    });
    await this.stateManager.replaceState({ interactions, modules: instances });
    for (const inst of instances) {
      try {
        const live = await this.createModuleInstance(inst);
        if (live?.start) await live.start();
      } catch (err) {
        this.logger.error(`Failed to start live module instance for ${inst.moduleName} (${inst.id}):`, err as any);
      }
    }
    this.setupTriggerEventListeners();
    this.emitStateUpdate(originClientId);
    return { moduleInstances: instances };
  }
}

export const interactorApp = InteractorApp.getInstance();


