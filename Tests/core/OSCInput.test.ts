import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OscInputModule } from '../../backend/src/modules/input/osc_input/index';

interface OscInputConfig {
  port: number;
  host: string;
  addressPattern: string;
  enabled: boolean;
}

// Mock the OSC library
vi.mock('osc', () => ({
  UDPPort: vi.fn().mockImplementation((options) => ({
    on: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    send: vi.fn(),
    localAddress: options.localAddress,
    localPort: options.localPort
  }))
}));

describe('OSC Input Module', () => {
  let module: OscInputModule;
  let mockConfig: OscInputConfig;

  beforeEach(() => {
    mockConfig = {
      port: 8000,
      host: '0.0.0.0',
      addressPattern: '/trigger',
      enabled: true
    };

    module = new OscInputModule(mockConfig);
  });

  afterEach(() => {
    if (module) {
      module.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with correct default values', () => {
      expect(module.getOscParameters()).toEqual({
        port: 8000,
        host: '0.0.0.0',
        addressPattern: '/trigger',
        enabled: true,
        status: 'stopped',
        lastMessage: undefined,
        messageCount: 0,
        mode: 'trigger'
      });
    });

    it('should validate port range correctly', async () => {
      const invalidConfig = { ...mockConfig, port: 80 }; // Below minimum
      const invalidModule = new OscInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid port number: 80. Must be between 1024 and 65535.');
    });

    it('should validate host format correctly', async () => {
      const invalidConfig = { ...mockConfig, host: 'invalid-host' };
      const invalidModule = new OscInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid host address: invalid-host');
    });

    it('should accept valid host addresses', async () => {
      const validHosts = ['0.0.0.0', 'localhost', '127.0.0.1', '192.168.1.100'];
      
      for (const host of validHosts) {
        const config = { ...mockConfig, host };
        const testModule = new OscInputModule(config);
        await expect(testModule.init()).resolves.not.toThrow();
        await testModule.destroy();
      }
    });
  });

  describe('Address Pattern Matching', () => {
    beforeEach(async () => {
      await module.init();
    });

    it('should match exact addresses', async () => {
      const config = { ...mockConfig, addressPattern: '/trigger' };
      const testModule = new OscInputModule(config);
      await testModule.init();
      
      // Access private method for testing
      const matchesPattern = (testModule as any).matchesAddressPattern.bind(testModule);
      
      expect(matchesPattern('/trigger')).toBe(true);
      expect(matchesPattern('/trigger/button1')).toBe(false);
      expect(matchesPattern('/other')).toBe(false);
      
      await testModule.destroy();
    });

    it('should match wildcard patterns', async () => {
      const config = { ...mockConfig, addressPattern: '/trigger/*' };
      const testModule = new OscInputModule(config);
      await testModule.init();
      
      const matchesPattern = (testModule as any).matchesAddressPattern.bind(testModule);
      
      expect(matchesPattern('/trigger/button1')).toBe(true);
      expect(matchesPattern('/trigger/button2')).toBe(true);
      expect(matchesPattern('/trigger')).toBe(false);
      expect(matchesPattern('/other/button1')).toBe(false);
      
      await testModule.destroy();
    });

    it('should match all addresses with wildcard', async () => {
      const config = { ...mockConfig, addressPattern: '*' };
      const testModule = new OscInputModule(config);
      await testModule.init();
      
      const matchesPattern = (testModule as any).matchesAddressPattern.bind(testModule);
      
      expect(matchesPattern('/trigger')).toBe(true);
      expect(matchesPattern('/sensor/1')).toBe(true);
      expect(matchesPattern('/any/address')).toBe(true);
      
      await testModule.destroy();
    });
  });

  describe('Event Emission', () => {
    let eventSpy: any;

    beforeEach(async () => {
      await module.init();
      eventSpy = vi.fn();
      module.on('oscMessage', eventSpy);
    });

    it('should emit oscMessage for all received messages', () => {
      const mockOscMsg = {
        address: '/trigger/button1',
        args: [1]
      };

      (module as any).handleOscMessage(mockOscMsg);

      expect(eventSpy).toHaveBeenCalledWith({
        address: '/trigger/button1',
        args: [1],
        timestamp: expect.any(Number)
      });
    });

    it('should emit trigger when message matches pattern in trigger mode', () => {
      const triggerSpy = vi.fn();
      module.on('trigger', triggerSpy);

      const mockOscMsg = {
        address: '/trigger',
        args: [1]
      };

      (module as any).handleOscMessage(mockOscMsg);

      expect(triggerSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'osc_input',
        event: 'oscTrigger',
        payload: {
          address: '/trigger',
          args: [1],
          timestamp: expect.any(Number),
          messageCount: 1
        },
        timestamp: expect.any(Number)
      });
    });

    it('should emit stream when message matches pattern in streaming mode', () => {
      module.setMode('streaming');
      const streamSpy = vi.fn();
      module.on('stream', streamSpy);

      const mockOscMsg = {
        address: '/trigger',
        args: [0.75]
      };

      (module as any).handleOscMessage(mockOscMsg);

      // The stream event format from base class
      expect(streamSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'osc_input',
        value: {
          address: '/trigger',
          value: 0.75,
          args: [0.75],
          timestamp: expect.any(Number)
        },
        timestamp: expect.any(Number)
      });
    });

    it('should not emit trigger/stream for non-matching addresses', () => {
      const triggerSpy = vi.fn();
      const streamSpy = vi.fn();
      module.on('oscTrigger', triggerSpy);
      module.on('stream', streamSpy);

      const mockOscMsg = {
        address: '/other/address',
        args: [1]
      };

      (module as any).handleOscMessage(mockOscMsg);

      expect(triggerSpy).not.toHaveBeenCalled();
      expect(streamSpy).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await module.init();
    });

    it('should track message count correctly', () => {
      const mockOscMsg = {
        address: '/trigger',
        args: [1]
      };

      expect(module.getOscParameters().messageCount).toBe(0);

      (module as any).handleOscMessage(mockOscMsg);
      expect(module.getOscParameters().messageCount).toBe(1);

      (module as any).handleOscMessage(mockOscMsg);
      expect(module.getOscParameters().messageCount).toBe(2);
    });

    it('should track last message correctly', () => {
      const mockOscMsg1 = {
        address: '/trigger/button1',
        args: [1]
      };

      const mockOscMsg2 = {
        address: '/trigger/button2',
        args: [0]
      };

      (module as any).handleOscMessage(mockOscMsg1);
      expect(module.getOscParameters().lastMessage?.address).toBe('/trigger/button1');

      (module as any).handleOscMessage(mockOscMsg2);
      expect(module.getOscParameters().lastMessage?.address).toBe('/trigger/button2');
    });

    it('should reset message counter and last message', () => {
      const mockOscMsg = {
        address: '/trigger',
        args: [1]
      };

      (module as any).handleOscMessage(mockOscMsg);
      expect(module.getOscParameters().messageCount).toBe(1);
      expect(module.getOscParameters().lastMessage).toBeDefined();

      module.reset();

      expect(module.getOscParameters().messageCount).toBe(0);
      expect(module.getOscParameters().lastMessage).toBeUndefined();
    });
  });

  describe('Mode Switching', () => {
    beforeEach(async () => {
      await module.init();
    });

    it('should switch between trigger and streaming modes', () => {
      expect(module.getMode()).toBe('trigger');

      module.setMode('streaming');
      expect(module.getMode()).toBe('streaming');

      module.setMode('trigger');
      expect(module.getMode()).toBe('trigger');
    });

    it('should emit different events based on mode', () => {
      const triggerSpy = vi.fn();
      const streamSpy = vi.fn();
      module.on('trigger', triggerSpy);
      module.on('stream', streamSpy);

      const mockOscMsg = {
        address: '/trigger',
        args: [0.5]
      };

      // Test trigger mode
      (module as any).handleOscMessage(mockOscMsg);
      expect(triggerSpy).toHaveBeenCalledTimes(1);
      expect(streamSpy).not.toHaveBeenCalled();

      // Switch to streaming mode
      module.setMode('streaming');
      (module as any).handleOscMessage(mockOscMsg);
      expect(triggerSpy).toHaveBeenCalledTimes(1); // Still 1 from before
      expect(streamSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      await module.init();
      await module.start();
    });

    it('should update address pattern without restart', async () => {
      const newConfig = { ...mockConfig, addressPattern: '/sensor/*' };
      
      await module.updateConfig(newConfig);
      
      expect(module.getOscParameters().addressPattern).toBe('/sensor/*');
    });

    it('should restart listener when port changes', async () => {
      const newConfig = { ...mockConfig, port: 8001 };
      
      await module.updateConfig(newConfig);
      
      expect(module.getOscParameters().port).toBe(8001);
    });

    it('should restart listener when host changes', async () => {
      const newConfig = { ...mockConfig, host: '127.0.0.1' };
      
      await module.updateConfig(newConfig);
      
      expect(module.getOscParameters().host).toBe('127.0.0.1');
    });

    it('should enable/disable listener correctly', async () => {
      const newConfig = { ...mockConfig, enabled: false };
      
      await module.updateConfig(newConfig);
      
      expect(module.getOscParameters().enabled).toBe(false);
      expect(module.getOscParameters().status).toBe('stopped');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed OSC messages gracefully', () => {
      const malformedMsg = {
        address: null,
        args: 'not-an-array'
      };

      expect(() => {
        (module as any).handleOscMessage(malformedMsg);
      }).not.toThrow();
    });

    it('should handle missing OSC message properties', () => {
      const incompleteMsg = {
        address: '/trigger'
        // Missing args
      };

      expect(() => {
        (module as any).handleOscMessage(incompleteMsg);
      }).not.toThrow();
    });
  });

  describe('Integration with Output Modules', () => {
    let mockOutputModule: any;

    beforeEach(async () => {
      await module.init();
      
      // Create a mock output module
      mockOutputModule = {
        onTriggerEvent: vi.fn(),
        onStreamingEvent: vi.fn(),
        send: vi.fn()
      };
    });

    it('should send trigger events to output modules', () => {
      // Simulate connecting to an output module
      module.on('trigger', (data) => {
        mockOutputModule.onTriggerEvent(data);
      });

      const mockOscMsg = {
        address: '/trigger',
        args: [1]
      };

      (module as any).handleOscMessage(mockOscMsg);

      expect(mockOutputModule.onTriggerEvent).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'osc_input',
        event: 'oscTrigger',
        payload: {
          address: '/trigger',
          args: [1],
          timestamp: expect.any(Number),
          messageCount: 1
        },
        timestamp: expect.any(Number)
      });
    });

    it('should send streaming events to output modules', () => {
      module.setMode('streaming');
      
      // Simulate connecting to an output module
      module.on('stream', (data) => {
        mockOutputModule.onStreamingEvent(data);
      });

      const mockOscMsg = {
        address: '/trigger',
        args: [0.75]
      };

      (module as any).handleOscMessage(mockOscMsg);

      expect(mockOutputModule.onStreamingEvent).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'osc_input',
        value: {
          address: '/trigger',
          value: 0.75,
          args: [0.75],
          timestamp: expect.any(Number)
        },
        timestamp: expect.any(Number)
      });
    });

    it('should pass correct message values to output modules', () => {
      module.setMode('streaming');
      
      const streamSpy = vi.fn();
      module.on('stream', streamSpy);

      const testCases = [
        { args: [0.5], expectedValue: 0.5 },
        { args: [1], expectedValue: 1 },
        { args: [0], expectedValue: 1 }, // 0 is falsy, defaults to 1
        { args: [], expectedValue: 1 }, // Default value when no args
        { args: [null], expectedValue: 1 }, // Default value when null
      ];

      testCases.forEach(({ args, expectedValue }) => {
        const mockOscMsg = {
          address: '/trigger',
          args
        };

        (module as any).handleOscMessage(mockOscMsg);
        
        const lastCall = streamSpy.mock.calls[streamSpy.mock.calls.length - 1][0];
        expect(lastCall.value.value).toBe(expectedValue);
      });
    });
  });
}); 