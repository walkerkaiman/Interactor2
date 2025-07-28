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

      // Register available modules (no hot reloading)
      // TODO: Fix module registration with proper manifests
      // this.moduleLoader.register('frames_input', {});
      // this.moduleLoader.register('dmx_output', {});
      // this.moduleLoader.register('http_input', {});
      // this.moduleLoader.register('osc_input', {});
      // this.moduleLoader.register('serial_input', {});
      // this.moduleLoader.register('time_input', {});
      // this.moduleLoader.register('audio_output', {});
      // this.moduleLoader.register('http_output', {});
      // this.moduleLoader.register('osc_output', {});

      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services:', String(error));
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
   * Setup minimal REST API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      try {
        const health = this.systemStats.getHealthStatus();
        const uptime = this.systemStats.getUptimeFormatted();
        
        res.json({
          status: health.status,
          uptime: uptime,
          timestamp: Date.now(),
          message: health.message
        });
      } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
          status: 'error',
          uptime: '0s',
          timestamp: Date.now(),
          error: String(error)
        });
      }
    });

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
      const response: ModuleListResponse = { modules };
      res.json({ success: true, data: response });
    });

    // Get module instances and their real-time state (must come before /:name route)
    this.app.get('/api/modules/instances', (req, res) => {
      try {
        const moduleInstances = this.stateManager.getModuleInstances();
        res.json({ 
          success: true, 
          data: { 
            instances: moduleInstances,
            count: moduleInstances.length 
          } 
        });
      } catch (error) {
        res.status(500).json({ success: false, error: String(error) });
      }
    });

    // Get specific module instance state (must come before /:name route)
    this.app.get('/api/modules/instances/:id', (req, res) => {
      try {
        const moduleInstance = this.stateManager.getModuleInstance(req.params.id as string);
        if (moduleInstance) {
          res.json({ success: true, data: moduleInstance });
        } else {
          res.status(404).json({ success: false, error: 'Module instance not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: String(error) });
      }
    });

    // Update module instance configuration
    this.app.put('/api/modules/instances/:id', async (req, res) => {
      try {
        const moduleInstances = this.stateManager.getModuleInstances();
        const moduleInstance = moduleInstances.find(m => m.id === req.params.id);
        
        if (!moduleInstance) {
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        // Update module configuration
        if (req.body.config) {
          moduleInstance.config = { ...moduleInstance.config, ...req.body.config };
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
      const response: InteractionListResponse = { interactions };
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
        
        // Create module instance
        const instance = {
          id: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          moduleName,
          config: config || {},
          status: 'stopped',
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
        const moduleInstance = this.moduleLoader.getInstance(req.params.moduleId as string);
        if (!moduleInstance) {
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        if ('onManualTrigger' in moduleInstance && typeof moduleInstance.onManualTrigger === 'function') {
          await moduleInstance.onManualTrigger();
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
        
        // Get the actual module instance from the module loader
        const actualModule = this.moduleLoader.getInstance(req.params.id as string);
        if (actualModule) {
          // Call the module's onStart method
          await actualModule.start();
          this.logger.info(`Module ${moduleInstance.moduleName} started successfully`);
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
        
        // Get the actual module instance from the module loader
        const actualModule = this.moduleLoader.getInstance(req.params.id as string);
        if (actualModule) {
          // Call the module's onStop method
          await actualModule.stop();
          this.logger.info(`Module ${moduleInstance.moduleName} stopped successfully`);
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
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ success: false, error: 'Not found' });
    });
  }

  /**
   * Setup WebSocket server
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      this.logger.info('WebSocket client connected');
      
      // Send initial state
      this.sendStateToClient(ws);
      
      ws.on('close', () => {
        this.logger.info('WebSocket client disconnected');
      });
      
      ws.on('error', (error) => {
        this.logger.error('WebSocket error:', String(error));
      });
    });
  }

  /**
   * Send state to a specific WebSocket client
   */
  private sendStateToClient(ws: any): void {
    try {
      const state = {
        type: 'state_update',
        data: {
          interactions: this.stateManager.getInteractions(),
          moduleInstances: this.stateManager.getModuleInstances()
        }
      };
      ws.send(JSON.stringify(state));
    } catch (error) {
      this.logger.error('Error sending state to client:', String(error));
    }
  }

  /**
   * Broadcast state update to all connected WebSocket clients
   */
  public broadcastStateUpdate(): void {
    if (this.wss.clients.size === 0) return;
    
    try {
      const state = {
        type: 'state_update',
        data: {
          interactions: this.stateManager.getInteractions(),
          moduleInstances: this.stateManager.getModuleInstances()
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
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    const port = this.config.server?.port || 3001;
    const host = this.config.server?.host || 'localhost';

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
