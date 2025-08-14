import { OutputModuleBase } from '../../OutputModuleBase';
import {
  ModuleConfig,
  OscOutputConfig,
  OscOutputMessage,
  OscOutputPayload,
  OscOutputErrorData,
  TriggerEvent,
  StreamEvent,
  isOscOutputConfig
} from '@interactor/shared';
import { InteractorError } from '../../../core/ErrorHandler';
import * as osc from 'osc';

export class OscOutputModule extends OutputModuleBase {
  private udpPort: osc.UDPPort | undefined = undefined;
  private host: string;
  private port: number;
  private addressPattern: string;
  private enabled: boolean;
  private lastMessage: OscOutputMessage | undefined = undefined;
  private lastError: OscOutputErrorData | undefined = undefined;
  private messageCount = 0;
  private errorCount = 0;

  constructor(config: OscOutputConfig) {
    // Apply defaults to config before passing to base class
    const configWithDefaults: OscOutputConfig = {
      ...config,
      host: config.host || '127.0.0.1',
      port: config.port || 8000,
      addressPattern: config.addressPattern || '/trigger',
      enabled: config.enabled !== false
    };

    super('osc_output', configWithDefaults, {
      name: 'OSC Output',
      type: 'output',
      version: '1.0.0',
      description: 'Sends OSC messages to external endpoints',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          host: {
            type: 'string',
            description: 'Target host address for OSC messages',
            default: '127.0.0.1'
          },
          port: {
            type: 'number',
            description: 'Target UDP port for OSC messages',
            minimum: 1024,
            maximum: 65535,
            default: 8000
          },
          addressPattern: {
            type: 'string',
            description: 'Default OSC address pattern to send to',
            default: '/trigger'
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the module',
            default: true
          }
        },
        required: ['host', 'port', 'addressPattern']
      },
      events: [
        {
          name: 'oscMessage',
          type: 'input',
          description: 'Triggers an OSC message'
        },
        {
          name: 'oscSent',
          type: 'output',
          description: 'Emitted when an OSC message is sent successfully'
        },
        {
          name: 'oscError',
          type: 'output',
          description: 'Emitted when an OSC message fails to send'
        },
        {
          name: 'stateUpdate',
          type: 'output',
          description: 'Emitted when module state changes'
        }
      ]
    });

    // Set private properties from the config with defaults
    this.host = configWithDefaults.host;
    this.port = configWithDefaults.port;
    this.addressPattern = configWithDefaults.addressPattern;
    this.enabled = !!configWithDefaults.enabled;
  }

  protected async onInit(): Promise<void> {
    // Validate port range
    if (this.port < 1024 || this.port > 65535) {
      throw InteractorError.validation(
        `OSC port must be between 1024-65535`,
        { provided: this.port, min: 1024, max: 65535 },
        ['Use 8000 for TouchOSC default', 'Use 9000 for common OSC applications', 'Avoid ports below 1024 (system reserved)']
      );
    }

    // Validate host format
    if (!this.isValidHost(this.host)) {
      throw InteractorError.validation(
        `Invalid OSC host address`,
        { provided: this.host, expected: 'valid IP address or hostname' },
        ['Use "127.0.0.1" for local testing', 'Use "192.168.1.100" for network device', 'Use "0.0.0.0" to listen on all interfaces']
      );
    }

    // Validate address pattern
    if (!this.addressPattern || !this.addressPattern.startsWith('/')) {
      throw InteractorError.validation(
        `OSC address pattern must start with '/'`,
        { provided: this.addressPattern, expected: 'pattern starting with /' },
        ['Use "/trigger" for simple triggers', 'Use "/fader/1" for numbered controls', 'Use "/app/control" for organized patterns']
      );
    }
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      await this.initOscSender();
    }
  }

  protected async onStop(): Promise<void> {
    this.stopOscSender();
  }

  protected async onDestroy(): Promise<void> {
    this.stopOscSender();
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Use type guard to ensure we have OSC output config
    if (!isOscOutputConfig(newConfig)) {
      throw InteractorError.validation(
        'Invalid OSC output configuration provided',
        { providedConfig: newConfig },
        ['Check that all required fields are present: host, port, addressPattern', 'Ensure values are within valid ranges', 'Verify address pattern starts with /']
      );
    }
    
    // Validate port range
    if (newConfig.port < 1024 || newConfig.port > 65535) {
      throw InteractorError.validation(
        `OSC port must be between 1024-65535`,
        { provided: newConfig.port, min: 1024, max: 65535 },
        ['Use 8000 for TouchOSC default', 'Use 9000 for common OSC applications', 'Avoid ports below 1024 (system reserved)']
      );
    }

    // Validate host format
    if (!this.isValidHost(newConfig.host)) {
      throw InteractorError.validation(
        `Invalid OSC host address`,
        { provided: newConfig.host, expected: 'valid IP address or hostname' },
        ['Use "127.0.0.1" for local testing', 'Use "192.168.1.100" for network device', 'Use "0.0.0.0" to listen on all interfaces']
      );
    }

    // Validate address pattern
    if (!newConfig.addressPattern || !newConfig.addressPattern.startsWith('/')) {
      throw InteractorError.validation(
        `OSC address pattern must start with '/'`,
        { provided: newConfig.addressPattern, expected: 'pattern starting with /' },
        ['Use "/trigger" for simple triggers', 'Use "/fader/1" for numbered controls', 'Use "/app/control" for organized patterns']
      );
    }
    
    let needsRestart = false;
    
    if (newConfig.host !== this.host) {
      this.host = newConfig.host;
      needsRestart = true;
    }
    
    if (newConfig.port !== this.port) {
      this.port = newConfig.port;
      needsRestart = true;
    }
    
    if (newConfig.addressPattern !== this.addressPattern) {
      this.addressPattern = newConfig.addressPattern;
    }
    
    if (newConfig.enabled !== this.enabled) {
      this.enabled = !!newConfig.enabled;
      if (this.enabled && !this.isConnected) {
        await this.start();
      } else if (!this.enabled && this.isConnected) {
        await this.stop();
      }
    }
    
    if (needsRestart && this.isConnected) {
      this.stopOscSender();
      if (this.enabled) {
        await this.initOscSender();
      }
    }
  }

  /**
   * Send data with proper typing
   */
  protected async onSend<T = unknown>(data: T): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict('Cannot send OSC data when module is disabled', { enabled: this.enabled, attempted: 'send' });
    }
    await this.sendOscMessage(this.addressPattern, data);
  }

  /**
   * Handle trigger events with proper typing
   */
  protected async handleTriggerEvent(event: TriggerEvent): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict('Cannot handle trigger event when OSC module is disabled', { enabled: this.enabled, attempted: 'trigger_event' });
    }
    
    // Extract address from event payload if available, otherwise use default
    const address = event.payload?.address || this.addressPattern;
    const args = event.payload?.args || [event.payload?.value || 1];
    
    await this.sendOscMessage(address, args);
  }

  /**
   * Handle streaming events with proper typing
   */
  protected async handleStreamingEvent(event: StreamEvent): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict('Cannot handle streaming event when OSC module is disabled', { enabled: this.enabled, attempted: 'streaming_event' });
    }
    
    // For streaming events, send the value to the default address pattern
    await this.sendOscMessage(this.addressPattern, [event.value]);
  }

  /**
   * Handle manual trigger with proper typing
   */
  protected async handleManualTrigger(): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict('Cannot perform manual trigger when OSC module is disabled', { enabled: this.enabled, attempted: 'manual_trigger' });
    }
    
    const testData = {
      message: 'Manual trigger from OSC output module',
      timestamp: Date.now(),
      moduleId: this.id
    };
    
    await this.sendOscMessage(this.addressPattern, [testData]);
  }

  /**
   * Initialize OSC sender with proper error handling
   */
  private async initOscSender(): Promise<void> {
    if (this.udpPort) {
      return; // Already initialized
    }

    try {
      this.udpPort = new (osc as any).UDPPort({
        remoteAddress: this.host,
        remotePort: this.port,
        metadata: true
      });

      (this.udpPort as any).on('ready', () => {
        this.logger?.info(`OSC sender ready to ${this.host}:${this.port}`);
        this.setConnectionStatus(true);
        this.emit('status', {
          moduleId: this.id,
          moduleName: this.name,
          status: 'ready',
          details: { host: this.host, port: this.port }
        });
      });

      (this.udpPort as any).on('error', (error: Error) => {
        this.logger?.error(`OSC sender error:`, error);
        this.setConnectionStatus(false);
        this.emit('error', {
          moduleId: this.id,
          moduleName: this.name,
          error: error.message,
          context: 'osc_sender'
        });
      });

      (this.udpPort as any).open();
    } catch (error) {
      this.logger?.error(`Failed to initialize OSC sender:`, error);
      this.setConnectionStatus(false);
      throw error;
    }
  }

  /**
   * Stop OSC sender
   */
  private stopOscSender(): void {
    if (this.udpPort) {
      (this.udpPort as any).close();
      this.udpPort = undefined;
      this.setConnectionStatus(false);
      this.logger?.info(`OSC sender stopped`);
      this.emit('status', {
        moduleId: this.id,
        moduleName: this.name,
        status: 'stopped'
      });
    }
  }

  /**
   * Send OSC message with proper typing and error handling
   */
  private async sendOscMessage<T = unknown>(address: string, data: T): Promise<void> {
    if (!this.udpPort || !this.isConnected) {
      throw InteractorError.internal('OSC sender is not ready - cannot send message', new Error('UDP port not initialized or connection lost'));
    }

    const timestamp = Date.now();
    
    try {
      // Convert data to OSC arguments
      const args = this.convertToOscArgs(data);
      
      this.logger?.debug(`Sending OSC message to ${address}`, args);
      
      // Create OSC message
      const oscMessage: osc.OscMessage = {
        address: address,
        args: args
      };

      // Send the message
      (this.udpPort as any).send(oscMessage);
      
      // Create message data object
      const messageData: OscOutputMessage = {
        address: address,
        args: args,
        timestamp
      };
      
      this.lastMessage = messageData;
      this.lastSentValue = data;
      
      // Success response
      const responsePayload: OscOutputPayload = {
        address: address,
        args: args,
        timestamp,
        messageCount: this.messageCount + 1
      };
      
      this.messageCount++;
      this.emitOutput<OscOutputPayload>('oscSent', responsePayload);
      this.emitStatus('success', { address, argsCount: args.length });
      
      this.logger?.info(`OSC message sent successfully to ${address}`);
      
    } catch (error) {
      this.errorCount++;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData: OscOutputErrorData = {
        host: this.host,
        port: this.port,
        address: address,
        error: errorMessage,
        timestamp
      };
      
      this.lastError = errorData;
      
      this.emitError(error instanceof Error ? error : new Error(errorMessage), 'osc_send');
      this.emitOutput<OscOutputErrorData>('oscError', errorData);
      
      this.logger?.error(`OSC message error:`, error);
      
      // Re-throw the error for the calling method to handle
      throw error;
    }
    
    // Emit state update
    this.emit('stateUpdate', {
      status: this.isConnected ? 'ready' : 'stopped',
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      lastMessage: this.lastMessage,
      lastError: this.lastError
    });
  }

  /**
   * Convert data to OSC arguments
   */
  private convertToOscArgs(data: unknown): any[] {
    if (Array.isArray(data)) {
      return data;
    }
    
    if (typeof data === 'number') {
      return [data];
    }
    
    if (typeof data === 'string') {
      return [data];
    }
    
    if (typeof data === 'boolean') {
      return [data ? 1 : 0];
    }
    
    if (typeof data === 'object' && data !== null) {
      // For objects, try to extract a numeric value or convert to string
      if ('value' in data && typeof (data as any).value === 'number') {
        return [(data as any).value];
      }
      
      return [JSON.stringify(data)];
    }
    
    // Default fallback
    return [data];
  }

  /**
   * Validate host address format
   */
  private isValidHost(host: string): boolean {
    // Basic validation - can be enhanced
    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }
    
    // Check for valid IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(host);
  }

  /**
   * Get configuration with proper return type
   */
  public getConfig(): OscOutputConfig {
    return {
      host: this.host,
      port: this.port,
      addressPattern: this.addressPattern,
      enabled: this.enabled
    };
  }

  /**
   * Get module state with proper return type
   */
  public getState(): {
    id: string;
    status: 'initializing' | 'running' | 'stopped' | 'error';
    lastError?: string;
    startTime?: number;
    messageCount: number;
    config: ModuleConfig;
  } {
    return {
      id: this.id,
      status: this.isConnected ? 'running' : 'stopped',
      messageCount: this.messageCount,
      config: this.config
    };
  }

  /**
   * Get detailed state for testing purposes
   */
  public getDetailedState(): {
    host: string;
    port: number;
    addressPattern: string;
    enabled: boolean;
    isConnected: boolean;
    lastMessage: OscOutputMessage | undefined;
    lastError: OscOutputErrorData | undefined;
    messageCount: number;
    errorCount: number;
    status: string;
  } {
    return {
      host: this.host,
      port: this.port,
      addressPattern: this.addressPattern,
      enabled: this.enabled,
      isConnected: this.isConnected,
      lastMessage: this.lastMessage,
      lastError: this.lastError,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      status: this.isConnected ? 'ready' : 'stopped'
    };
  }

  /**
   * Reset counters
   */
  public reset(): void {
    this.messageCount = 0;
    this.errorCount = 0;
    this.lastMessage = undefined;
    this.lastError = undefined;
    this.emit('stateUpdate', {
      status: this.isConnected ? 'ready' : 'stopped',
      messageCount: this.messageCount,
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
      const testData = { test: true, timestamp: Date.now() };
      await this.sendOscMessage(this.addressPattern, testData);
      return true;
    } catch (error) {
      this.logger?.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Send OSC message to a specific address
   */
  public async sendToAddress(address: string, data: unknown): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict('Cannot send to OSC address when module is disabled', { enabled: this.enabled, attempted: 'send_to_address', address });
    }
    await this.sendOscMessage(address, data);
  }
} 