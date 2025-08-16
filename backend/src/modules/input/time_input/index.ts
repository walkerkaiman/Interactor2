import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig, TimeInputConfig, TimeTriggerPayload, TimeState } from '@interactor/shared';
import { InteractorError } from '../../../core/ErrorHandler';
import WebSocket from 'ws';
import { TimeEngine } from './domain/TimeEngine';
import { WsClient } from './infra/WsClient';
import { convertTo12Hour, convertTo24Hour } from './domain/DisplayFormatter';

/**
 * Time Input Module
 * 
 * IMPORTANT: This module is for COUNTDOWN TIMERS and TRIGGERS only.
 * 
 * Purpose:
 * - Clock mode: Triggers at specific time, shows countdown to target
 * - Metronome mode: Triggers at intervals, shows countdown to next trigger
 * 
 * DO NOT ADD:
 * - Current time calculation or display
 * - Clock functionality
 * - Time indicators
 * 
 * This module provides time-based automation, not time display.
 */
export class TimeInputModule extends InputModuleBase {
  private engine: TimeEngine;
  private timeMode: 'clock' | 'metronome' = 'clock';
  private targetTime?: string;
  private millisecondDelay: number = 1000;
  private enabled: boolean = true;
  private apiEnabled: boolean = false;
  private apiEndpoint?: string;
  private countdown: string = '--';
  private wsClient?: WsClient;
  private reconnectDelay: number = 1000;
  private maxReconnectAttempts: number = 5;
  private wsReconnectAttempts: number = 0;
  private engineRunning: boolean = false; // Flag to track if engine is running
  // StateManager removed - modules should not directly access core services
  
  // WebSocket properties
  private ws: WebSocket | null = null;
  private wsUrl?: string;
  private wsReconnectInterval: NodeJS.Timeout | null = null;
  private externalId?: string; // Store external ID for state updates

  constructor(config: any = {}) {
    super('time_input', config);

    // Create safe config with defaults
    const safeConfig = {
      mode: config.mode || 'clock',
      targetTime: config.targetTime || '12:00 PM',
      millisecondDelay: config.millisecondDelay || 1000,
      enabled: config.enabled !== undefined ? config.enabled : true,
      apiEnabled: config.apiEnabled || false,
      apiEndpoint: config.apiEndpoint
    };

    // Initialize module properties from config
    this.timeMode = safeConfig.mode;
    this.targetTime = safeConfig.targetTime;
    this.millisecondDelay = safeConfig.millisecondDelay;
    this.enabled = safeConfig.enabled;
    this.apiEnabled = safeConfig.apiEnabled;
    this.apiEndpoint = safeConfig.apiEndpoint;

    // Only log if there are issues with initialization
    if (!this.targetTime || this.targetTime === 'undefined') {
      this.logger?.error('TimeInputModule: Missing or invalid targetTime in config:', {
        config: config,
        safeConfig: safeConfig
      });
    }

    // Initialize time engine
    this.engine = new TimeEngine(
      () => this.updateTimeDisplay(),
      () => this.emitTimeTrigger(),
      this.timeMode,
      this.targetTime,
      this.logger
    );
  }

  /**
   * Restore module state from saved data
   */
  protected async onStateRestore(state: any): Promise<void> {
    // Only log if there are issues with state restoration
    if (!state || typeof state !== 'object') {
      this.logger?.error('TimeInputModule: Invalid state provided for restoration:', state);
      return;
    }

    await super.onStateRestore(state);
    
    // Restore module properties from state
    if (state) {
      this.timeMode = state.mode || this.timeMode;
      this.targetTime = state.targetTime || this.targetTime;
      this.millisecondDelay = state.millisecondDelay || this.millisecondDelay;
      this.enabled = state.enabled !== undefined ? state.enabled : this.enabled;
      this.apiEnabled = state.apiEnabled || this.apiEnabled;
      this.apiEndpoint = state.apiEndpoint || this.apiEndpoint;
    }
    
    // Only log if critical properties are missing
    if (!this.targetTime || this.targetTime === 'undefined') {
      this.logger?.error('TimeInputModule: Missing targetTime after state restoration:', {
        state: state,
        restoredTargetTime: this.targetTime
      });
    }
    
    // Update the existing engine with restored configuration instead of creating a new one
    if (this.engine) {
      this.engine.updateConfig(this.timeMode, this.targetTime, this.millisecondDelay);
      if (this.enabled && !this.engineRunning) {
        this.startEngine();
      }
    }
  }

  protected async onInit(): Promise<void> {
    // Validate configuration first
    if (this.timeMode === 'clock') {
      // Validate time format for clock mode
      if (this.targetTime && !this.isValidTimeFormat(this.targetTime)) {
        throw InteractorError.validation(
          `Invalid time format: ${this.targetTime}`,
          { provided: this.targetTime, expected: '12-hour format' },
          ['Use format like "2:30 PM" or "10:15 AM"', 'Include AM/PM designation', 'Use 12-hour format (1-12), not 24-hour']
        );
      }
    } else if (this.timeMode === 'metronome') {
      // Validate millisecond delay for metronome mode
      if (this.millisecondDelay < 100 || this.millisecondDelay > 60000) {
        throw InteractorError.validation(
          `Millisecond delay must be between 100-60000ms`,
          { provided: this.millisecondDelay, min: 100, max: 60000 },
          ['Try 1000ms for 1-second intervals', 'Use 500ms for faster pulses', 'Maximum is 60000ms (1 minute)']
        );
      }
    }
    
    // Initialize the current time and countdown immediately
    this.updateTimeDisplay();
    
    // Start listening if enabled
    if (this.enabled) {
      await this.onStartListening();
    }

    // Validate WebSocket configuration if enabled
    if (this.apiEnabled) {
      if (!this.apiEndpoint) {
        throw InteractorError.validation(
          'WebSocket API endpoint is required when API is enabled',
          { apiEnabled: this.apiEnabled, apiEndpoint: this.apiEndpoint },
          ['Provide a WebSocket URL like "wss://api.example.com/time"', 'Or disable apiEnabled if not using external time source']
        );
      }
      if (!this.apiEndpoint.match(/^wss?:\/\/.+/)) {
        throw InteractorError.validation(
          'API endpoint must be a valid WebSocket URL',
          { provided: this.apiEndpoint, expected: 'ws:// or wss:// protocol' },
          ['Use "wss://" for secure connections', 'Use "ws://" for local development', 'Include full URL path if needed']
        );
      }
    }
  }

  protected async onStart(): Promise<void> {
    this.logger?.info(`Time Input module ${this.id} starting...`);
    
    if (this.enabled) {
      this.startEngine();
    } else {
      this.logger?.warn(`Time Input module ${this.id} is disabled`);
    }

    // Start WebSocket connection if API is enabled
    if (this.apiEnabled && this.apiEndpoint) {
      this.connectWebSocket();
    }
  }

  protected async onStop(): Promise<void> {
    this.engine.stop();
    this.engineRunning = false;
    this.disconnectWebSocket();
  }

  protected async onDestroy(): Promise<void> {
    this.engine.stop();
    this.engineRunning = false;
    this.disconnectWebSocket();
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    const newTimeConfig = newConfig as TimeInputConfig;
    
    if (newTimeConfig.mode !== this.timeMode) {
      this.timeMode = newTimeConfig.mode || 'clock';
      this.engine.updateConfig(this.timeMode, this.targetTime, this.millisecondDelay);
    }
    
    if (newTimeConfig.targetTime !== this.targetTime) {
      this.targetTime = newTimeConfig.targetTime || this.targetTime;
      if (this.timeMode === 'clock' && !this.isValidTimeFormat(this.targetTime || '')) {
        throw InteractorError.validation(
          `Invalid time format: ${this.targetTime}`,
          { provided: this.targetTime, expected: '12-hour format' },
          ['Use format like "2:30 PM" or "10:15 AM"', 'Include AM/PM designation', 'Use 12-hour format (1-12), not 24-hour']
        );
      }
      this.engine.updateConfig(this.timeMode, this.targetTime, this.millisecondDelay);
    }
    
    if (newTimeConfig.millisecondDelay !== this.millisecondDelay) {
      this.millisecondDelay = newTimeConfig.millisecondDelay || 1000;
      if (this.timeMode === 'metronome' && (this.millisecondDelay < 100 || this.millisecondDelay > 60000)) {
        throw InteractorError.validation(
          `Millisecond delay must be between 100-60000ms`,
          { provided: this.millisecondDelay, min: 100, max: 60000 },
          ['Try 1000ms for 1-second intervals', 'Use 500ms for faster pulses', 'Maximum is 60000ms (1 minute)']
        );
      }
      this.engine.updateConfig(this.timeMode, this.targetTime, this.millisecondDelay);
    }
    
    if (newTimeConfig.enabled !== this.enabled) {
      this.enabled = newTimeConfig.enabled ?? this.enabled;
      if (!this.enabled) {
        this.engine.stop();
        this.engineRunning = false;
      } else if (this.enabled && !this.engineRunning) {
        this.startEngine();
      }
    }

    // Handle WebSocket configuration changes
    if (newTimeConfig.apiEnabled !== this.apiEnabled || newTimeConfig.apiEndpoint !== this.apiEndpoint) {
      this.apiEnabled = newTimeConfig.apiEnabled || false;
      this.apiEndpoint = newTimeConfig.apiEndpoint;
      
      if (this.apiEnabled && this.apiEndpoint) {
        this.disconnectWebSocket();
        this.connectWebSocket();
      } else {
        this.disconnectWebSocket();
      }
    }
    
    // Emit configuration update using the standardized method
    this.emitConfigUpdate();
  }
  
  /**
   * Emit current module state - called after config changes and periodic updates
   */
  private emitStateUpdate(): void {
    // Use the standardized runtime state update method
    // This prevents overwriting user's unregistered configuration changes
    this.emitRuntimeStateUpdate({
      countdown: this.countdown,
    });
  }

  protected handleInput(data: any): void {
    // Handle manual trigger
    if (data && data.type === 'manualTrigger') {
      this.manualTrigger();
    }
    
    // Handle WebSocket API data
    if (data && data.type === 'apiTime' && this.apiEnabled) {
      this.handleApiTimeData(data.payload);
    }
  }

  protected async onStartListening(): Promise<void> {
    this.logger?.info(`Time Input module ${this.id} starting to listen...`);
    if (this.enabled) {
      this.startEngine();
    }
    if (this.apiEnabled && this.apiEndpoint) {
      this.connectWebSocket();
    }
  }

  protected async onStopListening(): Promise<void> {
    this.engine.stop();
    this.engineRunning = false;
    this.disconnectWebSocket();
  }

  /**
   * Manual trigger function
   */
  public manualTrigger(): void {
    if (!this.enabled) return;

    this.logger?.info('Manual trigger activated');
    
    // Emit trigger event
    this.emitTrigger('timeTrigger', {
      mode: this.timeMode,
      targetTime: this.targetTime,
      millisecondDelay: this.millisecondDelay,
      currentTime: new Date().toISOString(),
      timestamp: Date.now(),
      manual: true
    });
  }

  /**
   * Validate time format (12-hour format)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM)$/i;
    return timeRegex.test(time);
  }

  /**
   * Get trigger parameters for UI display
   */
  public getTriggerParameters(): any {
    // Only log if there are issues with parameters
    const params = {
      mode: this.timeMode,
      targetTime: this.targetTime,
      millisecondDelay: this.millisecondDelay,
      enabled: this.enabled,
      apiEnabled: this.apiEnabled,
      apiEndpoint: this.apiEndpoint,
      countdown: this.countdown
    };

    // Only log if critical parameters are missing
    if (!this.targetTime || this.targetTime === 'undefined') {
      this.logger?.error('TimeInputModule: Missing targetTime in getTriggerParameters:', params);
    }

    return params;
  }

  /**
   * Convert 24-hour time to 12-hour format
   */
  private convertTo12Hour(time24: string): string {
    return convertTo12Hour(time24);
  }

  /**
   * Convert 12-hour time to 24-hour format
   */
  private convertTo24Hour(time12: string): string {
    return convertTo24Hour(time12);
  }

  /**
   * Update time display and countdown - called by TimeEngine every second
   */
  private updateTimeDisplay(): void {
    // Countdown calculation only - no current time display
    let newCountdown = '--';
    
    if (this.timeMode === 'clock' && this.targetTime) {
      try {
        const target24 = this.convertTo24Hour(this.targetTime);
        const [targetHours, targetMinutes] = target24.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(targetHours, targetMinutes, 0, 0);
        
        const now = new Date();
        if (targetDate <= now) targetDate.setDate(targetDate.getDate() + 1);
        
        const diffMs = targetDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        newCountdown = diffHours > 0 ? `${diffHours}h ${diffMinutes}m ${diffSeconds}s` :
                      diffMinutes > 0 ? `${diffMinutes}m ${diffSeconds}s` :
                      `${diffSeconds}s`;
      } catch (error) {
        this.logger?.error('Failed to calculate clock countdown:', error);
        newCountdown = 'Invalid time';
      }
    } 
    else if (this.timeMode === 'metronome') {
      try {
        const timeToNext = this.millisecondDelay - (Date.now() % this.millisecondDelay);
        newCountdown = `${Math.ceil(timeToNext / 1000)}s to next`;
      } catch (error) {
        this.logger?.error('Failed to calculate metronome countdown:', error);
        newCountdown = '--';
      }
    }

    // Only emit state update if countdown actually changed
    if (newCountdown !== this.countdown) {
      this.countdown = newCountdown;
      this.emitStateUpdate();
    }
  }

  /**
   * Connect to WebSocket API
   */
  private connectWebSocket(): void {
    if (!this.apiEndpoint || !this.apiEnabled) return;

    if (!this.wsClient) {
      this.wsClient = new WsClient(this.apiEndpoint, {
        baseDelay: this.reconnectDelay,
        maxAttempts: this.maxReconnectAttempts,
      });

      this.wsClient.on('open', () => {
        this.logger?.info('WebSocket API connected');
        this.emit('apiConnected', { endpoint: this.apiEndpoint, timestamp: Date.now() });
      });

      this.wsClient.on('close', (evt) => {
        this.logger?.warn(`WebSocket API disconnected: ${evt.code} ${evt.reason}`);
        this.emit('apiDisconnected', { endpoint: this.apiEndpoint, code: evt.code, reason: evt.reason, timestamp: Date.now() });
      });

      this.wsClient.on('message', (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          this.handleApiTimeData(data);
        } catch (err) {
          this.logger?.error('Failed to parse WebSocket message', err);
        }
      });
    }

    this.wsClient.connect();
  }
  /**
   * Disconnect from WebSocket API
   */
  private disconnectWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.shutdown();
      this.wsClient = undefined;
    }
  }

  /**
   * Schedule WebSocket reconnection
   */
  private scheduleReconnect(): void {
    if (this.wsReconnectAttempts >= this.maxReconnectAttempts) {
      this.logger?.error('Max WebSocket reconnection attempts reached');
      return;
    }
    
    this.wsReconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.wsReconnectAttempts - 1); // Exponential backoff
    
    this.logger?.info(`Scheduling WebSocket reconnection attempt ${this.wsReconnectAttempts} in ${delay}ms`);
    
    this.wsReconnectInterval = setTimeout(() => {
      if (this.apiEnabled && this.apiEndpoint) {
        this.connectWebSocket();
      }
    }, delay);
  }

  /**
   * Handle time data from WebSocket API
   */
  private handleApiTimeData(data: any): void {
    try {
      // Extract time information from API data
      // Expected format: { time: "2:30 PM", timestamp: 1234567890, ... }
      if (data.targetTime) {
        // Update target time if provided
        this.targetTime = data.targetTime;
        this.logger?.info(`Updated target time from API: ${this.targetTime}`);
      }
      
      if (data.countdown) {
        // Update countdown display
        this.countdown = data.countdown;
      }
      
      // Emit state update with API data
      this.emit('stateUpdate', {
        mode: this.timeMode,
        countdown: this.countdown,
        targetTime12Hour: this.timeMode === 'clock' ? this.convertTo12Hour(this.targetTime || '') : '',
        millisecondDelay: this.millisecondDelay,
        enabled: this.enabled,
        apiConnected: this.wsClient != null,
        apiData: data
      });
      
    } catch (error) {
      this.logger?.error('Failed to handle API time data:', error);
    }
  }

  /**
   * Get runtime state (data that changes frequently, not configuration)
   */
  protected getRuntimeState(): Record<string, any> {
    return {
      isRunning: this.isRunning,
      isInitialized: this.isInitialized,
      countdown: this.countdown,
      isListening: this.isListening,
    };
  }

  /**
   * Get configuration settings for a specific mode
   */
  protected getConfigForMode(mode: string): Record<string, any> {
    const baseConfig = { ...this.config };
    
    switch (mode) {
      case 'clock':
        // For clock mode, emphasize clock-specific settings
        return {
          ...baseConfig,
          // Clock-specific settings are primary
          targetTime: baseConfig.targetTime,
          mode: 'clock',
          // Other settings are still available but secondary
          millisecondDelay: baseConfig.millisecondDelay,
          enabled: baseConfig.enabled,
          apiEnabled: baseConfig.apiEnabled,
          apiEndpoint: baseConfig.apiEndpoint,
        };
        
      case 'metronome':
        // For metronome mode, emphasize metronome-specific settings
        return {
          ...baseConfig,
          // Metronome-specific settings are primary
          millisecondDelay: baseConfig.millisecondDelay,
          mode: 'metronome',
          // Other settings are still available but secondary
          targetTime: baseConfig.targetTime,
          enabled: baseConfig.enabled,
          apiEnabled: baseConfig.apiEnabled,
          apiEndpoint: baseConfig.apiEndpoint,
        };
        
      default:
        return baseConfig;
    }
  }

  /**
   * Get all available modes for this module
   */
  public getAvailableModes(): string[] {
    return ['clock', 'metronome'];
  }

  /**
   * Get UI schema for a specific mode
   */
  protected getUISchemaForMode(mode: string): any {
    const baseSchema = {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'Operating mode',
          enum: ['clock', 'metronome'],
          default: 'clock'
        },
        enabled: {
          type: 'boolean',
          description: 'Enable/disable the time trigger',
          default: true
        },
        apiEnabled: {
          type: 'boolean',
          description: 'Enable WebSocket API for external time sources',
          default: false
        },
        apiEndpoint: {
          type: 'string',
          description: 'WebSocket endpoint for external time API (e.g., wss://api.example.com/time)',
          pattern: '^wss?://.+'
        }
      },
      required: ['mode']
    };

    switch (mode) {
      case 'clock':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            targetTime: {
              type: 'string',
              description: 'Target time in 12-hour format (e.g., 2:30 PM) - Clock mode only',
              pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$'
            },
            // Include metronome settings but mark as secondary
            millisecondDelay: {
              type: 'number',
              description: 'Delay between pulses in milliseconds - Metronome mode only (secondary in clock mode)',
              minimum: 100,
              maximum: 60000,
              default: 1000
            }
          }
        };
        
      case 'metronome':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            millisecondDelay: {
              type: 'number',
              description: 'Delay between pulses in milliseconds - Metronome mode only',
              minimum: 100,
              maximum: 60000,
              default: 1000
            },
            // Include clock settings but mark as secondary
            targetTime: {
              type: 'string',
              description: 'Target time in 12-hour format (e.g., 2:30 PM) - Clock mode only (secondary in metronome mode)',
              pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$'
            }
          }
        };
        
      default:
        return baseSchema;
    }
  }

  private emitTimeTrigger(): void {
    this.emitTrigger('timeTrigger', {
      mode: this.timeMode,
      targetTime: this.targetTime,
      timestamp: Date.now()
    });
  }

  private startEngine(): void {
    // Prevent multiple engine starts
    if (this.engineRunning) {
      this.logger?.debug('Engine already running, skipping start');
      return;
    }
    
    const interval = this.timeMode === 'metronome' 
      ? (this.millisecondDelay || 1000)
      : 1000; // Check every second for clock mode
    
    this.engine.start(interval);
    this.engineRunning = true;
    this.logger?.debug(`Engine started with ${interval}ms interval`);
  }
} 