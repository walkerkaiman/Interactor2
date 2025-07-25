import { ModuleBase } from '../core/ModuleBase';
import {
  ModuleConfig,
  ModuleManifest,
  OutputModule,
  EventHandler
} from '@interactor/shared';

export abstract class OutputModuleBase extends ModuleBase implements OutputModule {
  public readonly type = 'output' as const;
  public category: 'trigger' | 'streaming';

  protected outputHandlers: EventHandler[] = [];
  protected lastSentValue: any = null;
  protected isConnected = false;

  constructor(
    name: string, 
    config: ModuleConfig, 
    manifest: ModuleManifest,
    category: 'trigger' | 'streaming' = 'trigger'
  ) {
    super(name, config, manifest);
    this.category = category;
  }

  /**
   * Register an output handler
   */
  public onOutput(handler: EventHandler): void {
    this.outputHandlers.push(handler);
  }

  /**
   * Send data to the output
   */
  public async send(data: any): Promise<void> {
    try {
      this.logger?.debug(`Sending data from ${this.name}:`, data);
      await this.onSend(data);
      this.lastSentValue = data;
      this.incrementMessageCount();
      
      this.logger?.debug(`Data sent successfully from ${this.name}`);
    } catch (error) {
      this.logger?.error(`Failed to send data from ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Handle trigger events
   */
  public async onTriggerEvent(event: any): Promise<void> {
    try {
      this.logger?.debug(`Handling trigger event in ${this.name}:`, event);
      await this.handleTriggerEvent(event);
      this.incrementMessageCount();
    } catch (error) {
      this.logger?.error(`Error handling trigger event in ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Handle streaming events
   */
  public async onStreamingEvent(event: any): Promise<void> {
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
   * Manual trigger - for testing and manual control
   */
  public async manualTrigger(): Promise<void> {
    try {
      this.logger?.info(`Manual trigger activated for ${this.name}`);
      await this.onManualTrigger();
      this.incrementMessageCount();
    } catch (error) {
      this.logger?.error(`Error in manual trigger for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Get the last sent value
   */
  public getLastSentValue(): any {
    return this.lastSentValue;
  }

  /**
   * Check if the output is connected/ready
   */
  public isOutputConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Set connection status
   */
  protected setConnectionStatus(connected: boolean): void {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      this.emit('connectionChanged', { 
        moduleId: this.id, 
        moduleName: this.name, 
        connected 
      });
    }
  }

  /**
   * Emit output event
   */
  protected emitOutput(event: string, payload?: any): void {
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
   * Emit error event
   */
  protected emitError(error: Error, context?: string): void {
    this.logger?.error(`Error in ${this.name}${context ? ` (${context})` : ''}:`, error);
    
    this.emit('error', {
      moduleId: this.id,
      moduleName: this.name,
      error: error.message,
      context,
      timestamp: Date.now()
    });
  }

  /**
   * Emit status update
   */
  protected emitStatus(status: string, details?: any): void {
    this.logger?.debug(`Status update for ${this.name}: ${status}`, details);
    
    this.emit('status', {
      moduleId: this.id,
      moduleName: this.name,
      status,
      details,
      timestamp: Date.now()
    });
  }

  // Abstract methods that must be implemented by subclasses

  /**
   * Send data to the output device/system
   */
  protected abstract onSend(data: any): Promise<void>;

  /**
   * Handle trigger events
   */
  protected abstract handleTriggerEvent(event: any): Promise<void>;

  /**
   * Handle streaming events
   */
  protected abstract handleStreamingEvent(event: any): Promise<void>;

  /**
   * Handle manual trigger
   */
  protected abstract onManualTrigger(): Promise<void>;

  /**
   * Override onDestroy to clean up output handlers
   */
  protected async onDestroy(): Promise<void> {
    this.outputHandlers = [];
    this.lastSentValue = null;
    this.isConnected = false;
  }
}
