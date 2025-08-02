import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig, FramesInputConfig, FrameData, FrameTriggerPayload, FrameStreamPayload } from '@interactor/shared';
import { InteractorError } from '../../../core/ErrorHandler';
import * as sacn from 'sacn';

export class FramesInputModule extends InputModuleBase {
  private receiver?: sacn.Receiver;
  private universe: number;
  private enabled: boolean;
  private lastFrameNumber: number = 0;
  private frameCount: number = 0;
  private lastFrameData?: FrameData;
  // StateManager removed - modules should not directly access core services

  constructor(config: FramesInputConfig) {
    super('frames_input', config, {
      name: 'Frames Input',
      type: 'input',
      version: '1.0.0',
      description: 'Monitors sACN frame numbers on Universe 999 using channels 1 and 2 as MSB/LSB',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          universe: {
            type: 'number',
            description: 'sACN universe to monitor for frame data',
            minimum: 1,
            maximum: 63999,
            default: 999
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the sACN listener',
            default: true
          }
        },
        required: ['universe']
      },
      events: [
        {
          name: 'frameChange',
          type: 'output',
          description: 'Emitted when frame number changes (trigger mode)'
        },
        {
          name: 'frameData',
          type: 'output',
          description: 'Emitted when frame data is received'
        },
        {
          name: 'stateUpdate',
          type: 'output',
          description: 'Emitted when module state changes'
        }
      ]
    });

    this.universe = config.universe ?? 999;
    this.enabled = config.enabled !== false;
    // StateManager access removed - using proper event emission instead
  }

  protected async onInit(): Promise<void> {
    if (this.logger) {
      this.logger.info(`Initializing Frames Input Module for universe ${this.universe}`);
    }
    
    if (this.universe < 1 || this.universe > 63999) {
      throw InteractorError.validation(
        `sACN universe must be between 1-63999`,
        { provided: this.universe, min: 1, max: 63999 },
        ['Try 999 for standard frame monitoring', 'Use 1-512 for lighting universes', 'Maximum is 63999 per sACN specification']
      );
    }
  }

  protected async onStart(): Promise<void> {
    if (this.logger) {
      this.logger.info(`Frames Input module onStart() called, enabled: ${this.enabled}`);
    }
    
    if (this.enabled) {
      if (this.logger) {
        this.logger.info(`Starting sACN listener for Frames Input module`);
      }
      await this.initSacnListener();
    } else {
      if (this.logger) {
        this.logger.info(`Frames Input module is disabled, skipping sACN listener`);
      }
    }
  }

  protected async onStop(): Promise<void> {
    await this.stopSacnListener();
  }

  protected async onDestroy(): Promise<void> {
    await this.stopSacnListener();
  }

  protected async onConfigUpdate(oldConfig: FramesInputConfig, newConfig: FramesInputConfig): Promise<void> {
    const oldUniverse = this.universe;
    const oldEnabled = this.enabled;

    this.universe = newConfig.universe || 999;
    this.enabled = newConfig.enabled !== false;

    // Restart listener if universe changed or enabled state changed
    if (oldUniverse !== this.universe || oldEnabled !== this.enabled) {
      await this.stopSacnListener();
      if (this.enabled) {
        await this.initSacnListener();
      }
    }
  }

  protected async onStartListening(): Promise<void> {
    if (!this.receiver && this.enabled) {
      await this.initSacnListener();
    }
  }

  protected async onStopListening(): Promise<void> {
    await this.stopSacnListener();
  }

  /**
   * Initialize sACN receiver for the specified universe
   */
  private async initSacnListener(): Promise<void> {
    try {
      if (this.logger) {
        this.logger.info(`Initializing sACN receiver for universe ${this.universe} on port 5568`);
      }

      // Create sACN receiver - use standard sACN port (5568)
      this.receiver = new sacn.Receiver({
        universes: [this.universe],
        port: 5568  // Explicitly specify port 5568
      });

      if (this.logger) {
        this.logger.info(`sACN receiver created successfully`);
      }

      this.receiver.on('packet', async (packet) => {
        if (this.logger) {
          this.logger.info(`sACN packet event triggered for universe ${packet.universe}`);
        }
        await this.handleSacnPacket(packet);
      });

      this.receiver.on('error', (error) => {
        if (this.logger) {
          this.logger.error(`sACN receiver error: ${error.message}`);
        }
      });

      if (this.logger) {
        this.logger.info(`sACN listener started for universe ${this.universe}`);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to initialize sACN listener: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Stop sACN receiver
   */
  private async stopSacnListener(): Promise<void> {
    if (this.receiver) {
      this.receiver.close();
      this.receiver = undefined as any;
      if (this.logger) {
        this.logger.info(`sACN listener stopped for universe ${this.universe}`);
      }
    }
  }

  /**
   * Handle incoming sACN packet
   */
  private async handleSacnPacket(packet: any): Promise<void> {
    try {
      if (this.logger) {
        this.logger.info(`Received sACN packet for universe ${packet.universe}`);
        this.logger.info(`Packet keys: ${Object.keys(packet).join(', ')}`);
      }

      // Extract DMX data from the packet
      // The Frame Conductor sends frame numbers in channels 1 and 2 (0-indexed)
      const dmxData = packet.slotsData || packet.dmxData || [];
      
      if (this.logger) {
        this.logger.info(`DMX data length: ${dmxData.length}`);
        this.logger.info(`DMX data first 10 values: ${dmxData.slice(0, 10).join(', ')}`);
      }

      // Extract channels 1 and 2 (MSB and LSB) - same as Frame Conductor encoding
      const msb = dmxData[0] || 0; // Channel 1 (MSB) - Most significant byte
      const lsb = dmxData[1] || 0; // Channel 2 (LSB) - Least significant byte

      // Combine MSB and LSB to form frame number - same as Frame Conductor decoding
      const frameNumber = (msb << 8) | lsb;

      if (this.logger) {
        this.logger.info(`Extracted frame data - MSB: ${msb}, LSB: ${lsb}, Frame: ${frameNumber}`);
      }

      const frameData: FrameData = {
        frameNumber,
        msb,
        lsb,
        timestamp: Date.now()
      };

      this.lastFrameData = frameData;
      this.frameCount++;

      // Emit frame data event
      this.emit('frameData', frameData);

      // Check if frame number changed
      if (frameNumber !== this.lastFrameNumber) {
        this.lastFrameNumber = frameNumber;

        if (this.mode === 'trigger') {
          // Trigger mode: emit trigger event on frame change
          this.emitTrigger('frameChange', {
            frameNumber,
            msb,
            lsb,
            timestamp: frameData.timestamp,
            frameCount: this.frameCount
          });
        } else {
          // Streaming mode: emit stream with frame number
          this.emitStream({
            frameNumber,
            msb,
            lsb,
            timestamp: frameData.timestamp
          });
        }
      }

      // Emit state update locally
      const stateUpdate = {
        id: this.id,
        moduleName: this.name,
        status: 'listening',
        universe: this.universe,
        currentFrame: frameNumber,
        msb,
        lsb,
        frameCount: this.frameCount,
        mode: this.mode,
        lastUpdate: frameData.timestamp
      };

      // State management is handled by the core system via event emission
      this.logger?.debug(`Frames Input ${this.id}: Emitting state update`, stateUpdate);

      // Emit stateUpdate event for the frontend
      this.emit('stateUpdate', stateUpdate);

    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error processing sACN packet: ${error}`);
      }
    }
  }

  /**
   * Get current frame parameters
   */
  public getFrameParameters() {
    return {
      universe: this.universe,
      enabled: this.enabled,
      status: this.receiver ? 'listening' : 'stopped',
      currentFrame: this.lastFrameNumber,
      frameCount: this.frameCount,
      mode: this.mode,
      lastFrameData: this.lastFrameData
    };
  }

  /**
   * Reset frame counter and last frame data
   */
  public reset(): void {
    this.frameCount = 0;
    this.lastFrameNumber = 0;
    this.lastFrameData = undefined as any;
    if (this.logger) {
      this.logger.info('Frame counter and data reset');
    }
  }

  /**
   * Handle incoming frame data
   */
  protected handleInput(data: any): void {
    // This method is called by the base class when data is received
    // The actual processing is done in handleSacnPacket
    this.logger?.debug('handleInput called with data:', data);
  }

  /**
   * Get current state for UI display
   */
  public getState() {
    return {
      id: this.id,
      moduleName: this.name,
      universe: this.universe,
      enabled: this.enabled,
      status: this.state.status,
      currentFrame: this.lastFrameNumber,
      frameCount: this.frameCount,
      mode: this.getMode(),
      lastFrameData: this.lastFrameData,
      messageCount: this.state.messageCount,
      config: this.config
    };
  }
} 