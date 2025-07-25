import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig } from '@interactor/shared';
import { SerialPort } from 'serialport';

interface SerialInputConfig extends ModuleConfig {
  port: string;
  baudRate: number;
  logicOperator: '>' | '<' | '=';
  threshold: number;
  enabled: boolean;
}

interface SerialData {
  value: number;
  rawData: string;
  timestamp: number;
}

export class SerialInputModule extends InputModuleBase {
  private serialPort?: SerialPort;
  private port: string;
  private baudRate: number;
  private logicOperator: '>' | '<' | '=';
  private threshold: number;
  private enabled: boolean;
  private lastSerialValue: number = 0;
  private dataCount: number = 0;
  private lastSerialData?: SerialData;
  private lastTriggered: boolean = false;

  constructor(config: SerialInputConfig) {
    super('serial_input', config, {
      name: 'Serial Input',
      type: 'input',
      version: '1.0.0',
      description: 'Monitors serial data from hardware sensors with threshold triggering',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          port: {
            type: 'string',
            description: 'Serial port to monitor (e.g., COM1, /dev/ttyUSB0)',
            default: 'COM1'
          },
          baudRate: {
            type: 'number',
            description: 'Baud rate for serial communication',
            minimum: 9600,
            maximum: 115200,
            default: 9600
          },
          logicOperator: {
            type: 'string',
            description: 'Logic operator for threshold comparison',
            enum: ['>', '<', '='],
            default: '>'
          },
          threshold: {
            type: 'number',
            description: 'Threshold value for trigger mode',
            default: 100
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the serial listener',
            default: true
          }
        },
        required: ['port', 'baudRate', 'logicOperator', 'threshold']
      },
      events: [
        {
          name: 'serialData',
          type: 'output',
          description: 'Emitted when serial data is received'
        },
        {
          name: 'thresholdTrigger',
          type: 'output',
          description: 'Emitted when value crosses threshold (trigger mode)'
        },
        {
          name: 'stateUpdate',
          type: 'output',
          description: 'Emitted when module state changes'
        }
      ]
    });

    this.port = config.port || 'COM1';
    this.baudRate = config.baudRate || 9600;
    this.logicOperator = config.logicOperator || '>';
    this.threshold = config.threshold || 100;
    this.enabled = config.enabled !== false;
  }

  protected async onInit(): Promise<void> {
    if (this.logger) {
      this.logger.info(`Initializing Serial Input Module for port ${this.port} at ${this.baudRate} baud`);
    }
    
    // Validate baud rate
    if (this.baudRate < 9600 || this.baudRate > 115200) {
      throw new Error(`Invalid baud rate: ${this.baudRate}. Must be between 9600 and 115200.`);
    }

    // Validate logic operator
    const validOperators = ['>', '<', '='];
    if (!validOperators.includes(this.logicOperator)) {
      throw new Error(`Invalid logic operator: ${this.logicOperator}. Must be one of: ${validOperators.join(', ')}`);
    }
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      await this.initSerialListener();
    }
  }

  protected async onStop(): Promise<void> {
    await this.stopSerialListener();
  }

  protected async onDestroy(): Promise<void> {
    await this.stopSerialListener();
  }

  protected async onConfigUpdate(oldConfig: SerialInputConfig, newConfig: SerialInputConfig): Promise<void> {
    const oldPort = this.port;
    const oldBaudRate = this.baudRate;
    const oldEnabled = this.enabled;

    this.port = newConfig.port || 'COM1';
    this.baudRate = newConfig.baudRate || 9600;
    this.logicOperator = newConfig.logicOperator || '>';
    this.threshold = newConfig.threshold || 100;
    this.enabled = newConfig.enabled !== false;

    // Restart listener if port, baud rate, or enabled state changed
    if (oldPort !== this.port || oldBaudRate !== this.baudRate || oldEnabled !== this.enabled) {
      await this.stopSerialListener();
      if (this.enabled) {
        await this.initSerialListener();
      }
    }
  }

  protected async onStartListening(): Promise<void> {
    if (!this.serialPort && this.enabled) {
      await this.initSerialListener();
    }
  }

  protected async onStopListening(): Promise<void> {
    await this.stopSerialListener();
  }

  /**
   * Initialize serial port listener
   */
  private async initSerialListener(): Promise<void> {
    try {
      this.serialPort = new SerialPort({
        path: this.port,
        baudRate: this.baudRate,
        autoOpen: false
      });

      this.serialPort.on('data', (data) => {
        this.handleSerialData(data);
      });

      this.serialPort.on('error', (error) => {
        if (this.logger) {
          this.logger.error(`Serial port error: ${error.message}`);
        }
      });

      this.serialPort.on('open', () => {
        if (this.logger) {
          this.logger.info(`Serial port ${this.port} opened at ${this.baudRate} baud`);
        }
      });

      this.serialPort.on('close', () => {
        if (this.logger) {
          this.logger.info(`Serial port ${this.port} closed`);
        }
      });

      await this.serialPort.open();
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to initialize serial listener: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Stop serial port listener
   */
  private async stopSerialListener(): Promise<void> {
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.close();
      this.serialPort = undefined as any;
      if (this.logger) {
        this.logger.info(`Serial listener stopped for port ${this.port}`);
      }
    }
  }

  /**
   * Handle incoming serial data
   */
  private handleSerialData(data: Buffer): void {
    try {
      const rawData = data.toString().trim();
      
      // Try to parse as number
      const value = parseFloat(rawData);
      
      if (isNaN(value)) {
        if (this.logger) {
          this.logger.warn(`Received non-numeric serial data: ${rawData}`);
        }
        return;
      }

      const serialData: SerialData = {
        value,
        rawData,
        timestamp: Date.now()
      };

      this.lastSerialData = serialData;
      this.dataCount++;

      // Emit serial data event
      this.emit('serialData', serialData);

      // Check threshold trigger
      const shouldTrigger = this.checkTrigger(value);
      
      if (shouldTrigger && !this.lastTriggered) {
        this.lastTriggered = true;

        if (this.mode === 'trigger') {
          // Trigger mode: emit trigger event
          this.emitTrigger('thresholdTrigger', {
            value,
            rawData,
            threshold: this.threshold,
            operator: this.logicOperator,
            timestamp: serialData.timestamp,
            dataCount: this.dataCount
          });
        } else {
          // Streaming mode: emit stream with value
          this.emitStream({
            value,
            rawData,
            threshold: this.threshold,
            operator: this.logicOperator,
            timestamp: serialData.timestamp
          });
        }
      } else if (!shouldTrigger) {
        this.lastTriggered = false;
      }

      this.lastSerialValue = value;

      // Emit state update
      this.emit('stateUpdate', {
        status: this.serialPort?.isOpen ? 'listening' : 'stopped',
        port: this.port,
        baudRate: this.baudRate,
        currentValue: value,
        threshold: this.threshold,
        operator: this.logicOperator,
        dataCount: this.dataCount,
        mode: this.mode,
        lastUpdate: serialData.timestamp
      });

    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error processing serial data: ${error}`);
      }
    }
  }

  /**
   * Check if value meets trigger condition
   */
  private checkTrigger(value: number): boolean {
    switch (this.logicOperator) {
      case '>':
        return value > this.threshold;
      case '<':
        return value < this.threshold;
      case '=':
        return value === this.threshold;
      default:
        return false;
    }
  }

  /**
   * Get current serial parameters
   */
  public getSerialParameters() {
    return {
      port: this.port,
      baudRate: this.baudRate,
      logicOperator: this.logicOperator,
      threshold: this.threshold,
      enabled: this.enabled,
      status: this.serialPort?.isOpen ? 'listening' : 'stopped',
      currentValue: this.lastSerialValue,
      dataCount: this.dataCount,
      mode: this.mode,
      lastSerialData: this.lastSerialData
    };
  }

  /**
   * Reset data counter and last serial data
   */
  public reset(): void {
    this.dataCount = 0;
    this.lastSerialValue = 0;
    this.lastSerialData = undefined as any;
    this.lastTriggered = false;
    if (this.logger) {
      this.logger.info('Serial data counter and data reset');
    }
  }

  /**
   * Get available serial ports
   */
  public static async getAvailablePorts(): Promise<string[]> {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => port.path);
    } catch (error) {
      console.error('Error listing serial ports:', error);
      return [];
    }
  }

  /**
   * Handle incoming serial data
   */
  protected handleInput(data: any): void {
    // This method is called by the base class when data is received
    // The actual processing is done in handleSerialData
    this.logger?.debug('handleInput called with data:', data);
  }

  /**
   * Get current state for UI display
   */
  public getState() {
    return {
      id: this.id,
      moduleName: this.name,
      port: this.port,
      baudRate: this.baudRate,
      logicOperator: this.logicOperator,
      threshold: this.threshold,
      enabled: this.enabled,
      status: this.state.status,
      currentValue: this.lastSerialValue,
      dataCount: this.dataCount,
      mode: this.getMode(),
      lastSerialData: this.lastSerialData,
      messageCount: this.state.messageCount,
      config: this.config
    };
  }
} 