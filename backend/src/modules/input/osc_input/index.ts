import { InputModuleBase } from '../../InputModuleBase';
import { 
  ModuleConfig, 
  OscInputConfig, 
  OscMessage, 
  OscTriggerPayload, 
  OscStreamPayload,
  TriggerEvent,
  StreamEvent,
  isOscConfig
} from '@interactor/shared';
import * as osc from 'osc';

export class OscInputModule extends InputModuleBase {
  private udpPort: osc.UDPPort | undefined = undefined;
  private port: number;
  private host: string;
  private addressPattern: string;
  private enabled: boolean;
  private lastMessage: OscMessage | undefined = undefined;
  private messageCount: number = 0;

  constructor(config: OscInputConfig) {
    super('osc_input', config, {
      name: 'OSC Input',
      type: 'input',
      version: '1.0.0',
      description: 'Receives OSC messages and triggers/streams events',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          port: {
            type: 'number',
            description: 'UDP port to listen for OSC messages',
            minimum: 1024,
            maximum: 65535,
            default: 8000
          },
          host: {
            type: 'string',
            description: 'Host address to bind to',
            default: '0.0.0.0'
          },
          addressPattern: {
            type: 'string',
            description: 'OSC address pattern to match (e.g., /trigger/*)',
            default: '/trigger'
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the OSC listener',
            default: true
          }
        },
        required: ['port', 'host', 'addressPattern']
      },
      events: [
        {
          name: 'oscMessage',
          type: 'output',
          description: 'Emitted when OSC message is received'
        },
        {
          name: 'oscTrigger',
          type: 'output',
          description: 'Emitted when OSC message matches address pattern (trigger mode)'
        }
      ]
    });

    this.port = config.port || 8000;
    this.host = config.host || '0.0.0.0';
    this.addressPattern = config.addressPattern || '/trigger';
    this.enabled = config.enabled !== false;
  }

  protected async onInit(): Promise<void> {
    // Validate port range
    if (this.port < 1024 || this.port > 65535) {
      throw new Error(`Invalid port number: ${this.port}. Must be between 1024 and 65535.`);
    }

    // Validate host format
    if (!this.isValidHost(this.host)) {
      throw new Error(`Invalid host address: ${this.host}`);
    }
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      await this.initOscListener();
    }
  }

  protected async onStop(): Promise<void> {
    this.stopOscListener();
  }

  protected async onDestroy(): Promise<void> {
    this.stopOscListener();
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Use type guard to ensure we have OSC config
    if (!isOscConfig(newConfig)) {
      throw new Error('Invalid OSC configuration provided');
    }
    
    let needsRestart = false;
    
    if (newConfig.port !== this.port) {
      this.port = newConfig.port;
      needsRestart = true;
    }
    
    if (newConfig.host !== this.host) {
      this.host = newConfig.host;
      needsRestart = true;
    }
    
    if (newConfig.addressPattern !== this.addressPattern) {
      this.addressPattern = newConfig.addressPattern;
    }
    
    if (newConfig.enabled !== this.enabled) {
      this.enabled = newConfig.enabled;
      if (this.enabled && !this.isListening) {
        await this.startListening();
      } else if (!this.enabled && this.isListening) {
        await this.stopListening();
      }
    }
    
    if (needsRestart && this.isListening) {
      this.stopOscListener();
      if (this.enabled) {
        await this.initOscListener();
      }
    }
  }

  protected handleInput(data: unknown): void {
    if (this.isValidOscMessage(data)) {
      this.handleOscMessage(data);
    }
  }

  protected async onStartListening(): Promise<void> {
    if (this.enabled) {
      await this.initOscListener();
    }
  }

  protected async onStopListening(): Promise<void> {
    this.stopOscListener();
  }

  /**
   * Initialize OSC listener with proper error handling
   */
  private async initOscListener(): Promise<void> {
    if (this.udpPort) {
      return; // Already initialized
    }

    try {
      this.udpPort = new osc.UDPPort({
        localAddress: this.host,
        localPort: this.port,
        metadata: true
      });

      this.udpPort.on('ready', () => {
        this.logger?.info(`OSC listener ready on ${this.host}:${this.port}`);
        this.emit('status', {
          moduleId: this.id,
          moduleName: this.name,
          status: 'listening',
          details: { host: this.host, port: this.port }
        });
      });

      this.udpPort.on('message', (oscMsg: osc.OscMessage) => {
        this.handleOscMessage(oscMsg);
      });

      this.udpPort.on('error', (error: Error) => {
        this.logger?.error(`OSC listener error:`, error);
        this.emit('error', {
          moduleId: this.id,
          moduleName: this.name,
          error: error.message,
          context: 'osc_listener'
        });
      });

      this.udpPort.open();
    } catch (error) {
      this.logger?.error(`Failed to initialize OSC listener:`, error);
      throw error;
    }
  }

  /**
   * Stop OSC listener
   */
  private stopOscListener(): void {
    if (this.udpPort) {
      this.udpPort.close();
      this.udpPort = undefined;
      this.logger?.info(`OSC listener stopped`);
      this.emit('status', {
        moduleId: this.id,
        moduleName: this.name,
        status: 'stopped'
      });
    }
  }

  /**
   * Handle incoming OSC message with proper typing
   */
  private handleOscMessage(oscMsg: osc.OscMessage): void {
    if (!oscMsg.address) {
      this.logger?.warn('Received OSC message without address');
      return;
    }

    const message: OscMessage = {
      address: oscMsg.address,
      args: oscMsg.args || [],
      timestamp: Date.now()
    };

    this.lastMessage = message;
    this.messageCount++;

    this.logger?.debug(`Received OSC message: ${message.address}`, message.args);

    // Emit oscMessage event for all received messages
    this.emit('oscMessage', {
      address: message.address,
      args: message.args,
      timestamp: message.timestamp
    });

    // Check if message matches address pattern
    if (this.matchesAddressPattern(message.address)) {
      if (this.mode === 'trigger') {
        // Trigger mode: emit trigger event with typed payload
        const triggerPayload: OscTriggerPayload = {
          address: message.address,
          args: message.args,
          timestamp: message.timestamp,
          messageCount: this.messageCount
        };
        this.emitTrigger<OscTriggerPayload>('oscTrigger', triggerPayload);
      } else {
        // Streaming mode: emit stream with typed payload
        const streamPayload: OscStreamPayload = {
          address: message.address,
          value: message.args[0] || 1, // Use first argument as value, default to 1
          args: message.args,
          timestamp: message.timestamp
        };
        this.emitStream<OscStreamPayload>(streamPayload);
      }
    }

    // Emit state update
    this.emit('stateUpdate', {
      status: this.enabled ? 'listening' : 'stopped',
      lastMessage: message,
      messageCount: this.messageCount,
      mode: this.mode
    });
  }

  /**
   * Check if OSC address matches the configured pattern
   */
  private matchesAddressPattern(address: string): boolean {
    // Simple pattern matching - can be enhanced for more complex patterns
    if (this.addressPattern === '*') {
      return true;
    }
    
    if (this.addressPattern.endsWith('*')) {
      const prefix = this.addressPattern.slice(0, -1);
      return address.startsWith(prefix);
    }
    
    return address === this.addressPattern;
  }

  /**
   * Validate host address format
   */
  private isValidHost(host: string): boolean {
    // Basic validation - can be enhanced
    if (host === '0.0.0.0' || host === 'localhost' || host === '127.0.0.1') {
      return true;
    }
    
    // Check for valid IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(host);
  }

  /**
   * Type guard to validate OSC message structure
   */
  private isValidOscMessage(data: unknown): data is osc.OscMessage {
    return (
      typeof data === 'object' &&
      data !== null &&
      'address' in data &&
      typeof (data as osc.OscMessage).address === 'string'
    );
  }

  /**
   * Get OSC listener parameters for UI display with proper return type
   */
  public getOscParameters(): {
    port: number;
    host: string;
    addressPattern: string;
    enabled: boolean;
    status: string;
    lastMessage: OscMessage | undefined;
    messageCount: number;
    mode: string;
  } {
    return {
      port: this.port,
      host: this.host,
      addressPattern: this.addressPattern,
      enabled: this.enabled,
      status: this.enabled && this.udpPort ? 'listening' : 'stopped',
      lastMessage: this.lastMessage,
      messageCount: this.messageCount,
      mode: this.mode
    };
  }

  /**
   * Reset message counter
   */
  public reset(): void {
    this.messageCount = 0;
    this.lastMessage = undefined;
    this.emit('stateUpdate', {
      status: this.udpPort ? 'listening' : 'stopped',
      messageCount: this.messageCount,
      lastMessage: undefined
    });
  }
} 