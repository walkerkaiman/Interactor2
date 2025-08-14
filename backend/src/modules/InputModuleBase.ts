import { ModuleBase } from '../core/ModuleBase';
import {
  ModuleConfig,
  ModuleManifest,
  InputModule,
  EventHandler
} from '@interactor/shared';

export abstract class InputModuleBase extends ModuleBase implements InputModule {
  public readonly type = 'input' as const;

  protected mode: 'trigger' | 'streaming' = 'trigger';
  protected inputHandlers: EventHandler[] = [];
  protected lastValue: unknown = null;
  protected isListening = false;

  constructor(
    name: string, 
    config: ModuleConfig, 
    manifest: ModuleManifest,
    id?: string
  ) {
    super(name, config, manifest, id);
  }

  /**
   * Set the input mode (trigger or streaming)
   */
  public setMode(mode: 'trigger' | 'streaming'): void {
    if (this.mode !== mode) {
      this.logger?.info(`Changing mode for ${this.name} from ${this.mode} to ${mode}`);
      this.mode = mode;
      this.emit('modeChanged', { moduleId: this.id, moduleName: this.name, mode });
    }
  }

  /**
   * Get current input mode
   */
  public getMode(): 'trigger' | 'streaming' {
    return this.mode;
  }

  /**
   * Register an input handler
   */
  public onInput(handler: EventHandler): void {
    this.inputHandlers.push(handler);
  }

  /**
   * Start listening for input
   */
  public async startListening(): Promise<void> {
    if (this.isListening) {
      return; // Already listening
    }

    try {
      this.logger?.info(`Starting input listening for ${this.name}`);
      await this.onStartListening();
      this.isListening = true;
      this.logger?.info(`Input listening started for ${this.name}`);
    } catch (error) {
      this.logger?.error(`Failed to start input listening for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Stop listening for input
   */
  public async stopListening(): Promise<void> {
    if (!this.isListening) {
      return; // Not listening
    }

    try {
      this.logger?.info(`Stopping input listening for ${this.name}`);
      await this.onStopListening();
      this.isListening = false;
      this.logger?.info(`Input listening stopped for ${this.name}`);
    } catch (error) {
      this.logger?.error(`Failed to stop input listening for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Get the last received value
   */
  public getLastValue(): unknown {
    return this.lastValue;
  }

  /**
   * Check if the module is currently listening
   */
  public isInputListening(): boolean {
    return this.isListening;
  }

  /**
   * Emit a trigger event with typed payload
   */
  protected emitTrigger<T = unknown>(event: string, payload?: T): void {
    this.incrementMessageCount();
    this.logger?.debug(`Emitting trigger event from ${this.name}: ${event}`, payload);
    
    const triggerEvent: any = {
      moduleId: this.id,
      moduleName: this.name,
      event,
      payload,
      timestamp: Date.now()
    };
    
    this.emit('trigger', triggerEvent);

    // Notify input handlers
    for (const handler of this.inputHandlers) {
      try {
        handler({
          type: 'trigger',
          event,
          payload,
          source: this.name,
          timestamp: Date.now()
        });
      } catch (error) {
        this.logger?.error(`Error in input handler for ${this.name}:`, error);
      }
    }
  }

  /**
   * Emit a streaming event with typed value
   */
  /**
   * Handle manual trigger
   */
  public async onManualTrigger(): Promise<void> {
    try {
      this.logger?.debug(`Manual trigger for ${this.name}`);
      // If subclass has its own manualTrigger method (legacy), delegate to it
      if (typeof (this as any).manualTrigger === 'function' && (this as any).manualTrigger !== (this as any).onManualTrigger) {
        await (this as any).manualTrigger();
        return;
      }
      // Emit a generic trigger event; subclasses can override for custom behaviour
      this.emitTrigger('manualTrigger', {
        timestamp: Date.now(),
        manual: true,
      });
      this.incrementMessageCount();

      // Emit triggerEvent for frontend pulse animation consistency
      this.emit('triggerEvent', {
        moduleId: this.id,
        type: 'manual',
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger?.error(`Error in manual trigger for ${this.name}:`, error as any);
      throw error;
    }
  }

  protected emitStream<T = unknown>(value: T): void {
    this.incrementMessageCount();
    this.lastValue = value;
    this.logger?.debug(`Emitting stream value from ${this.name}:`, value);
    
    const streamEvent: any = {
      moduleId: this.id,
      moduleName: this.name,
      value,
      timestamp: Date.now()
    };
    
    this.emit('stream', streamEvent);

    // Notify input handlers
    for (const handler of this.inputHandlers) {
      try {
        handler({
          type: 'stream',
          value,
          source: this.name,
          timestamp: Date.now()
        });
      } catch (error) {
        this.logger?.error(`Error in input handler for ${this.name}:`, error);
      }
    }
  }

  /**
   * Handle incoming data - to be implemented by subclasses
   */
  protected abstract handleInput(data: unknown): void;

  /**
   * Start listening for input - to be implemented by subclasses
   */
  protected abstract onStartListening(): Promise<void>;

  /**
   * Stop listening for input - to be implemented by subclasses
   */
  protected abstract onStopListening(): Promise<void>;

  /**
   * Override onStart to also start listening
   */
  protected async onStart(): Promise<void> {
    await this.startListening();
  }

  /**
   * Override onStop to also stop listening
   */
  protected async onStop(): Promise<void> {
    await this.stopListening();
  }

  /**
   * Override onDestroy to clean up input handlers
   */
  protected async onDestroy(): Promise<void> {
    this.inputHandlers = [];
    this.lastValue = null;
    this.isListening = false;
  }
}
