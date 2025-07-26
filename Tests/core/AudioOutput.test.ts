import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioOutputModule } from '../../backend/src/modules/output/audio_output';
import { AudioOutputConfig, AudioPlaybackData } from '@interactor/shared';

describe('Audio Output Module', () => {
  let module: AudioOutputModule;
  const mockConfig: AudioOutputConfig = {
    id: 'audio_output_1',
    name: 'Test Audio Output',
    type: 'output',
    version: '1.0.0',
    description: 'Test audio output module',
    author: 'Test User',
    deviceId: 'default',
    sampleRate: 44100,
    channels: 2,
    format: 'wav',
    volume: 0.8,
    enabled: true,
    bufferSize: 4096,
    loop: false,
    fadeInDuration: 500,
    fadeOutDuration: 1000
  };

  beforeEach(async () => {
    module = new AudioOutputModule(mockConfig);
    await module.init();
  });

  afterEach(async () => {
    await module.destroy();
  });

  describe('Configuration', () => {
    it('should initialize with correct default values', () => {
      const config = module.getConfig();
      expect(config).toEqual({
        deviceId: 'default',
        sampleRate: 44100,
        channels: 2,
        format: 'wav',
        volume: 0.8,
        enabled: true,
        bufferSize: 4096,
        loop: false,
        fadeInDuration: 500,
        fadeOutDuration: 1000,
        enableFileUpload: true,
        uploadPort: 3001,
        uploadHost: '0.0.0.0',
        maxFileSize: 52428800,
        allowedExtensions: ['.wav', '.mp3', '.ogg', '.m4a', '.flac']
      });
    });

    it('should validate sample rate correctly', async () => {
      const invalidConfig = { ...mockConfig, sampleRate: 5000 }; // Too low
      const invalidModule = new AudioOutputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid sample rate: 5000. Must be between 8000 and 48000 Hz.');
    });

    it('should validate channels correctly', async () => {
      const invalidConfig = { ...mockConfig, channels: 3 }; // Invalid
      const invalidModule = new AudioOutputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid channel count: 3. Must be 1 or 2.');
    });

    it('should validate volume correctly', async () => {
      const invalidConfig = { ...mockConfig, volume: 1.5 }; // Too high
      const invalidModule = new AudioOutputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid volume: 1.5. Must be between 0.0 and 1.0.');
    });

    it('should validate buffer size correctly', async () => {
      const invalidConfig = { ...mockConfig, bufferSize: 100 }; // Too small
      const invalidModule = new AudioOutputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid buffer size: 100. Must be between 256 and 16384 samples.');
    });

    it('should validate format correctly', async () => {
      const invalidConfig = { ...mockConfig, format: 'flac' as any }; // Invalid format
      const invalidModule = new AudioOutputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid audio format: flac. Must be \'wav\', \'mp3\', or \'ogg\'.');
    });

    it('should validate fade durations correctly', async () => {
      const invalidConfig = { ...mockConfig, fadeInDuration: 15000 }; // Too long
      const invalidModule = new AudioOutputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid fade in duration: 15000. Must be between 0 and 10000 ms.');
    });
  });

  describe('Module State', () => {
    it('should return correct initial state', () => {
      const state = module.getState();
      expect(state).toEqual({
        status: 'ready',
        deviceId: 'default',
        sampleRate: 44100,
        channels: 2,
        format: 'wav',
        volume: 0.8,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        loop: false,
        playCount: 0,
        errorCount: 0,
        lastError: undefined,
        lastUpdate: expect.any(Number),
        fileUploadEnabled: true,
        uploadPort: 3001,
        uploadCount: 0,
        lastUpload: undefined
      });
    });

    it('should return correct detailed state', () => {
      const state = module.getDetailedState();
      expect(state).toEqual({
        deviceId: 'default',
        sampleRate: 44100,
        channels: 2,
        format: 'wav',
        volume: 0.8,
        enabled: true,
        isConnected: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        playCount: 0,
        errorCount: 0,
        status: 'stopped'
      });
    });
  });

  describe('Audio Playback', () => {
    it('should handle string audio data (file path)', async () => {
      const outputSpy = vi.fn();
      module.on('output', outputSpy);

      await module.send('/path/to/audio.wav');

      expect(outputSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'audio_output',
        event: 'audioOutput',
        payload: {
          deviceId: 'default',
          sampleRate: 44100,
          channels: 2,
          format: 'wav',
          volume: 0.8,
          isPlaying: true,
          currentTime: 0,
          duration: 5.0, // Default duration for string data
          timestamp: expect.any(Number),
          playCount: 1
        },
        timestamp: expect.any(Number)
      });
    });

    it('should handle AudioPlaybackData objects', async () => {
      const outputSpy = vi.fn();
      module.on('output', outputSpy);

      const audioData: AudioPlaybackData = {
        audioData: new ArrayBuffer(1024),
        volume: 0.5,
        loop: true,
        fadeInDuration: 1000,
        fadeOutDuration: 500,
        timestamp: Date.now()
      };

      await module.send(audioData);

      expect(outputSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'audio_output',
        event: 'audioOutput',
        payload: {
          deviceId: 'default',
          sampleRate: 44100,
          channels: 2,
          format: 'wav',
          volume: 0.5,
          isPlaying: true,
          currentTime: 0,
          duration: expect.any(Number),
          timestamp: expect.any(Number),
          playCount: 1
        },
        timestamp: expect.any(Number)
      });
    });

    it('should handle unknown data types by generating test tone', async () => {
      const outputSpy = vi.fn();
      module.on('output', outputSpy);

      await module.send(42); // Unknown data type

      expect(outputSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'audio_output',
        event: 'audioOutput',
        payload: {
          deviceId: 'default',
          sampleRate: 44100,
          channels: 2,
          format: 'wav',
          volume: 0.8,
          isPlaying: true,
          currentTime: 0,
          duration: 1.0, // Test tone duration
          timestamp: expect.any(Number),
          playCount: 1
        },
        timestamp: expect.any(Number)
      });
    });

    it('should reject playback when disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const disabledModule = new AudioOutputModule(disabledConfig);
      await disabledModule.init();

      await expect(disabledModule.send('/path/to/audio.wav')).rejects.toThrow('Audio output module is disabled');
    });
  });

  describe('Event Handling', () => {
    it('should handle trigger events', async () => {
      const outputSpy = vi.fn();
      module.on('output', outputSpy);

      await module.onTriggerEvent({
        type: 'trigger',
        payload: '/path/to/audio.wav',
        timestamp: Date.now(),
        source: 'test'
      });

      expect(outputSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'audio_output',
        event: 'audioOutput',
        payload: expect.objectContaining({
          isPlaying: true,
          playCount: 1
        }),
        timestamp: expect.any(Number)
      });
    });

    it('should handle streaming events for volume control', async () => {
      // Test volume control via streaming
      await module.handleStreamingEvent({
        type: 'stream',
        value: 50, // 50% volume
        timestamp: Date.now(),
        source: 'volume_control'
      });

      // Volume should be normalized to 0.5
      const state = module.getState();
      expect(state.volume).toBe(0.5);
    });

    it('should handle manual trigger', async () => {
      const outputSpy = vi.fn();
      module.on('output', outputSpy);

      await module.manualTrigger();

      expect(outputSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'audio_output',
        event: 'audioOutput',
        payload: expect.objectContaining({
          isPlaying: true,
          playCount: 1,
          duration: 1.0 // Test tone duration
        }),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Playback Control', () => {
    beforeEach(async () => {
      await module.start();
    });

    it('should pause playback', async () => {
      const outputSpy = vi.fn();
      module.on('output', outputSpy);

      // Start playback first
      await module.send('/path/to/audio.wav');
      
      // Clear previous calls
      outputSpy.mockClear();

      // Pause playback
      await module.pause();

      expect(outputSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'audio_output',
        event: 'audioOutput',
        payload: expect.objectContaining({
          isPlaying: false
        }),
        timestamp: expect.any(Number)
      });
    });

    it('should resume playback', async () => {
      const outputSpy = vi.fn();
      module.on('output', outputSpy);

      // Start playback first
      await module.send('/path/to/audio.wav');
      
      // Pause playback
      await module.pause();
      
      // Clear previous calls
      outputSpy.mockClear();

      // Resume playback
      await module.resume();

      expect(outputSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'audio_output',
        event: 'audioOutput',
        payload: expect.objectContaining({
          isPlaying: true
        }),
        timestamp: expect.any(Number)
      });
    });

    it('should stop playback', async () => {
      const outputSpy = vi.fn();
      module.on('output', outputSpy);

      // Start playback first
      await module.send('/path/to/audio.wav');
      
      // Clear previous calls
      outputSpy.mockClear();

      // Stop playback
      await module.stop();

      expect(outputSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'audio_output',
        event: 'audioOutput',
        payload: expect.objectContaining({
          isPlaying: false,
          currentTime: 0
        }),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Error Handling', () => {
    it('should emit error events when playback fails', async () => {
      const errorSpy = vi.fn();
      module.on('error', errorSpy);

      // Mock a failure by sending invalid data
      await expect(module.send('')).rejects.toThrow('No audio data provided');

      expect(errorSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'audio_output',
        error: 'No audio data provided',
        context: 'audio_playback',
        timestamp: expect.any(Number)
      });
    });

    it('should increment error count on errors', async () => {
      // Mock a failure
      await expect(module.send('')).rejects.toThrow('No audio data provided');

      const state = module.getState();
      expect(state.errorCount).toBe(1);
    });
  });

  describe('Utility Methods', () => {
    it('should reset counters', () => {
      // First, trigger some activity
      module.send('/path/to/audio.wav');
      
      // Reset
      module.reset();

      const state = module.getState();
      expect(state.playCount).toBe(0);
      expect(state.errorCount).toBe(0);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
    });

    it('should test connection', async () => {
      const result = await module.testConnection();
      expect(result).toBe(true);
    });

    it('should test connection when disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const disabledModule = new AudioOutputModule(disabledConfig);
      await disabledModule.init();

      const result = await disabledModule.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    it('should handle valid configuration updates', async () => {
      const newConfig = {
        ...mockConfig,
        volume: 0.6,
        sampleRate: 48000,
        channels: 1
      };

      await module.onConfigUpdate(mockConfig, newConfig);

      const config = module.getConfig();
      expect(config.volume).toBe(0.6);
      expect(config.sampleRate).toBe(48000);
      expect(config.channels).toBe(1);
    });

    it('should reject invalid configuration updates', async () => {
      const invalidConfig = {
        ...mockConfig,
        sampleRate: 5000 // Invalid
      };

      await expect(module.onConfigUpdate(mockConfig, invalidConfig)).rejects.toThrow('Invalid sample rate: 5000. Must be between 8000 and 48000 Hz.');
    });
  });

  describe('Module Lifecycle', () => {
    it('should start and stop correctly', async () => {
      // Initially should be disconnected
      expect(module.isOutputConnected()).toBe(false);
      
      await module.start();
      expect(module.isOutputConnected()).toBe(true);

      // Use the lifecycle stop method (not the public stop method)
      await (module as any).onStop();
      expect(module.isOutputConnected()).toBe(false);
    });

    it('should destroy correctly', async () => {
      await module.start();
      await module.destroy();
      
      expect(module.isOutputConnected()).toBe(false);
    });
  });
}); 