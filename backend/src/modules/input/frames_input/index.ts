import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig, FramesInputConfig, FrameData, FrameTriggerPayload, FrameStreamPayload } from '@interactor/shared';
import * as sacn from 'sacn';

export class FramesInputModule extends InputModuleBase {
  private receiver?: sacn.Receiver;
  private universe: number;
  private enabled: boolean;
  private lastFrameNumber: number = 0;
  private frameCount: number = 0;
  private lastFrameData?: FrameData;

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
  }

  protected async onInit(): Promise<void> {
    if (this.logger) {
      this.logger.info(`Initializing Frames Input Module for universe ${this.universe}`);
    }
    
    if (this.universe < 1 || this.universe > 63999) {
      throw new Error(`Invalid universe number: ${this.universe}. Must be between 1 and 63999.`);
    }
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      await this.initSacnListener();
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
      this.receiver = new sacn.Receiver({
        universes: [this.universe],
        port: 5568
      });

      this.receiver.on('packet', (packet) => {
        this.handleSacnPacket(packet);
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
  private handleSacnPacket(packet: any): void {
    try {
      // Extract channels 1 and 2 (MSB and LSB)
      const msb = packet.slotsData[0] || 0; // Channel 1 (MSB)
      const lsb = packet.slotsData[1] || 0; // Channel 2 (LSB)

      // Combine MSB and LSB to form frame number
      const frameNumber = (msb << 8) | lsb;

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
      this.emit('stateUpdate', {
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
      });

      // Also emit to process for backend notification
      process.emit('stateUpdate', {
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
      });

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