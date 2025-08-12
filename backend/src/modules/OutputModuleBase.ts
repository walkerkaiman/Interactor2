import { ModuleBase } from '../core/ModuleBase';
import {
  ModuleConfig,
  ModuleManifest,
  OutputModule,
  EventHandler,
  TriggerEvent,
  StreamEvent
} from '@interactor/shared';

export abstract class OutputModuleBase extends ModuleBase implements OutputModule {
  public readonly type = 'output' as const;

  protected outputHandlers: EventHandler[] = [];
  protected lastSentValue: unknown = null;
  protected isConnected = false;

  constructor(
    name: string, 
    config: ModuleConfig, 
    manifest: ModuleManifest,
    id?: string
  ) {
    super(name, config, manifest, id);
  }

  /**
   * Add output handler
   */
  public addOutputHandler(handler: EventHandler): void {
    this.outputHandlers.push(handler);
  }

  /**
   * Remove output handler
   */
  public removeOutputHandler(handler: EventHandler): void {
    const index = this.outputHandlers.indexOf(handler);
    if (index > -1) {
      this.outputHandlers.splice(index, 1);
    }
  }

  /**
   * Handle trigger events with typed event parameter
   */
  public async onTriggerEvent(event: TriggerEvent): Promise<void> {
    try {
      this.logger?.debug(`Handling trigger event in ${this.name}:`, event);
      await this.handleTriggerEvent(event);
      this.incrementMessageCount();
      
      // Emit trigger event to frontend for pulse animation
      this.emit('triggerEvent', {
        moduleId: this.id,
        type: 'auto',
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger?.error(`Error handling trigger event in ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Handle streaming events with typed event parameter
   */
  public async onStreamingEvent(event: StreamEvent): Promise<void> {
    try {
      this.logger?.debug(`Handling streaming event in ${this.name}:`, event);
      await this.handleStreamingEvent(event);
      this.incrementMessageCount();
    } catch (error) {
      this.logger?.error(`Error handling streaming event in ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Handle manual trigger
   */
  public async onManualTrigger(): Promise<void> {
    try {
      this.logger?.debug(`Manual trigger for ${this.name}`);
      await this.handleManualTrigger();
      this.incrementMessageCount();
      
      // Emit trigger event to frontend for pulse animation
      this.emit('triggerEvent', {
        moduleId: this.id,
        type: 'manual',
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger?.error(`Error in manual trigger for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Get last sent value
   */
  public getLastSentValue(): unknown {
    return this.lastSentValue;
  }

  /**
   * Check if module is connected
   */
  public isModuleConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Emit output event with typed payload
   */
  protected emitOutput<T = unknown>(event: string, payload?: T): void {
    this.logger?.debug(`Emitting output event from ${this.name}: ${event}`, payload);
    
    this.emit('output', {
      moduleId: this.id,
      moduleName: this.name,
      event,
      payload,
      timestamp: Date.now()
    });

    // Notify output handlers
    for (const handler of this.outputHandlers) {
      try {
        handler({
          type: 'output',
          event,
          payload,
          source: this.name,
          timestamp: Date.now()
        });
      } catch (error) {
        this.logger?.error(`Error in output handler for ${this.name}:`, error);
      }
    }
  }

  /**
   * Set connection status
   */
  protected setConnected(connected: boolean): void {
    this.isConnected = connected;
    this.logger?.debug(`Connection status for ${this.name}: ${connected}`);
  }

  /**
   * Set last sent value
   */
  protected setLastSentValue(value: unknown): void {
    this.lastSentValue = value;
  }

  // Abstract methods that must be implemented by subclasses

  /**
   * Send data to the output device/system with typed parameter
   */
  protected abstract onSend<T = unknown>(data: T): Promise<void>;

  /**
   * Handle trigger events with typed event parameter
   */
  protected abstract handleTriggerEvent(event: TriggerEvent): Promise<void>;

  /**
   * Handle streaming events with typed event parameter
   */
  protected abstract handleStreamingEvent(event: StreamEvent): Promise<void>;

  /**
   * Handle manual trigger
   */
  protected abstract handleManualTrigger(): Promise<void>;

  /**
   * Override onDestroy to clean up output handlers
   */
  protected async onDestroy(): Promise<void> {
    this.outputHandlers = [];
    this.lastSentValue = null;
    this.isConnected = false;
  }
}
