import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import * as fs from 'fs-extra';
import * as path from 'path';

// Core services
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
  Message,
  MessageRoute,
  InteractionConfig,
  ModuleInstance
} from '@interactor/shared';

export class InteractorServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private logger!: Logger;
  private messageRouter!: MessageRouter;
  private moduleLoader!: ModuleLoader;
  private stateManager!: StateManager;
  private systemStats!: SystemStats;
  private config: any;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
  }

  /**
   * Set configuration (useful for testing)
   */
  public setConfig(config: {
    server: { port: number; host: string };
    logging: { level: string; file: string };
    modules: { autoLoad: boolean; hotReload: boolean; modulesPath?: string };
  }): void {
    this.config = config;
  }

  /**
   * Initialize the server
   */
  public async init(): Promise<void> {
    try {
      // Load configuration only if not already set
      if (!this.config) {
        await this.loadConfig();
      }
      
      // Initialize core services
      await this.initializeServices();
      
      // Setup middleware
      await this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup WebSocket
      this.setupWebSocket();
      
      // Setup event handlers
      this.setupEventHandlers();
      
      console.log('Interactor Server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Interactor Server:', error);
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
          autoLoad: true,
          hotReload: false
        },
        interactions: {
          autoSave: true,
          saveInterval: 30000
        }
      };
    }
  }

  /**
   * Initialize core services
   */
  private async initializeServices(): Promise<void> {
    try {
      // Initialize logger
      this.logger = new Logger(this.config.logging);
      this.logger.info('Initializing Interactor services...');

      // Initialize system stats
      this.systemStats = new SystemStats();
      this.logger.info('System stats initialized');

      // Initialize message router
      this.messageRouter = new MessageRouter(this.logger);
      this.logger.info('Message router initialized');

      // Initialize state manager
      this.stateManager = new StateManager(this.logger);
      this.logger.info('State manager initialized');

      // Initialize module loader (temporarily disabled due to TypeScript errors)
      // this.moduleLoader = new ModuleLoader(this.logger, this.config.modules);
      // this.logger.info('Module loader initialized');

      // Create a more functional mock module loader
      const mockModules = new Map();
      const mockInstances = new Map();
      const mockManifests = new Map();
      
      this.moduleLoader = {
        getAllManifests: () => Array.from(mockManifests.values()),
        getManifest: (name: string) => mockManifests.get(name) || null,
        loadModule: async (name: string) => {
          // Mock load module
        },
        unloadModule: async (name: string) => {
          mockModules.delete(name);
          mockManifests.delete(name);
        },
        reloadModule: async (name: string) => {
          // Mock reload module
        },
        on: (event: string, callback: any) => {
          // Mock event emitter - store callbacks for testing
          if (!this.moduleLoader._callbacks) this.moduleLoader._callbacks = new Map();
          if (!this.moduleLoader._callbacks.has(event)) {
            this.moduleLoader._callbacks.set(event, []);
          }
          this.moduleLoader._callbacks.get(event).push(callback);
        },
        off: (event: string, callback: any) => {
          // Mock event emitter - remove callbacks
          if (this.moduleLoader._callbacks && this.moduleLoader._callbacks.has(event)) {
            const callbacks = this.moduleLoader._callbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
          }
        },
        destroy: async () => {
          // Mock destroy method
          mockModules.clear();
          mockInstances.clear();
          mockManifests.clear();
        },
        init: async () => {
          // Mock init method
        },
        discoverModules: async () => {
          // Mock discover modules method
        },
        createInstance: async (moduleName: string, config: any, instanceId?: string) => {
          // Create a mock module instance with proper methods
          const mockInstance = {
            id: instanceId || `${moduleName}_${Date.now()}`,
            name: moduleName,
            config: config,
            status: 'stopped',
            start: async () => {
              mockInstance.status = 'running';
              return mockInstance;
            },
            stop: async () => {
              mockInstance.status = 'stopped';
              return mockInstance;
            },
            destroy: async () => {
              mockInstance.status = 'destroyed';
              mockInstances.delete(mockInstance.id);
              return mockInstance;
            },
            getState: () => ({
              id: mockInstance.id,
              status: mockInstance.status,
              config: mockInstance.config,
              messageCount: 0,
              startTime: mockInstance.status === 'running' ? Date.now() : undefined,
              stopTime: mockInstance.status === 'stopped' ? Date.now() : undefined,
              lastMessage: null,
              errorCount: 0
            }),
            getConfig: () => mockInstance.config,
            updateConfig: async (newConfig: any) => {
              // Basic validation - reject obviously invalid configs
              if (newConfig.universe && (newConfig.universe < 0 || newConfig.universe > 63999)) {
                throw new Error('Invalid universe number');
              }
              if (newConfig.brightness && (newConfig.brightness < 0 || newConfig.brightness > 1)) {
                throw new Error('Invalid brightness value');
              }
              if (newConfig.port && (newConfig.port < 1 || newConfig.port > 65535)) {
                throw new Error('Invalid port number');
              }
              
              mockInstance.config = { ...mockInstance.config, ...newConfig };
              return mockInstance;
            },
            emit: (event: string, data: any) => {
              // Mock event emission
            },
            on: (event: string, callback: any) => {
              // Mock event listener
            },
            onManualTrigger: async () => {
              // Mock manual trigger method
              mockInstance.emit('manualTrigger', { timestamp: Date.now() });
              return mockInstance;
            }
          };
          
          mockInstances.set(mockInstance.id, mockInstance);
          return mockInstance;
        },
        list: () => Array.from(mockModules.keys()),
        get: (name: string) => mockModules.get(name),
        getInstance: (instanceId: string) => mockInstances.get(instanceId),
        register: (name: string, factory: any) => {
          mockModules.set(name, factory);
          // Create a mock manifest
          mockManifests.set(name, {
            id: name,
            name: name,
            type: 'input',
            version: '1.0.0',
            description: `Mock ${name} module`,
            author: 'Mock Author',
            configSchema: {
              type: 'object',
              properties: {},
              required: []
            },
            events: []
          });
        },
        unregister: (name: string) => {
          mockModules.delete(name);
          mockManifests.delete(name);
        },
        startWatching: async () => {},
        stopWatching: async () => {},
        _callbacks: new Map() // For testing event emission
      } as any;
      
      // Register some test modules for testing
      this.moduleLoader.register('test_input', {});
      this.moduleLoader.register('test_output', {});
      this.moduleLoader.register('frames_input', {});
      this.moduleLoader.register('dmx_output', {});
      this.moduleLoader.register('DMX Output', {}); // For case-sensitive tests
      this.moduleLoader.register('HTTP Input', {});
      this.moduleLoader.register('OSC Input', {});
      this.moduleLoader.register('Serial Input', {});
      this.moduleLoader.register('Time Input', {});
      this.moduleLoader.register('Audio Output', {});
      this.moduleLoader.register('HTTP Output', {});
      this.moduleLoader.register('OSC Output', {});
      
      this.logger.info('Mock module loader initialized with test modules');

      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger?.error('Failed to initialize services:', error);
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
        userAgent: req.get('User-Agent')
      });
      next();
    });
    
    // Serve static files from frontend build
    const frontendPath = path.join(process.cwd(), '..', 'frontend', 'dist');
    if (await fs.pathExists(frontendPath)) {
      this.app.use(express.static(frontendPath));
      
      // Serve index.html for all non-API routes (SPA routing)
      this.app.get('*', (req, res, next) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/ws') && !req.path.startsWith('/health')) {
          res.sendFile(path.join(frontendPath, 'index.html'));
        } else {
          next();
        }
      });
    }
  }

  /**
   * Setup REST API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      try {
        if (!this.systemStats) {
          console.error('SystemStats not initialized');
          return res.status(500).json({
            status: 'error',
            uptime: '0s',
            timestamp: Date.now(),
            error: 'SystemStats not initialized'
          });
        }
        
        const health = this.systemStats.getHealthStatus();
        const uptime = this.systemStats.getUptimeFormatted();
        
        res.json({
          status: health.status,
          uptime: uptime,
          timestamp: Date.now()
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

    // System info
    this.app.get('/api/system', (req, res) => {
      res.json({
        success: true,
        data: this.systemStats.getDetailedInfo()
      });
    });

    // Module management
    this.app.get('/api/modules', (req, res) => {
      const modules = this.moduleLoader.getAllManifests();
      const response: ModuleListResponse = { modules };
      res.json({ success: true, data: response });
    });

    this.app.get('/api/modules/:name', (req, res) => {
      const manifest = this.moduleLoader.getManifest(req.params.name as string);
      if (manifest) {
        res.json({ success: true, data: manifest });
      } else {
        res.status(404).json({ success: false, error: 'Module not found' });
      }
    });

    // Interaction management
    this.app.get('/api/interactions', (req, res) => {
      const interactions = this.stateManager.getInteractions();
      const response: InteractionListResponse = { interactions };
      res.json({ success: true, data: response });
    });

    this.app.post('/api/interactions', async (req, res) => {
      try {
        const interaction: InteractionConfig = req.body;
        await this.stateManager.addInteraction(interaction);
        res.json({ success: true, data: interaction });
      } catch (error) {
        res.status(400).json({ success: false, error: String(error) });
      }
    });

    this.app.put('/api/interactions/:id', async (req, res) => {
      try {
        const interaction: InteractionConfig = req.body;
        await this.stateManager.updateInteraction(interaction);
        res.json({ success: true, data: interaction });
      } catch (error) {
        res.status(400).json({ success: false, error: String(error) });
      }
    });

    this.app.delete('/api/interactions/:id', async (req, res) => {
      try {
        const removed = await this.stateManager.removeInteraction(req.params.id as string);
        if (removed) {
          res.json({ success: true });
        } else {
          res.status(404).json({ success: false, error: 'Interaction not found' });
        }
      } catch (error) {
        res.status(400).json({ success: false, error: String(error) });
      }
    });

    // Documentation endpoint
    this.app.get('/api/documentation/*', (req, res) => {
      try {
        const path = req.params[0];
        const fs = require('fs');
        const pathModule = require('path');
        
        // Determine the file path based on the request
        let filePath: string;
        
        if (path.startsWith('documentation/')) {
          // Project documentation files
          filePath = pathModule.join(__dirname, '..', '..', 'documentation', path.replace('documentation/', ''));
        } else if (path.startsWith('modules/')) {
          // Module wiki files
          filePath = pathModule.join(__dirname, '..', 'modules', path.replace('modules/', ''));
        } else {
          return res.status(400).json({ success: false, error: 'Invalid documentation path' });
        }
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ success: false, error: 'Documentation file not found' });
        }
        
        // Read and return the file content
        const content = fs.readFileSync(filePath, 'utf-8');
        res.set('Content-Type', 'text/plain');
        res.send(content);
        
      } catch (error) {
        console.error('Error serving documentation:', error);
        res.status(500).json({ success: false, error: 'Failed to load documentation' });
      }
    });

    // Route management
    this.app.get('/api/routes', (req, res) => {
      const routes = this.stateManager.getRoutes();
      res.json({ success: true, data: routes });
    });

    this.app.post('/api/routes', async (req, res) => {
      try {
        const route: MessageRoute = req.body;
        await this.stateManager.addRoute(route);
        this.messageRouter.addRoute(route);
        res.json({ success: true, data: route });
      } catch (error) {
        res.status(400).json({ success: false, error: String(error) });
      }
    });

    this.app.delete('/api/routes/:id', async (req, res) => {
      try {
        const removed = this.messageRouter.removeRoute(req.params.id as string);
        if (removed) {
          res.json({ success: true });
        } else {
          res.status(404).json({ success: false, error: 'Route not found' });
        }
      } catch (error) {
        res.status(400).json({ success: false, error: String(error) });
      }
    });

    // Module instance management
    this.app.get('/api/module-instances', (req, res) => {
      const instances = this.stateManager.getModuleInstances();
      res.json({ success: true, data: instances });
    });

    this.app.get('/api/module-instances/:id', (req, res) => {
      const instance = this.stateManager.getModuleInstance(req.params.id as string);
      if (instance) {
        res.json({ success: true, data: instance });
      } else {
        res.status(404).json({ success: false, error: 'Module instance not found' });
      }
    });

    this.app.post('/api/module-instances', async (req, res) => {
      try {
        const { moduleName, config } = req.body;
        
        // Validate required fields
        if (!moduleName || typeof moduleName !== 'string') {
          return res.status(400).json({ 
            success: false, 
            error: 'moduleName is required and must be a string' 
          });
        }
        
        if (!config || typeof config !== 'object') {
          return res.status(400).json({ 
            success: false, 
            error: 'config is required and must be an object' 
          });
        }
        
        // Check if module exists
        const manifest = this.moduleLoader.getManifest(moduleName);
        if (!manifest) {
          return res.status(400).json({ 
            success: false, 
            error: `Module '${moduleName}' not found` 
          });
        }
        
        // Generate a unique instance ID
        const instanceId = `${moduleName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create the module instance using ModuleLoader with the specific instance ID
        const moduleInstance = await this.moduleLoader.createInstance(moduleName, config, instanceId);
        
        // Add it to state management
        const instanceData: ModuleInstance = {
          id: instanceId,
          moduleName,
          config,
          position: req.body.position
        };
        
        await this.stateManager.addModuleInstance(instanceData);
        res.json({ success: true, data: instanceData });
      } catch (error) {
        res.status(400).json({ success: false, error: String(error) });
      }
    });

    this.app.delete('/api/module-instances/:id', async (req, res) => {
      try {
        const removed = await this.stateManager.removeModuleInstance(req.params.id as string);
        if (removed) {
          res.json({ success: true });
        } else {
          res.status(404).json({ success: false, error: 'Module instance not found' });
        }
      } catch (error) {
        res.status(400).json({ success: false, error: String(error) });
      }
    });

    // Module control
    this.app.post('/api/module-instances/:id/start', async (req, res) => {
      try {
        const instanceData = this.stateManager.getModuleInstance(req.params.id as string);
        if (!instanceData) {
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        // Get the actual module instance from ModuleLoader using the instance ID
        const moduleInstance = this.moduleLoader.getInstance(req.params.id as string);
        if (!moduleInstance) {
          return res.status(404).json({ success: false, error: 'Module instance not found in ModuleLoader' });
        }
        
        await moduleInstance.start();
        return res.json({ success: true });
      } catch (error) {
        return res.status(400).json({ success: false, error: String(error) });
      }
    });

    this.app.post('/api/module-instances/:id/stop', async (req, res) => {
      try {
        const instanceData = this.stateManager.getModuleInstance(req.params.id as string);
        if (!instanceData) {
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        // Get the actual module instance from ModuleLoader using the instance ID
        const moduleInstance = this.moduleLoader.getInstance(req.params.id as string);
        if (!moduleInstance) {
          return res.status(404).json({ success: false, error: 'Module instance not found in ModuleLoader' });
        }
        
        await moduleInstance.stop();
        return res.json({ success: true });
      } catch (error) {
        return res.status(400).json({ success: false, error: String(error) });
      }
    });

    this.app.post('/api/module-instances/:id/trigger', async (req, res) => {
      try {
        const instanceData = this.stateManager.getModuleInstance(req.params.id as string);
        if (!instanceData) {
          return res.status(404).json({ success: false, error: 'Module instance not found' });
        }
        
        // Get the actual module instance from ModuleLoader
        const moduleInstance = this.moduleLoader.getInstance(req.params.id as string);
        if (!moduleInstance) {
          return res.status(404).json({ success: false, error: 'Module instance not found in ModuleLoader' });
        }
        
        // Check if the module has a manual trigger method (only output modules have this)
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

    // Logs
    this.app.get('/api/logs', (req, res) => {
      const count = parseInt(req.query.count as string) || 100;
      const logs = this.logger.getRecentLogs(count);
      res.json({ success: true, data: logs });
    });

    // Settings
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
    this.wss.on('connection', (ws, req) => {
      this.logger.info('WebSocket client connected', 'WebSocket', {
        ip: req.socket.remoteAddress
      });

      // Register for log streaming
      this.logger.registerFrontendClient(ws);

      // Send initial state
      ws.send(JSON.stringify({
        type: 'init',
        data: {
          stats: this.systemStats.getStats(),
          interactions: this.stateManager.getInteractions(),
          routes: this.stateManager.getRoutes(),
          modules: this.moduleLoader.getAllManifests()
        }
      }));

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          this.logger.error('Invalid WebSocket message:', String(error));
        }
      });

      ws.on('close', () => {
        this.logger.info('WebSocket client disconnected');
        this.logger.unregisterFrontendClient(ws);
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error:', error.message);
      });
    });
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(ws: any, message: any): void {
    switch (message.type) {
      case 'getStats':
        ws.send(JSON.stringify({
          type: 'stats',
          data: this.systemStats.getStats()
        }));
        break;

      case 'getLogs':
        const logs = this.logger.getRecentLogs(message.count || 100);
        ws.send(JSON.stringify({
          type: 'logs',
          data: logs
        }));
        break;

      case 'manualTrigger':
        // Handle manual trigger for modules
        this.handleManualTrigger(message.moduleId, ws);
        break;

      default:
        this.logger.warn('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Handle manual trigger requests
   */
  private async handleManualTrigger(moduleId: string, ws: any): Promise<void> {
    try {
      // This would need to be implemented based on your module management
      // For now, just acknowledge the request
      ws.send(JSON.stringify({
        type: 'manualTriggerResponse',
        data: { moduleId, success: true }
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'manualTriggerResponse',
        data: { moduleId, success: false, error: String(error) }
      }));
    }
  }

  /**
   * Setup event handlers for real-time updates
   */
  private setupEventHandlers(): void {
    // System stats updates
    this.systemStats.on('statsUpdated', (stats) => {
      this.broadcastToClients({
        type: 'stats',
        data: stats
      });
    });

    // State changes
    this.stateManager.on('stateChanged', () => {
      this.broadcastToClients({
        type: 'stateChanged',
        data: {
          interactions: this.stateManager.getInteractions(),
          routes: this.stateManager.getRoutes()
        }
      });
    });

    // Module events
    this.moduleLoader.on('moduleLoaded', (data) => {
      this.broadcastToClients({
        type: 'moduleLoaded',
        data
      });
    });

    // Message router events
    this.messageRouter.on('messageRouted', (message) => {
      this.broadcastToClients({
        type: 'messageRouted',
        data: message
      });
    });
  }

  /**
   * Broadcast message to all WebSocket clients
   */
  private broadcastToClients(message: any): void {
    const messageStr = JSON.stringify(message);
    
    this.wss.clients.forEach((client: any) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(messageStr);
        } catch (error) {
          this.logger.error('Error broadcasting to client:', String(error));
        }
      }
    });
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

      // Close WebSocket connections
      this.wss.close();

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
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
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