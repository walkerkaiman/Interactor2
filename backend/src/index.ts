import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import * as fs from 'fs-extra';
import * as path from 'path';
import { WebSocketServer } from 'ws';
import { setupWebSocket } from './appapi/websocket';

// Core services (singletons)
import { Logger } from './core/Logger';
import { MessageRouter } from './core/MessageRouter';
import { ModuleLoader } from './core/ModuleLoader';
import { StateManager } from './core/StateManager';
import { SystemStats } from './core/SystemStats';
import { ErrorHandler, InteractorError } from './core/ErrorHandler';
import { FileUploader } from './services/FileUploader';
import { fileUploader } from './services/fileUploaderInstance';
import { moduleRegistry } from './app/ModuleRegistry';
// Transitional explicit API registrations to ensure factories are available in dev
import './modules/input/time_input/api/index';
import './modules/output/audio_output/api/index';
import './modules/input/frames_input/api/index';
import './modules/input/http_input/api/index';
import './modules/input/osc_input/api/index';
import './modules/input/serial_input/api/index';
import './modules/output/dmx_output/api/index';
import './modules/output/http_output/api/index';
import './modules/output/osc_output/api/index';
import { buildHttpRoutes } from './appapi/httpRoutes';

// Types
import {
  ApiResponse,
  ModuleListResponse,
  InteractionListResponse,
  InteractionConfig,
  ModuleInstance
} from '@interactor/shared';

export class InteractorServer {
  private app: express.Application;
  private server: any;
  private wss!: WebSocketServer;
  private logger: Logger;
  private messageRouter: MessageRouter;
  private moduleLoader: ModuleLoader;
  private stateManager: StateManager;
  private systemStats: SystemStats;
  private config: any;
  private isShuttingDown = false;
  private moduleInstances: Map<string, any> = new Map(); // Live module instances registry
  private idMapping: Map<string, string> = new Map(); // Map external IDs to internal IDs
  private fileUploader!: FileUploader;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    
    // Initialize singleton services
    this.logger = Logger.getInstance();
    this.logger.setLevel('debug'); // Ensure debug level logging
    this.messageRouter = MessageRouter.getInstance();
    this.moduleLoader = ModuleLoader.getInstance();
    this.stateManager = StateManager.getInstance();
    this.systemStats = SystemStats.getInstance();
  }

  /**
   * Set configuration (useful for testing)
   */
  public setConfig(config: {
    server: { port: number; host: string };
    logging: { level: string; file: string };
    modules: { autoLoad: boolean; modulesPath?: string };
  }): void {
    this.config = config;
  }

  /**
   * Initialize the server
   */
  public async init(): Promise<void> {
    try {
      await this.loadConfig();
      await this.initializeServices();
      await this.setupMiddleware();
      await this.setupRoutes();
      this.wss = setupWebSocket(this.server);
      await this.setupModuleStateListeners();
    } catch (error) {
      this.logger.error('Failed to initialize Interactor Server', 'InteractorServer', { error: String(error) });
      throw error;
    }
  }

  /**
   * Load configuration from file
   */
  private async loadConfig(): Promise<void> {
    // Try multiple locations so running from ts-node-dev works
    const candidatePaths = [
      path.join(__dirname, '../../../../config/system.json'), // repo root
      path.join(__dirname, '../../../config/system.json'),     // backend/config
      path.join(__dirname, '../../config/system.json')         // dist/config fallback
    ];

    for (const configPath of candidatePaths) {
      if (await fs.pathExists(configPath)) {
        const configData = await fs.readFile(configPath, 'utf-8');
        this.config = JSON.parse(configData);
        return;
      }
    }

    // Default configuration
    this.config = {
      server: {
        port: 3001,
        host: '0.0.0.0'
      },
      logging: {
        level: 'info',
        file: 'logs/interactor.log'
      },
      modules: {
        autoLoad: true
      }
    };
  }

  /**
   * Initialize core services
   */
  private async initializeServices(): Promise<void> {
    try {
      this.logger.info('Initializing Interactor services...');

      // Initialize state manager
      await this.stateManager.init();
      this.logger.info('State manager initialized');

      // Initialize module loader (load manifests once at startup)
      await this.moduleLoader.init();
      this.logger.info('Module loader initialized');

      // Restore live module instances from data store
      await this.restoreModuleInstances();
      this.logger.info('Module instances restored');

      // Use the global file uploader instance
      this.fileUploader = fileUploader;

      // Register Audio Output module
      this.fileUploader.registerModule('audio-output', {
        allowedExtensions: ['.wav', '.mp3', '.ogg', '.m4a', '.flac'],
        subdirectory: 'audio',
        maxFileSize: 50 * 1024 * 1024 // 50MB
      });

      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services:', String(error));
      throw error;
    }
  }

  /**
   * Restore live module instances from data store
   */
  private async restoreModuleInstances(): Promise<void> {
    try {
      const moduleInstances = this.stateManager.getModuleInstances();
      const interactions = this.stateManager.getInteractions();
      const failedInstances = [];
      
      this.logger.info(`Restoring ${moduleInstances.length} module instances from data store`);
      
      // Create live instances for supported modules in the data store (inputs and outputs)
      for (const moduleInstance of moduleInstances) {
        try {
          const liveInstance = await this.createModuleInstance(moduleInstance);
          if (liveInstance) {
            // Set up state listeners for this module
            this.setupModuleStateListener(moduleInstance);

            // Start the live module instance if it was previously running
            if (moduleInstance.status === 'running') {
              await liveInstance.start();
              this.logger.info(`Restored and started live module instance for ${moduleInstance.moduleName} (${moduleInstance.id})`);
            } else {
              this.logger.info(`Restored live module instance for ${moduleInstance.moduleName} (${moduleInstance.id}) - not starting (status: ${moduleInstance.status})`);
            }
          }
        } catch (error) {
          this.logger.error(`Failed to restore live module instance for ${moduleInstance.moduleName} (${moduleInstance.id}):`, { message: error.message, stack: error.stack });
          this.logger.info(`Skipping failed restoration of ${moduleInstance.moduleName} (${moduleInstance.id}) to allow server startup.`);
          failedInstances.push(moduleInstance.id);
        }
      }
      
      // Remove failed instances from state to prevent future errors
      if (failedInstances.length > 0) {
        const updatedModuleInstances = moduleInstances.filter(instance => !failedInstances.includes(instance.id));
        await this.stateManager.replaceState({ modules: updatedModuleInstances });
        this.logger.info(`Removed ${failedInstances.length} failed module instances from state manager.`);
      }
      
      // Set up trigger event listeners for output modules
      this.setupTriggerEventListeners();
      
      this.logger.info(`Successfully restored ${this.moduleInstances.size} live module instances`);
    } catch (error) {
      this.logger.error('Failed to restore module instances:', { message: error.message, stack: error.stack });
      this.logger.info('Continuing server startup despite restoration failure.');
    }
  }

  /**
   * Setup Express middleware
   */
  private async setupMiddleware(): Promise<void> {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for development
    }));
    
    // Compression
    this.app.use(compression());
    
    // CORS
    this.app.use(cors());
    
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // JSON parsing error handler
    this.app.use((err: any, req: any, res: any, next: any) => {
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        });
      }
      next(err);
    });
    
    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, 'HTTP', {
        ip: req.ip,
        userAgent: req.get('User-Agent') || undefined
      });
      next();
    });
    
    // Serve static files from frontend build (DISABLED for development)
    // const frontendPath = path.join(process.cwd(), '..', 'frontend', 'dist');
    // if (await fs.pathExists(frontendPath)) {
    //   this.app.use(express.static(frontendPath));
    //   
    //   // Serve index.html for all non-API routes (SPA routing)
    //   this.app.get('*', (req, res, next) => {
    //     if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
    //       res.sendFile(path.join(frontendPath, 'index.html'));
    //     } else {
    //       next();
    //     }
    //   });
    // }
  }

  /**
   * Get the correct module name from manifest
   */
  private getModuleNameFromManifest(moduleName: string): string {
    // Try to get the manifest to get the correct display name
    const manifest = this.moduleLoader.getManifest(moduleName);
    if (manifest) {
      return manifest.name;
    }
    
    // Fallback to the provided name
    return moduleName;
  }

  /**
   * Get the internal module reference (directory name)
   */
  private getInternalModuleName(moduleName: string): string {
    // Map display names to internal names
    const nameMap: Record<string, string> = {
      'Time Input': 'time_input',
      'Audio Output': 'audio_output',
      'DMX Output': 'dmx_output',
      'OSC Input': 'osc_input',
      'OSC Output': 'osc_output',
      'HTTP Input': 'http_input',
      'HTTP Output': 'http_output',
      'Serial Input': 'serial_input',
      'Frames Input': 'frames_input'
    };
    
    return nameMap[moduleName] || moduleName;
  }

  /**
   * Update module ID in state manager
   */
  private async updateModuleIdInStateManager(oldId: string, newId: string): Promise<void> {
    try {
      const moduleInstances = this.stateManager.getModuleInstances();
      const moduleInstance = moduleInstances.find(m => m.id === oldId);
      
      if (moduleInstance) {
        moduleInstance.id = newId;
        await this.stateManager.replaceState({ modules: moduleInstances });
        this.logger.debug(`Updated module ID in state manager: ${oldId} -> ${newId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update module ID in state manager:`, String(error));
    }
  }

  /**
   * Create a live module instance
   */
  private async createModuleInstance(moduleData: ModuleInstance): Promise<any> {
    try {
      const moduleName = this.getInternalModuleName(moduleData.moduleName);
      this.logger.debug(`Attempting to create instance for module: ${moduleData.moduleName} (${moduleData.id})`, { moduleName });
      
      if (!moduleName) {
        this.logger.error(`Failed to resolve internal module name for ${moduleData.moduleName} (${moduleData.id})`);
        return null;
      }
      
      this.logger.debug(`Resolved internal module name: ${moduleName} for ${moduleData.moduleName} (${moduleData.id})`);
      
      // Check if module is registered in the registry
      if (!moduleRegistry.has(moduleName)) {
        this.logger.error(`Module not registered in registry: ${moduleName} (${moduleData.id})`);
        return null;
      }
      
      this.logger.debug(`Module found in registry: ${moduleName} (${moduleData.id})`);
      
      // Create instance using the module registry
      this.logger.debug(`Creating new instance of ${moduleData.moduleName} with ID ${moduleData.id}`, { config: moduleData.config });
      const instance = await moduleRegistry.create(moduleName, moduleData.config || {}, moduleData.id);
      
      this.logger.debug(`Created instance of ${moduleName} (${moduleData.moduleName}, ID: ${moduleData.id})`);
      
      // Set logger and message router
      instance.setLogger(this.logger);
      
      // Initialize the module instance
      this.logger.debug(`Initializing instance of ${moduleName} (${moduleData.moduleName}, ID: ${moduleData.id})`);
      await instance.init();
      
      this.logger.debug(`Initialized instance of ${moduleName} (${moduleData.moduleName}, ID: ${moduleData.id})`);
      
      // Store the live instance
      this.moduleInstances.set(moduleData.id, instance);
      this.logger.debug(`Stored live instance for ${moduleName} (${moduleData.moduleName}, ID: ${moduleData.id}) in moduleInstances`);
      
      return instance;
    } catch (error) {
      this.logger.error(`Failed to create module instance for ${moduleData.moduleName} (${moduleData.id}):`);
      this.logger.error(`Error message: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
      if (error instanceof Error) {
        this.logger.error(`Error name: ${error.name}`);
        this.logger.error(`Error constructor: ${error.constructor.name}`);
      }
      return null;
    }
  }

  /**
   * Transitional fallback factory for well-known modules until all modules self-register
   */
  private async createModuleInstanceFallback(displayName: string, config: any, id?: string): Promise<any> {
    if (displayName === 'Time Input') {
      this.logger.debug(`Creating Time Input module with config:`, config);
      const { TimeInputModule } = await import('./modules/input/time_input/index');
      const moduleInstance = new TimeInputModule(config, id);
      return moduleInstance;
    }
    if (displayName === 'Audio Output') {
      const { AudioOutputModule } = await import('./modules/output/audio_output/index');
      const moduleInstance = new AudioOutputModule(config, id);
      return moduleInstance;
    }
    throw new Error(`No factory available for module: ${displayName}`);
  }
  
  /**
   * Handle state update from a live module instance
   */
  private async handleModuleStateUpdate(moduleId: string, stateData: any): Promise<void> {
    try {
      const moduleInstances = this.stateManager.getModuleInstances();
      const moduleInstance = moduleInstances.find(m => m.id === moduleId);
      
      if (moduleInstance) {
        // Only update runtime fields, not configuration
        // Runtime fields that should be updated: currentTime, countdown, status, etc.
        const runtimeFields = ['currentTime', 'countdown', 'status', 'isRunning', 'isInitialized', 'isListening', 'lastUpdate'];
        
        // Update only runtime fields
        runtimeFields.forEach(field => {
          if ((stateData as any)[field] !== undefined) {
            (moduleInstance as any)[field] = (stateData as any)[field];
          }
        });
        
        moduleInstance.lastUpdate = Date.now();
        
        // Save to StateManager
        await this.stateManager.replaceState({ modules: moduleInstances });
        
        // Broadcast to frontend
        this.broadcastStateUpdate();
        
        this.logger.debug(`Updated runtime state for module ${moduleId}`, stateData);
      }
    } catch (error) {
      this.logger.error(`Failed to handle state update for module ${moduleId}:`, String(error));
    }
  }
  
  /**
   * Handle config update from a live module instance
   */
  private async handleModuleConfigUpdate(moduleId: string, configData: any): Promise<void> {
    try {
      const moduleInstances = this.stateManager.getModuleInstances();
      const moduleInstance = moduleInstances.find(m => m.id === moduleId);
      
      if (moduleInstance) {
        // Update the stored config
        moduleInstance.config = configData.newConfig;
        moduleInstance.lastUpdate = Date.now();
        
        // Save to StateManager
        await this.stateManager.replaceState({ modules: moduleInstances });
        
        // Broadcast to frontend
        this.broadcastStateUpdate();
        
        this.logger.debug(`Updated config for module ${moduleId}`, configData);
      }
    } catch (error) {
      this.logger.error(`Failed to handle config update for module ${moduleId}:`, String(error));
    }
  }

  /**
   * Setup minimal REST API routes
   */
  private setupRoutes(): void {
    // Mount thin controllers router (in-progress extraction)
    this.app.use(buildHttpRoutes());
    // Health check (will be removed once fully extracted into appapi)
    this.app.get('/health', ErrorHandler.asyncHandler(async (req, res) => {
      const health = this.systemStats.getHealthStatus();
      const uptime = this.systemStats.getUptimeFormatted();
      res.json({ status: health.status, uptime, timestamp: Date.now(), message: health.message });
    }));

    // System stats (duplicate during transition)
    this.app.get('/api/stats', (req, res) => {
      res.json({ success: true, data: this.systemStats.getStats() });
    });

    // Module management - list available modules
    this.app.get('/api/modules', (req, res) => {
      const modules = this.moduleLoader.getAllManifests();
      this.logger.debug(`API: Returning ${modules.length} modules`, 'InteractorServer');
      const response: ModuleListResponse = { modules };
      res.json({ success: true, data: response });
    });

    // Get module instances and their real-time state (must come before /:name route)
    this.app.get('/api/modules/instances', ErrorHandler.asyncHandler(async (req, res) => {
      const moduleInstances = this.stateManager.getModuleInstances();
      res.json({ 
        success: true, 
        data: { 
          instances: moduleInstances,
          count: moduleInstances.length 
        } 
      });
    }));

    // Get specific module instance state (must come before /:name route)
    this.app.get('/api/modules/instances/:id', ErrorHandler.asyncHandler(async (req, res) => {
      const moduleInstance = this.stateManager.getModuleInstance(req.params.id as string);
      if (!moduleInstance) {
        throw InteractorError.notFound('Module instance', req.params.id);
      }
      res.json({ success: true, data: moduleInstance });
    }));

    // Update module instance configuration
    this.app.put('/api/modules/instances/:id', ErrorHandler.asyncHandler(async (req, res) => {
      if (!req.body.config) {
        throw InteractorError.validation('Configuration data is required', {
          field: 'config',
          provided: req.body
        }, ['Include config object in request body']);
      }

      const moduleInstances = this.stateManager.getModuleInstances();
      const moduleInstance = moduleInstances.find(m => m.id === req.params.id);
      
      if (!moduleInstance) {
        this.logger.error(`Module instance not found in state manager for ID: ${req.params.id}`);
        throw InteractorError.notFound('Module instance', req.params.id);
      }
      
      // Update module configuration in data store
      const newConfig = { ...moduleInstance.config, ...req.body.config };
      moduleInstance.config = newConfig;
      moduleInstance.lastUpdate = Date.now();
      
      this.logger.info(`Updating module config for ${moduleInstance.moduleName} (${req.params.id}):`);
      this.logger.debug('Module config update details', 'InteractorServer', {
        oldConfig: moduleInstance.config,
        newConfig: newConfig,
        changes: req.body.config
      });
      
      // CRITICAL: Also update the live module instance if it exists
      let liveInstance = this.moduleInstances.get(req.params.id as string);
      if (!liveInstance) {
        this.logger.warn(`No live instance found for module ${req.params.id}, attempting to create one.`);
        try {
          liveInstance = await this.createModuleInstance(moduleInstance);
          if (liveInstance) {
            this.logger.info(`Created live instance for ${moduleInstance.moduleName} (${req.params.id}) during config update.`);
          } else {
            this.logger.error(`Failed to create live instance for ${moduleInstance.moduleName} (${req.params.id}) during config update.`);
          }
        } catch (error) {
          this.logger.error(`Failed to create live module instance during config update:`, { message: error.message, stack: error.stack });
        }
      }
      
      if (liveInstance) {
        try {
          await liveInstance.updateConfig(newConfig);
          this.logger.info(`Updated live module instance config for ${moduleInstance.moduleName} (${req.params.id})`);
        } catch (error) {
          this.logger.error(`Failed to update live module config:`, { message: error.message, stack: error.stack });
          throw InteractorError.internal('Failed to update module configuration', error as Error);
        }
      } else {
        this.logger.warn(`No live instance found for module ${req.params.id}, only updated data store`);
      }
      
      // Update state
      await this.stateManager.replaceState({ modules: moduleInstances });
      
      // Sync interactions with updated module instances
      await this.syncInteractionsWithModules();
      
      // Broadcast state update
      this.broadcastStateUpdate();
      
      res.json({ 
        success: true, 
        message: 'Module configuration updated successfully',
        data: moduleInstance
      });
    }));

    // Update module instance configuration (specific endpoint)
    this.app.put('/api/modules/instances/:id/config', async (req, res) => {
      try {
        this.logger.info(`[CONFIG UPDATE] Received PUT request for module ${req.params.id}`);
        this.logger.debug(`[CONFIG UPDATE] Request body:`, req.body);
        
        const moduleInstances = this.stateManager.getModuleInstances();
        const moduleInstance = moduleInstances.find(m => m.id === req.params.id);
        
        if (!moduleInstance) {
          this.logger.error(`[CONFIG UPDATE] Module instance not found: ${req.params.id}`);
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        this.logger.info(`[CONFIG UPDATE] Found module instance: ${moduleInstance.moduleName} (${moduleInstance.id})`);
        this.logger.debug(`[CONFIG UPDATE] Current config:`, moduleInstance.config);
        
        // Update module configuration
        if (req.body.config) {
          this.logger.info(`[CONFIG UPDATE] Processing config update for ${req.params.id}`);
          this.logger.debug(`[CONFIG UPDATE] Incoming config:`, req.body.config);
          
          // Extract the actual config from the nested structure
          let actualConfig = req.body.config;
          
          // If the config contains the module ID as a key, extract that nested config
          if (req.params.id in req.body.config) {
            this.logger.debug(`[CONFIG UPDATE] Found nested config structure, extracting from key: ${req.params.id}`);
            actualConfig = req.body.config[req.params.id];
            this.logger.debug(`[CONFIG UPDATE] Extracted config:`, actualConfig);
          }
          
          // Merge with existing config, avoiding nested structures
          const oldConfig = { ...moduleInstance.config };
          moduleInstance.config = { ...moduleInstance.config, ...actualConfig };
          
          // Remove any nested module ID keys that might have been created
          if (req.params.id in moduleInstance.config) {
            this.logger.debug(`[CONFIG UPDATE] Removing nested module ID key: ${req.params.id}`);
            delete moduleInstance.config[req.params.id];
          }
          
          this.logger.info(`[CONFIG UPDATE] Config merged successfully`);
          this.logger.debug(`[CONFIG UPDATE] Old config:`, oldConfig);
          this.logger.debug(`[CONFIG UPDATE] New config:`, moduleInstance.config);
          
          // Update the live module instance if it exists
          const liveInstance = this.moduleInstances.get(req.params.id);
          if (liveInstance && typeof liveInstance.updateConfig === 'function') {
            this.logger.info(`[CONFIG UPDATE] Updating live module instance for ${req.params.id}`);
            try {
              await liveInstance.updateConfig(actualConfig);
              this.logger.info(`[CONFIG UPDATE] Successfully updated live module instance configuration for ${req.params.id}`);
            } catch (updateError) {
              this.logger.error(`[CONFIG UPDATE] Failed to update live module instance configuration for ${req.params.id}:`, updateError);
            }
          } else {
            this.logger.warn(`[CONFIG UPDATE] No live instance found or updateConfig method not available for ${req.params.id}`);
            this.logger.debug(`[CONFIG UPDATE] Live instance exists: ${!!liveInstance}`);
            this.logger.debug(`[CONFIG UPDATE] Has updateConfig method: ${liveInstance && typeof liveInstance.updateConfig === 'function'}`);
          }
        } else {
          this.logger.warn(`[CONFIG UPDATE] No config provided in request body for ${req.params.id}`);
        }
        
        moduleInstance.lastUpdate = Date.now();
        
        this.logger.info(`[CONFIG UPDATE] Saving updated state to file for ${req.params.id}`);
        // Update state
        await this.stateManager.replaceState({ modules: moduleInstances });
        this.logger.info(`[CONFIG UPDATE] State saved successfully for ${req.params.id}`);
        
        // Broadcast state update
        this.logger.info(`[CONFIG UPDATE] Broadcasting state update for ${req.params.id}`);
        this.broadcastStateUpdate();
        
        this.logger.info(`[CONFIG UPDATE] Configuration update completed successfully for ${req.params.id}`);
        return res.json({ 
          success: true, 
          message: 'Module configuration updated successfully',
          data: moduleInstance
        });
      } catch (error) {
        this.logger.error(`[CONFIG UPDATE] Failed to update module configuration for ${req.params.id}:`, error);
        return res.status(500).json({ success: false, error: String(error) });
      }
    });

    this.app.get('/api/modules/:name', (req, res) => {
      const manifest = this.moduleLoader.getManifest(req.params.name as string);
      if (manifest) {
        return res.json({ success: true, data: manifest });
      } else {
        return res.status(404).json({ success: false, error: 'Module not found' });
      }
    });

    // Interaction management - atomic updates only
    this.app.get('/api/interactions', (req, res) => {
      const interactions = this.stateManager.getInteractions();
      const moduleInstances = this.stateManager.getModuleInstances();
      
      this.logger.debug(`API: Returning ${interactions.length} interactions with ${moduleInstances.length} module instances`, 'InteractorServer');
      
      // Log interaction details for debugging
      interactions.forEach(interaction => {
        this.logger.debug(`API: Interaction ${interaction.id} has ${interaction.modules?.length || 0} modules`, 'InteractorServer');
      });
      
      // Merge real-time module data into interactions
      const enrichedInteractions = interactions.map(interaction => ({
        ...interaction,
        modules: interaction.modules?.map(module => {
          const instanceUpdate = moduleInstances.find(instance => instance.id === module.id);
          if (instanceUpdate) {
            return { ...module, ...instanceUpdate };
          }
          return module;
        }) || []
      }));
      
      const response: InteractionListResponse = { interactions: enrichedInteractions };
      this.logger.debug(`API: Sending response with ${enrichedInteractions.length} interactions`, 'InteractorServer');
      return res.json({ success: true, data: response });
    });

    // Register entire interaction map (atomic update)
    this.app.post('/api/interactions/register', async (req, res) => {
      try {
        this.logger.info(`[INTERACTION REG] Received interaction registration request`);
        this.logger.debug(`[INTERACTION REG] Request body:`, req.body);
        
        const interactionMap: InteractionConfig[] = req.body.interactions || [];
        const originClientId: string | undefined = (req.get('X-Client-Id') as string) || req.body.clientId;
        
        this.logger.info(`[INTERACTION REG] Processing ${interactionMap.length} interactions`);
        
        // Replace entire interaction state
        await this.stateManager.replaceState({ interactions: interactionMap });
        
        // Process routes from interactions and add to MessageRouter (no event remapping)
        const messageRouter = MessageRouter.getInstance();
        messageRouter.clearRoutes();
        interactionMap.forEach(interaction => {
          interaction.routes?.forEach(route => {
            const ensuredRoute = { ...route } as any;
            if (!ensuredRoute.id) {
              ensuredRoute.id = `route_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            }
            messageRouter.addRoute(ensuredRoute);
          });
        });
        
        // Create module instances for all modules in interactions
        const moduleInstances: any[] = [];
        const existingModuleInstances = this.stateManager.getModuleInstances();
        
        this.logger.info(`[INTERACTION REG] Processing ${interactionMap.reduce((sum, i) => sum + i.modules.length, 0)} modules`);
        
        interactionMap.forEach(interaction => {
          interaction.modules.forEach(moduleInstance => {
            this.logger.debug(`[INTERACTION REG] Processing module: ${moduleInstance.moduleName} (${moduleInstance.id})`);
            this.logger.debug(`[INTERACTION REG] Module config:`, moduleInstance.config);
            
            // Check if this module already exists and preserve its status
            const existingInstance = existingModuleInstances.find(m => m.id === moduleInstance.id);
            const currentStatus = existingInstance ? existingInstance.status : 'stopped';
            
            this.logger.debug(`[INTERACTION REG] Existing instance found: ${!!existingInstance}`);
            this.logger.debug(`[INTERACTION REG] Current status: ${currentStatus}`);
            
            // Create a module instance with state
            const instance = {
              id: moduleInstance.id,
              moduleName: moduleInstance.moduleName,
              config: moduleInstance.config,
              status: currentStatus, // Preserve existing status
              messageCount: existingInstance ? existingInstance.messageCount : 0,
              currentFrame: existingInstance ? existingInstance.currentFrame : undefined,
              frameCount: existingInstance ? existingInstance.frameCount : 0,
              lastUpdate: Date.now()
            };
            moduleInstances.push(instance);
            
            this.logger.debug(`[INTERACTION REG] Created instance config:`, instance.config);
          });
        });
        
        this.logger.info(`[INTERACTION REG] Saving ${moduleInstances.length} module instances to state`);
        // Store module instances in state
        await this.stateManager.replaceState({ 
          interactions: interactionMap,
          modules: moduleInstances 
        });
        
        // Create live module instances for inputs and outputs; start inputs if appropriate
        for (const moduleInstance of moduleInstances) {
          try {
            this.logger.debug(`[INTERACTION REG] Processing live instance for: ${moduleInstance.moduleName} (${moduleInstance.id})`);
            
            let liveInstance = this.moduleInstances.get(moduleInstance.id);
            if (!liveInstance) {
              this.logger.info(`[INTERACTION REG] Creating live instance for ${moduleInstance.moduleName} (${moduleInstance.id}) during interaction registration.`);
              liveInstance = await this.createModuleInstance(moduleInstance);
              if (liveInstance) {
                this.logger.info(`[INTERACTION REG] Successfully created live instance for ${moduleInstance.moduleName} (${moduleInstance.id}).`);
                const displayName = this.getModuleNameFromManifest(moduleInstance.moduleName);
                const internalName = this.getInternalModuleName(displayName);
                // Start inputs automatically (e.g., time_input)
                if (displayName === 'Time Input' || internalName === 'time_input') {
                  try {
                    await liveInstance.start();
                    this.logger.info(`[INTERACTION REG] Started live module instance for ${moduleInstance.moduleName} (${moduleInstance.id})`);
                    moduleInstance.status = 'running';
                  } catch (startError) {
                    this.logger.error(`[INTERACTION REG] Failed to start live module instance for ${moduleInstance.moduleName} (${moduleInstance.id}):`, { message: startError.message, stack: startError.stack });
                  }
                }
              } else {
                this.logger.error(`[INTERACTION REG] Failed to create live instance for ${moduleInstance.moduleName} (${moduleInstance.id}).`);
              }
            } else {
              this.logger.info(`[INTERACTION REG] Live instance already exists for ${moduleInstance.moduleName} (${moduleInstance.id}).`);
              // DO NOT update existing live instances with saved state - preserve their current configuration
              this.logger.info(`[INTERACTION REG] Preserving existing live module instance configuration for ${moduleInstance.moduleName} (${moduleInstance.id})`);
            }
          } catch (error) {
            this.logger.error(`[INTERACTION REG] Failed to create/start live module instance for ${moduleInstance.moduleName} (${moduleInstance.id}):`, { message: error.message, stack: error.stack });
          }
        }
        
        // Re-wire router after (re)creating instances
        this.setupTriggerEventListeners();
        
        // Broadcast state update to all clients with originClientId (echo suppression friendly)
        this.logger.info('[INTERACTION REG] Register completed, broadcasting state_update', 'InteractorServer', { originClientId: originClientId || 'none' });
        this.broadcastStateUpdate(originClientId);
        
        res.json({ 
          success: true, 
          message: 'Interaction map registered successfully',
          count: interactionMap.length,
          moduleInstances: moduleInstances.length
        });
      } catch (error) {
        this.logger.error(`[INTERACTION REG] Failed to register interactions:`, { message: error.message, stack: error.stack });
        res.status(400).json({ success: false, error: String(error) });
      }
    });

    // Create a new module instance
    this.app.post('/api/modules/instances', async (req, res) => {
      try {
        const { moduleName, config } = req.body;
        
        if (!moduleName) {
          return res.status(400).json({ success: false, error: 'Module name is required' });
        }
        
        // Check if module exists
        const manifest = this.moduleLoader.getManifest(moduleName);
        if (!manifest) {
          return res.status(404).json({ success: false, error: 'Module not found' });
        }
        
        // Generate instance ID
        const instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create live module instance using createModuleInstance method
        const liveInstance = await this.createModuleInstance({
          id: instanceId,
          moduleName,
          config: config || {}
        });
        
        if (!liveInstance) {
          return res.status(400).json({ success: false, error: 'Failed to create module instance' });
        }
        
        // Create instance data for state manager
        const instance = {
          id: instanceId,
          moduleName,
          config: liveInstance.getConfig ? liveInstance.getConfig() : (config || {}),
          status: 'stopped' as const,
          messageCount: 0,
          currentFrame: undefined,
          frameCount: 0,
          lastUpdate: Date.now()
        };
        
        // Add to state
        await this.stateManager.addModuleInstance(instance);
        
        // Broadcast state update to all connected clients
        this.broadcastStateUpdate();
        
        return res.json({ 
          success: true, 
          data: instance,
          message: 'Module instance created successfully'
        });
      } catch (error) {
        return res.status(500).json({ success: false, error: String(error) });
      }
    });

    // Manual trigger for outputs
    this.app.post('/api/trigger/:moduleId', async (req, res) => {
      try {
        const moduleId = req.params.moduleId as string;

        // Attempt to retrieve a live module instance first
        let moduleInstance = this.moduleInstances.get(moduleId);

        // If a live instance doesn't exist yet, but we have the module data in state, create it on-demand
        if (!moduleInstance) {
          const storedModuleData = this.stateManager.getModuleInstance(moduleId);
          if (storedModuleData) {
            try {
              moduleInstance = await this.createModuleInstance(storedModuleData);
            } catch (err) {
              this.logger.error(`Failed to create live instance for manual trigger of ${moduleId}:`, 'InteractorServer', { error: String(err) });
            }
          }
        }

        if (!moduleInstance) {
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        const payload = req.body?.payload || {};
        
        // Handle time input module specific functionality
        if (moduleInstance.name === 'Time Input') {
          if (payload.type === 'manualTrigger') {
            if ('manualTrigger' in moduleInstance && typeof moduleInstance.manualTrigger === 'function') {
              await moduleInstance.manualTrigger();
              
              // Emit trigger event to frontend
              this.broadcastTriggerEvent(req.params.moduleId as string, 'manual');
              
              return res.json({ success: true, message: 'Time trigger activated' });
            }
          } else if (payload.type === 'stopStream') {
            if ('stopStream' in moduleInstance && typeof moduleInstance.stopStream === 'function') {
              await moduleInstance.stopStream();
              return res.json({ success: true, message: 'Time stream stopped' });
            }
          }
        }
        
        // Handle general manual trigger
        if ('onManualTrigger' in moduleInstance && typeof moduleInstance.onManualTrigger === 'function') {
          await moduleInstance.onManualTrigger();
          
          // Emit trigger event to frontend
          this.broadcastTriggerEvent(req.params.moduleId as string, 'manual');
          
          return res.json({ success: true });
        } else {
          return res.status(400).json({ success: false, error: 'Module does not support manual triggering' });
        }
      } catch (error) {
        return res.status(400).json({ success: false, error: String(error) });
      }
    });

    // Start module instance
    this.app.post('/api/modules/instances/:id/start', async (req, res) => {
      try {
        const moduleInstances = this.stateManager.getModuleInstances();
        const moduleInstance = moduleInstances.find(m => m.id === req.params.id);
        
        if (!moduleInstance) {
          this.logger.error(`Module instance not found in state manager for ID: ${req.params.id}`);
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        // Create live module instance if it doesn't exist
        let liveInstance = this.moduleInstances.get(req.params.id);
        if (!liveInstance) {
          this.logger.warn(`No live instance found for module ${req.params.id}, attempting to create one.`);
          liveInstance = await this.createModuleInstance(moduleInstance);
          if (!liveInstance) {
            this.logger.error(`Failed to create live instance for ${moduleInstance.moduleName} (${req.params.id})`);
            throw new Error(`Failed to create live instance for ${moduleInstance.moduleName}`);
          }
          this.logger.info(`Created live instance for ${moduleInstance.moduleName} (${req.params.id}) during start request.`);
        }
        
        // Start the live module instance
        try {
          await liveInstance.start();
          this.logger.info(`Module ${moduleInstance.moduleName} (${req.params.id}) started successfully`);
        } catch (error) {
          this.logger.error(`Failed to start module ${moduleInstance.moduleName}:`, { message: error.message, stack: error.stack });
          return res.status(500).json({ success: false, error: String(error) });
        }
        
        // Update module status to running
        moduleInstance.status = 'running';
        moduleInstance.lastUpdate = Date.now();
        
        // Update state
        await this.stateManager.replaceState({ modules: moduleInstances });
        
        // Broadcast state update
        this.broadcastStateUpdate();
        
        return res.json({ 
          success: true, 
          message: 'Module started successfully',
          data: moduleInstance
        });
      } catch (error) {
        this.logger.error(`Failed to start module:`, { message: error.message, stack: error.stack });
        return res.status(500).json({ success: false, error: String(error) });
      }
    });

    // Stop module instance
    this.app.post('/api/modules/instances/:id/stop', async (req, res) => {
      try {
        const moduleInstances = this.stateManager.getModuleInstances();
        const moduleInstance = moduleInstances.find(m => m.id === req.params.id);
        
        if (!moduleInstance) {
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        // Stop the live module instance if it exists
        const liveInstance = this.moduleInstances.get(req.params.id);
        if (liveInstance) {
          try {
            await liveInstance.stop();
            this.logger.info(`Live module ${moduleInstance.moduleName} (${req.params.id}) stopped successfully`);
          } catch (error) {
            this.logger.error(`Failed to stop live module ${moduleInstance.moduleName}:`, String(error));
            return res.status(500).json({ success: false, error: String(error) });
          }
        } else {
          this.logger.warn(`No live instance found for module ${req.params.id}`);
        }
        
        // Update module status to stopped
        moduleInstance.status = 'stopped';
        moduleInstance.lastUpdate = Date.now();
        
        // Update state
        await this.stateManager.replaceState({ modules: moduleInstances });
        
        // Broadcast state update
        this.broadcastStateUpdate();
        
        return res.json({ 
          success: true, 
          message: 'Module stopped successfully',
          data: moduleInstance
        });
      } catch (error) {
        this.logger.error(`Failed to stop module: ${String(error)}`);
        return res.status(500).json({ success: false, error: String(error) });
      }
    });

    // Settings management
    this.app.get('/api/settings', (req, res) => {
      const settings = this.stateManager.getSettings();
      res.json({ success: true, data: settings });
    });

    this.app.put('/api/settings/:key', async (req, res) => {
      try {
        await this.stateManager.setSetting(req.params.key as string, req.body.value);
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ success: false, error: String(error) });
      }
    });

    // Logs (optional - for debugging)
    this.app.get('/api/logs', (req, res) => {
      const count = parseInt(req.query.count as string) || 100;
      const logs = this.logger.getRecentLogs(count);
      res.json({ success: true, data: logs });
    });

    // Error handling
    this.app.use(ErrorHandler.middleware());

    // 404 handler
    this.app.use((req, res) => {
      const error = InteractorError.notFound('Resource', req.path);
      const response = ErrorHandler.toResponse(error);
      res.status(404).json(response);
    });
  }

  /**
   * Setup WebSocket server
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      const clientId = Math.random().toString(36).substring(7);
      this.logger.info('WebSocket client connected', 'WebSocket', { clientId });
      
      // Send initial state with error handling
      try {
        this.sendStateToClient(ws);
      } catch (error) {
        ErrorHandler.logError(error as Error, { context: 'initial_state_send', clientId });
        
        // Send error message to client
        try {
          ws.send(JSON.stringify({
            type: 'error',
            data: {
              message: 'Failed to load initial state',
              code: 'INITIAL_STATE_ERROR',
              retryable: true,
              suggestions: ['Refresh the page to reconnect']
            }
          }));
        } catch (sendError) {
          this.logger.error('Failed to send error message to WebSocket client', 'WebSocket', { clientId });
        }
      }
      
      ws.on('close', (code, reason) => {
        this.logger.info('WebSocket client disconnected', 'WebSocket', { 
          clientId, 
          code, 
          reason: reason.toString() 
        });
      });
      
      ws.on('error', (error) => {
        ErrorHandler.logError(error, { 
          context: 'websocket_error', 
          clientId,
          errorType: error.name || 'UnknownWebSocketError'
        });
        
        // Attempt graceful recovery
        if (ws.readyState === ws.OPEN) {
          try {
            ws.send(JSON.stringify({
              type: 'connection_error',
              data: {
                message: 'Connection error occurred',
                code: 'WEBSOCKET_ERROR',
                retryable: true,
                suggestions: ['Connection will automatically retry', 'Refresh if issues persist']
              }
            }));
          } catch (sendError) {
            this.logger.error('Failed to send error recovery message', 'WebSocket', { clientId });
          }
        }
      });
      
      // Handle ping/pong to keep connection alive
      ws.on('ping', () => {
        try {
          ws.pong();
        } catch (error) {
          this.logger.error('Failed to respond to ping', 'WebSocket', { clientId, error: String(error) });
        }
      });

      // Handle unexpected WebSocket termination
      ws.on('unexpected-response', (request, response) => {
        this.logger.warn('WebSocket unexpected response', 'WebSocket', {
          clientId,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage
        });
      });
    });

    // Handle WebSocket server errors
    this.wss.on('error', (error) => {
      ErrorHandler.logError(error, { context: 'websocket_server_error' });
    });
  }

  /**
   * Send state to a specific WebSocket client with enhanced error handling
   */
  private sendStateToClient(ws: any): void {
    if (ws.readyState !== ws.OPEN) {
      this.logger.warn('Attempted to send state to closed WebSocket connection', 'WebSocket');
      return;
    }

    try {
      const interactions = this.stateManager.getInteractions();
      const moduleInstances = this.stateManager.getModuleInstances();
      
      const state = {
        type: 'state_update',
        data: {
          interactions,
          moduleInstances,
          timestamp: Date.now()
        }
      };
      
      ws.send(JSON.stringify(state));
      
    } catch (stateError) {
      ErrorHandler.logError(stateError as Error, { context: 'state_retrieval' });
      
      // Send a minimal state if there's an error retrieving data
      try {
        const minimalState = {
          type: 'state_update',
          data: {
            interactions: [],
            moduleInstances: [],
            timestamp: Date.now()
          },
          error: {
            message: 'Failed to retrieve complete state',
            code: 'STATE_RETRIEVAL_ERROR',
            retryable: true
          }
        };
        ws.send(JSON.stringify(minimalState));
      } catch (sendError) {
        ErrorHandler.logError(sendError as Error, { context: 'minimal_state_send' });
        
        // Last resort: send error notification
        try {
          ws.send(JSON.stringify({
            type: 'error',
            data: {
              message: 'System temporarily unavailable',
              code: 'SYSTEM_ERROR',
              retryable: true,
              suggestions: ['Refresh the page', 'Check system status']
            }
          }));
        } catch (finalError) {
          this.logger.error('Complete failure to communicate with WebSocket client', 'WebSocket');
          // Close the connection as last resort
          ws.close(1011, 'Server error - unable to send data');
        }
      }
    }
  }

  /**
   * Broadcast state update to all connected WebSocket clients
   */
  public broadcastStateUpdate(originClientId?: string): void {
    if (this.wss.clients.size === 0) return;
    
    try {
      const state = {
        type: 'state_update',
        data: {
          interactions: this.stateManager.getInteractions(),
          moduleInstances: this.stateManager.getModuleInstances(),
          ...(originClientId ? { originClientId } : {})
        }
      };
      
      const message = JSON.stringify(state);
      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
      
      this.logger.debug(`Broadcasted state update to ${this.wss.clients.size} clients`);
    } catch (error) {
      this.logger.error('Error broadcasting state update:', String(error));
    }
  }

  /**
   * Broadcast a module-specific runtime update to all connected WebSocket clients
   * This allows updating read-only fields without affecting user configuration
   */
  public broadcastModuleRuntimeUpdate(moduleId: string, runtimeData: Record<string, any>): void {
    if (this.wss.clients.size === 0) return;
    
    try {
      const runtimeUpdate = {
        type: 'module_runtime_update',
        data: {
          moduleId,
          runtimeData
        }
      };
      
      const message = JSON.stringify(runtimeUpdate);
      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
      
      this.logger.debug(`Broadcasted runtime update for module ${moduleId} to ${this.wss.clients.size} clients`);
    } catch (error) {
      this.logger.error('Error broadcasting module runtime update:', String(error));
    }
  }

  /**
   * Broadcast a trigger event to all connected WebSocket clients
   */
  private broadcastTriggerEvent(moduleId: string, type: 'manual' | 'auto'): void {
    if (this.wss.clients.size === 0) return;

    try {
      const event = {
        type: 'trigger_event',
        data: {
          moduleId,
          type
        }
      };
      const message = JSON.stringify(event);

      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
      this.logger.debug(`Broadcasted trigger event for module ${moduleId} of type ${type}`);
    } catch (error) {
      this.logger.error('Error broadcasting trigger event:', String(error));
    }
  }

  /**
   * Setup trigger event listeners for output modules
   */
  private setupTriggerEventListeners(): void {
    // Clear previous listeners to avoid duplicates when re-wiring
    this.messageRouter.removeAllListeners();

    // Wire output modules by live instance id
    const moduleInstances = this.stateManager.getModuleInstances();
    moduleInstances.forEach(moduleInstance => {
      const manifest = this.moduleLoader.getManifest(moduleInstance.moduleName);
      if (manifest?.type !== 'output') return;

      const liveInstance = this.moduleInstances.get(moduleInstance.id);
      if (!liveInstance) {
        this.logger.warn(`No live instance found for output module ${moduleInstance.moduleName} (${moduleInstance.id})`);
        return;
      }

      // Pulse → WS
      liveInstance.on('triggerEvent', (event: any) => {
        this.logger.debug(`Received trigger event from module: ${event.moduleId}`, event);
        this.broadcastTriggerEvent(event.moduleId, event.type);
      });

      // Router → output instance
      this.messageRouter.on(moduleInstance.id, (message: any) => {
        this.logger.debug(`Router → ${moduleInstance.moduleName} (${moduleInstance.id}):`, message);
        if (message.event === 'trigger' || message.event === 'timeTrigger' || message.event === 'manualTrigger') {
          const triggerEvent = {
            moduleId: message.source,
            moduleName: 'Input Module',
            event: message.event,
            payload: message.payload,
            timestamp: message.timestamp
          };
          if (typeof liveInstance.onTriggerEvent === 'function') {
            liveInstance.onTriggerEvent(triggerEvent);
          }
        } else if (message.event === 'stream') {
          const streamEvent = {
            moduleId: message.source,
            moduleName: 'Input Module',
            value: message.payload,
            timestamp: message.timestamp
          };
          if (typeof liveInstance.onStreamingEvent === 'function') {
            liveInstance.onStreamingEvent(streamEvent);
          }
        }
      });
    });
  }

  /**
   * Setup listeners for a specific module
   */
  private setupModuleStateListener(moduleInstance: any): void {
    // Try to find the module by the instance ID first
    let actualModule = this.moduleLoader.getInstance(moduleInstance.id);
    
    // If not found, try to find it in the moduleInstances registry
    if (!actualModule) {
      actualModule = this.moduleInstances.get(moduleInstance.id);
    }
    
    // If still not found, try to find it by matching the module name and checking all instances
    if (!actualModule) {
      for (const [id, module] of this.moduleInstances.entries()) {
        if (module.name === moduleInstance.moduleName || module.name === moduleInstance.name) {
          actualModule = module;
          this.logger.debug(`Found module by name match: ${moduleInstance.moduleName} -> ${id}`);
          break;
        }
      }
    }
    
    if (!actualModule) {
      this.logger.warn(`Cannot set up listeners for module ${moduleInstance.id} (${moduleInstance.moduleName}) - module not found`);
      return;
    }

    // Remove existing listeners to prevent duplicates
    actualModule.removeAllListeners('stateUpdate');
    actualModule.removeAllListeners('runtimeStateUpdate');

    // Listen for stateUpdate events from this module
    actualModule.on('stateUpdate', (stateData: any) => {
      this.logger.debug(`Received state update from module ${moduleInstance.moduleName} (${moduleInstance.id}):`, stateData);
      
      // Update the module instance with the new state
      Object.assign(moduleInstance, stateData);
      moduleInstance.lastUpdate = Date.now();
      
      // Only save state if this is a configuration change, not a runtime update
      // Runtime fields that should NOT trigger state saves
      const runtimeFields = ['currentTime', 'countdown', 'status', 'isRunning', 'isInitialized', 'isListening', 'lastUpdate'];
      const hasConfigChanges = Object.keys(stateData).some(key => !runtimeFields.includes(key));
      
      if (hasConfigChanges) {
        // Save to StateManager only for configuration changes
        const moduleInstances = this.stateManager.getModuleInstances();
        this.stateManager.replaceState({ modules: moduleInstances }).then(() => {
          // Broadcast to frontend
          this.broadcastStateUpdate();
        }).catch(error => {
          this.logger.error(`Failed to save state update for module ${moduleInstance.id}:`, error);
        });
      } else {
        // Just broadcast runtime updates without saving state
        this.broadcastStateUpdate();
      }
    });
    
    // Listen for runtime state updates specifically
    actualModule.on('runtimeStateUpdate', (runtimeData: any) => {
      this.logger.debug(`Received runtime state update from module ${moduleInstance.moduleName} (${moduleInstance.id}):`, runtimeData);
      
      // Update only runtime fields
      const runtimeFields = ['currentTime', 'countdown', 'status', 'isRunning', 'isInitialized', 'isListening', 'lastUpdate'];
      runtimeFields.forEach(field => {
        if (runtimeData[field] !== undefined) {
          moduleInstance[field] = runtimeData[field];
        }
      });
      
      moduleInstance.lastUpdate = Date.now();
      
      // Broadcast targeted runtime update to frontend (NO state saving for runtime data)
      this.broadcastModuleRuntimeUpdate(moduleInstance.id, runtimeData);
    });
  }

  /**
   * Setup listeners for module state updates
   */
  private setupModuleStateListeners(): void {
    // Get all module instances and set up state update listeners
    const moduleInstances = this.stateManager.getModuleInstances();
    
    moduleInstances.forEach(moduleInstance => {
      this.setupModuleStateListener(moduleInstance);
    });
    
    // Also set up a periodic broadcast to ensure frontend gets updates
    setInterval(() => {
      if (this.wss.clients.size > 0) {
        this.broadcastStateUpdate();
      }
    }, 1000); // Broadcast every 1 second for real-time updates
    
    // Set up trigger event listeners for output modules
    this.setupTriggerEventListeners();
  }

  /**
   * Sync interactions with current module instances
   */
  private async syncInteractionsWithModules(): Promise<void> {
    const interactions = this.stateManager.getInteractions();
    const moduleInstances = this.stateManager.getModuleInstances();
    let interactionsUpdated = false;
    
    interactions.forEach(interaction => {
      interaction.modules?.forEach((module: any) => {
        const matchingInstance = moduleInstances.find(instance => instance.id === module.id);
        if (matchingInstance && JSON.stringify(module.config) !== JSON.stringify(matchingInstance.config)) {
          // Update the module configuration in the interaction
          module.config = matchingInstance.config;
          interactionsUpdated = true;
          this.logger.info(`Synced interaction module config for ${module.moduleName} (${module.id})`);
        }
      });
    });
    
    // Save updated interactions if any were modified
    if (interactionsUpdated) {
      await this.stateManager.replaceState({ interactions });
      this.logger.info('Synced interactions with module instances');
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    const port = this.config.server?.port || 3001;
    const host = this.config.server?.host || 'localhost';

    // Start the file uploader first
    await this.fileUploader.start();

    // Test instantiation of TimeInputModule with minimal config
    try {
      const { TimeInputModule } = await import('./modules/input/time_input/index');
      const testConfig = {
        mode: 'clock',
        targetTime: '12:00 PM',
        enabled: false
      };
      const testInstance = new TimeInputModule(testConfig, 'test-instance');
      this.logger.info('Successfully created test instance of TimeInputModule', { config: testConfig });
    } catch (error) {
      this.logger.error('Failed to create test instance of TimeInputModule', {
        message: error.message,
        stack: error.stack,
        errorObject: error
      });
    }

    return new Promise((resolve, reject) => {
      this.server.listen(port, host, () => {
        this.logger.info(`Interactor Server started on http://${host}:${port}`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        this.logger.error('Server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Shutting down Interactor Server...');

    try {
      // Stop accepting new connections
      this.server.close();

      // Stop the file uploader
      await this.fileUploader.stop();

      // Destroy services
      await this.moduleLoader.destroy();
      await this.stateManager.destroy();
      await this.systemStats.destroy();

      this.logger.info('Interactor Server stopped');
    } catch (error) {
      this.logger.error('Error during shutdown:', String(error));
      throw error;
    }
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new InteractorServer();
  
  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Start the server
  server.init()
    .then(() => server.start())
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}

export default InteractorServer;

