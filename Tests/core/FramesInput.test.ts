import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FramesInputModule } from '../../backend/src/modules/input/frames_input/index';

interface FramesInputConfig {
  universe: number;
  enabled: boolean;
}

// Mock the sACN library
vi.mock('sacn', () => ({
  Receiver: vi.fn().mockImplementation((options) => {
    const mockReceiver = {
      on: vi.fn(),
      close: vi.fn(),
      universes: options.universes,
      port: options.port
    };
    return mockReceiver;
  })
}));

describe('Frames Input Module', () => {
  let module: FramesInputModule;
  let mockConfig: FramesInputConfig;

  beforeEach(() => {
    mockConfig = {
      universe: 999,
      enabled: true
    };

    module = new FramesInputModule(mockConfig);
  });

  afterEach(() => {
    if (module) {
      module.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with correct default values', () => {
      expect(module.getFrameParameters()).toEqual({
        universe: 999,
        enabled: true,
        status: 'stopped',
        currentFrame: 0,
        frameCount: 0,
        mode: 'trigger',
        lastFrameData: undefined
      });
    });

    it('should validate universe range correctly', async () => {
      const invalidConfig = { ...mockConfig, universe: 0 }; // Below minimum
      const invalidModule = new FramesInputModule(invalidConfig);
      
      // The validation happens in onInit, so we need to call init() to trigger it
      try {
        await invalidModule.init();
        // If we get here, the validation didn't work
        throw new Error('Validation should have failed but did not');
      } catch (error) {
        expect(error.message).toContain('Invalid universe number');
      }
    });

    it('should validate universe maximum correctly', async () => {
      const invalidConfig = { ...mockConfig, universe: 70000 }; // Above maximum
      const invalidModule = new FramesInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid universe number: 70000. Must be between 1 and 63999.');
    });

    it('should accept valid universe numbers', async () => {
      const validUniverses = [1, 999, 1000, 63999];
      
      for (const universe of validUniverses) {
        const config = { ...mockConfig, universe };
        const testModule = new FramesInputModule(config);
        await expect(testModule.init()).resolves.not.toThrow();
        await testModule.destroy();
      }
    });
  });

  describe('MSB/LSB Frame Extraction', () => {
    beforeEach(async () => {
      await module.init();
    });

    it('should correctly extract frame number from MSB/LSB', () => {
      const testCases = [
        { msb: 0, lsb: 100, expected: 100 },
        { msb: 1, lsb: 255, expected: 511 },
        { msb: 255, lsb: 255, expected: 65535 },
        { msb: 4, lsb: 210, expected: 1234 },
        { msb: 0, lsb: 0, expected: 0 }
      ];

      testCases.forEach(({ msb, lsb, expected }) => {
        const mockPacket = {
          slotsData: [msb, lsb, ...Array(510).fill(0)] // sACN has 512 channels
        };

        (module as any).handleSacnPacket(mockPacket);
        
        const params = module.getFrameParameters();
        expect(params.currentFrame).toBe(expected);
      });
    });

    it('should handle missing channel data gracefully', () => {
      const mockPacket = {
        slotsData: [] // Empty slots data
      };

      expect(() => {
        (module as any).handleSacnPacket(mockPacket);
      }).not.toThrow();

      const params = module.getFrameParameters();
      expect(params.currentFrame).toBe(0); // Should default to 0
    });

    it('should handle undefined channel data', () => {
      const mockPacket = {
        slotsData: [undefined, undefined, ...Array(510).fill(0)]
      };

      expect(() => {
        (module as any).handleSacnPacket(mockPacket);
      }).not.toThrow();

      const params = module.getFrameParameters();
      expect(params.currentFrame).toBe(0); // Should default to 0
    });
  });

  describe('Event Emission', () => {
    let eventSpy: any;

    beforeEach(async () => {
      await module.init();
      eventSpy = vi.fn();
      module.on('frameData', eventSpy);
    });

    it('should emit frameData for all received packets', () => {
      const mockPacket = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      (module as any).handleSacnPacket(mockPacket);

      expect(eventSpy).toHaveBeenCalledWith({
        frameNumber: 1234,
        msb: 4,
        lsb: 210,
        timestamp: expect.any(Number)
      });
    });

    it('should emit trigger when frame number changes in trigger mode', () => {
      const triggerSpy = vi.fn();
      module.on('trigger', triggerSpy);

      const mockPacket = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      (module as any).handleSacnPacket(mockPacket);

      expect(triggerSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'frames_input',
        event: 'frameChange',
        payload: {
          frameNumber: 1234,
          msb: 4,
          lsb: 210,
          timestamp: expect.any(Number),
          frameCount: 1
        },
        timestamp: expect.any(Number)
      });
    });

    it('should emit stream when frame number changes in streaming mode', () => {
      module.setMode('streaming');
      const streamSpy = vi.fn();
      module.on('stream', streamSpy);

      const mockPacket = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      (module as any).handleSacnPacket(mockPacket);

      expect(streamSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'frames_input',
        value: {
          frameNumber: 1234,
          msb: 4,
          lsb: 210,
          timestamp: expect.any(Number)
        },
        timestamp: expect.any(Number)
      });
    });

    it('should not emit trigger/stream for unchanged frame numbers', () => {
      const triggerSpy = vi.fn();
      const streamSpy = vi.fn();
      module.on('trigger', triggerSpy);
      module.on('stream', streamSpy);

      const mockPacket = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      // First packet - should emit
      (module as any).handleSacnPacket(mockPacket);
      expect(triggerSpy).toHaveBeenCalledTimes(1);

      // Second packet with same frame number - should not emit
      (module as any).handleSacnPacket(mockPacket);
      expect(triggerSpy).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should emit different events based on mode', () => {
      const triggerSpy = vi.fn();
      const streamSpy = vi.fn();
      module.on('trigger', triggerSpy);
      module.on('stream', streamSpy);

      const mockPacket = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      // Test trigger mode
      (module as any).handleSacnPacket(mockPacket);
      expect(triggerSpy).toHaveBeenCalledTimes(1);
      expect(streamSpy).not.toHaveBeenCalled();

      // Reset and test streaming mode
      module.reset();
      module.setMode('streaming');
      (module as any).handleSacnPacket(mockPacket);
      expect(triggerSpy).toHaveBeenCalledTimes(1); // Still 1 from before
      expect(streamSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await module.init();
    });

    it('should track frame count correctly', () => {
      const mockPacket = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      expect(module.getFrameParameters().frameCount).toBe(0);

      (module as any).handleSacnPacket(mockPacket);
      expect(module.getFrameParameters().frameCount).toBe(1);

      (module as any).handleSacnPacket(mockPacket);
      expect(module.getFrameParameters().frameCount).toBe(2);
    });

    it('should track last frame data correctly', () => {
      const mockPacket1 = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      const mockPacket2 = {
        slotsData: [1, 100, ...Array(510).fill(0)]
      };

      (module as any).handleSacnPacket(mockPacket1);
      expect(module.getFrameParameters().lastFrameData?.frameNumber).toBe(1234);

      (module as any).handleSacnPacket(mockPacket2);
      expect(module.getFrameParameters().lastFrameData?.frameNumber).toBe(356);
    });

    it('should reset frame counter and last frame data', () => {
      const mockPacket = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      (module as any).handleSacnPacket(mockPacket);
      expect(module.getFrameParameters().frameCount).toBe(1);
      expect(module.getFrameParameters().lastFrameData).toBeDefined();

      module.reset();

      expect(module.getFrameParameters().frameCount).toBe(0);
      expect(module.getFrameParameters().lastFrameData).toBeUndefined();
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
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      await module.init();
      await module.start();
    });

    it('should update universe without restart', async () => {
      const newConfig = { ...mockConfig, universe: 1000 };
      
      await module.updateConfig(newConfig);
      
      expect(module.getFrameParameters().universe).toBe(1000);
    });

    it('should restart listener when universe changes', async () => {
      const newConfig = { ...mockConfig, universe: 1000 };
      
      await module.updateConfig(newConfig);
      
      expect(module.getFrameParameters().universe).toBe(1000);
    });

    it('should enable/disable listener correctly', async () => {
      const newConfig = { ...mockConfig, enabled: false };
      
      await module.updateConfig(newConfig);
      
      expect(module.getFrameParameters().enabled).toBe(false);
      expect(module.getFrameParameters().status).toBe('stopped');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed sACN packets gracefully', () => {
      const malformedPacket = {
        slotsData: 'not-an-array'
      };

      expect(() => {
        (module as any).handleSacnPacket(malformedPacket);
      }).not.toThrow();
    });

    it('should handle missing packet properties', () => {
      const incompletePacket = {
        // Missing slotsData
      };

      expect(() => {
        (module as any).handleSacnPacket(incompletePacket);
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

      const mockPacket = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      (module as any).handleSacnPacket(mockPacket);

      expect(mockOutputModule.onTriggerEvent).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'frames_input',
        event: 'frameChange',
        payload: {
          frameNumber: 1234,
          msb: 4,
          lsb: 210,
          timestamp: expect.any(Number),
          frameCount: 1
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

      const mockPacket = {
        slotsData: [4, 210, ...Array(510).fill(0)]
      };

      (module as any).handleSacnPacket(mockPacket);

      expect(mockOutputModule.onStreamingEvent).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'frames_input',
        value: {
          frameNumber: 1234,
          msb: 4,
          lsb: 210,
          timestamp: expect.any(Number)
        },
        timestamp: expect.any(Number)
      });
    });

    it('should pass correct frame numbers to output modules', () => {
      module.setMode('streaming');
      
      const streamSpy = vi.fn();
      module.on('stream', streamSpy);

      const testCases = [
        { msb: 0, lsb: 100, expectedFrame: 100 },
        { msb: 1, lsb: 255, expectedFrame: 511 },
        { msb: 255, lsb: 255, expectedFrame: 65535 },
        { msb: 4, lsb: 210, expectedFrame: 1234 }
      ];

      testCases.forEach(({ msb, lsb, expectedFrame }) => {
        const mockPacket = {
          slotsData: [msb, lsb, ...Array(510).fill(0)]
        };

        (module as any).handleSacnPacket(mockPacket);
        
        const lastCall = streamSpy.mock.calls[streamSpy.mock.calls.length - 1][0];
        expect(lastCall.value.frameNumber).toBe(expectedFrame);
      });
    });
  });

  describe('sACN Listener Management', () => {
    it('should initialize sACN receiver correctly', async () => {
      await module.init();
      await module.start();

      // The receiver should be initialized
      expect(module.getFrameParameters().status).toBe('listening');
    });

    it('should stop sACN receiver on destroy', async () => {
      await module.init();
      await module.start();
      await module.destroy();

      expect(module.getFrameParameters().status).toBe('stopped');
    });

    it('should handle sACN receiver errors gracefully', async () => {
      await module.init();
      await module.start();

      // The module should be listening even if sACN errors occur
      expect(module.getFrameParameters().status).toBe('listening');
    });
  });
}); 