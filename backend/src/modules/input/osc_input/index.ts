import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig } from '@interactor/shared';
import * as osc from 'osc';

interface OscInputConfig extends ModuleConfig {
  port: number;
  host: string;
  addressPattern: string;
  enabled: boolean;
}

interface OscMessage {
  address: string;
  args: any[];
  timestamp: number;
}

export class OscInputModule extends InputModuleBase {
  private udpPort?: osc.UDPPort;
  private port: number;
  private host: string;
  private addressPattern: string;
  private enabled: boolean;
  private lastMessage?: OscMessage;
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
    const newOscConfig = newConfig as OscInputConfig;
    
    let needsRestart = false;
    
    if (newOscConfig.port !== this.port) {
      this.port = newOscConfig.port;
      needsRestart = true;
    }
    
    if (newOscConfig.host !== this.host) {
      this.host = newOscConfig.host;
      needsRestart = true;
    }
    
    if (newOscConfig.addressPattern !== this.addressPattern) {
      this.addressPattern = newOscConfig.addressPattern;
    }
    
    if (newOscConfig.enabled !== this.enabled) {
      this.enabled = newOscConfig.enabled;
      if (this.enabled && this.isRunning) {
        await this.initOscListener();
      } else {
        this.stopOscListener();
      }
    } else if (needsRestart && this.enabled && this.isRunning) {
      this.stopOscListener();
      await this.initOscListener();
    }
  }

  protected handleInput(data: any): void {
    // This module doesn't handle external input
  }

  protected async onStartListening(): Promise<void> {
    await this.initOscListener();
  }

  protected async onStopListening(): Promise<void> {
    this.stopOscListener();
  }

  /**
   * Initialize OSC listener
   */
  private async initOscListener(): Promise<void> {
    if (this.udpPort) {
      this.stopOscListener();
    }

    try {
      this.udpPort = new osc.UDPPort({
        localAddress: this.host,
        localPort: this.port,
        metadata: true
      });

      this.udpPort.on('ready', () => {
        this.logger?.info(`OSC listener started on ${this.host}:${this.port}`);
        this.emit('stateUpdate', {
          status: 'listening',
          port: this.port,
          host: this.host,
          addressPattern: this.addressPattern
        });
      });

      this.udpPort.on('message', (oscMsg: any) => {
        this.handleOscMessage(oscMsg);
      });

      this.udpPort.on('error', (error: Error) => {
        this.logger?.error(`OSC listener error:`, error);
        this.emit('stateUpdate', {
          status: 'error',
          error: error.message
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
      this.udpPort = undefined as any;
      this.logger?.info('OSC listener stopped');
      this.emit('stateUpdate', {
        status: 'stopped'
      });
    }
  }

  /**
   * Handle incoming OSC message
   */
  private handleOscMessage(oscMsg: any): void {
    const message: OscMessage = {
      address: oscMsg.address,
      args: oscMsg.args || [],
      timestamp: Date.now()
    };

    this.lastMessage = message;
    this.messageCount++;

    // Emit general OSC message event
    this.emit('oscMessage', message);

    // Check if message matches address pattern
    if (this.matchesAddressPattern(message.address)) {
      if (this.mode === 'trigger') {
        // Trigger mode: emit trigger event
        this.emitTrigger('oscTrigger', {
          address: message.address,
          args: message.args,
          timestamp: message.timestamp,
          messageCount: this.messageCount
        });
      } else {
        // Streaming mode: emit stream with message data
        this.emitStream({
          address: message.address,
          value: message.args[0] || 1, // Use first argument as value, default to 1
          args: message.args,
          timestamp: message.timestamp
        });
      }
    }

    // Emit state update
    this.emit('stateUpdate', {
      status: 'listening',
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
   * Get OSC listener parameters for UI display
   */
  public getOscParameters(): {
    port: number;
    host: string;
    addressPattern: string;
    enabled: boolean;
    status: string;
    lastMessage?: OscMessage | undefined;
    messageCount: number;
    mode: string;
  } {
    return {
      port: this.port,
      host: this.host,
      addressPattern: this.addressPattern,
      enabled: this.enabled,
      status: this.udpPort ? 'listening' : 'stopped',
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
    this.lastMessage = undefined as any;
    this.emit('stateUpdate', {
      status: this.udpPort ? 'listening' : 'stopped',
      messageCount: this.messageCount,
      lastMessage: undefined
    });
  }
} 