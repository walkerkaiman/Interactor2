import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OscOutputModule } from '../../backend/src/modules/output/osc_output';

// Mock the osc module
vi.mock('osc', () => ({
  UDPPort: vi.fn().mockImplementation(() => {
    const mockUdpPort = {
      on: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
      send: vi.fn()
    };

    // Store callbacks
    const callbacks: Record<string, Function> = {};

    mockUdpPort.on = vi.fn().mockImplementation((event: string, callback: Function) => {
      callbacks[event] = callback;
    });

    // Simulate the 'ready' event when open is called
    mockUdpPort.open = vi.fn().mockImplementation(() => {
      // Trigger the 'ready' event after a short delay to simulate async behavior
      setTimeout(() => {
        if (callbacks['ready']) {
          callbacks['ready']();
        }
      }, 10);
    });

    return mockUdpPort;
  })
}));

describe('OSC Output Module', () => {
  let module: OscOutputModule;
  const mockConfig = {
    host: '127.0.0.1',
    port: 8000,
    addressPattern: '/trigger',
    enabled: true
  };

  beforeEach(async () => {
    module = new OscOutputModule(mockConfig);
    await module.init();
  });

  afterEach(async () => {
    await module.destroy();
  });

  describe('Configuration', () => {
    it('should initialize with correct default values', () => {
      expect(module.getConfig()).toEqual(mockConfig);
      expect(module.getConfig().host).toBe('127.0.0.1');
      expect(module.getConfig().port).toBe(8000);
      expect(module.getConfig().addressPattern).toBe('/trigger');
      expect(module.getConfig().enabled).toBe(true);
    });

    it('should validate port range correctly', async () => {
      const invalidConfig = { ...mockConfig, port: 80 };
      await expect(module.updateConfig(invalidConfig)).rejects.toThrow('Invalid configuration: Field \'port\' must be at least 1024');
    });

    it('should validate host format correctly', async () => {
      const invalidConfig = { ...mockConfig, host: 'invalid-host' };
      await expect(module.updateConfig(invalidConfig)).rejects.toThrow('Invalid host address: invalid-host');
    });

    it('should validate address pattern correctly', async () => {
      const invalidConfig = { ...mockConfig, addressPattern: 'invalid-pattern' };
      await expect(module.updateConfig(invalidConfig)).rejects.toThrow('Invalid OSC address pattern: invalid-pattern. Must start with \'/\'');
    });

    it('should accept valid configurations', async () => {
      const validConfig = { ...mockConfig, port: 9000, host: '192.168.1.100' };
      await expect(module.updateConfig(validConfig)).resolves.not.toThrow();
    });
  });

  describe('Module Lifecycle', () => {
    it('should start and stop correctly', async () => {
      await module.start();
      
      // Wait for the mock to trigger the ready event
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(module.isOutputConnected()).toBe(true);

      await module.stop();
      expect(module.isOutputConnected()).toBe(false);
    });

    it('should handle disabled state', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const disabledModule = new OscOutputModule(disabledConfig);
      await disabledModule.init();
      
      expect(disabledModule.isOutputConnected()).toBe(false);
      
      await disabledModule.destroy();
    });
  });

  describe('Data Conversion', () => {
    it('should convert numbers correctly', () => {
      // Test the private method by accessing it through the module instance
      const convertMethod = (module as any).convertToOscArgs;
      expect(convertMethod(42)).toEqual([42]);
    });

    it('should convert strings correctly', () => {
      const convertMethod = (module as any).convertToOscArgs;
      expect(convertMethod('hello world')).toEqual(['hello world']);
    });

    it('should convert booleans correctly', () => {
      const convertMethod = (module as any).convertToOscArgs;
      expect(convertMethod(true)).toEqual([1]);
      expect(convertMethod(false)).toEqual([0]);
    });

    it('should convert arrays correctly', () => {
      const convertMethod = (module as any).convertToOscArgs;
      expect(convertMethod([1, 2, 3, 'test'])).toEqual([1, 2, 3, 'test']);
    });

    it('should convert objects with value property correctly', () => {
      const convertMethod = (module as any).convertToOscArgs;
      expect(convertMethod({ value: 123, other: 'data' })).toEqual([123]);
    });

    it('should convert objects without value property to JSON string', () => {
      const convertMethod = (module as any).convertToOscArgs;
      const testObj = { name: 'test', enabled: true };
      expect(convertMethod(testObj)).toEqual([JSON.stringify(testObj)]);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const disabledModule = new OscOutputModule(disabledConfig);
      await disabledModule.init();

      await expect(disabledModule.send('test')).rejects.toThrow('OSC output module is disabled');
      
      await disabledModule.destroy();
    });

    it('should handle OSC sender not ready error', async () => {
      // Test without starting the module
      await expect(module.send('test')).rejects.toThrow('OSC sender is not ready');
    });
  });

  describe('State Management', () => {
    it('should track message count correctly', () => {
      expect(module.getDetailedState().messageCount).toBe(0);
      
      // Manually increment to test state tracking
      (module as any).messageCount = 1;
      expect(module.getDetailedState().messageCount).toBe(1);
      
      (module as any).messageCount = 2;
      expect(module.getDetailedState().messageCount).toBe(2);
    });

    it('should track error count correctly', () => {
      expect(module.getDetailedState().errorCount).toBe(0);
      
      // Manually increment to test state tracking
      (module as any).errorCount = 1;
      expect(module.getDetailedState().errorCount).toBe(1);
    });

    it('should reset counters correctly', () => {
      // Set some initial state
      (module as any).messageCount = 5;
      (module as any).errorCount = 3;
      (module as any).lastMessage = { address: '/test', args: [1], timestamp: Date.now() };
      (module as any).lastError = { host: 'test', port: 8000, address: '/test', error: 'test', timestamp: Date.now() };
      
      expect(module.getDetailedState().messageCount).toBe(5);
      expect(module.getDetailedState().errorCount).toBe(3);
      
      module.reset();
      
      expect(module.getDetailedState().messageCount).toBe(0);
      expect(module.getDetailedState().errorCount).toBe(0);
    });

    it('should store last message correctly', () => {
      const testMessage = {
        address: '/test/address',
        args: ['test message'],
        timestamp: Date.now()
      };
      
      (module as any).lastMessage = testMessage;
      
      const state = module.getDetailedState();
      expect(state.lastMessage).toBeDefined();
      expect(state.lastMessage?.address).toBe('/test/address');
      expect(state.lastMessage?.args).toEqual(['test message']);
    });
  });

  describe('Configuration Updates', () => {
    it('should handle configuration updates correctly', async () => {
      const newConfig = { ...mockConfig, port: 9000, host: '192.168.1.100' };
      await module.updateConfig(newConfig);

      expect(module.getConfig().port).toBe(9000);
      expect(module.getConfig().host).toBe('192.168.1.100');
    });

    it('should validate new configuration', async () => {
      const invalidConfig = { ...mockConfig, port: 80 };
      await expect(module.updateConfig(invalidConfig)).rejects.toThrow('Invalid configuration: Field \'port\' must be at least 1024');
    });
  });

  describe('Connection Testing', () => {
    it('should fail connection test when disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const disabledModule = new OscOutputModule(disabledConfig);
      await disabledModule.init();

      const result = await disabledModule.testConnection();
      expect(result).toBe(false);
      
      await disabledModule.destroy();
    });

    it('should fail connection test when not started', async () => {
      const result = await module.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Host Validation', () => {
    it('should validate localhost correctly', () => {
      const isValidHost = (module as any).isValidHost;
      expect(isValidHost('localhost')).toBe(true);
      expect(isValidHost('127.0.0.1')).toBe(true);
    });

    it('should validate IP addresses correctly', () => {
      const isValidHost = (module as any).isValidHost;
      expect(isValidHost('192.168.1.100')).toBe(true);
      expect(isValidHost('10.0.0.1')).toBe(true);
      expect(isValidHost('172.16.0.1')).toBe(true);
    });

    it('should reject invalid IP addresses', () => {
      const isValidHost = (module as any).isValidHost;
      expect(isValidHost('invalid-host')).toBe(false);
      expect(isValidHost('256.256.256.256')).toBe(false);
      expect(isValidHost('192.168.1.')).toBe(false);
    });
  });

  describe('Module State', () => {
    it('should return correct state when stopped', () => {
      const state = module.getState();
      expect(state.id).toBeDefined();
      expect(state.status).toBe('stopped');
      expect(state.messageCount).toBe(0);
      expect(state.config).toEqual(mockConfig);
    });

    it('should return correct detailed state', () => {
      const state = module.getDetailedState();
      expect(state.host).toBe('127.0.0.1');
      expect(state.port).toBe(8000);
      expect(state.addressPattern).toBe('/trigger');
      expect(state.enabled).toBe(true);
      expect(state.isConnected).toBe(false);
      expect(state.status).toBe('stopped');
      expect(state.messageCount).toBe(0);
      expect(state.errorCount).toBe(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit status events correctly', async () => {
      const statusSpy = vi.fn();
      module.on('status', statusSpy);

      await module.start();
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for ready event

      expect(statusSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'osc_output',
        status: 'ready',
        details: { host: '127.0.0.1', port: 8000 }
      });
    });
  });
}); 