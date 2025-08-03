import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig, TimeInputConfig, TimeTriggerPayload, TimeState } from '@interactor/shared';
import { InteractorError } from '../../../core/ErrorHandler';
import WebSocket from 'ws';
import { TimeEngine } from './TimeEngine';
import { WsClient } from './WsClient';
import { convertTo12Hour, convertTo24Hour } from './DisplayFormatter';

export class TimeInputModule extends InputModuleBase {
  private intervalId?: NodeJS.Timeout;
  private metronomeIntervalId?: NodeJS.Timeout;
  private engine: TimeEngine;
  private wsClient?: WsClient;
  private displayUpdateIntervalId?: NodeJS.Timeout;
  private targetTime: string;
  private enabled: boolean;
  private currentTime: string = '';
  private countdown: string = '';
  private timeMode: 'clock' | 'metronome' = 'clock';
  private millisecondDelay: number = 1000;
  // StateManager removed - modules should not directly access core services
  
  // WebSocket properties
  private ws: WebSocket | null = null;
  private wsUrl?: string;
  private wsReconnectInterval: NodeJS.Timeout | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds
  private apiEnabled = false;
  private apiEndpoint?: string;
  private externalId?: string; // Store external ID for state updates

  constructor(config: TimeInputConfig, externalId?: string) {
    super('time_input', config, {
      name: 'Time Input',
      type: 'input',
      version: '1.0.0',
      description: 'Clock mode triggers at specific time, Metronome mode pulses at intervals.',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            description: 'Operating mode',
            enum: ['clock', 'metronome'],
            default: 'clock'
          },
          targetTime: {
            type: 'string',
            description: 'Target time in 12-hour format (e.g., 2:30 PM) - Clock mode only',
            pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$'
          },
          millisecondDelay: {
            type: 'number',
            description: 'Delay between pulses in milliseconds - Metronome mode only',
            minimum: 100,
            maximum: 60000,
            default: 1000
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
      },
      events: [
        {
          name: 'timeTrigger',
          type: 'output',
          description: 'Emitted when target time is reached (Clock mode) or on pulse (Metronome mode)'
        },
        {
          name: 'stateUpdate',
          type: 'output',
          description: 'Emitted when module state changes'
        },
        {
          name: 'apiConnected',
          type: 'output',
          description: 'Emitted when WebSocket API connection is established'
        },
        {
          name: 'apiDisconnected',
          type: 'output',
          description: 'Emitted when WebSocket API connection is lost'
        }
      ]
    });

    this.targetTime = config.targetTime || '12:00 PM';
    this.enabled = config.enabled !== false;
    this.timeMode = config.mode || 'clock';
    this.millisecondDelay = config.millisecondDelay || 1000;
    // StateManager access removed - using proper event emission instead
    
    // WebSocket configuration
    this.apiEnabled = config.apiEnabled || false;
    this.apiEndpoint = config.apiEndpoint;
    
    // Store external ID if provided
    this.externalId = externalId;

    // Create engine instance
    this.engine = new TimeEngine({
      mode: this.timeMode,
      targetTime: this.targetTime,
      delayMs: this.millisecondDelay,
      enabled: this.enabled,
    });

    // Wire engine events
    this.engine.on('tick', ({ currentTime, countdown }) => {
      this.currentTime = currentTime;
      this.countdown = countdown;
      this.emitStateUpdate();
    });
    this.engine.on('pulse', () => {
      this.emitTrigger('timeTrigger', {
        mode: 'metronome',
        millisecondDelay: this.millisecondDelay,
        currentTime: new Date().toISOString(),
        timestamp: Date.now(),
      });
    });
    this.engine.on('clockHit', () => {
      this.emitTrigger('timeTrigger', {
        mode: 'clock',
        targetTime: this.targetTime,
        currentTime: new Date().toISOString(),
        timestamp: Date.now(),
      });
    });
  }

  protected async onInit(): Promise<void> {
    // Validate configuration first
    if (this.timeMode === 'clock') {
      // Validate time format for clock mode
      if (!this.isValidTimeFormat(this.targetTime)) {
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
      this.engine.start();
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
    this.disconnectWebSocket();
  }

  protected async onDestroy(): Promise<void> {
    this.engine.stop();
    this.disconnectWebSocket();
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    const newTimeConfig = newConfig as TimeInputConfig;
    
    if (newTimeConfig.mode !== this.timeMode) {
      this.timeMode = newTimeConfig.mode || 'clock';
      this.engine.update({ mode: this.timeMode });
    }
    
    if (newTimeConfig.targetTime !== this.targetTime) {
      this.targetTime = newTimeConfig.targetTime || this.targetTime;
      if (this.timeMode === 'clock' && !this.isValidTimeFormat(this.targetTime)) {
        throw InteractorError.validation(
          `Invalid time format: ${this.targetTime}`,
          { provided: this.targetTime, expected: '12-hour format' },
          ['Use format like "2:30 PM" or "10:15 AM"', 'Include AM/PM designation', 'Use 12-hour format (1-12), not 24-hour']
        );
      }
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
      this.engine.update({ delayMs: this.millisecondDelay });
    }
    
    if (newTimeConfig.enabled !== this.enabled) {
      this.enabled = newTimeConfig.enabled ?? this.enabled;
      this.engine.update({ enabled: this.enabled });
      if (!this.enabled) {
        this.engine.stop();
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
    
    // CRITICAL: Notify core system about configuration changes
    // This ensures the frontend receives the updated state
    this.emitStateUpdate();
  }
  
  /**
   * Emit current module state - called after config changes and periodic updates
   */
  private emitStateUpdate(): void {
    const moduleId = this.externalId ?? this.id;
    const stateUpdate = {
      id: moduleId,
      moduleName: 'Time Input', // Use the display name that frontend expects
      status: this.enabled ? (this.isRunning ? 'running' : 'ready') : 'stopped',
      mode: this.timeMode,
      currentTime: this.currentTime,
      countdown: this.countdown,
      targetTime: this.targetTime,
      targetTime12Hour: this.timeMode === 'clock' ? this.convertTo12Hour(this.targetTime) : '',
      millisecondDelay: this.millisecondDelay,
      enabled: this.enabled,
      apiEnabled: this.apiEnabled,
      apiEndpoint: this.apiEndpoint,
      lastUpdate: Date.now()
    };

    this.logger?.info(`Time Input ${moduleId}: Emitting state update - currentTime = ${this.currentTime}, countdown = ${this.countdown}`);
    
    // Emit state update event for core system to handle
    this.emit('stateUpdate', stateUpdate);
    
    // Also emit moduleStateChanged for real-time updates
    this.emit('moduleStateChanged', stateUpdate);
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
      this.engine.start();
    }
    if (this.apiEnabled && this.apiEndpoint) {
      this.connectWebSocket();
    }
  }

  protected async onStopListening(): Promise<void> {
    this.engine.stop();
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
   * Start metronome mode
   */
  private startMetronome(): void {
    if (this.metronomeIntervalId) {
      clearInterval(this.metronomeIntervalId);
    }
    if (this.displayUpdateIntervalId) {
      clearInterval(this.displayUpdateIntervalId);
    }

    this.logger?.info(`Starting metronome with ${this.millisecondDelay}ms delay`);
    
    // Update display immediately
    this.updateTimeDisplay();
    
    // Emit initial trigger
    this.emitTrigger('timeTrigger', {
      mode: 'metronome',
      millisecondDelay: this.millisecondDelay,
      currentTime: new Date().toISOString(),
      timestamp: Date.now()
    });

    // Set up interval for metronome pulses
    this.metronomeIntervalId = setInterval(() => {
      if (!this.enabled || this.timeMode !== 'metronome') {
        this.stopMetronome();
        return;
      }
      
      this.updateTimeDisplay(); // Update display before emitting trigger
      
      this.emitTrigger('timeTrigger', {
        mode: 'metronome',
        millisecondDelay: this.millisecondDelay,
        currentTime: new Date().toISOString(),
        timestamp: Date.now()
      });
    }, this.millisecondDelay);
    
    // Set up a separate interval for more frequent display updates
    const updateInterval = Math.min(1000, Math.floor(this.millisecondDelay / 4)); // Update at least every second, or 1/4 of the delay
    this.displayUpdateIntervalId = setInterval(() => {
      if (this.enabled && this.timeMode === 'metronome') {
        this.updateTimeDisplay();
      }
    }, updateInterval);
  }

  /**
   * Stop metronome mode
   */
  private stopMetronome(): void {
    if (this.metronomeIntervalId) {
      clearInterval(this.metronomeIntervalId);
      this.metronomeIntervalId = undefined as any;
    }
    if (this.displayUpdateIntervalId) {
      clearInterval(this.displayUpdateIntervalId);
      this.displayUpdateIntervalId = undefined as any;
    }
  }

  /**
   * Start checking for target time (Clock mode)
   */
  private startTimeCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.displayUpdateIntervalId) {
      clearInterval(this.displayUpdateIntervalId);
    }

    // Update display immediately
    this.updateTimeDisplay();

    // Check every second
    this.intervalId = setInterval(() => {
      this.updateTimeDisplay();
      
      if (this.enabled && this.timeMode === 'clock' && this.checkTime()) {
        this.emitTrigger('timeTrigger', {
          mode: 'clock',
          targetTime: this.targetTime,
          currentTime: new Date().toISOString(),
          timestamp: Date.now()
        });
      }
    }, 1000);
    
    // Set up a separate interval for more frequent display updates
    this.displayUpdateIntervalId = setInterval(() => {
      if (this.enabled && this.timeMode === 'clock') {
        this.updateTimeDisplay();
      }
    }, 1000);
  }

  /**
   * Stop checking for target time
   */
  private stopTimeCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined as any;
    }
  }

  /**
   * Check if current time matches target time (Clock mode)
   */
  private checkTime(): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Convert target time to 24-hour format for comparison
    const targetTime24 = this.convertTo24Hour(this.targetTime);
    return currentTime === targetTime24;
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
  public getTriggerParameters(): { 
    mode: 'clock' | 'metronome';
    targetTime: string; 
    millisecondDelay: number;
    enabled: boolean; 
    currentTime: string; 
    countdown: string;
    targetTime12Hour: string;
  } {
    return {
      mode: this.timeMode,
      targetTime: this.targetTime,
      millisecondDelay: this.millisecondDelay,
      enabled: this.enabled,
      currentTime: this.currentTime,
      countdown: this.countdown,
      targetTime12Hour: this.convertTo12Hour(this.targetTime)
    };
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
   * Update current time and countdown display
   */
  private updateTimeDisplay(): void {
    const now = new Date();
    
    // Update current time in 12-hour format with seconds
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    this.currentTime = `${hours12}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${period}`;
    
    // Calculate countdown based on mode
    if (this.timeMode === 'clock') {
      // Calculate countdown to target time
      const targetTime24 = this.convertTo24Hour(this.targetTime);
      const parts = targetTime24.split(':').map(Number);
      const targetHours = parts[0];
      const targetMinutes = parts[1];
      
      if (targetHours === undefined || targetMinutes === undefined) {
        this.countdown = 'Invalid time';
        return;
      }
      
      const targetDate = new Date();
      targetDate.setHours(targetHours, targetMinutes, 0, 0);
      
      // If target time has passed today, set it for tomorrow
      if (targetDate <= now) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      
      const diffMs = targetDate.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      if (diffHours > 0) {
        this.countdown = `${diffHours}h ${diffMinutes}m ${diffSeconds}s`;
      } else if (diffMinutes > 0) {
        this.countdown = `${diffMinutes}m ${diffSeconds}s`;
      } else {
        this.countdown = `${diffSeconds}s`;
      }
    } else if (this.timeMode === 'metronome') {
      // For metronome mode, show countdown to next pulse
      const timeSinceLastPulse = Date.now() % this.millisecondDelay;
      const timeToNextPulse = this.millisecondDelay - timeSinceLastPulse;
      const secondsToNext = Math.ceil(timeToNextPulse / 1000);
      
      if (secondsToNext > 0) {
        this.countdown = `${secondsToNext}s to next`;
      } else {
        this.countdown = 'Now!';
      }
    }
    
    // Emit updated state to core system
    this.emitStateUpdate();
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
      if (data.time) {
        // Update target time if provided by API
        if (this.isValidTimeFormat(data.time)) {
          this.targetTime = data.time;
          this.logger?.info(`Updated target time from API: ${this.targetTime}`);
        }
      }
      
      if (data.currentTime) {
        // Update current time display
        this.currentTime = data.currentTime;
      }
      
      if (data.countdown) {
        // Update countdown display
        this.countdown = data.countdown;
      }
      
      // Emit state update with API data
      this.emit('stateUpdate', {
        mode: this.timeMode,
        currentTime: this.currentTime,
        countdown: this.countdown,
        targetTime12Hour: this.timeMode === 'clock' ? this.convertTo12Hour(this.targetTime) : '',
        millisecondDelay: this.millisecondDelay,
        enabled: this.enabled,
        apiConnected: this.wsClient != null,
        apiData: data
      });
      
    } catch (error) {
      this.logger?.error('Failed to handle API time data:', error);
    }
  }
} 