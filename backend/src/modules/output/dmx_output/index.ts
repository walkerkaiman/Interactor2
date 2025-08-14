import { OutputModuleBase } from '../../OutputModuleBase';
import {
  ModuleConfig,
  DmxOutputConfig,
  DmxFrame,
  DmxOutputData,
  DmxOutputPayload,
  DmxErrorData,
  DmxFileUploadData,
  DmxFileUploadPayload,
  TriggerEvent,
  StreamEvent,
  isDmxOutputConfig
} from '@interactor/shared';
import { InteractorError } from '../../../core/ErrorHandler';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';

export class DmxOutputModule extends OutputModuleBase {
  private universe: number;
  private brightness: number;
  private protocol: DmxOutputConfig['protocol'];
  private enabled: boolean;
  private currentFrame: number = 0;
  private totalFrames: number = 0;
  private isPlaying: boolean = false;
  private frameCount: number = 0;
  private errorCount: number = 0;
  private lastError: DmxErrorData | undefined = undefined;
  private lastUpdate: number = Date.now();
  
  // File upload server
  private uploadServer: express.Application | undefined = undefined;
  private uploadPort: number = 3002;
  private uploadHost: string = 'localhost';
  private enableFileUpload: boolean = false;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private allowedExtensions: string[] = ['.csv'];
  
  // DMX sequence data
  private dmxSequence: DmxFrame[] = [];
  private assetsPath: string;

  constructor(config: DmxOutputConfig) {
    // Apply defaults to config before passing to base class
    const configWithDefaults: DmxOutputConfig = {
      ...config,
      universe: config.universe || 1,
      brightness: config.brightness || 1.0,
      protocol: {
        ...(config.protocol || {}),
        type: (config.protocol && config.protocol.type) ? config.protocol.type : 'artnet',
        host: config.protocol?.host || '127.0.0.1',
        port: config.protocol?.port || 6454,
        serialPort: config.protocol?.serialPort,
        baudRate: config.protocol?.baudRate || 57600
      },
      enabled: config.enabled !== false,
      enableFileUpload: config.enableFileUpload !== false,
      uploadPort: config.uploadPort || 3002,
      uploadHost: config.uploadHost || 'localhost',
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024,
      allowedExtensions: config.allowedExtensions || ['.csv']
    };

    super('dmx_output', configWithDefaults, {
      name: 'DMX Output',
      type: 'output',
      version: '1.0.0',
      description: 'DMX output module with CSV file upload and playback',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          universe: {
            type: 'number',
            description: 'DMX universe number (1-512)',
            minimum: 1,
            maximum: 512,
            default: 1
          },
          brightness: {
            type: 'number',
            description: 'Brightness level (0.0-1.0)',
            minimum: 0.0,
            maximum: 1.0,
            default: 1.0
          },
          protocol: {
            type: 'object',
            description: 'DMX protocol configuration',
            properties: {
              type: {
                type: 'string',
                enum: ['artnet', 'sACN', 'dmx512'],
                description: 'Protocol type',
                default: 'artnet'
              },
              host: {
                type: 'string',
                description: 'Target IP address for network protocols',
                default: '127.0.0.1'
              },
              port: {
                type: 'number',
                description: 'Target port for network protocols',
                minimum: 1024,
                maximum: 65535,
                default: 6454
              },
              serialPort: {
                type: 'string',
                description: 'Serial port for DMX512'
              },
              baudRate: {
                type: 'number',
                description: 'Baud rate for serial communication',
                default: 57600
              }
            },
            // required handled via runtime validation
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the DMX output',
            default: true
          },
          enableFileUpload: {
            type: 'boolean',
            description: 'Enable/disable file upload server',
            default: true
          },
          uploadPort: {
            type: 'number',
            description: 'File upload server port',
            minimum: 1024,
            maximum: 65535,
            default: 3002
          },
          uploadHost: {
            type: 'string',
            description: 'File upload server host',
            default: 'localhost'
          },
          maxFileSize: {
            type: 'number',
            description: 'Maximum file size in bytes',
            default: 10485760
          },
          allowedExtensions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Allowed file extensions',
            default: ['.csv']
          }
        },
        required: ['universe', 'brightness', 'protocol', 'enabled']
      },
      events: [
        {
          name: 'dmxFrame',
          type: 'input',
          description: 'Triggers a DMX frame'
        },
        {
          name: 'dmxSent',
          type: 'output',
          description: 'Emitted when a DMX frame is sent successfully'
        },
        {
          name: 'dmxError',
          type: 'output',
          description: 'Emitted when a DMX frame fails to send'
        },
        {
          name: 'fileUploaded',
          type: 'output',
          description: 'Emitted when a DMX file is uploaded successfully'
        },
        {
          name: 'stateUpdate',
          type: 'output',
          description: 'Emitted when module state changes'
        }
      ]
    });

    // Set private properties from the config with defaults
    this.universe = configWithDefaults.universe;
    this.brightness = configWithDefaults.brightness;
    this.protocol = configWithDefaults.protocol;
    this.enabled = configWithDefaults.enabled;
    this.enableFileUpload = !!configWithDefaults.enableFileUpload;
    this.uploadPort = configWithDefaults.uploadPort ?? 3002;
    this.uploadHost = configWithDefaults.uploadHost ?? 'localhost';
    this.maxFileSize = configWithDefaults.maxFileSize ?? (10 * 1024 * 1024);
    this.allowedExtensions = configWithDefaults.allowedExtensions ?? ['.csv'];
    
    // Set assets path
    this.assetsPath = path.join(__dirname, 'assets');
    
    // Ensure assets directory exists
    if (!fs.existsSync(this.assetsPath)) {
      fs.mkdirSync(this.assetsPath, { recursive: true });
    }
  }

  protected async onInit(): Promise<void> {
    // Validate universe range
    if (this.universe < 1 || this.universe > 512) {
      throw InteractorError.validation(
        `DMX universe must be between 1-512`,
        { provided: this.universe, min: 1, max: 512 },
        ['Try universe 1 for main lighting', 'Use 2-512 for additional fixtures', 'Each universe supports 512 channels']
      );
    }

    // Validate brightness range
    if (this.brightness < 0.0 || this.brightness > 1.0) {
      throw InteractorError.validation(
        `DMX brightness must be between 0.0-1.0`,
        { provided: this.brightness, min: 0.0, max: 1.0 },
        ['Use 1.0 for full brightness', 'Use 0.5 for 50% brightness', 'Use 0.0 to turn off all channels']
      );
    }

    // Validate protocol configuration
    if (!this.protocol.type) {
      throw InteractorError.validation(
        'DMX protocol type is required',
        { provided: this.protocol },
        ['Use "artnet" for Art-Net protocol', 'Use "sACN" for streaming ACN', 'Use "dmx512" for direct serial DMX']
      );
    }

    if (this.protocol.type === 'artnet' || this.protocol.type === 'sACN') {
      if (!this.protocol.host) {
        throw InteractorError.validation(
          `Host address is required for ${this.protocol.type} protocol`,
          { protocol: this.protocol.type, host: this.protocol.host },
          ['Use "127.0.0.1" for local testing', 'Use broadcast address "255.255.255.255" for network', 'Use specific IP like "192.168.1.100" for target device']
        );
      }
      if (!this.protocol.port || this.protocol.port < 1024 || this.protocol.port > 65535) {
        throw InteractorError.validation(
          `${this.protocol.type} port must be between 1024-65535`,
          { provided: this.protocol.port, min: 1024, max: 65535, protocol: this.protocol.type },
          ['Use 6454 for Art-Net (default)', 'Use 5568 for sACN/E1.31', 'Avoid ports below 1024 (system reserved)']
        );
      }
    }

    if (this.protocol.type === 'dmx512') {
      if (!this.protocol.serialPort) {
        throw InteractorError.validation(
          'Serial port is required for DMX512 protocol',
          { protocol: this.protocol.type, serialPort: this.protocol.serialPort },
          ['Use "COM1" on Windows', 'Use "/dev/ttyUSB0" on Linux', 'Check Device Manager for available ports']
        );
      }
    }

    // Validate upload configuration
    if (this.enableFileUpload) {
      if (this.uploadPort < 1024 || this.uploadPort > 65535) {
        throw InteractorError.validation(
          `File upload port must be between 1024-65535`,
          { provided: this.uploadPort, min: 1024, max: 65535 },
          ['Use 3002 (default for DMX module)', 'Avoid ports below 1024 (system reserved)', 'Check that port is not already in use']
        );
      }
    }
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      await this.initDmxConnection();
      if (this.enableFileUpload) {
        await this.initFileUploadServer();
      }
      
      // Load default DMX file if no sequence is loaded
      if (this.dmxSequence.length === 0) {
        await this.loadDefaultDmxFile();
      }
    }
  }

  protected async onStop(): Promise<void> {
    this.stopDmxConnection();
    this.stopFileUploadServer();
    this.isPlaying = false;
  }

  protected async onDestroy(): Promise<void> {
    this.stopDmxConnection();
    this.stopFileUploadServer();
    this.dmxSequence = [];
    this.currentFrame = 0;
    this.totalFrames = 0;
    this.isPlaying = false;
    this.frameCount = 0;
    this.errorCount = 0;
    this.lastError = undefined;
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    if (!isDmxOutputConfig(newConfig)) {
      throw InteractorError.validation(
        'Invalid DMX output configuration provided',
        { providedConfig: newConfig },
        ['Check that all required fields are present: universe, brightness, protocol', 'Ensure protocol object has type, host, and port fields', 'Verify values are within valid ranges']
      );
    }
    
    // Validate universe range
    if (newConfig.universe < 1 || newConfig.universe > 512) {
      throw InteractorError.validation(
        `DMX universe must be between 1-512`,
        { provided: newConfig.universe, min: 1, max: 512 },
        ['Try universe 1 for main lighting', 'Use 2-512 for additional fixtures', 'Each universe supports 512 channels']
      );
    }

    // Validate brightness range
    if (newConfig.brightness < 0.0 || newConfig.brightness > 1.0) {
      throw InteractorError.validation(
        `DMX brightness must be between 0.0-1.0`,
        { provided: newConfig.brightness, min: 0.0, max: 1.0 },
        ['Use 1.0 for full brightness', 'Use 0.5 for 50% brightness', 'Use 0.0 to turn off all channels']
      );
    }

    let needsRestart = false;
    
    if (newConfig.universe !== this.universe) {
      this.universe = newConfig.universe;
      needsRestart = true;
    }
    
    if (newConfig.brightness !== this.brightness) {
      this.brightness = newConfig.brightness;
    }
    
    if (JSON.stringify(newConfig.protocol) !== JSON.stringify(this.protocol)) {
      this.protocol = newConfig.protocol;
      needsRestart = true;
    }
    
    if (newConfig.enabled !== this.enabled) {
      this.enabled = newConfig.enabled;
      if (this.enabled && !this.isConnected) {
        await this.start();
      } else if (!this.enabled && this.isConnected) {
        await this.stop();
      }
    }
    
    if (needsRestart && this.isConnected) {
      this.stopDmxConnection();
      if (this.enabled) {
        await this.initDmxConnection();
      }
    }
  }

  /**
   * Send data with proper typing
   */
  protected async onSend<T = unknown>(data: T): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict('Cannot send DMX data when module is disabled', { enabled: this.enabled, attempted: 'send' });
    }
    
    // Handle different data types
    if (typeof data === 'number') {
      // Single value - treat as frame index
      await this.sendFrameByIndex(data);
    } else if (Array.isArray(data)) {
      // Array of values - treat as DMX channels
      await this.sendDmxChannels(data);
    } else if (typeof data === 'object' && data !== null) {
      // Object - extract relevant data
      const dmxData = data as any;
      if (dmxData.channels && Array.isArray(dmxData.channels)) {
        await this.sendDmxChannels(dmxData.channels);
      } else if (typeof dmxData.frameIndex === 'number') {
        await this.sendFrameByIndex(dmxData.frameIndex);
      } else {
        throw InteractorError.validation('Invalid DMX data format - object must contain channels array or frameIndex', { provided: dmxData, expected: 'object with channels[] or frameIndex' });
      }
    } else {
        throw InteractorError.validation('Invalid DMX data type - must be number, array, or object', { provided: typeof data, data: data });
    }
  }

  protected async handleManualTrigger(): Promise<void> {
    const testChannels = new Array(512).fill(0);
    for (let i = 0; i < 16; i++) testChannels[i] = 255;
    await this.sendDmxChannels(testChannels);
  }

  /**
   * Handle trigger events with proper typing
   */
  protected async handleTriggerEvent(event: TriggerEvent): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict('Cannot handle trigger event when DMX module is disabled', { enabled: this.enabled, attempted: 'trigger_event' });
    }
    
    // In trigger mode, increment frame and send next frame
    if (this.dmxSequence.length > 0) {
      this.currentFrame = (this.currentFrame + 1) % this.dmxSequence.length;
      await this.sendCurrentFrame();
    } else {
      // No sequence loaded, load default file and then send frame
      await this.loadDefaultDmxFile();
      this.currentFrame = (this.currentFrame + 1) % this.dmxSequence.length;
      await this.sendCurrentFrame();
    }
  }

  /**
   * Handle streaming events with proper typing
   */
  protected async handleStreamingEvent(event: StreamEvent): Promise<void> {
    if (!this.enabled) {
      throw InteractorError.conflict('Cannot handle streaming event when DMX module is disabled', { enabled: this.enabled, attempted: 'streaming_event' });
    }
    
    // In streaming mode, use the value as frame index
    if (this.dmxSequence.length > 0) {
      const frameIndex = Math.floor(event.value) % this.dmxSequence.length;
      await this.sendFrameByIndex(frameIndex);
    } else {
      // No sequence loaded, load default file and then send frame
      await this.loadDefaultDmxFile();
      const frameIndex = Math.floor(event.value) % this.dmxSequence.length;
      await this.sendFrameByIndex(frameIndex);
    }
  }

  

  /**
   * Initialize DMX connection
   */
  private async initDmxConnection(): Promise<void> {
    try {
      // For now, we'll simulate DMX connection
      // In a real implementation, you would initialize the actual DMX protocol
      this.logger?.info(`Initializing DMX connection for universe ${this.universe} using ${this.protocol.type}`);
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.setConnectionStatus(true);
      this.emitStatus('ready', { 
        universe: this.universe, 
        protocol: this.protocol.type,
        brightness: this.brightness 
      });
      
      this.logger?.info(`DMX connection ready for universe ${this.universe}`);
    } catch (error) {
      this.logger?.error(`Failed to initialize DMX connection:`, error);
      this.setConnectionStatus(false);
      throw error;
    }
  }

  /**
   * Stop DMX connection
   */
  private stopDmxConnection(): void {
    this.setConnectionStatus(false);
    this.logger?.info(`DMX connection stopped for universe ${this.universe}`);
    this.emitStatus('stopped');
  }

  /**
   * Initialize file upload server
   */
  private async initFileUploadServer(): Promise<void> {
    if (this.uploadServer) {
      return; // Already initialized
    }

    try {
      this.uploadServer = express();
      
      // Configure multer for file uploads
      const storage = multer.memoryStorage();
      const upload = multer({
        storage: storage,
        limits: {
          fileSize: this.maxFileSize
        },
        fileFilter: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          if (this.allowedExtensions.includes(ext)) {
            cb(null, true);
          } else {
            cb(new Error(`File type not allowed. Allowed types: ${this.allowedExtensions.join(', ')}`));
          }
        }
      });

      // File upload endpoint
      this.uploadServer.post('/upload', upload.single('dmxFile'), async (req, res) => {
        try {
          if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
          }

          const fileData: DmxFileUploadData = {
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            buffer: req.file.buffer,
            timestamp: Date.now()
          };

          const result = await this.processUploadedFile(fileData);
          return res.json(result);
        } catch (error) {
          this.logger?.error('File upload error:', error);
          return res.status(500).json({ error: error instanceof Error ? error.message : 'Upload failed' });
        }
      });

      // List files endpoint
      this.uploadServer.get('/files', (req, res) => {
        try {
          const files = this.getAvailableFiles();
          res.json({ files });
        } catch (error) {
          this.logger?.error('File list error:', error);
          res.status(500).json({ error: 'Failed to list files' });
        }
      });

      // Load file endpoint
      this.uploadServer.post('/load/:filename', (req, res) => {
        try {
          const filename = req.params.filename;
          const success = this.loadDmxFile(filename);
          if (success) {
            res.json({ success: true, filename, frameCount: this.totalFrames });
          } else {
            res.status(404).json({ error: 'File not found' });
          }
        } catch (error) {
          this.logger?.error('File load error:', error);
          res.status(500).json({ error: 'Failed to load file' });
        }
      });

      // Start server
      this.uploadServer.listen(this.uploadPort, this.uploadHost, () => {
        this.logger?.info(`DMX file upload server listening on ${this.uploadHost}:${this.uploadPort}`);
      });

    } catch (error) {
      this.logger?.error(`Failed to initialize file upload server:`, error);
      throw error;
    }
  }

  /**
   * Stop file upload server
   */
  private stopFileUploadServer(): void {
    if (this.uploadServer) {
      // Note: In a real implementation, you would properly close the server
      this.uploadServer = undefined;
      this.logger?.info('DMX file upload server stopped');
    }
  }

  /**
   * Process uploaded file
   */
  private async processUploadedFile(fileData: DmxFileUploadData): Promise<DmxFileUploadPayload> {
    const timestamp = Date.now();
    const filename = `${timestamp}_${fileData.originalName}`;
    const filePath = path.join(this.assetsPath, filename);
    
    // Save file
    fs.writeFileSync(filePath, fileData.buffer);
    
    // Parse CSV and create DMX sequence
      const sequence = await this.parseCsvToDmxSequence(fileData.buffer);
    
    // Create payload
    const payload: DmxFileUploadPayload = {
      filename,
      originalName: fileData.originalName,
      size: fileData.size,
      mimetype: fileData.mimetype,
      filePath: `assets/${filename}`,
      frameCount: sequence.length,
      channelCount: sequence.length > 0 ? (sequence[0]?.channels.length || 0) : 0,
      timestamp,
      availableFiles: this.getAvailableFiles()
    };
    
    // Emit upload event
    this.emitOutput<DmxFileUploadPayload>('fileUploaded', payload);
    
    this.logger?.info(`DMX file uploaded: ${filename} (${sequence.length} frames)`);
    
    return payload;
  }

  /**
   * Parse CSV buffer to DMX sequence
   */
  private async parseCsvToDmxSequence(buffer: Buffer): Promise<DmxFrame[]> {
    return new Promise((resolve, reject) => {
      const sequence: DmxFrame[] = [];
      const csvString = buffer.toString('utf-8');
      
      // Simple CSV parsing (you might want to use a more robust parser)
      const lines = csvString.split('\n').filter(line => line.trim());
      
      for (let i = 0; i < lines.length; i++) {
        const line = (lines[i] || '').trim();
        if (!line) continue;
        
        const values = line.split(',').map(val => {
          const num = parseInt(val.trim(), 10);
          return isNaN(num) ? 0 : Math.min(255, Math.max(0, num));
        });
        
        // Pad to 512 channels if needed
        while (values.length < 512) {
          values.push(0);
        }
        
        // Truncate to 512 channels if too long
        if (values.length > 512) {
          values.splice(512);
        }
        
        sequence.push({
          frameNumber: i,
          channels: values,
          timestamp: Date.now()
        });
      }
      
      resolve(sequence);
    });
  }

  /**
   * Load DMX file
   */
  private loadDmxFile(filename: string): boolean {
    try {
      const filePath = path.join(this.assetsPath, filename);
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      const buffer = fs.readFileSync(filePath);
      this.parseCsvToDmxSequence(buffer).then(sequence => {
        this.dmxSequence = sequence;
        this.totalFrames = sequence.length;
        this.currentFrame = 0;
        this.isPlaying = false;
        
        this.logger?.info(`DMX file loaded: ${filename} (${sequence.length} frames)`);
      this.emitStatus('fileLoaded', { filename, frameCount: sequence.length });
      });
      
      return true;
    } catch (error) {
      this.logger?.error(`Failed to load DMX file ${filename}:`, error);
      return false;
    }
  }

  /**
   * Load default DMX file for error handling
   */
  private async loadDefaultDmxFile(): Promise<void> {
    try {
      const defaultFilePath = path.join(this.assetsPath, 'default_dmx.csv');
      if (!fs.existsSync(defaultFilePath)) {
        this.logger?.warn('Default DMX file not found, creating minimal default sequence');
        // Create a minimal default sequence if file doesn't exist
        this.dmxSequence = [{
          frameNumber: 0,
          channels: new Array(512).fill(0),
          timestamp: Date.now()
        }];
        this.totalFrames = 1;
        this.currentFrame = 0;
        this.isPlaying = false;
        return;
      }
      
      const buffer = fs.readFileSync(defaultFilePath);
      const sequence = await this.parseCsvToDmxSequence(buffer);
      this.dmxSequence = sequence;
      this.totalFrames = sequence.length;
      this.currentFrame = 0;
      this.isPlaying = false;
      
      this.logger?.info(`Default DMX file loaded: default_dmx.csv (${sequence.length} frames)`);
      this.emitStatus('fileLoaded', { filename: 'default_dmx.csv', frameCount: sequence.length });
    } catch (error) {
      this.logger?.error('Failed to load default DMX file:', error);
      // Create a minimal default sequence as fallback
      this.dmxSequence = [{
        frameNumber: 0,
        channels: new Array(512).fill(0),
        timestamp: Date.now()
      }];
      this.totalFrames = 1;
      this.currentFrame = 0;
      this.isPlaying = false;
    }
  }

  /**
   * Get available files
   */
  private getAvailableFiles(): string[] {
    try {
      if (!fs.existsSync(this.assetsPath)) {
        return [];
      }
      
      return fs.readdirSync(this.assetsPath)
        .filter(file => this.allowedExtensions.includes(path.extname(file).toLowerCase()))
        .sort();
    } catch (error) {
      this.logger?.error('Failed to get available files:', error);
      return [];
    }
  }

  /**
   * Send frame by index
   */
  private async sendFrameByIndex(frameIndex: number): Promise<void> {
    if (this.dmxSequence.length === 0) {
      // Load default file if no sequence is available
      await this.loadDefaultDmxFile();
    }
    
    const normalizedIndex = ((frameIndex % this.dmxSequence.length) + this.dmxSequence.length) % this.dmxSequence.length;
    const frame = this.dmxSequence[normalizedIndex];
    if (!frame) return;
    await this.sendDmxChannels(frame.channels);
    this.currentFrame = normalizedIndex;
  }

  /**
   * Send current frame
   */
  private async sendCurrentFrame(): Promise<void> {
    if (this.dmxSequence.length === 0) {
      // Load default file if no sequence is available
      await this.loadDefaultDmxFile();
    }
    
    const frame = this.dmxSequence[this.currentFrame];
    if (!frame) return;
    await this.sendDmxChannels(frame.channels);
  }

  /**
   * Send DMX channels
   */
  private async sendDmxChannels(channels: number[]): Promise<void> {
    if (!this.isConnected) {
      throw InteractorError.internal('DMX connection is not ready - cannot send channels', new Error('Connection not established'));
    }
    
    // Apply brightness multiplier
    const adjustedChannels = channels.map(channel => 
      Math.min(255, Math.max(0, Math.floor(channel * this.brightness)))
    );
    
    // Pad to 512 channels if needed
    while (adjustedChannels.length < 512) {
      adjustedChannels.push(0);
    }
    
    // Truncate to 512 channels if too long
    if (adjustedChannels.length > 512) {
      adjustedChannels.splice(512);
    }
    
    const timestamp = Date.now();
    
    try {
      // In a real implementation, you would send the DMX data here
      // For now, we'll simulate the sending
      this.logger?.debug(`Sending DMX data to universe ${this.universe}:`, adjustedChannels.slice(0, 16));
      
      // Simulate sending delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Create output data
      const outputData: DmxOutputData = {
        universe: this.universe,
        channels: adjustedChannels,
        brightness: this.brightness,
        timestamp
      };
      
      this.lastSentValue = outputData;
      
      // Success response
      const responsePayload: DmxOutputPayload = {
        universe: this.universe,
        channels: adjustedChannels,
        brightness: this.brightness,
        frameNumber: this.currentFrame,
        totalFrames: this.totalFrames,
        timestamp,
        frameCount: this.frameCount + 1
      };
      
      this.frameCount++;
      this.emitOutput<DmxOutputPayload>('dmxSent', responsePayload);
      this.emitStatus('success', { 
        universe: this.universe, 
        frameNumber: this.currentFrame,
        channelCount: adjustedChannels.length 
      });
      
      this.logger?.info(`DMX frame sent successfully to universe ${this.universe}`);
      
    } catch (error) {
      this.errorCount++;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData: DmxErrorData = {
        universe: this.universe,
        error: errorMessage,
        context: 'dmx_send',
        timestamp
      };
      
      this.lastError = errorData;
      
      this.emitError(error instanceof Error ? error : new Error(errorMessage), 'dmx_send');
      this.emitOutput<DmxErrorData>('dmxError', errorData);
      
      this.logger?.error(`DMX send error:`, error);
      
      throw error;
    }
    
    // Update last update timestamp
    this.lastUpdate = timestamp;
    
    // Emit state update
    this.emit('stateUpdate', {
      status: this.isConnected ? 'ready' : 'stopped',
      universe: this.universe,
      brightness: this.brightness,
      currentFrame: this.currentFrame,
      totalFrames: this.totalFrames,
      isPlaying: this.isPlaying,
      frameCount: this.frameCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      lastUpdate: this.lastUpdate
    });
  }

  /**
   * Get configuration with proper return type
   */
  public getConfig(): DmxOutputConfig {
    return {
      universe: this.universe,
      brightness: this.brightness,
      protocol: this.protocol,
      enabled: this.enabled,
      enableFileUpload: this.enableFileUpload,
      uploadPort: this.uploadPort,
      uploadHost: this.uploadHost,
      maxFileSize: this.maxFileSize,
      allowedExtensions: this.allowedExtensions
    };
  }

  /**
   * Get module state with proper return type
   */
  public getState(): ModuleConfig extends any ? any : any {
    // Conform to shared ModuleState: include messageCount
    return {
      id: this.id,
      status: this.isConnected ? 'running' : 'stopped',
      messageCount: this.frameCount,
      config: this.config
    } as any;
  }

  /**
   * Get detailed state for testing purposes
   */
  public getDetailedState(): {
    universe: number;
    brightness: number;
    protocol: DmxOutputConfig['protocol'];
    enabled: boolean;
    isConnected: boolean;
    currentFrame: number;
    totalFrames: number;
    isPlaying: boolean;
    frameCount: number;
    errorCount: number;
    lastError: DmxErrorData | undefined;
    lastUpdate: number;
    status: string;
  } {
    return {
      universe: this.universe,
      brightness: this.brightness,
      protocol: this.protocol,
      enabled: this.enabled,
      isConnected: this.isConnected,
      currentFrame: this.currentFrame,
      totalFrames: this.totalFrames,
      isPlaying: this.isPlaying,
      frameCount: this.frameCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      lastUpdate: this.lastUpdate,
      status: this.isConnected ? 'ready' : 'stopped'
    };
  }

  /**
   * Reset counters
   */
  public reset(): void {
    this.frameCount = 0;
    this.errorCount = 0;
    this.lastError = undefined;
    this.currentFrame = 0;
    this.isPlaying = false;
    this.emit('stateUpdate', {
      status: this.isConnected ? 'ready' : 'stopped',
      frameCount: this.frameCount,
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
      const testChannels = new Array(512).fill(0);
      testChannels[0] = 255; // Set first channel to full
      await this.sendDmxChannels(testChannels);
      return true;
    } catch (error) {
      this.logger?.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Load DMX file by name
   */
  public async loadFile(filename: string): Promise<boolean> {
    return this.loadDmxFile(filename);
  }

  /**
   * Get available files
   */
  public getFiles(): string[] {
    return this.getAvailableFiles();
  }

  /**
   * Set brightness level
   */
  public setBrightness(brightness: number): void {
    if (brightness < 0.0 || brightness > 1.0) {
      throw InteractorError.validation(`DMX brightness must be between 0.0-1.0`, { provided: brightness, min: 0.0, max: 1.0 });
    }
    this.brightness = brightness;
    this.emitStatus('brightnessChanged', { brightness });
  }

  /**
   * Get current brightness
   */
  public getBrightness(): number {
    return this.brightness;
  }

  /**
   * Set current frame
   */
  public setCurrentFrame(frame: number): void {
    if (this.dmxSequence.length === 0) {
      throw InteractorError.conflict('No DMX sequence loaded - cannot set frame', { sequenceLength: this.dmxSequence.length, requestedFrame: frame });
    }
    this.currentFrame = ((frame % this.dmxSequence.length) + this.dmxSequence.length) % this.dmxSequence.length;
    this.emitStatus('frameChanged', { currentFrame: this.currentFrame });
  }

  /**
   * Get current frame
   */
  public getCurrentFrame(): number {
    return this.currentFrame;
  }

  /**
   * Get total frames
   */
  public getTotalFrames(): number {
    return this.totalFrames;
  }

  /**
   * Get DMX sequence
   */
  public getDmxSequence(): DmxFrame[] {
    return [...this.dmxSequence];
  }
} 