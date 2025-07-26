import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DmxOutputModule } from '../../backend/src/modules/output/dmx_output';
import { DmxOutputConfig } from '@interactor/shared';

describe('DMX Output Module', () => {
  let module: DmxOutputModule;
  const mockConfig: DmxOutputConfig = {
    universe: 1,
    brightness: 1.0,
    protocol: {
      type: 'artnet',
      host: '127.0.0.1',
      port: 6454
    },
    enabled: true,
    enableFileUpload: false // Disable for testing
  };

  beforeEach(async () => {
    module = new DmxOutputModule(mockConfig);
    await module.init();
  });

  afterEach(async () => {
    await module.destroy();
  });

  describe('Configuration', () => {
    it('should initialize with correct default values', () => {
      const state = module.getDetailedState();
      expect(state.universe).toBe(1);
      expect(state.brightness).toBe(1.0);
      expect(state.protocol.type).toBe('artnet');
      expect(state.enabled).toBe(true);
    });

    it('should validate universe range', async () => {
      const invalidConfig = { ...mockConfig, universe: 513 }; // Use a value that won't be defaulted
      const invalidModule = new DmxOutputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid universe number');
    });

    it('should validate brightness range', async () => {
      const invalidConfig = { ...mockConfig, brightness: 1.5 };
      const invalidModule = new DmxOutputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid brightness level');
    });

    it('should validate protocol configuration', async () => {
      const invalidConfig = { 
        ...mockConfig, 
        protocol: { 
          type: 'artnet',
          host: undefined, // Explicitly set to undefined to override default
          port: 6454
        } 
      };
      const invalidModule = new DmxOutputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Host is required for artnet protocol');
    });
  });

  describe('Brightness Control', () => {
    it('should set brightness correctly', () => {
      module.setBrightness(0.5);
      expect(module.getBrightness()).toBe(0.5);
    });

    it('should validate brightness range', () => {
      expect(() => module.setBrightness(-0.1)).toThrow('Brightness must be between 0.0 and 1.0');
      expect(() => module.setBrightness(1.1)).toThrow('Brightness must be between 0.0 and 1.0');
    });

    it('should apply brightness to DMX channels', async () => {
      module.setBrightness(0.5);
      const testChannels = [255, 128, 64];
      
      // Start the module to set isConnected to true
      await module.start();
      
      // Mock the actual DMX sending part but keep the brightness calculation
      const originalEmitOutput = module['emitOutput'];
      const outputSpy = vi.fn();
      module['emitOutput'] = outputSpy;

      await module.send(testChannels);
      
      // Check that the output event was emitted with brightness-adjusted channels
      // Note: Math.floor(255 * 0.5) = 127, Math.floor(128 * 0.5) = 64, Math.floor(64 * 0.5) = 32
      expect(outputSpy).toHaveBeenCalledWith('dmxSent', expect.objectContaining({
        channels: expect.arrayContaining([127, 64, 32]), // Brightness-adjusted values
        brightness: 0.5
      }));
      
      // Restore original method
      module['emitOutput'] = originalEmitOutput;
    });
  });

  describe('CSV File Processing', () => {
    it('should parse CSV data correctly', async () => {
      const csvData = Buffer.from('255,128,64\n128,255,128\n64,128,255');
      const sequence = await module['parseCsvToDmxSequence'](csvData);
      
      expect(sequence).toHaveLength(3);
      // Check first few channels (the rest are padded to 512)
      expect(sequence[0].channels.slice(0, 3)).toEqual([255, 128, 64]);
      expect(sequence[1].channels.slice(0, 3)).toEqual([128, 255, 128]);
      expect(sequence[2].channels.slice(0, 3)).toEqual([64, 128, 255]);
      // Check that all sequences are padded to 512 channels
      expect(sequence[0].channels).toHaveLength(512);
      expect(sequence[1].channels).toHaveLength(512);
      expect(sequence[2].channels).toHaveLength(512);
    });

    it('should handle invalid CSV data', async () => {
      const csvData = Buffer.from('255,abc,64\n128,def,128');
      const sequence = await module['parseCsvToDmxSequence'](csvData);
      
      expect(sequence).toHaveLength(2);
      expect(sequence[0].channels[1]).toBe(0); // 'abc' becomes 0
      expect(sequence[1].channels[1]).toBe(0); // 'def' becomes 0
    });

    it('should pad channels to 512', async () => {
      const csvData = Buffer.from('255,128');
      const sequence = await module['parseCsvToDmxSequence'](csvData);
      
      expect(sequence[0].channels).toHaveLength(512);
      expect(sequence[0].channels[0]).toBe(255);
      expect(sequence[0].channels[1]).toBe(128);
      expect(sequence[0].channels[2]).toBe(0);
    });

    it('should truncate channels beyond 512', async () => {
      const longRow = Array(600).fill(255).join(',');
      const csvData = Buffer.from(longRow);
      const sequence = await module['parseCsvToDmxSequence'](csvData);
      
      expect(sequence[0].channels).toHaveLength(512);
      expect(sequence[0].channels[511]).toBe(255);
    });
  });

  describe('Frame Management', () => {
    beforeEach(async () => {
      // Load a test sequence
      const csvData = Buffer.from('255,128,64\n128,255,128\n64,128,255');
      const sequence = await module['parseCsvToDmxSequence'](csvData);
      module['dmxSequence'] = sequence;
      module['totalFrames'] = sequence.length;
    });

    it('should send frame by index with proper wrapping', async () => {
      const sendSpy = vi.fn();
      module['sendDmxChannels'] = sendSpy;

      await module['sendFrameByIndex'](0);
      expect(sendSpy).toHaveBeenCalledWith(expect.arrayContaining([255, 128, 64]));

      await module['sendFrameByIndex'](1);
      expect(sendSpy).toHaveBeenCalledWith(expect.arrayContaining([128, 255, 128]));

      // Test wrapping
      await module['sendFrameByIndex'](3); // Should wrap to 0
      expect(sendSpy).toHaveBeenCalledWith(expect.arrayContaining([255, 128, 64]));

      await module['sendFrameByIndex'](-1); // Should wrap to 2
      expect(sendSpy).toHaveBeenCalledWith(expect.arrayContaining([64, 128, 255]));
    });

    it('should set current frame correctly', () => {
      module.setCurrentFrame(1);
      expect(module.getCurrentFrame()).toBe(1);

      // Test wrapping
      module.setCurrentFrame(5); // Should wrap to 2 (5 % 3)
      expect(module.getCurrentFrame()).toBe(2);

      module.setCurrentFrame(-1); // Should wrap to 2
      expect(module.getCurrentFrame()).toBe(2);
    });

    it('should get total frames correctly', () => {
      expect(module.getTotalFrames()).toBe(3);
    });

    it('should get DMX sequence correctly', () => {
      const sequence = module.getDmxSequence();
      expect(sequence).toHaveLength(3);
      expect(sequence[0].frameNumber).toBe(0);
      expect(sequence[1].frameNumber).toBe(1);
      expect(sequence[2].frameNumber).toBe(2);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      // Load a test sequence
      const csvData = Buffer.from('255,128,64\n128,255,128\n64,128,255');
      const sequence = await module['parseCsvToDmxSequence'](csvData);
      module['dmxSequence'] = sequence;
      module['totalFrames'] = sequence.length;
      await module.start();
    });

    it('should handle trigger events in trigger mode', async () => {
      const triggerSpy = vi.fn();
      module.on('trigger', triggerSpy);

      const triggerEvent = {
        type: 'trigger' as const,
        payload: { value: 1 },
        timestamp: Date.now(),
        source: 'test'
      };

      await module.onTriggerEvent(triggerEvent);

      expect(module.getCurrentFrame()).toBe(1); // Should advance to next frame
    });

    it('should handle streaming events in streaming mode', async () => {
      const streamSpy = vi.fn();
      module.on('stream', streamSpy);

      const streamEvent = {
        type: 'stream' as const,
        value: 1.5, // Should floor to 1
        timestamp: Date.now(),
        source: 'test'
      };

      await module.onStreamingEvent(streamEvent);

      expect(module.getCurrentFrame()).toBe(1); // Should set to frame 1
    });

    it('should handle manual trigger', async () => {
      // The module is already started in beforeEach, so we don't need to start it again
      const outputSpy = vi.fn();
      module.on('output', outputSpy);

      await module.manualTrigger();

      // The manual trigger should emit a dmxSent event
      expect(outputSpy).toHaveBeenCalledWith(expect.objectContaining({
        event: 'dmxSent'
      }));
    });
  });

  describe('File Management', () => {
    it('should get available files', () => {
      const files = module.getFiles();
      expect(Array.isArray(files)).toBe(true);
    });

    it('should load file by name', async () => {
      // Mock the loadDmxFile method directly to test the public API
      const originalLoadDmxFile = module['loadDmxFile'];
      module['loadDmxFile'] = vi.fn().mockReturnValue(true);

      const result = await module.loadFile('test.csv');
      
      // The loadFile method should return true for successful load
      expect(result).toBe(true);
      expect(module['loadDmxFile']).toHaveBeenCalledWith('test.csv');

      // Restore original method
      module['loadDmxFile'] = originalLoadDmxFile;
    });

    it('should handle file not found', async () => {
      const mockExists = vi.fn().mockReturnValue(false);
      
      const originalExists = require('fs').existsSync;
      require('fs').existsSync = mockExists;

      const result = await module.loadFile('nonexistent.csv');
      
      expect(result).toBe(false);

      require('fs').existsSync = originalExists;
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const result = await module.testConnection();
      expect(typeof result).toBe('boolean');
    });

    it('should return false when disabled', async () => {
      module['enabled'] = false;
      const result = await module.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should reset counters correctly', () => {
      // Set some state
      module['frameCount'] = 10;
      module['errorCount'] = 5;
      module['currentFrame'] = 2;
      module['isPlaying'] = true;

      module.reset();

      expect(module['frameCount']).toBe(0);
      expect(module['errorCount']).toBe(0);
      expect(module['currentFrame']).toBe(0);
      expect(module['isPlaying']).toBe(false);
    });

    it('should get detailed state correctly', () => {
      const state = module.getDetailedState();
      
      expect(state).toHaveProperty('universe');
      expect(state).toHaveProperty('brightness');
      expect(state).toHaveProperty('protocol');
      expect(state).toHaveProperty('enabled');
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('currentFrame');
      expect(state).toHaveProperty('totalFrames');
      expect(state).toHaveProperty('isPlaying');
      expect(state).toHaveProperty('frameCount');
      expect(state).toHaveProperty('errorCount');
      expect(state).toHaveProperty('status');
    });

    it('should load default file on startup when no sequence is loaded', async () => {
      // Create a new module with empty sequence
      const newModule = new DmxOutputModule(mockConfig);
      newModule['dmxSequence'] = []; // Clear any default sequence
      
      // Mock the loadDefaultDmxFile method
      const loadDefaultSpy = vi.spyOn(newModule as any, 'loadDefaultDmxFile');
      
      await newModule.init();
      await newModule.start();
      
      // Should have called loadDefaultDmxFile during startup
      expect(loadDefaultSpy).toHaveBeenCalled();
      
      await newModule.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should load default file when no sequence is loaded', async () => {
      // Clear the sequence to simulate no file loaded
      module['dmxSequence'] = [];
      
      // Mock the loadDefaultDmxFile method to verify it's called
      const loadDefaultSpy = vi.spyOn(module as any, 'loadDefaultDmxFile');
      
      // Mock the sendDmxChannels method to avoid connection issues
      const originalSendDmxChannels = module['sendDmxChannels'];
      module['sendDmxChannels'] = vi.fn().mockResolvedValue(undefined);
      
      await module['sendFrameByIndex'](0);
      
      // Should have called loadDefaultDmxFile
      expect(loadDefaultSpy).toHaveBeenCalled();
      
      // Restore original method
      module['sendDmxChannels'] = originalSendDmxChannels;
    });

    it('should handle send without connection', async () => {
      module['isConnected'] = false;
      await expect(module['sendDmxChannels']([255, 128, 64])).rejects.toThrow('DMX connection is not ready');
    });

    it('should handle disabled module', async () => {
      module['enabled'] = false;
      await expect(module.send([255, 128, 64])).rejects.toThrow('DMX output module is disabled');
    });
  });
}); 