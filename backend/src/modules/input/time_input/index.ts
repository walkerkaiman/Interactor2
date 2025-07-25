import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig } from '@interactor/shared';

interface TimeInputConfig extends ModuleConfig {
  targetTime: string; // HH:MM format
  enabled: boolean;
}

export class TimeInputModule extends InputModuleBase {
  private intervalId?: NodeJS.Timeout;
  private targetTime: string;
  private enabled: boolean;

  constructor(config: TimeInputConfig) {
    super('time_input', config, {
      name: 'Time Input',
      type: 'input',
      category: 'trigger',
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
    }, 'trigger');

    this.targetTime = config.targetTime || '12:00';
    this.enabled = config.enabled !== false;
  }

  protected async onInit(): Promise<void> {
    // Validate time format
    if (!this.isValidTimeFormat(this.targetTime)) {
      throw new Error(`Invalid time format: ${this.targetTime}. Expected HH:MM format.`);
    }
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      this.startTimeCheck();
    }
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
        throw new Error(`Invalid time format: ${this.targetTime}. Expected HH:MM format.`);
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
    return currentTime === this.targetTime;
  }

  /**
   * Validate time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Get trigger parameters for UI display
   */
  public getTriggerParameters(): { targetTime: string; enabled: boolean } {
    return {
      targetTime: this.targetTime,
      enabled: this.enabled
    };
  }
} 