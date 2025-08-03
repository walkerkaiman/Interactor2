import { OutputModuleBase } from '../../OutputModuleBase';
import Speaker from 'speaker';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as stream from 'stream';
import * as path from 'path';
import { Reader as WavReader } from 'wav';
import { FFmpeg } from 'prism-media';
import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'child_process';
import {
  ModuleConfig,
  AudioOutputConfig,
  AudioPlaybackData,
  AudioOutputPayload,
  AudioErrorData,
  AudioErrorPayload,
  AudioOutputModuleState,
  AudioFileUploadData,
  AudioFileUploadPayload,
  AudioFileListPayload,
  AudioFileDeletePayload,
  AudioFileMetadataPayload,
  TriggerEvent,
  StreamEvent,
  ModuleState,
  isAudioOutputConfig
} from '@interactor/shared';
import { InteractorError } from '../../../core/ErrorHandler';
import * as fs from 'fs-extra';
import * as path from 'path';
import express, { Request, Response } from 'express';
import { Server } from 'http';
import multer from 'multer';

export class AudioOutputModule extends OutputModuleBase {
  private deviceId: string;
  private sampleRate: number;
  private channels: number;
  private format: 'wav' | 'mp3' | 'ogg';
  private volume: number;
  private enabled: boolean;
  private bufferSize: number;
  private loop: boolean;
  private fadeInDuration: number;
  private fadeOutDuration: number;
  
  // File upload server properties
  private enableFileUpload: boolean;
  private globalUploadPort: number = 4000;
  private uploadCount = 0;
  private lastUpload: AudioFileUploadPayload | undefined = undefined;
  private maxFileSize: number;
  private allowedExtensions: string[];
  
  // Audio state
  private isPlaying = false;
  private currentTime = 0;
  private duration = 0;
  private playCount = 0;
  private errorCount = 0;
  private lastError: AudioErrorData | undefined = undefined;
  private currentAudioData: AudioPlaybackData | undefined = undefined;

  constructor(config: AudioOutputConfig) {
    // Apply defaults to config before passing to base class
    const configWithDefaults: AudioOutputConfig = {
      ...config,
      deviceId: config.deviceId || 'default',
      sampleRate: config.sampleRate || 44100,
      channels: config.channels || 2,
      format: config.format || 'wav',
      volume: config.volume || 1.0,
      enabled: config.enabled !== false,
      bufferSize: config.bufferSize || 4096,
      loop: config.loop || false,
      fadeInDuration: config.fadeInDuration || 0,
      fadeOutDuration: config.fadeOutDuration || 0,
      enableFileUpload: config.enableFileUpload !== false,
      uploadPort: 4000, // Global FileUploader port
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedExtensions: ['.wav', '.mp3', '.ogg', '.m4a', '.flac']
    };

    super('audio_output', configWithDefaults, {
      name: 'Audio Output',
      type: 'output',
      version: '1.0.0',
      description: 'Plays audio files and generates audio output',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'Audio device name or ID',
            default: 'default'
          },
          sampleRate: {
            type: 'number',
            description: 'Sample rate in Hz (8000-48000)',
            minimum: 8000,
            maximum: 48000,
            default: 44100
          },
          channels: {
            type: 'number',
            description: 'Number of audio channels (1-2)',
            minimum: 1,
            maximum: 2,
            default: 2
          },
          format: {
            type: 'string',
            description: 'Audio format',
            enum: ['wav', 'mp3', 'ogg'],
            default: 'wav'
          },
          volume: {
            type: 'number',
            description: 'Volume level (0.0-1.0)',
            minimum: 0.0,
            maximum: 1.0,
            default: 1.0
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the audio output',
            default: true
          },
          bufferSize: {
            type: 'number',
            description: 'Audio buffer size in samples',
            minimum: 256,
            maximum: 16384,
            default: 4096
          },
          loop: {
            type: 'boolean',
            description: 'Whether to loop audio playback',
            default: false
          },
          fadeInDuration: {
            type: 'number',
            description: 'Fade in duration in milliseconds',
            minimum: 0,
            maximum: 10000,
            default: 0
          },
          fadeOutDuration: {
            type: 'number',
            description: 'Fade out duration in milliseconds',
            minimum: 0,
            maximum: 10000,
            default: 0
          },
          enableFileUpload: {
            type: 'boolean',
            description: 'Enable/disable file upload server',
            default: true
          },

          maxFileSize: {
            type: 'number',
            description: 'Maximum file size in bytes',
            minimum: 1024,
            maximum: 100 * 1024 * 1024, // 100MB max
            default: 52428800 // 50MB
          },
          allowedExtensions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Allowed audio file extensions',
            default: ['.wav', '.mp3', '.ogg', '.m4a', '.flac']
          }
        },
        required: ['sampleRate', 'channels', 'format', 'volume', 'enabled', 'bufferSize', 'loop', 'fadeInDuration', 'fadeOutDuration']
      },
      events: [
        {
          name: 'audioPlay',
          type: 'input',
          description: 'Triggers audio playback'
        },
        {
          name: 'audioStop',
          type: 'input',
          description: 'Stops audio playback'
        },
        {
          name: 'audioPause',
          type: 'input',
          description: 'Pauses audio playback'
        },
        {
          name: 'audioResume',
          type: 'input',
          description: 'Resumes audio playback'
        },
        {
          name: 'audioOutput',
          type: 'output',
          description: 'Emitted when audio playback state changes'
        },
        {
          name: 'audioError',
          type: 'output',
          description: 'Emitted when an audio error occurs'
        },
        {
          name: 'stateUpdate',
          type: 'output',
          description: 'Emitted when module state changes'
        },
        {
          name: 'fileUploaded',
          type: 'output',
          description: 'Emitted when an audio file is uploaded successfully'
        },
        {
          name: 'fileListUpdated',
          type: 'output',
          description: 'Emitted when the list of available audio files changes'
        },
        {
          name: 'uploadError',
          type: 'output',
          description: 'Emitted when a file upload fails'
        }
      ]
    });

    // Set private properties from the config with defaults
    this.deviceId = configWithDefaults.deviceId || 'default';
    this.sampleRate = configWithDefaults.sampleRate || 44100;
    this.channels = configWithDefaults.channels || 2;
    this.format = configWithDefaults.format || 'wav';
    this.volume = configWithDefaults.volume || 1.0;
    this.enabled = configWithDefaults.enabled !== false;
    this.bufferSize = configWithDefaults.bufferSize || 4096;
    this.loop = configWithDefaults.loop || false;
    this.fadeInDuration = configWithDefaults.fadeInDuration || 0;
    this.fadeOutDuration = configWithDefaults.fadeOutDuration || 0;
    
    // Set file upload properties
    this.enableFileUpload = configWithDefaults.enableFileUpload !== false;

    this.maxFileSize = configWithDefaults.maxFileSize || 50 * 1024 * 1024;
    this.allowedExtensions = configWithDefaults.allowedExtensions || ['.wav', '.mp3', '.ogg', '.m4a', '.flac'];
    
    // Initialize Express app for file uploads

  }

  protected async onInit(): Promise<void> {
    // Validate sample rate
    if (this.sampleRate < 8000 || this.sampleRate > 48000) {
      throw InteractorError.validation(
        `Audio sample rate must be between 8000-48000 Hz`,
        { provided: this.sampleRate, min: 8000, max: 48000 }
      );
    }

    // Validate channels
    if (this.channels < 1 || this.channels > 2) {
      throw InteractorError.validation(
        `Audio channels must be 1 (mono) or 2 (stereo)`,
        { provided: this.channels, min: 1, max: 2 }
      );
    }

    // Validate volume
    if (this.volume < 0.0 || this.volume > 1.0) {
      throw InteractorError.validation(
        `Audio volume must be between 0.0-1.0`,
        { provided: this.volume, min: 0.0, max: 1.0 }
      );
    }

    // Validate buffer size
    if (this.bufferSize < 256 || this.bufferSize > 16384) {
      throw InteractorError.validation(
        `Audio buffer size must be between 256-16384 samples`,
        { provided: this.bufferSize, min: 256, max: 16384 }
      );
    }

    // Validate format
    if (!['wav', 'mp3', 'ogg'].includes(this.format)) {
      throw InteractorError.validation(
        `Audio format must be wav, mp3, or ogg`,
        { provided: this.format, allowed: ['wav', 'mp3', 'ogg'] }
      );
    }

    // Validate fade durations
    if (this.fadeInDuration < 0 || this.fadeInDuration > 10000) {
      throw InteractorError.validation(
        `Fade in duration must be between 0-10000 ms`,
        { provided: this.fadeInDuration, min: 0, max: 10000 }
      );
    }

    if (this.fadeOutDuration < 0 || this.fadeOutDuration > 10000) {
      throw InteractorError.validation(
        `Fade out duration must be between 0-10000 ms`,
        { provided: this.fadeOutDuration, min: 0, max: 10000 }
      );
    }

    // Validate file upload settings
    if (this.enableFileUpload) {
      if (this.globalUploadPort < 1024 || this.globalUploadPort > 65535) {
        throw InteractorError.validation(
          `File upload port must be between 1024-65535`,
          { provided: this.globalUploadPort, min: 1024, max: 65535 }
        );
      }

      if (this.maxFileSize < 1024 || this.maxFileSize > 100 * 1024 * 1024) {
        throw InteractorError.validation(
          `Max file size must be between 1KB-100MB`,
          { provided: this.maxFileSize, min: 1024, max: 100 * 1024 * 1024 }
        );
      }

      // Ensure assets directory exists
      const assetsDir = path.join(__dirname, 'assets');
      await fse.ensureDir(assetsDir);
    }
  }

  protected async onStart(): Promise<void> {
    // Start audio output
    this.setConnectionStatus(true);
    this.logger?.info('Audio output module started');
  }

  protected async onStop(): Promise<void> {
    // Stop any currently playing audio
    await this.stopAudio();
    this.setConnectionStatus(false);
    this.logger?.info('Audio output module stopped');
  }

  protected async onDestroy(): Promise<void> {
    // Stop any currently playing audio
    await this.stopAudio();
    this.setConnectionStatus(false);
    this.logger?.info('Audio output module destroyed');
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Use type guard to ensure we have audio output config
    if (!isAudioOutputConfig(newConfig)) {
      throw InteractorError.validation(
        'Invalid audio output configuration provided',
        { providedConfig: newConfig },
        ['Check that all required fields are present: sampleRate, channels, format, volume', 'Ensure values are within valid ranges', 'Verify audio format is supported']
      );
    }
    
    // Validate configuration
    if (newConfig.sampleRate < 8000 || newConfig.sampleRate > 48000) {
      throw InteractorError.validation(
        `Audio sample rate must be between 8000-48000 Hz`,
        { provided: newConfig.sampleRate, min: 8000, max: 48000 },
        ['Use 44100 Hz for CD quality', 'Use 48000 Hz for professional audio', 'Use 22050 Hz for lower quality/bandwidth']
      );
    }
    
    this.deviceId = newConfig.deviceId || 'default';
    this.sampleRate = newConfig.sampleRate || 44100;
    this.channels = newConfig.channels || 2;
    this.format = newConfig.format || 'wav';
    this.volume = newConfig.volume || 1.0;
    this.enabled = newConfig.enabled !== false;
    this.bufferSize = newConfig.bufferSize || 4096;
    this.loop = newConfig.loop || false;
    this.fadeInDuration = newConfig.fadeInDuration || 0;
    this.fadeOutDuration = newConfig.fadeOutDuration || 0;
    
    // Update file upload settings
    this.enableFileUpload = newConfig.enableFileUpload !== false;
  }

  /**
   * Send audio data with proper typing
   */
  protected async onSend<T = unknown>(data: T): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict(
        'Cannot send audio data when module is disabled',
        { enabled: this.enabled, attempted: 'send' }
      );
    }
    await this.playAudio(data);
  }

  /**
   * Handle trigger events with proper typing
   */
  protected async handleTriggerEvent(event: TriggerEvent): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict(
        'Cannot handle trigger event when audio module is disabled',
        { enabled: this.enabled, attempted: 'trigger_event' }
      );
    }
    await this.playAudio(event.payload);
  }

  /**
   * Handle streaming events with proper typing
   */
  protected async handleStreamingEvent(event: StreamEvent): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict(
        'Cannot handle streaming event when audio module is disabled',
        { enabled: this.enabled, attempted: 'streaming_event' }
      );
    }
    // For streaming events, we might want to adjust volume based on the value
    const volume = Math.max(0, Math.min(1, event.value / 100)); // Normalize 0-100 to 0-1
    await this.setVolume(volume);
  }

  /**
   * Handle manual trigger
   */
  protected async handleManualTrigger(): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict(
        'Cannot perform manual trigger when audio module is disabled',
        { enabled: this.enabled, attempted: 'manual_trigger' }
      );
    }
    
    // If a file is selected, play it; otherwise fall back to test tone
    if (this.config.selectedFile) {
      await this.playAudio(this.config.selectedFile);
    } else {
      const testData: AudioPlaybackData = {
        audioData: this.generateTestTone(),
        volume: this.volume,
        loop: false,
        fadeInDuration: this.fadeInDuration,
        fadeOutDuration: this.fadeOutDuration,
        timestamp: Date.now()
      };
      await this.playAudio(testData);
    }
  }

  /**
   * Play audio with proper typing and error handling
   */
  private async playAudio<T = unknown>(data: T): Promise<void> {
    const timestamp = Date.now();
    
    try {
      this.logger?.debug(`Playing audio with data:`, data);
      
      // Convert data to AudioPlaybackData
      let audioData: AudioPlaybackData;
      
      if (typeof data === 'string') {
        // Assume it's a file path or URL
        audioData = {
          audioData: data,
          volume: this.volume,
          loop: this.loop,
          fadeInDuration: this.fadeInDuration,
          fadeOutDuration: this.fadeOutDuration,
          timestamp
        };
      } else if (data === undefined || data === null) {
        // No data provided (e.g., trigger without payload) – use selected file
        audioData = {
          audioData: this.config.selectedFile || this.generateTestTone(),
          volume: this.volume,
          loop: this.loop,
          fadeInDuration: this.fadeInDuration,
          fadeOutDuration: this.fadeOutDuration,
          timestamp
        };
      } else if (typeof data === 'object') {
        // Assume it's already AudioPlaybackData or similar
        audioData = {
          audioData: (data as any).audioData || this.generateTestTone(),
          volume: (data as any).volume || this.volume,
          loop: (data as any).loop || this.loop,
          fadeInDuration: (data as any).fadeInDuration || this.fadeInDuration,
          fadeOutDuration: (data as any).fadeOutDuration || this.fadeOutDuration,
          timestamp
        };
      } else {
        // Generate test tone for unknown data
        audioData = {
          audioData: this.generateTestTone(),
          volume: this.volume,
          loop: this.loop,
          fadeInDuration: this.fadeInDuration,
          fadeOutDuration: this.fadeOutDuration,
          timestamp
        };
      }
      
      // Validate audio data - only check if it's an empty string
      if (typeof audioData.audioData === 'string' && audioData.audioData.trim() === '') {
        throw InteractorError.validation(
          'Audio data cannot be empty',
          { provided: audioData.audioData, type: typeof audioData.audioData }
        );
      }
      
      // Start playback
      await this.startPlayback(audioData);
      
      // Create output payload
      const outputPayload: AudioOutputPayload = {
        deviceId: this.deviceId,
        sampleRate: this.sampleRate,
        channels: this.channels,
        format: this.format,
        volume: audioData.volume || this.volume,
        isPlaying: this.isPlaying,
        currentTime: this.currentTime,
        duration: this.duration,
        timestamp,
        playCount: this.playCount
      };
      
      this.emitOutput<AudioOutputPayload>('audioOutput', outputPayload);
      this.emitStatus('playing', { 
        deviceId: this.deviceId, 
        volume: audioData.volume || this.volume,
        duration: this.duration 
      });
      
      this.logger?.info(`Audio playback started successfully`);
      
    } catch (error) {
      this.errorCount++;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData: AudioErrorData = {
        deviceId: this.deviceId,
        error: errorMessage,
        context: 'playback',
        timestamp
      };
      
      const errorPayload: AudioErrorPayload = {
        deviceId: this.deviceId,
        error: errorMessage,
        context: 'playback',
        timestamp
      };
      
      this.lastError = errorData;
      
      this.emitError(error instanceof Error ? error : new Error(errorMessage), 'audio_playback');
      this.emitOutput<AudioErrorPayload>('audioError', errorPayload);
      
      this.logger?.error(`Audio playback error:`, error);
      
      // Re-throw the error for the calling method to handle
      throw error;
    }
    
    // Emit state update
    this.emit('stateUpdate', {
      status: this.isPlaying ? 'playing' : 'ready',
      deviceId: this.deviceId,
      isPlaying: this.isPlaying,
      playCount: this.playCount,
      errorCount: this.errorCount,
      lastError: this.lastError
    });
  }

  /**
   * Start audio playback
   */
    private currentSpeaker: Speaker | null = null;
  private currentStream: stream.Readable | null = null;

  private async startPlayback(audioData: AudioPlaybackData): Promise<void> {
    // Stop any currently playing audio
    if (this.isPlaying) {
      await this.stopAudio();
    }
    
    // Resolve the audio source path or buffer
    let audioStream: stream.Readable;
    let speakerOptions = {
      channels: this.channels,
      bitDepth: 16,
      sampleRate: this.sampleRate,
      signed: true,
    };

    if (typeof audioData.audioData === 'string') {
      const audioFilePath = path.isAbsolute(audioData.audioData)
        ? audioData.audioData
        : path.join(process.cwd(), 'data', 'uploads', 'audio', audioData.audioData);
      const ext = path.extname(audioFilePath).toLowerCase();

      if (ext === '.wav') {
        audioStream = fs.createReadStream(audioFilePath).pipe(new WavReader());
      } else if (ext === '.mp3') {
        audioStream = new FFmpeg({
          ffmpegPath,
          args: [
            '-i', audioFilePath,
            '-f', 's16le',
            '-ar', this.sampleRate.toString(),
            '-ac', this.channels.toString(),
            '-'
          ]
        });
      } else {
        throw new Error('Unsupported file format');
      }
    } else if (audioData.audioData instanceof ArrayBuffer) {
      // Raw PCM test tone; wrap in readable
      audioStream = stream.Readable.from(Buffer.from(audioData.audioData));
    } else {
      throw new Error('Unsupported audio data');
    }

    // Create speaker instance
    this.currentSpeaker = new Speaker(speakerOptions);

    // Pipe stream to speaker
    this.currentStream = audioStream;
    audioStream.pipe(this.currentSpeaker);

    // Listen for end events to update state
    this.currentSpeaker.on('close', () => {
      this.isPlaying = false;
      this.currentTime = 0;
      this.emitOutput<AudioOutputPayload>('audioOutput', {
        deviceId: this.deviceId,
        sampleRate: this.sampleRate,
        channels: this.channels,
        format: this.format,
        volume: this.volume,
        isPlaying: false,
        currentTime: 0,
        duration: this.duration,
        timestamp: Date.now(),
        playCount: this.playCount,
      });
    });

    audioStream.on('error', (err) => {
      this.logger?.error('Audio pipeline error:', err);
    });

    // Mark state
    this.currentAudioData = audioData;
    this.isPlaying = true;
    this.currentTime = 0;
    this.playCount++;
    this.duration = this.calculateAudioDuration(audioData.audioData);
    this.logger?.info('Started audio playback');
  }

  /**
   * Stop audio playback
   */
  private async stopAudio(): Promise<void> {
    if (this.currentStream) {
      try {
        this.currentStream.unpipe();
      } catch {}
      this.currentStream.destroy();
      this.currentStream = null;
    }
    if (this.currentSpeaker) {
      this.currentSpeaker.end();
      this.currentSpeaker = null;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.currentTime = 0;
      this.currentAudioData = undefined;
      this.logger?.debug('Audio playback stopped');
    }
  }

  /**
   * Set volume level
   */
  private async setVolume(volume: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, volume));
    this.logger?.debug(`Volume set to: ${this.volume}`);
  }

  /**
   * Generate a test tone (sine wave)
   */
  private generateTestTone(): ArrayBuffer {
    // Generate a 440Hz sine wave for 1 second
    const frequency = 440; // A4 note
    const duration = 1; // 1 second
    const samples = this.sampleRate * duration;
    const buffer = new ArrayBuffer(samples * this.channels * 2); // 16-bit samples
    const view = new Int16Array(buffer);
    
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / this.sampleRate) * 0.5;
      const sampleValue = Math.floor(sample * 32767);
      
      for (let channel = 0; channel < this.channels; channel++) {
        view[i * this.channels + channel] = sampleValue;
      }
    }
    
    return buffer;
  }

  /**
   * Calculate audio duration (simplified)
   */
  private calculateAudioDuration(audioData: string | ArrayBuffer): number {
    if (typeof audioData === 'string') {
      // For file paths, we'd need to read the file header
      // For now, return a default duration
      return 5.0; // 5 seconds default
    } else if (audioData instanceof ArrayBuffer) {
      // For raw audio data, calculate based on sample rate and buffer size
      const samples = audioData.byteLength / (this.channels * 2); // 16-bit samples
      return samples / this.sampleRate;
    }
    
    return 1.0; // Default 1 second
  }

  /**
   * Get configuration with proper return type
   */
  public getConfig(): AudioOutputConfig {
    return {
      deviceId: this.deviceId,
      sampleRate: this.sampleRate,
      channels: this.channels,
      format: this.format,
      volume: this.volume,
      enabled: this.enabled,
      bufferSize: this.bufferSize,
      loop: this.loop,
      fadeInDuration: this.fadeInDuration,
      fadeOutDuration: this.fadeOutDuration,
      enableFileUpload: this.enableFileUpload,
      uploadPort: 4000, // Global FileUploader port
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedExtensions: ['.wav', '.mp3', '.ogg', '.m4a', '.flac']
    };
  }

  /**
   * Get module state with proper return type
   */
  public getState(): ModuleState {
    return {
      id: this.id,
      messageCount: this.state.messageCount,
      config: this.config,
      status: this.isPlaying ? 'running' : 'stopped',
      lastError: this.lastError?.error || undefined
    };
  }

  /**
   * Get detailed state for testing purposes
   */
  public getDetailedState(): {
    deviceId: string;
    sampleRate: number;
    channels: number;
    format: string;
    volume: number;
    enabled: boolean;
    isConnected: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playCount: number;
    errorCount: number;
    status: string;
  } {
    return {
      deviceId: this.deviceId,
      sampleRate: this.sampleRate,
      channels: this.channels,
      format: this.format,
      volume: this.volume,
      enabled: this.enabled,
      isConnected: this.isConnected,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      playCount: this.playCount,
      errorCount: this.errorCount,
      status: this.isPlaying ? 'playing' : (this.isConnected ? 'ready' : 'stopped')
    };
  }

  /**
   * Reset counters
   */
  public reset(): void {
    this.playCount = 0;
    this.errorCount = 0;
    this.lastError = undefined;
    this.currentTime = 0;
    this.duration = 0;
    this.emit('stateUpdate', {
      status: this.isPlaying ? 'playing' : 'ready',
      playCount: this.playCount,
      errorCount: this.errorCount
    });
  }

  /**
   * Test connection with proper return type
   */
  public async testConnection(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }
    
    try {
      // Generate and play a test tone
      const testData: AudioPlaybackData = {
        audioData: this.generateTestTone(),
        volume: 0.1, // Low volume for test
        loop: false,
        fadeInDuration: 0,
        fadeOutDuration: 0,
        timestamp: Date.now()
      };
      
      await this.playAudio(testData);
      return true;
    } catch (error) {
      this.logger?.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Pause audio playback
   */
  public async pause(): Promise<void> {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.logger?.info('Audio playback paused');
      this.emitOutput('audioOutput', {
        deviceId: this.deviceId,
        sampleRate: this.sampleRate,
        channels: this.channels,
        format: this.format,
        volume: this.volume,
        isPlaying: false,
        currentTime: this.currentTime,
        duration: this.duration,
        timestamp: Date.now(),
        playCount: this.playCount
      });
    }
  }

  /**
   * Resume audio playback
   */
  public async resume(): Promise<void> {
    if (!this.isPlaying && this.currentAudioData) {
      this.isPlaying = true;
      this.logger?.info('Audio playback resumed');
      this.emitOutput('audioOutput', {
        deviceId: this.deviceId,
        sampleRate: this.sampleRate,
        channels: this.channels,
        format: this.format,
        volume: this.volume,
        isPlaying: true,
        currentTime: this.currentTime,
        duration: this.duration,
        timestamp: Date.now(),
        playCount: this.playCount
      });
    }
  }

  /**
   * Stop audio playback
   */
  public async stop(): Promise<void> {
    await this.stopAudio();
    this.logger?.info('Audio playback stopped');
    this.emitOutput('audioOutput', {
      deviceId: this.deviceId,
      sampleRate: this.sampleRate,
      channels: this.channels,
      format: this.format,
      volume: this.volume,
      isPlaying: false,
      currentTime: 0,
      duration: this.duration,
      timestamp: Date.now(),
      playCount: this.playCount
    });
  }

  // ============================================================================
  // FILE UPLOAD SERVER METHODS
  // ============================================================================



  /**
   * Save uploaded audio file to assets folder
   */
  private async saveAudioFile(uploadData: AudioFileUploadData): Promise<AudioFileUploadPayload> {
    try {
      const assetsDir = path.join(__dirname, 'assets');
      await fse.ensureDir(assetsDir);

      // Generate safe filename
      const timestamp = Date.now();
      const ext = path.extname(uploadData.originalName).toLowerCase();
      const safeName = `${timestamp}_${uploadData.originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(assetsDir, safeName);

      // Save original file
      await fse.writeFile(filePath, uploadData.buffer);

      let finalFileName = safeName;
      let finalFilePath = filePath;

      // If MP3, transcode to WAV so playback is immediate
      if (ext === '.mp3') {
        const wavName = safeName.replace(/\.mp3$/i, '.wav');
        const wavPath = path.join(assetsDir, wavName);
        await new Promise<void>((resolve, reject) => {
          execFile(ffmpegPath, ['-y', '-i', filePath, '-ar', this.sampleRate.toString(), '-ac', this.channels.toString(), wavPath], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        // Remove original mp3 to save space
        await fse.remove(filePath);
        finalFileName = wavName;
        finalFilePath = wavPath;
      }

      this.uploadCount++;
      this.lastUpload = {
        filename: finalFileName,
        originalName: uploadData.originalName,
        size: uploadData.size,
        mimetype: uploadData.mimetype,
        filePath: `assets/${finalFileName}`,
        timestamp: uploadData.timestamp,
        availableFiles: await this.getAvailableAudioFiles()
      };

      // Emit file uploaded event
      this.emitOutput<AudioFileUploadPayload>('fileUploaded', this.lastUpload);

      // Emit file list updated event
      const fileList = await this.getAudioFileList();
      this.emitOutput<AudioFileListPayload>('fileListUpdated', fileList);

      // Emit file uploaded event (not deleted - this was leftover code)
      this.emitOutput<AudioFileUploadPayload>('fileUploaded', this.lastUpload);

      this.logger?.info(`Audio file uploaded: ${safeName} (${uploadData.size} bytes)`);

      return this.lastUpload;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.error('Failed to save audio file:', error);
      
      // Emit upload error event
      this.emitOutput('uploadError', {
        error: errorMessage,
        originalName: uploadData.originalName,
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  /**
   * Get list of available audio files
   */
  private async getAvailableAudioFiles(): Promise<string[]> {
    try {
      const response = await fetch(`http://localhost:${this.globalUploadPort}/files/audio-output`);
      if (!response.ok) {
        throw new Error(`Failed to get files: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data?.files || [];
    } catch (error) {
      this.logger?.error('Failed to get available audio files:', error);
      return [];
    }
  }

  /**
   * Get audio file list payload
   */
  private async getAudioFileList(): Promise<AudioFileListPayload> {
    try {
      const response = await fetch(`http://localhost:${this.globalUploadPort}/files/audio-output`);
      if (!response.ok) {
        throw new Error(`Failed to get file list: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        files: data.data?.files || [],
        totalFiles: data.data?.totalFiles || 0,
        totalSize: data.data?.totalSize || 0,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger?.error('Failed to get audio file list:', error);
      return {
        files: [],
        totalFiles: 0,
        totalSize: 0,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Delete an audio file from assets folder
   */
  private async deleteAudioFile(filename: string): Promise<{
    filename: string;
    deleted: boolean;
    timestamp: number;
    remainingFiles: string[];
  }> {
    try {
      const response = await fetch(`http://localhost:${this.globalUploadPort}/files/audio-output/${filename}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const data = await response.json();
      const result = {
        filename,
        deleted: true,
        timestamp: Date.now(),
        remainingFiles: data.data?.remainingFiles || []
      };

      // Emit file list updated event
      const fileList = await this.getAudioFileList();
      this.emitOutput<AudioFileListPayload>('fileListUpdated', fileList);

      this.logger?.info(`Audio file deleted: ${filename}`);

      return result;

    } catch (error) {
      this.logger?.error('Failed to delete audio file:', error);
      throw error;
    }
  }

  /**
   * Get metadata for an audio file
   */
  private async getAudioFileMetadata(filename: string): Promise<{
    filename: string;
    size: number;
    format: string;
    duration?: number;
    sampleRate?: number;
    channels?: number;
    bitRate?: number;
    timestamp: number;
  }> {
    try {
      const response = await fetch(`http://localhost:${this.globalUploadPort}/files/audio-output/${filename}/metadata`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get metadata');
      }
      
      const data = await response.json();
      const metadata = {
        ...data.data,
        timestamp: Date.now()
      };
      
      this.logger?.debug(`Retrieved metadata for: ${filename}`);
      this.emitOutput<AudioFileMetadataPayload>('fileMetadata', metadata);
      
      return metadata;
    } catch (error) {
      this.logger?.error('Failed to get audio file metadata:', error);
      throw error;
    }
  }

  /**
   * Get file upload server info
   */
  public getFileUploadInfo(): {
    enabled: boolean;
    port: number;
    host: string;
    maxFileSize: number;
    allowedExtensions: string[];
    uploadCount: number;
    lastUpload?: AudioFileUploadPayload;
  } {
    return {
      enabled: this.enableFileUpload,
      port: this.globalUploadPort,
      host: 'localhost',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedExtensions: ['.wav', '.mp3', '.ogg', '.m4a', '.flac'],
      uploadCount: this.uploadCount,
      lastUpload: this.lastUpload
    };
  }

  // Add missing methods for compatibility
  protected setConnectionStatus(connected: boolean): void {
    this.isConnected = connected;
  }

  protected emitStatus(status: string, data?: any): void {
    this.emit('statusUpdate', { status, data, timestamp: Date.now() });
  }

  protected emitError(error: Error, context: string): void {
    this.emit('error', { error: error.message, context, timestamp: Date.now() });
  }
} 