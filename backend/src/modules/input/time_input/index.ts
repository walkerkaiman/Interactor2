import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig, TimeInputConfig, TimeTriggerPayload, TimeState } from '@interactor/shared';

export class TimeInputModule extends InputModuleBase {
  private intervalId?: NodeJS.Timeout;
  private targetTime: string;
  private enabled: boolean;
  private currentTime: string = '';
  private countdown: string = '';

  constructor(config: TimeInputConfig) {
    super('time_input', config, {
      name: 'Time Input',
      type: 'input',
      version: '1.0.0',
      description: 'Triggers events at a specific time of day',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          targetTime: {
            type: 'string',
            description: 'Target time in HH:MM format',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the time trigger',
            default: true
          }
        },
        required: ['targetTime']
      },
      events: [
        {
          name: 'timeTrigger',
          type: 'output',
          description: 'Emitted when target time is reached'
        }
      ]
    });

    this.targetTime = config.targetTime || '12:00 PM';
    this.enabled = config.enabled !== false;
  }

  protected async onInit(): Promise<void> {
    // Validate time format
    if (!this.isValidTimeFormat(this.targetTime)) {
      throw new Error(`Invalid time format: ${this.targetTime}. Expected 12-hour format (e.g., 2:30 PM).`);
    }
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      this.startTimeCheck();
    }
    // Start updating current time and countdown immediately
    this.updateTimeDisplay();
  }

  protected async onStop(): Promise<void> {
    this.stopTimeCheck();
  }

  protected async onDestroy(): Promise<void> {
    this.stopTimeCheck();
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    const newTimeConfig = newConfig as TimeInputConfig;
    
    if (newTimeConfig.targetTime !== this.targetTime) {
      this.targetTime = newTimeConfig.targetTime;
      if (!this.isValidTimeFormat(this.targetTime)) {
        throw new Error(`Invalid time format: ${this.targetTime}. Expected 12-hour format (e.g., 2:30 PM).`);
      }
    }
    
    if (newTimeConfig.enabled !== this.enabled) {
      this.enabled = newTimeConfig.enabled;
      if (this.enabled && this.isRunning) {
        this.startTimeCheck();
      } else {
        this.stopTimeCheck();
      }
    }
  }

  protected handleInput(data: any): void {
    // This module doesn't handle external input
  }

  protected async onStartListening(): Promise<void> {
    // Start the time checking interval
    this.startTimeCheck();
  }

  protected async onStopListening(): Promise<void> {
    // Stop the time checking interval
    this.stopTimeCheck();
  }

  /**
   * Start checking for target time
   */
  private startTimeCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check every second
    this.intervalId = setInterval(() => {
      this.updateTimeDisplay();
      
      if (this.enabled && this.checkTime()) {
        this.emitTrigger('timeTrigger', {
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
   * Check if current time matches target time
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
    targetTime: string; 
    enabled: boolean; 
    currentTime: string; 
    countdown: string;
    targetTime12Hour: string;
  } {
    return {
      targetTime: this.targetTime,
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
    const now = new Date();
    
    // Update current time in 12-hour format
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    this.currentTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    
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
    
    // Emit state update for UI sync
    this.emit('stateUpdate', {
      currentTime: this.currentTime,
      countdown: this.countdown,
      targetTime12Hour: this.convertTo12Hour(this.targetTime)
    });
  }
} 