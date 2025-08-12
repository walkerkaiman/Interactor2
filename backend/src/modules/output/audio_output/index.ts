import { OutputModuleBase } from '../../OutputModuleBase';
import {
  AudioOutputConfig,
  AudioPlaybackData,
  ModuleConfig,
  TriggerEvent,
  StreamEvent,
  ModuleState,
  AudioFileUploadPayload,
  AudioFileListPayload
} from '@interactor/shared';
import { InteractorError } from '../../../core/ErrorHandler';
import { NodeSpeakerPlayer } from './players/NodeSpeakerPlayer';
import { IAudioPlayer } from './players/IAudioPlayer';
import { LocalFileSystemStorage } from './storage/LocalFileSystemStorage';
import { IAudioStorage } from './storage/IAudioStorage';


/**
 * Default constants keep unit-tests happy.
 */
const DEFAULT_ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.m4a', '.flac'];
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export class AudioOutputModule extends OutputModuleBase {
  // Strategy instances
  private player: IAudioPlayer;
  private storage: IAudioStorage;

  // Internal state mirrored for tests
  private isPlaying = false;
  private currentTime = 0;
  private duration = 0;
  private playCount = 0;
  private errorCount = 0;
  private lastError: Error | undefined;
  private lastUpdate = Date.now();
  private lastUpload: AudioFileUploadPayload | undefined;

  // Resolved config (with defaults)
  private readonly cfg: AudioOutputConfig;

  constructor(
    config: AudioOutputConfig,
    id?: string,
    player?: IAudioPlayer,
    storage?: IAudioStorage
  ) {
    const cfgWithDefaults: AudioOutputConfig = {
      ...config,
      deviceId: config.deviceId || 'default',
      sampleRate: config.sampleRate || 44100,
      channels: config.channels || 2,
      format: config.format || 'wav',
      volume: config.volume ?? 1.0,
      enabled: config.enabled !== false,
      bufferSize: config.bufferSize || 4096,
      loop: config.loop || false,
      fadeInDuration: config.fadeInDuration || 0,
      fadeOutDuration: config.fadeOutDuration || 0,
      enableFileUpload: config.enableFileUpload !== false,
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024,
      allowedExtensions: config.allowedExtensions || ['.wav', '.mp3', '.ogg', '.m4a', '.flac']
    };
    const manifest = {
      name: 'Audio Output',
      type: 'output' as const,
      version: '1.0.0',
      description: 'Plays audio files and generates audio output',
      author: 'Interactor Team',
      configSchema: {
        type: 'object' as const,
        properties: {
          sampleRate: { type: 'number' as const, minimum: 8000, maximum: 48000 },
          channels: { type: 'number' as const, minimum: 1, maximum: 2 },
          volume: { type: 'number' as const, minimum: 0.0, maximum: 1.0 },
          bufferSize: { type: 'number' as const, minimum: 256, maximum: 16384 }
        },
        required: ['sampleRate', 'channels', 'volume', 'bufferSize']
      },
      events: []
    };
    super('audio_output', cfgWithDefaults, manifest, id);
    this.cfg = cfgWithDefaults;
    this.player = player || new NodeSpeakerPlayer(this.cfg.sampleRate, this.cfg.channels);
    this.storage = storage || new LocalFileSystemStorage(this.cfg.allowedExtensions!, this.cfg.sampleRate, this.cfg.channels, this.cfg.maxFileSize!);
    if (this.cfg.enableFileUpload) {
      this.registerUploads('audio-output', {
        allowedExtensions: this.cfg.allowedExtensions!,
        maxFileSize: this.cfg.maxFileSize!,
        subdirectory: 'audio-output',
        customProcessing: async () => {/* mp3→wav handled in storage */}
      });
    }
  }

  // ────────────────────────────── Lifecycle hooks ────────────────────────────

  protected async onInit(): Promise<void> {
    // Validate according to tests expectations
    if (this.cfg.sampleRate < 8000 || this.cfg.sampleRate > 48000) {
      throw InteractorError.validation(`Invalid sample rate: ${this.cfg.sampleRate}. Must be between 8000 and 48000 Hz.`);
    }
    if (![1, 2].includes(this.cfg.channels)) {
      throw InteractorError.validation(`Invalid channel count: ${this.cfg.channels}. Must be 1 or 2.`);
    }
    if (this.cfg.volume < 0.0 || this.cfg.volume > 1.0) {
      throw InteractorError.validation(`Invalid volume: ${this.cfg.volume}. Must be between 0.0 and 1.0.`);
    }
    if (this.cfg.bufferSize < 256 || this.cfg.bufferSize > 16384) {
      throw InteractorError.validation(`Invalid buffer size: ${this.cfg.bufferSize}. Must be between 256 and 16384 samples.`);
    }
    if (!['wav', 'mp3', 'ogg'].includes(this.cfg.format)) {
      throw InteractorError.validation(`Invalid audio format: ${this.cfg.format}. Must be 'wav', 'mp3', or 'ogg'.`);
    }
    if (this.cfg.fadeInDuration < 0 || this.cfg.fadeInDuration > 10000) {
      throw InteractorError.validation(`Invalid fade in duration: ${this.cfg.fadeInDuration}. Must be between 0 and 10000 ms.`);
    }
    if (this.cfg.fadeOutDuration < 0 || this.cfg.fadeOutDuration > 10000) {
      throw InteractorError.validation(`Invalid fade out duration: ${this.cfg.fadeOutDuration}. Must be between 0 and 10000 ms.`);
    }
  }

  protected async onStart(): Promise<void> {
    // Start upload server if enabled
    this.setConnected(true);
  }

  protected async onStop(): Promise<void> {
    await this.player.stop();
    this.setConnected(false);
  }

  protected async onDestroy(): Promise<void> {
    // Nothing additional for now.
  }

  protected async onConfigUpdate(_oldConfig: ModuleConfig, _newConfig: ModuleConfig): Promise<void> {
    // Not implemented in this simplified refactor.
  }

  // ────────────────────────────── Sending / Playback ─────────────────────────

  protected async onSend<T = unknown>(data: T): Promise<void> {
    if (!this.cfg.enabled) {
      throw new Error('Audio output module is disabled');
    }

    // Reject empty string
    if (typeof data === 'string' && data.trim() === '') {
      const err = new Error('No audio data provided');
      this.emitError(err, 'audio_playback');
      this.errorCount++;
      this.lastError = err;
      throw err;
    }

    try {
      await this.player.play(data as any);

      const playerState = this.player.getState();
      this.isPlaying = playerState.isPlaying;
      this.currentTime = playerState.currentTime;
      this.duration = playerState.duration;
      this.playCount++;
      this.lastUpdate = Date.now();

      // Custom volume overrides for AudioPlaybackData
      let volume = this.cfg.volume;
      const dataObj: any = data;
      if (dataObj && typeof dataObj === 'object' && dataObj.volume !== undefined) {
        volume = dataObj.volume;
      }

      const payload = {
        deviceId: this.cfg.deviceId,
        sampleRate: this.cfg.sampleRate,
        channels: this.cfg.channels,
        format: this.cfg.format,
        volume,
        isPlaying: this.isPlaying,
        currentTime: this.currentTime,
        duration: this.duration,
        timestamp: this.lastUpdate,
        playCount: this.playCount
      };
      
      this.emitOutput('audioOutput', payload);
      this.incrementMessageCount();
    } catch (err) {
      this.errorCount++;
      this.lastError = err as Error;
      this.emitError(err as Error, 'audio_playback');
      throw err;
    }
  }

  protected async handleTriggerEvent(event: TriggerEvent): Promise<void> {
    await this.onSend(event.payload);
  }

  protected async handleStreamingEvent(event: StreamEvent): Promise<void> {
    await this.onSend(event.value);
  }

  protected async handleManualTrigger(): Promise<void> {
    await this.onSend(42); // Unknown type triggers 1s test-tone behaviour
  }

  // ────────────────────────────── Public helpers ─────────────────────────────

  public getConfig(): AudioOutputConfig {
    const { deviceId, sampleRate, channels, format, volume, enabled, bufferSize, loop, fadeInDuration, fadeOutDuration, enableFileUpload, maxFileSize, allowedExtensions } = this.cfg;
    return { deviceId, sampleRate, channels, format, volume, enabled, bufferSize, loop, fadeInDuration, fadeOutDuration, enableFileUpload, maxFileSize, allowedExtensions } as AudioOutputConfig;
  }

  public getState(): ModuleState {
    return {
      status: 'ready',
      deviceId: this.cfg.deviceId,
      sampleRate: this.cfg.sampleRate,
      channels: this.cfg.channels,
      format: this.cfg.format,
      volume: this.cfg.volume,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      loop: this.cfg.loop,
      playCount: this.playCount,
      errorCount: this.errorCount,
      lastError: this.lastError?.message,
      lastUpdate: this.lastUpdate,
      fileUploadEnabled: this.cfg.enableFileUpload,
      lastUpload: this.lastUpload
    } as unknown as ModuleState;
  }

  public getDetailedState() {
    return {
      deviceId: this.cfg.deviceId,
      sampleRate: this.cfg.sampleRate,
      channels: this.cfg.channels,
      format: this.cfg.format,
      volume: this.cfg.volume,
      enabled: this.cfg.enabled,
      isConnected: this.isModuleConnected(),
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      playCount: this.playCount,
      errorCount: this.errorCount,
      status: this.isPlaying ? 'playing' : this.isModuleConnected() ? 'ready' : 'stopped'
    };
  }

  // ───────── Playback control wrappers ─────────

  public async pause(): Promise<void> {
    await this.player.pause();
      this.isPlaying = false;
    this.emitPlaybackState();
  }

  public async resume(): Promise<void> {
    await this.player.resume();
      this.isPlaying = true;
    this.emitPlaybackState();
  }

  public async stop(): Promise<void> {
    await this.player.stop();
    this.isPlaying = false;
    this.currentTime = 0;
    this.emitPlaybackState();
  }

  private emitPlaybackState(): void {
    const payload = {
      deviceId: this.cfg.deviceId,
      sampleRate: this.cfg.sampleRate,
      channels: this.cfg.channels,
      format: this.cfg.format,
      volume: this.cfg.volume,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      timestamp: Date.now(),
      playCount: this.playCount
    };
    this.emitOutput('audioOutput', payload);
  }

  // ───────── File-storage wrappers ─────────

  private async getAvailableAudioFiles(): Promise<string[]> {
    return this.storage.list();
  }

  private async getAudioFileList(): Promise<AudioFileListPayload> {
    return this.storage.listDetailed();
  }

  private async deleteAudioFile(filename: string) {
    return this.storage.delete(filename);
  }

  private async getAudioFileMetadata(filename: string) {
    return this.storage.metadata(filename);
  }

  public getFileUploadInfo() {
    return {
      enabled: this.cfg.enableFileUpload,
      port: 4000,
      host: '0.0.0.0',
      maxFileSize: this.cfg.maxFileSize,
      allowedExtensions: this.cfg.allowedExtensions,
      lastUpload: this.lastUpload
    };
  }

  // ───────── Error helper ─────────
  private emitError(error: Error, context: string): void {
    this.emit('error', {
      moduleId: this.id,
      moduleName: this.name,
      error: error.message,
      context,
      timestamp: Date.now()
    });
  }
}
