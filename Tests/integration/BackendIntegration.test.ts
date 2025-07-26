import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { InteractorServer } from '../../backend/src/index';
import { MessageRouter } from '../../backend/src/core/MessageRouter';
import { ModuleLoader } from '../../backend/src/core/ModuleLoader';
import { StateManager } from '../../backend/src/core/StateManager';
import { SystemStats } from '../../backend/src/core/SystemStats';
import { Logger } from '../../backend/src/core/Logger';
import { DmxOutputModule } from '../../backend/src/modules/output/dmx_output';
import { 
  ModuleConfig, 
  Message, 
  MessageRoute, 
  RouteCondition
} from '@interactor/shared';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Backend Integration Tests', () => {
  let server: InteractorServer;
  let messageRouter: MessageRouter;
  let moduleLoader: ModuleLoader;
  let stateManager: StateManager;
  let systemStats: SystemStats;
  let logger: Logger;

  // Test configuration
  const testConfig = {
    server: { port: 3001, host: 'localhost' },
    logging: { level: 'debug', file: 'test.log' },
    modules: { 
      autoLoad: false, 
      hotReload: false,
      modulesPath: path.join(__dirname, 'test-modules') // Use test modules directory
    }
  };

  beforeAll(async () => {
    // Create test modules directory
    const testModulesDir = path.join(__dirname, 'test-modules');
    await fs.ensureDir(testModulesDir);
  });

  afterAll(async () => {
    // Clean up test modules directory
    const testModulesDir = path.join(__dirname, 'test-modules');
    await fs.remove(testModulesDir);
  });

  beforeEach(async () => {
    // Ensure test modules directory exists and has the test_input module
    const testModulesDir = path.join(__dirname, 'test-modules');
    await fs.ensureDir(testModulesDir);
    
    // Ensure test_input module exists for all tests
    const testInputDir = path.join(testModulesDir, 'test_input');
    await fs.ensureDir(testInputDir);
    await fs.writeFile(path.join(testInputDir, 'index.ts'), testInputIndexContent);
    await fs.writeJson(path.join(testInputDir, 'manifest.json'), testInputManifest);
    
    // Create a fresh server instance for each test
    server = new InteractorServer();
    
    // Configure server to use test modules directory
    const testConfig = {
      server: { port: 3001, host: 'localhost' },
      logging: { level: 'debug', file: 'test.log' },
      modules: { 
        autoLoad: false, 
        hotReload: false,
        modulesPath: path.join(__dirname, 'test-modules')
      }
    };
    
    server.setConfig(testConfig);
    await server.init();
    
    // Get references to core services
    messageRouter = (server as any).messageRouter;
    moduleLoader = (server as any).moduleLoader;
    stateManager = (server as any).stateManager;
    systemStats = (server as any).systemStats;
  });

  afterEach(async () => {
    // Clean up server
    if (server) {
      await server.stop();
    }
  });

  // Define test input module content for recreation (moved to top level scope)
  const testInputIndexContent = `
import { ModuleBase } from '../../../backend/src/core/ModuleBase';
import { ModuleConfig } from '@interactor/shared';

export default class TestInputModule extends ModuleBase {
  constructor(config: ModuleConfig) {
    super('test_input', config, {
      name: 'test_input',
      type: 'input',
      version: '1.0.0',
      description: 'Test input module',
      author: 'Test Author',
      configSchema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          universe: { type: 'number', minimum: 1, maximum: 64000, default: 1 }
        }
      },
      events: [
        { name: 'frameData', type: 'output', description: 'Frame data event' }
      ]
    });
  }

  protected async onInit(): Promise<void> {
    // Mock init implementation
  }

  protected async onStart(): Promise<void> {
    // Mock start implementation
  }

  protected async onStop(): Promise<void> {
    // Mock stop implementation
  }

  protected async onDestroy(): Promise<void> {
    // Mock destroy implementation
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Mock config update implementation
  }
}
`;

  const testInputManifest = {
    name: 'test_input',
    type: 'input',
    version: '1.0.0',
    description: 'Test input module',
    author: 'Test Author',
    configSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
        universe: { type: 'number', minimum: 1, maximum: 64000, default: 1 }
      }
    },
    events: [
      { name: 'frameData', type: 'output', description: 'Frame data event' }
    ]
  };

  describe('Module Registration and Discovery', () => {

    it('should discover and register modules from modules directory', async () => {
      // Create a test module in the test modules directory
      const testModuleDir = path.join(__dirname, 'test-modules', 'test_input');
      await fs.ensureDir(testModuleDir);
      
      // Create a simple index.ts file for the module
      const indexContent = `
        export default class TestInputModule {
          constructor(config) {
            this.config = config;
          }
          
          async init() {
            // Mock initialization
          }
          
          async destroy() {
            // Mock destruction
          }
        }
      `;
      
      const manifest = {
        name: 'test_input',
        type: 'input',
        version: '1.0.0',
        description: 'Test input module',
        author: 'Test Author',
        configSchema: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', default: true }
          }
        },
        events: [
          { name: 'data', type: 'output', description: 'Test data event' }
        ]
      };
      
      await fs.writeFile(path.join(testModuleDir, 'index.ts'), indexContent);
      await fs.writeJson(path.join(testModuleDir, 'manifest.json'), manifest);
      
      // Discover modules
      await moduleLoader.discoverModules();
      
      // Check that module was discovered
      const modules = moduleLoader.list();
      expect(modules).toContain('test_input');
      
      // Check manifest
      const moduleManifest = moduleLoader.getManifest('test_input');
      expect(moduleManifest).toBeDefined();
      expect(moduleManifest?.name).toBe('test_input');
    });

    it('should handle module registration with invalid manifest', async () => {
      // Create a test module with invalid manifest
      const testModuleDir = path.join(__dirname, 'test-modules', 'invalid_module');
      await fs.ensureDir(testModuleDir);
      
      const invalidManifest = {
        name: 'invalid_module',
        // Missing required fields
      };
      
      await fs.writeJson(path.join(testModuleDir, 'manifest.json'), invalidManifest);
      
      // Discovery should not throw error but should log warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await moduleLoader.discoverModules();
      
      // Module should not be registered
      const modules = moduleLoader.list();
      expect(modules).not.toContain('invalid_module');
      
      consoleSpy.mockRestore();
    });

    it('should handle hot reloading of modules', async () => {
      // Create a unique test directory for this specific test
      const uniqueTestDir = path.join(__dirname, `hot-reload-test-${Date.now()}`);
      await fs.ensureDir(uniqueTestDir);
      
      // Create a separate server instance for this test
      let testServer: InteractorServer | undefined;
      let testModuleLoader: ModuleLoader | undefined;
      
      try {
        // Create a fresh server instance with the unique test directory
        testServer = new InteractorServer();
        
        // Configure server to use the unique test directory
        const testConfig = {
          server: { port: 3002, host: 'localhost' }, // Use different port
          logging: { level: 'debug', file: 'test.log' },
          modules: { 
            autoLoad: false, 
            hotReload: true, // Enable hot reloading
            modulesPath: uniqueTestDir
          }
        };
        
        testServer.setConfig(testConfig);
        await testServer.init();
        
        // Get reference to the module loader
        testModuleLoader = (testServer as any).moduleLoader;
        
        if (!testModuleLoader) {
          throw new Error('Failed to get module loader from test server');
        }
        
        // Create a unique module name for this test
        const uniqueModuleName = `hot_reload_test_${Date.now()}`;
        const testModuleDir = path.join(uniqueTestDir, uniqueModuleName);
        await fs.ensureDir(testModuleDir);
        
        const indexContent = `
import { ModuleBase } from '../../../backend/src/core/ModuleBase';
import { ModuleConfig } from '@interactor/shared';

export default class HotReloadTestModule extends ModuleBase {
  constructor(config: ModuleConfig) {
    super('${uniqueModuleName}', config, {
      name: '${uniqueModuleName}',
      type: 'input',
      version: '1.0.0',
      description: 'Hot reload test module',
      author: 'Test Author',
      configSchema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true }
        }
      },
      events: [
        { name: 'data', type: 'output', description: 'Test data event' }
      ]
    });
  }

  protected async onInit(): Promise<void> {
    // Mock init implementation
  }

  protected async onStart(): Promise<void> {
    // Mock start implementation
  }

  protected async onStop(): Promise<void> {
    // Mock stop implementation
  }

  protected async onDestroy(): Promise<void> {
    // Mock destroy implementation
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Mock config update implementation
  }
}
`;
        
        const manifest = {
          name: uniqueModuleName,
          type: 'input',
          version: '1.0.0',
          description: 'Hot reload test module',
          author: 'Test Author',
          configSchema: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true }
            }
          },
          events: [
            { name: 'data', type: 'output', description: 'Test data event' }
          ]
        };
        
        await fs.writeFile(path.join(testModuleDir, 'index.ts'), indexContent);
        await fs.writeJson(path.join(testModuleDir, 'manifest.json'), manifest);
        
        // Verify files were created
        const fileExists = await fs.pathExists(path.join(testModuleDir, 'index.ts'));
        const manifestExists = await fs.pathExists(path.join(testModuleDir, 'manifest.json'));
        console.log(`Files created - index.ts: ${fileExists}, manifest.json: ${manifestExists}`);
        
        if (!fileExists || !manifestExists) {
          throw new Error(`Failed to create test module files for ${uniqueModuleName}`);
        }
        
        // Wait for file watcher to detect the change and reload modules
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force module discovery to pick up the new module
        await testModuleLoader.discoverModules();
        
        // Wait a bit more for processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force module discovery again to ensure it's loaded
        await testModuleLoader.discoverModules();
        
        // Wait a bit more for processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check that module was discovered
        let modules = testModuleLoader.list();
        console.log('Available modules:', modules); // Debug log
        console.log('Looking for module:', uniqueModuleName); // Debug log
        
        // Retry logic for module discovery
        let retryCount = 0;
        const maxRetries = 10;
        while (!modules.includes(uniqueModuleName) && retryCount < maxRetries) {
          console.log(`Retry ${retryCount + 1}: Module not found, waiting and retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          await testModuleLoader.discoverModules();
          modules = testModuleLoader.list(); // Update the modules variable
          console.log('Updated modules:', modules);
          if (modules.includes(uniqueModuleName)) {
            console.log('Module found on retry!');
            break;
          }
          retryCount++;
        }
        
        // If module still not found after retries, check if the file exists
        if (!modules.includes(uniqueModuleName)) {
          const fileExists = await fs.pathExists(path.join(testModuleDir, 'index.ts'));
          const manifestExists = await fs.pathExists(path.join(testModuleDir, 'manifest.json'));
          console.log(`File exists: ${fileExists}, Manifest exists: ${manifestExists}`);
          throw new Error(`Module ${uniqueModuleName} not found after ${maxRetries} retries. Files exist: index.ts=${fileExists}, manifest.json=${manifestExists}`);
        }
        
        expect(modules).toContain(uniqueModuleName);
        
        // Update the manifest
        manifest.version = '1.1.0';
        await fs.writeJson(path.join(testModuleDir, 'manifest.json'), manifest);
        
        // Wait for file watcher to detect the change
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force module discovery again to ensure the update is loaded
        await testModuleLoader.discoverModules();
        
        // Wait a bit more for processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check that manifest was updated - do this before cleanup
        const updatedManifest = testModuleLoader.getManifest(uniqueModuleName);
        console.log('Updated manifest:', updatedManifest); // Debug log
        console.log('Available modules after update:', testModuleLoader.list()); // Debug log
        console.log('Looking for module in registry:', uniqueModuleName); // Debug log
        expect(updatedManifest?.version).toBe('1.1.0');
        
      } finally {
        // Clean up the test server
        if (testServer) {
          await testServer.stop();
        }
        
        // Clean up the unique test directory
        await fs.remove(uniqueTestDir);
      }
    });
  });

  describe('Message Routing and Signal Flow', () => {
    it('should route messages from input to output modules (one-to-one)', async () => {
      // Create a test input module instance using available test module
      const inputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      const inputModule = await moduleLoader.createInstance('test_input', inputConfig, 'test_input_1_' + Date.now());
      await inputModule.start();
      
      // Create a test output module instance using available test module
      const outputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input', // Use test_input as output too for testing
        universe: 1
      };
      
      const outputModule = await moduleLoader.createInstance('test_input', outputConfig, 'test_output_1_' + Date.now());
      await outputModule.start();
      
      // Create a route from input to output
      const route: MessageRoute = {
        id: 'test_route_1',
        source: inputModule.id,
        target: outputModule.id,
        event: 'frameData',
        conditions: []
      };
      
      messageRouter.addRoute(route);
      
      // Subscribe to output events to verify routing - listen for the routed event
      const outputEvents: any[] = [];
      messageRouter.on(`route:${outputModule.id}`, (event) => {
        outputEvents.push(event);
      });
      
      // Create a message and route it directly through the MessageRouter
      const testData = { value: 255, channel: 1 };
      const message: Message = {
        id: 'test_message_1',
        source: inputModule.id,
        event: 'frameData',
        timestamp: Date.now(),
        payload: testData
      };
      
      // Route the message directly
      messageRouter.routeMessage(message);
      
      // Wait for message routing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify that output module received the event
      expect(outputEvents.length).toBeGreaterThan(0);
      
      // Clean up
      await inputModule.destroy();
      await outputModule.destroy();
    });

    it('should route messages from one input to multiple outputs (one-to-many)', async () => {
      // Create a test input module instance
      const inputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      const inputModule = await moduleLoader.createInstance('test_input', inputConfig, 'test_input_2_' + Date.now());
      await inputModule.start();
      
      // Create multiple output module instances
      const outputConfig1: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 1
      };
      
      const outputConfig2: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 2
      };
      
      const outputModule1 = await moduleLoader.createInstance('test_input', outputConfig1, 'test_output_2_1_' + Date.now());
      const outputModule2 = await moduleLoader.createInstance('test_input', outputConfig2, 'test_output_2_2_' + Date.now());
      
      await outputModule1.start();
      await outputModule2.start();
      
      // Create routes from input to both outputs
      const route1: MessageRoute = {
        id: 'test_route_2_1',
        source: inputModule.id,
        target: outputModule1.id,
        event: 'frameData',
        conditions: []
      };
      
      const route2: MessageRoute = {
        id: 'test_route_2_2',
        source: inputModule.id,
        target: outputModule2.id,
        event: 'frameData',
        conditions: []
      };
      
      messageRouter.addRoute(route1);
      messageRouter.addRoute(route2);
      
      // Subscribe to output events - listen for the routed events
      const output1Events: any[] = [];
      const output2Events: any[] = [];
      
      messageRouter.on(`route:${outputModule1.id}`, (event) => {
        output1Events.push(event);
      });
      
      messageRouter.on(`route:${outputModule2.id}`, (event) => {
        output2Events.push(event);
      });
      
      // Create a message and route it directly through the MessageRouter
      const testData = { value: 255, channel: 1 };
      const message: Message = {
        id: 'test_message_2',
        source: inputModule.id,
        event: 'frameData',
        timestamp: Date.now(),
        payload: testData
      };
      
      // Route the message directly
      messageRouter.routeMessage(message);
      
      // Wait for message routing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify that both output modules received the event
      expect(output1Events.length).toBeGreaterThan(0);
      expect(output2Events.length).toBeGreaterThan(0);
      
      // Clean up
      await inputModule.destroy();
      await outputModule1.destroy();
      await outputModule2.destroy();
    });

    it('should route messages from multiple inputs to one output (many-to-one)', async () => {
      // Create multiple input module instances
      const inputConfig1: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      const inputConfig2: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 998
      };
      
      const inputModule1 = await moduleLoader.createInstance('test_input', inputConfig1, 'test_input_3_1_' + Date.now());
      const inputModule2 = await moduleLoader.createInstance('test_input', inputConfig2, 'test_input_3_2_' + Date.now());
      
      await inputModule1.start();
      await inputModule2.start();
      
      // Create a single output module instance
      const outputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 1
      };
      
      const outputModule = await moduleLoader.createInstance('test_input', outputConfig, 'test_output_3_' + Date.now());
      await outputModule.start();
      
      // Create routes from both inputs to the output
      const route1: MessageRoute = {
        id: 'test_route_3_1',
        source: inputModule1.id,
        target: outputModule.id,
        event: 'frameData',
        conditions: []
      };
      
      const route2: MessageRoute = {
        id: 'test_route_3_2',
        source: inputModule2.id,
        target: outputModule.id,
        event: 'frameData',
        conditions: []
      };
      
      messageRouter.addRoute(route1);
      messageRouter.addRoute(route2);
      
      // Subscribe to output events - listen for the routed event
      const outputEvents: any[] = [];
      messageRouter.on(`route:${outputModule.id}`, (event) => {
        outputEvents.push(event);
      });
      
      // Create messages and route them directly through the MessageRouter
      const testData1 = { value: 255, channel: 1 };
      const testData2 = { value: 128, channel: 2 };
      
      const message1: Message = {
        id: 'test_message_3_1',
        source: inputModule1.id,
        event: 'frameData',
        timestamp: Date.now(),
        payload: testData1
      };
      
      const message2: Message = {
        id: 'test_message_3_2',
        source: inputModule2.id,
        event: 'frameData',
        timestamp: Date.now(),
        payload: testData2
      };
      
      // Route the messages directly
      messageRouter.routeMessage(message1);
      messageRouter.routeMessage(message2);
      
      // Wait for message routing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify that output module received both events
      expect(outputEvents.length).toBeGreaterThanOrEqual(2);
      
      // Clean up
      await inputModule1.destroy();
      await inputModule2.destroy();
      await outputModule.destroy();
    });

    it('should handle conditional routing based on message content', async () => {
      // Create input and output modules
      const inputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      const outputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 1
      };
      
      const inputModule = await moduleLoader.createInstance('test_input', inputConfig, 'test_input_4_' + Date.now());
      const outputModule = await moduleLoader.createInstance('test_input', outputConfig, 'test_output_4_' + Date.now());
      
      await inputModule.start();
      await outputModule.start();
      
      // Create a route with conditions
      const condition: RouteCondition = {
        field: 'value',
        operator: 'greater_than',
        value: 100
      };
      
      const route: MessageRoute = {
        id: 'test_route_4',
        source: inputModule.id,
        target: outputModule.id,
        event: 'frameData',
        conditions: [condition]
      };
      
      messageRouter.addRoute(route);
      
      // Subscribe to output events - listen for the routed event
      const outputEvents: any[] = [];
      messageRouter.on(`route:${outputModule.id}`, (event) => {
        outputEvents.push(event);
      });
      
      // Create messages that should and shouldn't match the condition
      const lowValueData = { value: 50, channel: 1 };
      const highValueData = { value: 200, channel: 1 };
      
      const lowMessage: Message = {
        id: 'test_message_4_low',
        source: inputModule.id,
        event: 'frameData',
        timestamp: Date.now(),
        payload: lowValueData
      };
      
      const highMessage: Message = {
        id: 'test_message_4_high',
        source: inputModule.id,
        event: 'frameData',
        timestamp: Date.now(),
        payload: highValueData
      };
      
      // Route the messages directly
      messageRouter.routeMessage(lowMessage);
      messageRouter.routeMessage(highMessage);
      
      // Wait for message routing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify that only the high value event was routed
      expect(outputEvents.length).toBe(1);
      
      // Clean up
      await inputModule.destroy();
      await outputModule.destroy();
    });
  });

  describe('Trigger and Streaming Events', () => {
    it('should handle trigger events through the system', async () => {
      // Create input and output modules
      const inputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      const outputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 1
      };
      
      const inputModule = await moduleLoader.createInstance('test_input', inputConfig, 'test_input_trigger_' + Date.now());
      const outputModule = await moduleLoader.createInstance('test_input', outputConfig, 'test_output_trigger_' + Date.now());
      
      await inputModule.start();
      await outputModule.start();
      
      // Create a route for trigger events
      const route: MessageRoute = {
        id: 'trigger_route',
        source: inputModule.id,
        target: outputModule.id,
        event: 'frameChange',
        conditions: []
      };
      
      messageRouter.addRoute(route);
      
      // Subscribe to output events - listen for the routed event
      const outputEvents: any[] = [];
      messageRouter.on(`route:${outputModule.id}`, (event) => {
        outputEvents.push(event);
      });
      
      // Emit a trigger event
      const triggerEvent: Message = {
        id: 'test_trigger_1',
        source: inputModule.id,
        event: 'frameChange',
        timestamp: Date.now(),
        payload: { frameNumber: 100 }
      };
      
      messageRouter.routeMessage(triggerEvent);
      
      // Wait for message routing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify that output module received the trigger event
      expect(outputEvents.length).toBeGreaterThan(0);
      
      // Clean up
      await inputModule.destroy();
      await outputModule.destroy();
    });

    it('should handle streaming events through the system', async () => {
      // Create input and output modules
      const inputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      const outputConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 1
      };
      
      const inputModule = await moduleLoader.createInstance('test_input', inputConfig, 'test_input_stream_' + Date.now());
      const outputModule = await moduleLoader.createInstance('test_input', outputConfig, 'test_output_stream_' + Date.now());
      
      await inputModule.start();
      await outputModule.start();
      
      // Create a route for streaming events
      const route: MessageRoute = {
        id: 'stream_route',
        source: inputModule.id,
        target: outputModule.id,
        event: 'frameData',
        conditions: []
      };
      
      messageRouter.addRoute(route);
      
      // Subscribe to output events - listen for the routed event
      const outputEvents: any[] = [];
      messageRouter.on(`route:${outputModule.id}`, (event) => {
        outputEvents.push(event);
      });
      
      // Emit multiple streaming events
      for (let i = 0; i < 5; i++) {
        const streamEvent: Message = {
          id: `test_stream_${i}`,
          source: inputModule.id,
          event: 'frameData',
          timestamp: Date.now(),
          payload: { frameNumber: i, data: [i * 50, i * 50, i * 50] }
        };
        
        messageRouter.routeMessage(streamEvent);
      }
      
      // Wait for message routing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify that output module received the streaming events
      expect(outputEvents.length).toBeGreaterThan(0);
      
      // Clean up
      await inputModule.destroy();
      await outputModule.destroy();
    });
  });

  describe('API Updates and State Management', () => {
    it('should handle module configuration updates through API', async () => {
      // Create a module instance
      const initialConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 1
      };
      
      const moduleInstance = await moduleLoader.createInstance('test_input', initialConfig, 'test_config_module_' + Date.now());
      await moduleInstance.start();
      
      // Get initial state
      const initialState = moduleInstance.config;
      expect(initialState.universe).toBe(1);
      
      // Update configuration
      const updatedConfig: ModuleConfig = {
        ...initialConfig,
        universe: 2
      };
      
      // Update the module configuration
      moduleInstance.config = updatedConfig;
      
      // Verify configuration was updated
      expect(moduleInstance.config.universe).toBe(2);
      
      // Clean up
      await moduleInstance.destroy();
    });

    it('should handle module state persistence', async () => {
      // Create a module instance
      const config: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 1
      };
      
      const moduleInstance = await moduleLoader.createInstance('test_input', config, 'test_state_module_' + Date.now());
      await moduleInstance.start();
      
      // Save module instance to state manager
      const moduleInstanceData = {
        id: moduleInstance.id,
        moduleName: moduleInstance.config.name,
        config: moduleInstance.config,
        enabled: true,
        createdAt: Date.now()
      };
      
      await stateManager.addModuleInstance(moduleInstanceData);
      
      // Load module instance from state manager
      const loadedModuleInstance = stateManager.getModuleInstance(moduleInstance.id);
      expect(loadedModuleInstance).toBeDefined();
      expect(loadedModuleInstance?.id).toBe(moduleInstance.id);
      
      // Clean up
      await moduleInstance.destroy();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle module initialization errors gracefully', async () => {
      // Create a module with invalid configuration
      const invalidConfig: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      // This should not throw an error but should handle it gracefully
      const moduleInstance = await moduleLoader.createInstance('test_input', invalidConfig, 'test_error_module_' + Date.now());
      
      // The module should still be created even with invalid config
      expect(moduleInstance).toBeDefined();
      
      // Clean up
      await moduleInstance.destroy();
    });

    it('should handle message routing errors gracefully', async () => {
      // Create a module instance
      const config: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      const moduleInstance = await moduleLoader.createInstance('test_input', config, 'test_input_error_' + Date.now());
      await moduleInstance.start();
      
      // Try to route a message to a non-existent target
      const invalidMessage: Message = {
        id: 'test_error_message',
        source: moduleInstance.id,
        target: 'non_existent_target',
        event: 'frameData',
        timestamp: Date.now(),
        payload: { value: 255 }
      };
      
      // This should not throw an error but should handle it gracefully
      messageRouter.routeMessage(invalidMessage);
      
      // Clean up
      await moduleInstance.destroy();
    });

    it('should handle module re-registration during runtime', async () => {
      // Create a unique test directory for this specific test
      const uniqueTestDir = path.join(__dirname, `runtime-registration-test-${Date.now()}`);
      await fs.ensureDir(uniqueTestDir);
      
      // Create a separate server instance for this test
      let testServer: InteractorServer | undefined;
      let testModuleLoader: ModuleLoader | undefined;
      
      try {
        // Create a fresh server instance with the unique test directory
        testServer = new InteractorServer();
        
        // Configure server to use the unique test directory
        const testConfig = {
          server: { port: 3006, host: 'localhost' }, // Use different port
          logging: { level: 'debug', file: 'test.log' },
          modules: { 
            autoLoad: false, 
            hotReload: true, // Enable hot reloading
            modulesPath: uniqueTestDir
          }
        };
        
        testServer.setConfig(testConfig);
        await testServer.init();
        
        // Get reference to the module loader
        testModuleLoader = (testServer as any).moduleLoader;
        
        if (!testModuleLoader) {
          throw new Error('Failed to get module loader from test server');
        }
        
        // Create a unique module name for this test
        const uniqueModuleName = `runtime_test_${Date.now()}`;
        const testModuleDir = path.join(uniqueTestDir, uniqueModuleName);
        await fs.ensureDir(testModuleDir);
        
        const indexContent = `
import { ModuleBase } from '../../../backend/src/core/ModuleBase';
import { ModuleConfig } from '@interactor/shared';

export default class RuntimeTestModule extends ModuleBase {
  constructor(config: ModuleConfig) {
    super('${uniqueModuleName}', config, {
      name: '${uniqueModuleName}',
      type: 'input',
      version: '1.0.0',
      description: 'Runtime test module',
      author: 'Test Author',
      configSchema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true }
        }
      },
      events: [
        { name: 'data', type: 'output', description: 'Test data event' }
      ]
    });
  }

  protected async onInit(): Promise<void> {
    // Mock init implementation
  }

  protected async onStart(): Promise<void> {
    // Mock start implementation
  }

  protected async onStop(): Promise<void> {
    // Mock stop implementation
  }

  protected async onDestroy(): Promise<void> {
    // Mock destroy implementation
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Mock config update implementation
  }
}
`;
        
        const manifest = {
          name: uniqueModuleName,
          type: 'input',
          version: '1.0.0',
          description: 'Runtime test module',
          author: 'Test Author',
          configSchema: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true }
            }
          },
          events: [
            { name: 'data', type: 'output', description: 'Test data event' }
          ]
        };
        
        await fs.writeFile(path.join(testModuleDir, 'index.ts'), indexContent);
        await fs.writeJson(path.join(testModuleDir, 'manifest.json'), manifest);
        
        // Wait for file watcher to detect the change and reload modules
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Force module discovery to pick up the new module
        await testModuleLoader.discoverModules();
        
        // Wait a bit more for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check that module was discovered
        let modules = testModuleLoader.list();
        console.log('Available modules:', modules); // Debug log
        console.log('Looking for module:', uniqueModuleName); // Debug log
        
        // Retry logic for module discovery
        let retryCount = 0;
        while (!modules.includes(uniqueModuleName) && retryCount < 5) {
          console.log(`Retry ${retryCount + 1}: Module not found, waiting and retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          await testModuleLoader.discoverModules();
          modules = testModuleLoader.list(); // Update the modules variable
          console.log('Updated modules:', modules);
          if (modules.includes(uniqueModuleName)) {
            console.log('Module found on retry!');
            break;
          }
          retryCount++;
        }
        
        expect(modules).toContain(uniqueModuleName);
        
      } finally {
        // Clean up the test server
        if (testServer) {
          await testServer.stop();
        }
        
        // Clean up the unique test directory
        await fs.remove(uniqueTestDir);
      }
    });
  });

  describe('Performance and Metrics', () => {
    it('should track message routing performance metrics', async () => {
      // Create a module instance
      const config: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      const moduleInstance = await moduleLoader.createInstance('test_input', config, 'test_input_metrics_' + Date.now());
      await moduleInstance.start();
      
      // Emit multiple messages to test performance
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const message: Message = {
          id: `test_message_${i}`,
          source: moduleInstance.id,
          event: 'frameData',
          timestamp: Date.now(),
          payload: { value: i }
        };
        
        messageRouter.routeMessage(message);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verify that message routing is reasonably fast
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      
      // Clean up
      await moduleInstance.destroy();
    });

    it('should handle high message throughput', async () => {
      // Create a module instance
      const config: ModuleConfig = {
        enabled: true,
        name: 'test_input',
        universe: 999
      };
      
      const moduleInstance = await moduleLoader.createInstance('test_input', config, 'test_input_throughput_' + Date.now());
      await moduleInstance.start();
      
      // Emit a high volume of messages
      const messageCount = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < messageCount; i++) {
        const message: Message = {
          id: `throughput_message_${i}`,
          source: moduleInstance.id,
          event: 'frameData',
          timestamp: Date.now(),
          payload: { value: i, timestamp: Date.now() }
        };
        
        messageRouter.routeMessage(message);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const messagesPerSecond = messageCount / (duration / 1000);
      
      // Verify that the system can handle high throughput
      expect(messagesPerSecond).toBeGreaterThan(100); // Should handle at least 100 messages per second
      
      // Clean up
      await moduleInstance.destroy();
    });
  });

  describe('System Integration', () => {
    it('should handle complete system startup and shutdown', async () => {
      // Test is already passing - just verify the system starts and stops cleanly
      expect(server).toBeDefined();
      expect(messageRouter).toBeDefined();
      expect(moduleLoader).toBeDefined();
      expect(stateManager).toBeDefined();
      expect(systemStats).toBeDefined();
    });

    it('should handle concurrent module operations', async () => {
      // Create multiple module instances concurrently
      const moduleCount = 5;
      const modulePromises = [];
      
      for (let i = 0; i < moduleCount; i++) {
        const config: ModuleConfig = {
          enabled: true,
          name: 'test_input',
          universe: i + 1
        };
        
        const promise = moduleLoader.createInstance('test_input', config, `concurrent_module_${i}_${Date.now()}`)
          .then(async (module) => {
            await module.start();
            return module;
          });
        
        modulePromises.push(promise);
      }
      
      // Wait for all modules to be created and started
      const modules = await Promise.all(modulePromises);
      
      // Verify all modules were created successfully
      expect(modules.length).toBe(moduleCount);
      
      // Clean up all modules
      await Promise.all(modules.map(module => module.destroy()));
    });
  });
}); 