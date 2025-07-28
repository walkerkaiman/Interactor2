import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig, TimeInputConfig, TimeTriggerPayload, TimeState } from '@interactor/shared';
import { StateManager } from '../../../core/StateManager';
import WebSocket from 'ws';

export class TimeInputModule extends InputModuleBase {
  private intervalId?: NodeJS.Timeout;
  private metronomeIntervalId?: NodeJS.Timeout;
  private targetTime: string;
  private enabled: boolean;
  private currentTime: string = '';
  private countdown: string = '';
  private timeMode: 'clock' | 'metronome' = 'clock';
  private millisecondDelay: number = 1000;
  private stateManager: StateManager;
  
  // WebSocket properties
  private ws: WebSocket | null = null;
  private wsUrl?: string;
  private wsReconnectInterval: NodeJS.Timeout | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds
  private apiEnabled = false;
  private apiEndpoint?: string;

  constructor(config: TimeInputConfig) {
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
    this.stateManager = StateManager.getInstance();
    
    // WebSocket configuration
    this.apiEnabled = config.apiEnabled || false;
    this.apiEndpoint = config.apiEndpoint;
  }

  protected async onInit(): Promise<void> {
    if (this.timeMode === 'clock') {
      // Validate time format for clock mode
      if (!this.isValidTimeFormat(this.targetTime)) {
        throw new Error(`Invalid time format: ${this.targetTime}. Expected 12-hour format (e.g., 2:30 PM).`);
      }
    } else if (this.timeMode === 'metronome') {
      // Validate millisecond delay for metronome mode
      if (this.millisecondDelay < 100 || this.millisecondDelay > 60000) {
        throw new Error(`Invalid millisecond delay: ${this.millisecondDelay}. Must be between 100 and 60000.`);
      }
    }

    // Validate WebSocket configuration if enabled
    if (this.apiEnabled) {
      if (!this.apiEndpoint) {
        throw new Error('API endpoint is required when apiEnabled is true');
      }
      if (!this.apiEndpoint.match(/^wss?:\/\/.+/)) {
        throw new Error('API endpoint must be a valid WebSocket URL (ws:// or wss://)');
      }
    }
  }

  protected async onStart(): Promise<void> {
    console.log(`[DEBUG] Time Input module ${this.id} onStart() called`);
    this.logger?.info(`Time Input module ${this.id} starting...`);
    
    if (this.enabled) {
      if (this.timeMode === 'clock') {
        this.logger?.info(`Starting clock mode with target time: ${this.targetTime}`);
        this.startTimeCheck();
      } else if (this.timeMode === 'metronome') {
        this.logger?.info(`Starting metronome mode with delay: ${this.millisecondDelay}ms`);
        this.startMetronome();
      }
    } else {
      this.logger?.warn(`Time Input module ${this.id} is disabled`);
    }
    
    // Start WebSocket connection if API is enabled
    if (this.apiEnabled && this.apiEndpoint) {
      this.connectWebSocket();
    }
    
    // Start updating current time and countdown immediately
    console.log(`[DEBUG] Time Input module ${this.id} calling updateTimeDisplay`);
    this.logger?.info(`Time Input module ${this.id} calling updateTimeDisplay`);
    this.updateTimeDisplay();
  }

  protected async onStop(): Promise<void> {
    this.stopTimeCheck();
    this.stopMetronome();
    this.disconnectWebSocket();
  }

  protected async onDestroy(): Promise<void> {
    this.stopTimeCheck();
    this.stopMetronome();
    this.disconnectWebSocket();
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    const newTimeConfig = newConfig as TimeInputConfig;
    
    if (newTimeConfig.mode !== this.timeMode) {
      this.timeMode = newTimeConfig.mode || 'clock';
      // Restart with new mode
      if (this.enabled && this.isRunning) {
        this.stopTimeCheck();
        this.stopMetronome();
        if (this.timeMode === 'clock') {
          this.startTimeCheck();
        } else if (this.timeMode === 'metronome') {
          this.startMetronome();
        }
      }
    }
    
    if (newTimeConfig.targetTime !== this.targetTime) {
      this.targetTime = newTimeConfig.targetTime || this.targetTime;
      if (this.timeMode === 'clock' && !this.isValidTimeFormat(this.targetTime)) {
        throw new Error(`Invalid time format: ${this.targetTime}. Expected 12-hour format (e.g., 2:30 PM).`);
      }
    }
    
    if (newTimeConfig.millisecondDelay !== this.millisecondDelay) {
      this.millisecondDelay = newTimeConfig.millisecondDelay || 1000;
      if (this.timeMode === 'metronome' && (this.millisecondDelay < 100 || this.millisecondDelay > 60000)) {
        throw new Error(`Invalid millisecond delay: ${this.millisecondDelay}. Must be between 100 and 60000.`);
      }
      // Restart metronome with new delay if running
      if (this.timeMode === 'metronome' && this.enabled && this.isRunning) {
        this.stopMetronome();
        this.startMetronome();
      }
    }
    
    if (newTimeConfig.enabled !== this.enabled) {
      this.enabled = newTimeConfig.enabled ?? this.enabled;
      if (this.enabled && this.isRunning) {
        if (this.timeMode === 'clock') {
          this.startTimeCheck();
        } else if (this.timeMode === 'metronome') {
          this.startMetronome();
        }
      } else {
        this.stopTimeCheck();
        this.stopMetronome();
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
    if (this.timeMode === 'clock') {
      this.startTimeCheck();
    } else if (this.timeMode === 'metronome') {
      this.startMetronome();
    }
    
    // Connect to WebSocket API if enabled
    if (this.apiEnabled && this.apiEndpoint) {
      this.connectWebSocket();
    }
  }

  protected async onStopListening(): Promise<void> {
    this.stopTimeCheck();
    this.stopMetronome();
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

    this.logger?.info(`Starting metronome with ${this.millisecondDelay}ms delay`);
    
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
      
      this.emitTrigger('timeTrigger', {
        mode: 'metronome',
        millisecondDelay: this.millisecondDelay,
        currentTime: new Date().toISOString(),
        timestamp: Date.now()
      });
    }, this.millisecondDelay);
  }

  /**
   * Stop metronome mode
   */
  private stopMetronome(): void {
    if (this.metronomeIntervalId) {
      clearInterval(this.metronomeIntervalId);
      this.metronomeIntervalId = undefined as any;
    }
  }

  /**
   * Start checking for target time (Clock mode)
   */
  private startTimeCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

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
    const parts = time24.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    
    if (hours === undefined || minutes === undefined) {
      throw new Error(`Invalid time format: ${time24}`);
    }
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Convert 12-hour time to 24-hour format
   */
  private convertTo24Hour(time12: string): string {
    const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
      throw new Error(`Invalid 12-hour time format: ${time12}`);
    }
    
    const hoursStr = match[1];
    const minutesStr = match[2];
    const periodStr = match[3];
    
    if (!hoursStr || !minutesStr || !periodStr) {
      throw new Error(`Invalid 12-hour time format: ${time12}`);
    }
    
    let hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    const period = periodStr.toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Update current time and countdown display
   */
  private updateTimeDisplay(): void {
    console.log(`[DEBUG] Time Input module ${this.id} updateTimeDisplay() called`);
    const now = new Date();
    
    // Update current time in 12-hour format
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    this.currentTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    // Debug logging
    console.log(`[DEBUG] Time Input module ${this.id}: Current time = ${this.currentTime}, Mode = ${this.timeMode}, Enabled = ${this.enabled}`);
    this.logger?.info(`Time Input ${this.id || 'unknown'}: Current time = ${this.currentTime}, Mode = ${this.timeMode}, Enabled = ${this.enabled}, Countdown = ${this.countdown}`);
    
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
      // For metronome mode, show the delay interval
      const seconds = this.millisecondDelay / 1000;
      this.countdown = `${seconds}s interval`;
    }
    
    // Create state update for UI sync
    const stateUpdate = {
      id: this.id,
      moduleName: this.name || 'Time Input',
      status: this.enabled ? 'listening' : 'stopped',
      mode: this.timeMode,
      currentTime: this.currentTime,
      countdown: this.countdown,
      targetTime12Hour: this.timeMode === 'clock' ? this.convertTo12Hour(this.targetTime) : '',
      millisecondDelay: this.millisecondDelay,
      enabled: this.enabled || false,
      lastUpdate: Date.now()
    };

    // Debug logging
    this.logger?.info(`Time Input ${this.id || 'unknown'}: State update object:`, stateUpdate);

    // Update the state manager directly
    try {
      // Check if the module instance exists in the state manager
      const existingInstance = this.stateManager.getModuleInstance(this.id);
      this.logger?.info(`Time Input ${this.id || 'unknown'}: Existing instance found: ${!!existingInstance}`);
      
      if (existingInstance) {
        // Update existing instance
        this.logger?.info(`Time Input ${this.id || 'unknown'}: Updating existing instance`);
        this.stateManager.updateModuleInstance(stateUpdate);
      } else {
        // Add new instance if it doesn't exist
        this.logger?.info(`Time Input ${this.id || 'unknown'}: Adding new instance`);
        this.stateManager.addModuleInstance(stateUpdate);
      }
      
      // Verify the update worked
      const updatedInstance = this.stateManager.getModuleInstance(this.id);
      this.logger?.info(`Time Input ${this.id || 'unknown'}: Updated instance currentTime: ${updatedInstance?.currentTime}, countdown: ${updatedInstance?.countdown}`);
    } catch (error) {
      this.logger?.error(`Failed to update module instance state: ${error}`);
    }
    
    // Emit state update for UI sync
    this.emit('stateUpdate', {
      mode: this.timeMode,
      currentTime: this.currentTime,
      countdown: this.countdown,
      targetTime12Hour: this.timeMode === 'clock' ? this.convertTo12Hour(this.targetTime) : '',
      millisecondDelay: this.millisecondDelay,
      enabled: this.enabled
    });
  }

  /**
   * Connect to WebSocket API
   */
  private connectWebSocket(): void {
    if (!this.apiEndpoint || !this.apiEnabled) {
      return;
    }

    try {
      this.logger?.info(`Connecting to WebSocket API: ${this.apiEndpoint}`);
      
      this.ws = new WebSocket(this.apiEndpoint);
      
      this.ws.onopen = () => {
        this.logger?.info('WebSocket API connected');
        this.wsReconnectAttempts = 0;
        this.emit('apiConnected', {
          endpoint: this.apiEndpoint,
          timestamp: Date.now()
        });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          this.handleApiTimeData(data);
        } catch (error) {
          this.logger?.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        this.logger?.warn(`WebSocket API disconnected: ${event.code} ${event.reason}`);
        this.emit('apiDisconnected', {
          endpoint: this.apiEndpoint,
          code: event.code,
          reason: event.reason,
          timestamp: Date.now()
        });
        
        // Attempt to reconnect
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        this.logger?.error('WebSocket API error:', error);
      };
      
    } catch (error) {
      this.logger?.error('Failed to connect to WebSocket API:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket API
   */
  private disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.wsReconnectInterval) {
      clearTimeout(this.wsReconnectInterval);
      this.wsReconnectInterval = null;
    }
    
    this.wsReconnectAttempts = 0;
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
        apiConnected: this.ws?.readyState === 1,
        apiData: data
      });
      
    } catch (error) {
      this.logger?.error('Failed to handle API time data:', error);
    }
  }
} 