import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import * as fs from 'fs-extra';
import * as path from 'path';
import { WebSocketServer } from 'ws';

// Core services (singletons)
import { Logger } from './core/Logger';
import { MessageRouter } from './core/MessageRouter';
import { ModuleLoader } from './core/ModuleLoader';
import { StateManager } from './core/StateManager';
import { SystemStats } from './core/SystemStats';
import { ErrorHandler, InteractorError } from './core/ErrorHandler';
import { FileUploader } from './services/FileUploader';

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
  private wss: WebSocketServer;
  private logger: Logger;
  private messageRouter: MessageRouter;
  private moduleLoader: ModuleLoader;
  private stateManager: StateManager;
  private systemStats: SystemStats;
  private config: any;
  private isShuttingDown = false;
  private moduleInstances: Map<string, any> = new Map(); // Live module instances registry
  private fileUploader!: FileUploader;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    // Initialize singleton services
    this.logger = Logger.getInstance();
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
      await this.setupWebSocket();
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
    const configPath = path.join(process.cwd(), 'config', 'system.json');
    
    if (await fs.pathExists(configPath)) {
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configData);
    } else {
      // Default configuration
      this.config = {
        server: {
          port: 3001,
          host: 'localhost'
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

      // Initialize global file uploader
      this.fileUploader = new FileUploader({
        port: 4000,
        host: '0.0.0.0',
        uploadDir: path.join(process.cwd(), 'data', 'uploads'),
        maxFileSize: 50 * 1024 * 1024, // 50MB
        moduleConfigs: new Map()
      }, this.logger);

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
      
      this.logger.info(`Restoring ${moduleInstances.length} module instances from data store`);
      
      // Create live instances for all modules in the data store
      for (const moduleInstance of moduleInstances) {
        if (moduleInstance.moduleName === 'Time Input' || moduleInstance.moduleName === 'time_input') {
          try {
            // Create live module instance
            const liveInstance = await this.createModuleInstance(moduleInstance);
            if (liveInstance) {
              // Start the live module instance if it was previously running
              if (moduleInstance.status === 'running') {
                await liveInstance.start();
                this.logger.info(`Restored and started live module instance for ${moduleInstance.moduleName} (${moduleInstance.id})`);
              } else {
                this.logger.info(`Restored live module instance for ${moduleInstance.moduleName} (${moduleInstance.id}) - not starting (status: ${moduleInstance.status})`);
              }
            }
          } catch (error) {
            this.logger.error(`Failed to restore live module instance for ${moduleInstance.moduleName} (${moduleInstance.id}):`, String(error));
          }
        }
      }
      
      // Set up trigger event listeners for output modules
      this.setupTriggerEventListeners();
      
      this.logger.info(`Successfully restored ${this.moduleInstances.size} live module instances`);
    } catch (error) {
      this.logger.error('Failed to restore module instances:', String(error));
      throw error;
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
    
    // Serve static files from frontend build
    const frontendPath = path.join(process.cwd(), '..', 'frontend', 'dist');
    if (await fs.pathExists(frontendPath)) {
      this.app.use(express.static(frontendPath));
      
      // Serve index.html for all non-API routes (SPA routing)
      this.app.get('*', (req, res, next) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
          res.sendFile(path.join(frontendPath, 'index.html'));
        } else {
          next();
        }
      });
    }
  }

  /**
   * Create a live module instance
   */
  private async createModuleInstance(moduleData: any): Promise<any> {
    const { id, moduleName, config } = moduleData;
    
    // Handle Time Input module (check for both possible names)
    if (moduleName === 'Time Input' || moduleName === 'time_input') {
      try {
        // Import the TimeInputModule class
        const { TimeInputModule } = await import('./modules/input/time_input/index');
        
        // Create instance with config and external ID
        const moduleInstance = new TimeInputModule(config, id);
        moduleInstance.setLogger(this.logger);
        
        // Set up event listeners for state updates
        moduleInstance.on('stateUpdate', (stateData: any) => {
          this.handleModuleStateUpdate(id, stateData);
        });
        
        moduleInstance.on('configUpdated', (configData: any) => {
          this.handleModuleConfigUpdate(id, configData);
        });
        
        // Initialize the module
        await moduleInstance.init();
        
        // Store in registry
        this.moduleInstances.set(id, moduleInstance);
        
        this.logger.info(`Created live instance for ${moduleName} (${id})`);
        return moduleInstance;
      } catch (error) {
        this.logger.error(`Failed to create ${moduleName} instance:`, error);
        throw error;
      }
    }
    
    // Handle Audio Output module
    if (moduleName === 'Audio Output' || moduleName === 'audio_output') {
      try {
        // Import the AudioOutputModule class
        const { AudioOutputModule } = await import('./modules/output/audio_output/index');
        
        // Create instance with config
        const moduleInstance = new AudioOutputModule(config);
        moduleInstance.setLogger(this.logger);
        
        // Set up event listeners for state updates
        moduleInstance.on('stateUpdate', (stateData: any) => {
          this.handleModuleStateUpdate(id, stateData);
        });
        
        moduleInstance.on('configUpdated', (configData: any) => {
          this.handleModuleConfigUpdate(id, configData);
        });
        
        // Initialize the module
        await moduleInstance.init();
        
        // Store in registry
        this.moduleInstances.set(id, moduleInstance);
        
        this.logger.info(`Created live instance for ${moduleName} (${id})`);
        return moduleInstance;
      } catch (error) {
        this.logger.error(`Failed to create ${moduleName} instance:`, error);
        throw error;
      }
    }
    
    return null; // Module type not supported yet
  }
  
  /**
   * Handle state update from a live module instance
   */
  private async handleModuleStateUpdate(moduleId: string, stateData: any): Promise<void> {
    try {
      const moduleInstances = this.stateManager.getModuleInstances();
      const moduleInstance = moduleInstances.find(m => m.id === moduleId);
      
      if (moduleInstance) {
        // Update the stored state with the new data
        Object.assign(moduleInstance, stateData);
        moduleInstance.lastUpdate = Date.now();
        
        // Save to StateManager
        await this.stateManager.replaceState({ modules: moduleInstances });
        
        // Broadcast to frontend
        this.broadcastStateUpdate();
        
        this.logger.debug(`Updated state for module ${moduleId}`, stateData);
      }
    } catch (error) {
      this.logger.error(`Failed to handle state update for module ${moduleId}:`, error);
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
      this.logger.error(`Failed to handle config update for module ${moduleId}:`, error);
    }
  }

  /**
   * Setup minimal REST API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', ErrorHandler.asyncHandler(async (req, res) => {
      const health = this.systemStats.getHealthStatus();
      const uptime = this.systemStats.getUptimeFormatted();
      
      res.json({
        status: health.status,
        uptime: uptime,
        timestamp: Date.now(),
        message: health.message
      });
    }));

    // System stats
    this.app.get('/api/stats', (req, res) => {
      res.json({
        success: true,
        data: this.systemStats.getStats()
      });
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
        throw InteractorError.notFound('Module instance', req.params.id);
      }
      
      // Update module configuration in data store
      const newConfig = { ...moduleInstance.config, ...req.body.config };
      moduleInstance.config = newConfig;
      moduleInstance.lastUpdate = Date.now();
      
      this.logger.info(`Updating module config for ${moduleInstance.moduleName} (${req.params.id}):`, {
        oldConfig: moduleInstance.config,
        newConfig: newConfig,
        changes: req.body.config
      });
      
      // CRITICAL: Also update the live module instance if it exists
      const liveInstance = this.moduleInstances.get(req.params.id);
      if (liveInstance) {
        try {
          await liveInstance.updateConfig(newConfig);
          this.logger.info(`Updated live module instance config for ${moduleInstance.moduleName} (${req.params.id})`);
        } catch (error) {
          this.logger.error(`Failed to update live module config:`, error);
          throw InteractorError.moduleError('Failed to update module configuration', error as Error);
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
        const moduleInstances = this.stateManager.getModuleInstances();
        const moduleInstance = moduleInstances.find(m => m.id === req.params.id);
        
        if (!moduleInstance) {
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        // Update module configuration
        if (req.body.config) {
          moduleInstance.config = { ...moduleInstance.config, ...req.body.config };
          
                          // Note: Module instances are managed by StateManager, not ModuleLoader
                // The configuration update is handled through the state update mechanism
        }
        
        moduleInstance.lastUpdate = Date.now();
        
        // Update state
        await this.stateManager.replaceState({ modules: moduleInstances });
        
        // Broadcast state update
        this.broadcastStateUpdate();
        
        res.json({ 
          success: true, 
          message: 'Module configuration updated successfully',
          data: moduleInstance
        });
      } catch (error) {
        res.status(500).json({ success: false, error: String(error) });
      }
    });

    this.app.get('/api/modules/:name', (req, res) => {
      const manifest = this.moduleLoader.getManifest(req.params.name as string);
      if (manifest) {
        res.json({ success: true, data: manifest });
      } else {
        res.status(404).json({ success: false, error: 'Module not found' });
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
      res.json({ success: true, data: response });
    });

    // Register entire interaction map (atomic update)
    this.app.post('/api/interactions/register', async (req, res) => {
      try {
        const interactionMap: InteractionConfig[] = req.body.interactions || [];
        
        // Replace entire interaction state
        await this.stateManager.replaceState({ interactions: interactionMap });
        
        // Process routes from interactions and add to MessageRouter
        const messageRouter = MessageRouter.getInstance();
        messageRouter.clearRoutes(); // Clear existing routes
        
        interactionMap.forEach(interaction => {
          if (interaction.routes) {
            interaction.routes.forEach(route => {
              // For output modules, we need to map the simplified "input" handle to actual module events
              // Since MessageRoute doesn't contain handle info, we'll use the event name to determine mapping
              const targetModule = interaction.modules.find(m => m.id === route.target);
              if (targetModule) {
                const manifest = this.moduleLoader.getManifest(targetModule.moduleName);
                if (manifest?.type === 'output' && manifest.events) {
                  const inputEvents = manifest.events.filter(e => e.type === 'input');
                  if (inputEvents.length > 0 && inputEvents[0]?.name) {
                    // For output modules, map to the first available input event
                    const mappedRoute = {
                      ...route,
                      event: inputEvents[0].name
                    };
                    messageRouter.addRoute(mappedRoute);
                    this.logger.debug(`Mapped route for output module: ${route.id} -> ${inputEvents[0].name}`, 'InteractorServer');
                  }
                } else {
                  // For regular routes, add as-is
                  messageRouter.addRoute(route);
                }
              } else {
                // Fallback: add route as-is
                messageRouter.addRoute(route);
              }
            });
          }
        });
        
        // Create module instances for all modules in interactions
        const moduleInstances: any[] = [];
        interactionMap.forEach(interaction => {
          interaction.modules.forEach(moduleInstance => {
            // Create a module instance with state
            const instance = {
              id: moduleInstance.id,
              moduleName: moduleInstance.moduleName,
              config: moduleInstance.config,
              status: 'stopped',
              messageCount: 0,
              currentFrame: undefined,
              frameCount: 0,
              lastUpdate: Date.now()
            };
            moduleInstances.push(instance);
          });
        });
        
        // Store module instances in state
        await this.stateManager.replaceState({ 
          interactions: interactionMap,
          modules: moduleInstances 
        });
        
        // Create and start live module instances for input modules
        for (const moduleInstance of moduleInstances) {
          if (moduleInstance.moduleName === 'Time Input') {
            try {
              // Create live module instance
              const liveInstance = await this.createModuleInstance(moduleInstance);
              if (liveInstance) {
                // Start the live module instance
                await liveInstance.start();
                this.logger.info(`Started live module instance for ${moduleInstance.moduleName} (${moduleInstance.id})`);
              }
            } catch (error) {
              this.logger.error(`Failed to start live module instance for ${moduleInstance.moduleName} (${moduleInstance.id}):`, error);
            }
          }
        }
        
        // Set up trigger event listeners for output modules
        this.setupTriggerEventListeners();
        
        // Broadcast state update to all connected clients
        this.broadcastStateUpdate();
        
        res.json({ 
          success: true, 
          message: 'Interaction map registered successfully',
          count: interactionMap.length,
          moduleInstances: moduleInstances.length
        });
      } catch (error) {
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
        
        res.json({ 
          success: true, 
          data: instance,
          message: 'Module instance created successfully'
        });
      } catch (error) {
        res.status(500).json({ success: false, error: String(error) });
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
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        // Create live module instance if it doesn't exist
        let liveInstance = this.moduleInstances.get(req.params.id);
        if (!liveInstance) {
          liveInstance = await this.createModuleInstance(moduleInstance);
          if (!liveInstance) {
            throw new Error(`Failed to create live instance for ${moduleInstance.moduleName}`);
          }
        }
        
        // Start the live module instance
        try {
          await liveInstance.start();
          this.logger.info(`Module ${moduleInstance.moduleName} (${req.params.id}) started successfully`);
        } catch (error) {
          this.logger.error(`Failed to start module ${moduleInstance.moduleName}:`, error);
          throw error;
        }
        
        // Update module status to running
        moduleInstance.status = 'running';
        moduleInstance.lastUpdate = Date.now();
        
        // Update state
        await this.stateManager.replaceState({ modules: moduleInstances });
        
        // Broadcast state update
        this.broadcastStateUpdate();
        
        res.json({ 
          success: true, 
          message: 'Module started successfully',
          data: moduleInstance
        });
      } catch (error) {
        this.logger.error(`Failed to start module: ${error}`);
        res.status(500).json({ success: false, error: String(error) });
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
            this.logger.error(`Failed to stop live module ${moduleInstance.moduleName}:`, error);
            throw error;
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
        
        res.json({ 
          success: true, 
          message: 'Module stopped successfully',
          data: moduleInstance
        });
      } catch (error) {
        this.logger.error(`Failed to stop module: ${error}`);
        res.status(500).json({ success: false, error: String(error) });
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
  public broadcastStateUpdate(): void {
    if (this.wss.clients.size === 0) return;
    
    try {
      // Update current time for Time Input modules
      const moduleInstances = this.stateManager.getModuleInstances();
      let hasTimeInputUpdates = false;
      
      moduleInstances.forEach(moduleInstance => {
        if (moduleInstance.moduleName === 'Time Input' && moduleInstance.status === 'running') {
          const now = new Date();
          
          // Update current time in 12-hour format
          const hours = now.getHours();
          const minutes = now.getMinutes();
          const period = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          const newCurrentTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
          
          // Update countdown based on mode
          let newCountdown = '';
          const mode = moduleInstance.config?.mode || 'clock';
          if (mode === 'metronome') {
            const millisecondDelay = moduleInstance.config?.millisecondDelay || 1000;
            const seconds = millisecondDelay / 1000;
            newCountdown = `${seconds}s interval`;
          } else if (mode === 'clock') {
            newCountdown = 'Clock mode - target time calculation needed';
          }
          
          // Only update if the time or countdown has changed
          if (moduleInstance.currentTime !== newCurrentTime || moduleInstance.countdown !== newCountdown) {
            moduleInstance.currentTime = newCurrentTime;
            moduleInstance.countdown = newCountdown;
            moduleInstance.lastUpdate = Date.now();
            hasTimeInputUpdates = true;
            this.logger.info(`Updated Time Input module ${moduleInstance.id}: currentTime = ${moduleInstance.currentTime}, countdown = ${moduleInstance.countdown}`);
          }
        }
      });
      
      // Update state if there were changes
      if (hasTimeInputUpdates) {
        this.stateManager.replaceState({ modules: moduleInstances });
        this.logger.info(`Updated state with Time Input changes`);
      }
      
      // Get the updated instances for the WebSocket message
      const updatedModuleInstances = this.stateManager.getModuleInstances();
      const timeInputInstance = updatedModuleInstances.find(m => m.moduleName === 'Time Input');
      if (timeInputInstance) {
        this.logger.info(`Time Input module in WebSocket message: currentTime = ${timeInputInstance.currentTime}, countdown = ${timeInputInstance.countdown}`);
      }
      
      const state = {
        type: 'state_update',
        data: {
          interactions: this.stateManager.getInteractions(),
          moduleInstances: updatedModuleInstances
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
    // Get all module instances and set up trigger event listeners for output modules
    const moduleInstances = this.stateManager.getModuleInstances();
    
    moduleInstances.forEach(moduleInstance => {
      const manifest = this.moduleLoader.getManifest(moduleInstance.moduleName);
      if (manifest?.type === 'output') {
        // Get the actual module instance from the module loader
        const actualModule = this.moduleLoader.getInstance(moduleInstance.id);
        if (actualModule) {
          // Set up trigger event listener for this output module
          actualModule.on('triggerEvent', (event: any) => {
            this.logger.debug(`Received trigger event from module: ${event.moduleId}`, event);
            this.broadcastTriggerEvent(event.moduleId, event.type);
          });
        }
      }
    });
  }

  /**
   * Setup listeners for module state updates
   */
  private setupModuleStateListeners(): void {
    // Listen for stateUpdate events from any module
    // Note: This approach doesn't work because modules emit events on their own instances
    // We need to handle this differently by updating the state manager directly
    // when modules emit stateUpdate events
    
    // For now, we'll rely on the modules to update their state through the state manager
    // The frames input module should call this.stateManager.updateModuleInstance() directly
    
    // We'll also set up a periodic broadcast to ensure frontend gets updates
    setInterval(() => {
      if (this.wss.clients.size > 0) {
        this.broadcastStateUpdate();
      }
    }, 5000); // Broadcast every 5 seconds instead of every second
    
    // Also broadcast when module instances are updated
    // We'll override the state manager's updateModuleInstance method to broadcast
    const originalUpdateModuleInstance = this.stateManager.updateModuleInstance.bind(this.stateManager);
    this.stateManager.updateModuleInstance = async (moduleInstance: any) => {
      await originalUpdateModuleInstance(moduleInstance);
      // Broadcast state update after module instance is updated
      this.broadcastStateUpdate();
    };
    
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
