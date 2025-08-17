import { ModuleManifest } from '@interactor/shared';

/**
 * Unified configuration schema that includes all possible properties from all modules
 * This ensures consistent state structure across all modules
 */
export interface UnifiedModuleConfig {
  // Common properties (all modules)
  enabled: boolean;
  lastUpdate: number;
  
  // Time Input specific
  mode?: 'clock' | 'metronome';
  targetTime?: string;
  millisecondDelay?: number;
  apiEnabled?: boolean;
  apiEndpoint?: string;
  
  // Audio Output specific
  deviceId?: string;
  sampleRate?: number;
  channels?: number;
  format?: string;
  volume?: number;
  bufferSize?: number;
  loop?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  enableFileUpload?: boolean;
  uploadPort?: number;
  uploadHost?: string;
  maxFileSize?: number;
  allowedExtensions?: string[];
  
  // DMX Output specific
  universe?: number;
  brightness?: number;
  protocol?: {
    type: string;
    host?: string;
    port?: number;
    serialPort?: string;
    baudRate?: number;
  };
  
  // OSC Input specific
  port?: number;
  address?: string;
  addressPattern?: string;
  
  // OSC Output specific
  targetHost?: string;
  targetPort?: number;
  
  // HTTP Input specific
  httpPort?: number;
  httpPath?: string;
  threshold?: number;
  logicOperator?: string;
  
  // HTTP Output specific
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  
  // Serial Input specific
  serialPort?: string;
  baudRate?: number;
  
  // Frames Input specific
  sACNUniverse?: number;
  frameMode?: string;
}

/**
 * Configuration normalizer that ensures all modules have consistent configuration structure
 */
export class ConfigNormalizer {
  private static instance: ConfigNormalizer;
  
  public static getInstance(): ConfigNormalizer {
    if (!ConfigNormalizer.instance) {
      ConfigNormalizer.instance = new ConfigNormalizer();
    }
    return ConfigNormalizer.instance;
  }
  
  /**
   * Get default configuration for all modules
   */
  public getDefaultConfig(): UnifiedModuleConfig {
    return {
      // Common defaults
      enabled: true,
      lastUpdate: Date.now(),
      
      // Time Input defaults
      mode: 'clock',
      targetTime: '12:00 PM',
      millisecondDelay: 1000,
      apiEnabled: false,
      apiEndpoint: '',
      
      // Audio Output defaults
      deviceId: 'default',
      sampleRate: 44100,
      channels: 2,
      format: 'wav',
      volume: 1.0,
      bufferSize: 4096,
      loop: false,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      enableFileUpload: true,
      uploadPort: 4000,
      uploadHost: '0.0.0.0',
      maxFileSize: 52428800,
      allowedExtensions: ['.wav', '.mp3', '.ogg', '.m4a', '.flac'],
      
      // DMX Output defaults
      universe: 1,
      brightness: 1.0,
      protocol: {
        type: 'artnet',
        host: '127.0.0.1',
        port: 6454,
        baudRate: 57600
      },
      
      // OSC Input defaults
      port: 8000,
      address: '/osc',
      addressPattern: '/osc/*',
      
      // OSC Output defaults
      targetHost: '127.0.0.1',
      targetPort: 8000,
      
      // HTTP Input defaults
      httpPort: 3003,
      httpPath: '/trigger',
      threshold: 0.5,
      logicOperator: '>',
      
      // HTTP Output defaults
      url: 'http://localhost:3004',
      method: 'POST',
      headers: {},
      
      // Serial Input defaults
      serialPort: 'COM1',
      baudRate: 9600,
      
      // Frames Input defaults
      sACNUniverse: 1,
      frameMode: 'trigger'
    };
  }
  
  /**
   * Normalize a module's configuration to the unified structure
   */
  public normalizeConfig(moduleName: string, config: any = {}): UnifiedModuleConfig {
    const defaultConfig = this.getDefaultConfig();
    const normalized: UnifiedModuleConfig = { ...defaultConfig };
    
    // Apply module-specific normalization
    switch (moduleName) {
      case 'Time Input':
        normalized.mode = config.mode || defaultConfig.mode;
        normalized.targetTime = config.targetTime || defaultConfig.targetTime;
        normalized.millisecondDelay = config.millisecondDelay || defaultConfig.millisecondDelay;
        normalized.apiEnabled = config.apiEnabled ?? defaultConfig.apiEnabled;
        normalized.apiEndpoint = config.apiEndpoint || defaultConfig.apiEndpoint;
        normalized.enabled = config.enabled ?? defaultConfig.enabled;
        break;
        
      case 'Audio Output':
        normalized.deviceId = config.deviceId || defaultConfig.deviceId;
        normalized.sampleRate = config.sampleRate || defaultConfig.sampleRate;
        normalized.channels = config.channels || defaultConfig.channels;
        normalized.format = config.format || defaultConfig.format;
        normalized.volume = config.volume ?? defaultConfig.volume;
        normalized.bufferSize = config.bufferSize || defaultConfig.bufferSize;
        normalized.loop = config.loop ?? defaultConfig.loop;
        normalized.fadeInDuration = config.fadeInDuration ?? defaultConfig.fadeInDuration;
        normalized.fadeOutDuration = config.fadeOutDuration ?? defaultConfig.fadeOutDuration;
        normalized.enableFileUpload = config.enableFileUpload ?? defaultConfig.enableFileUpload;
        normalized.uploadPort = config.uploadPort || defaultConfig.uploadPort;
        normalized.uploadHost = config.uploadHost || defaultConfig.uploadHost;
        normalized.maxFileSize = config.maxFileSize || defaultConfig.maxFileSize;
        normalized.allowedExtensions = config.allowedExtensions || defaultConfig.allowedExtensions;
        normalized.enabled = config.enabled ?? defaultConfig.enabled;
        break;
        
      case 'DMX Output':
        normalized.universe = config.universe || defaultConfig.universe;
        normalized.brightness = config.brightness ?? defaultConfig.brightness;
        normalized.protocol = config.protocol || defaultConfig.protocol;
        normalized.enableFileUpload = config.enableFileUpload ?? defaultConfig.enableFileUpload;
        normalized.uploadPort = config.uploadPort || defaultConfig.uploadPort;
        normalized.uploadHost = config.uploadHost || defaultConfig.uploadHost;
        normalized.maxFileSize = config.maxFileSize || defaultConfig.maxFileSize;
        normalized.allowedExtensions = config.allowedExtensions || defaultConfig.allowedExtensions;
        normalized.enabled = config.enabled ?? defaultConfig.enabled;
        break;
        
      case 'OSC Input':
        normalized.port = config.port || defaultConfig.port;
        normalized.address = config.address || defaultConfig.address;
        normalized.addressPattern = config.addressPattern || defaultConfig.addressPattern;
        normalized.enabled = config.enabled ?? defaultConfig.enabled;
        break;
        
      case 'OSC Output':
        normalized.targetHost = config.targetHost || defaultConfig.targetHost;
        normalized.targetPort = config.targetPort || defaultConfig.targetPort;
        normalized.enabled = config.enabled ?? defaultConfig.enabled;
        break;
        
      case 'HTTP Input':
        normalized.httpPort = config.httpPort || defaultConfig.httpPort;
        normalized.httpPath = config.httpPath || defaultConfig.httpPath;
        normalized.threshold = config.threshold ?? defaultConfig.threshold;
        normalized.logicOperator = config.logicOperator || defaultConfig.logicOperator;
        normalized.enabled = config.enabled ?? defaultConfig.enabled;
        break;
        
      case 'HTTP Output':
        normalized.url = config.url || defaultConfig.url;
        normalized.method = config.method || defaultConfig.method;
        normalized.headers = config.headers || defaultConfig.headers;
        normalized.enabled = config.enabled ?? defaultConfig.enabled;
        break;
        
      case 'Serial Input':
        normalized.serialPort = config.serialPort || defaultConfig.serialPort;
        normalized.baudRate = config.baudRate || defaultConfig.baudRate;
        normalized.enabled = config.enabled ?? defaultConfig.enabled;
        break;
        
      case 'Frames Input':
        normalized.sACNUniverse = config.sACNUniverse || defaultConfig.sACNUniverse;
        normalized.frameMode = config.frameMode || defaultConfig.frameMode;
        normalized.enabled = config.enabled ?? defaultConfig.enabled;
        break;
        
      default:
        // For unknown modules, just apply the config as-is
        Object.assign(normalized, config);
        break;
    }
    
    // Always update the timestamp
    normalized.lastUpdate = Date.now();
    
    return normalized;
  }
  
  /**
   * Extract module-specific configuration from unified config
   */
  public extractModuleConfig(moduleName: string, unifiedConfig: UnifiedModuleConfig): any {
    switch (moduleName) {
      case 'Time Input':
        return {
          mode: unifiedConfig.mode,
          targetTime: unifiedConfig.targetTime,
          millisecondDelay: unifiedConfig.millisecondDelay,
          apiEnabled: unifiedConfig.apiEnabled,
          apiEndpoint: unifiedConfig.apiEndpoint,
          enabled: unifiedConfig.enabled
        };
        
      case 'Audio Output':
        return {
          deviceId: unifiedConfig.deviceId,
          sampleRate: unifiedConfig.sampleRate,
          channels: unifiedConfig.channels,
          format: unifiedConfig.format,
          volume: unifiedConfig.volume,
          bufferSize: unifiedConfig.bufferSize,
          loop: unifiedConfig.loop,
          fadeInDuration: unifiedConfig.fadeInDuration,
          fadeOutDuration: unifiedConfig.fadeOutDuration,
          enableFileUpload: unifiedConfig.enableFileUpload,
          uploadPort: unifiedConfig.uploadPort,
          uploadHost: unifiedConfig.uploadHost,
          maxFileSize: unifiedConfig.maxFileSize,
          allowedExtensions: unifiedConfig.allowedExtensions,
          enabled: unifiedConfig.enabled
        };
        
      case 'DMX Output':
        return {
          universe: unifiedConfig.universe,
          brightness: unifiedConfig.brightness,
          protocol: unifiedConfig.protocol,
          enableFileUpload: unifiedConfig.enableFileUpload,
          uploadPort: unifiedConfig.uploadPort,
          uploadHost: unifiedConfig.uploadHost,
          maxFileSize: unifiedConfig.maxFileSize,
          allowedExtensions: unifiedConfig.allowedExtensions,
          enabled: unifiedConfig.enabled
        };
        
      case 'OSC Input':
        return {
          port: unifiedConfig.port,
          address: unifiedConfig.address,
          addressPattern: unifiedConfig.addressPattern,
          enabled: unifiedConfig.enabled
        };
        
      case 'OSC Output':
        return {
          targetHost: unifiedConfig.targetHost,
          targetPort: unifiedConfig.targetPort,
          enabled: unifiedConfig.enabled
        };
        
      case 'HTTP Input':
        return {
          httpPort: unifiedConfig.httpPort,
          httpPath: unifiedConfig.httpPath,
          threshold: unifiedConfig.threshold,
          logicOperator: unifiedConfig.logicOperator,
          enabled: unifiedConfig.enabled
        };
        
      case 'HTTP Output':
        return {
          url: unifiedConfig.url,
          method: unifiedConfig.method,
          headers: unifiedConfig.headers,
          enabled: unifiedConfig.enabled
        };
        
      case 'Serial Input':
        return {
          serialPort: unifiedConfig.serialPort,
          baudRate: unifiedConfig.baudRate,
          enabled: unifiedConfig.enabled
        };
        
      case 'Frames Input':
        return {
          sACNUniverse: unifiedConfig.sACNUniverse,
          frameMode: unifiedConfig.frameMode,
          enabled: unifiedConfig.enabled
        };
        
      default:
        // For unknown modules, return the unified config as-is
        return unifiedConfig;
    }
  }
  
  /**
   * Clean up any nested module configurations (like the Time Input issue)
   */
  public cleanNestedConfig(config: any): any {
    if (!config || typeof config !== 'object') {
      return config;
    }
    
    // Remove any keys that look like module IDs (containing hyphens and timestamps)
    const cleaned: any = {};
    Object.keys(config).forEach(key => {
      if (!key.includes('-') || key === 'enabled' || key === 'mode' || key === 'millisecondDelay' || 
          key === 'apiEnabled' || key === 'deviceId' || key === 'sampleRate' || key === 'channels' ||
          key === 'format' || key === 'volume' || key === 'bufferSize' || key === 'loop' ||
          key === 'fadeInDuration' || key === 'fadeOutDuration' || key === 'enableFileUpload' ||
          key === 'uploadPort' || key === 'uploadHost' || key === 'maxFileSize' || 
          key === 'allowedExtensions' || key === 'universe' || key === 'brightness' ||
          key === 'protocol' || key === 'port' || key === 'address' || key === 'addressPattern' ||
          key === 'targetHost' || key === 'targetPort' || key === 'httpPort' || key === 'httpPath' ||
          key === 'threshold' || key === 'logicOperator' || key === 'url' || key === 'method' ||
          key === 'headers' || key === 'serialPort' || key === 'baudRate' || key === 'sACNUniverse' ||
          key === 'frameMode' || key === 'targetTime') {
        cleaned[key] = config[key];
      }
    });
    
    return cleaned;
  }
}

export const configNormalizer = ConfigNormalizer.getInstance();
