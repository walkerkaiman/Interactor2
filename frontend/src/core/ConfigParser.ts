import { ModuleManifest } from '@interactor/shared';

/**
 * Unified configuration interface matching the backend
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
 * Configuration parser that extracts module-specific settings from unified configuration
 */
export class ConfigParser {
  private static instance: ConfigParser;
  
  // Mapping from display names to folder names (what backend uses internally)
  private readonly moduleNameMapping: Map<string, string> = new Map([
    ['Time Input', 'time_input'],
    ['Audio Output', 'audio_output'],
    ['DMX Output', 'dmx_output'],
    ['OSC Input', 'osc_input'],
    ['OSC Output', 'osc_output'],
    ['HTTP Input', 'http_input'],
    ['HTTP Output', 'http_output'],
    ['Serial Input', 'serial_input'],
    ['Frames Input', 'frames_input']
  ]);
  
  public static getInstance(): ConfigParser {
    if (!ConfigParser.instance) {
      ConfigParser.instance = new ConfigParser();
    }
    return ConfigParser.instance;
  }
  
  /**
   * Get the internal module name (folder name) from display name
   */
  private getInternalModuleName(displayName: string): string {
    return this.moduleNameMapping.get(displayName) || displayName;
  }
  
  /**
   * Extract module-specific configuration from unified config based on module manifest
   */
  public extractModuleConfig(moduleName: string, unifiedConfig: UnifiedModuleConfig, manifest?: ModuleManifest): any {
    // Convert display name to internal name for consistent processing
    const internalModuleName = this.getInternalModuleName(moduleName);
    
    // If no manifest provided, use module name to determine relevant fields
    if (!manifest) {
      return this.extractByModuleName(internalModuleName, unifiedConfig);
    }
    
    // Extract fields based on manifest schema
    const moduleConfig: any = {};
    
    if (manifest.configSchema?.properties) {
      Object.keys(manifest.configSchema.properties).forEach(fieldName => {
        if (unifiedConfig.hasOwnProperty(fieldName)) {
          moduleConfig[fieldName] = unifiedConfig[fieldName as keyof UnifiedModuleConfig];
        }
      });
    }
    
    // Always include enabled status
    moduleConfig.enabled = unifiedConfig.enabled;
    
    return moduleConfig;
  }
  
  /**
   * Extract configuration by module name (fallback when manifest not available)
   */
  private extractByModuleName(moduleName: string, unifiedConfig: UnifiedModuleConfig): any {
    switch (moduleName) {
      case 'time_input':
        return {
          mode: unifiedConfig.mode,
          targetTime: unifiedConfig.targetTime,
          millisecondDelay: unifiedConfig.millisecondDelay,
          apiEnabled: unifiedConfig.apiEnabled,
          apiEndpoint: unifiedConfig.apiEndpoint,
          enabled: unifiedConfig.enabled
        };
        
      case 'audio_output':
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
        
      case 'dmx_output':
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
        
      case 'osc_input':
        return {
          port: unifiedConfig.port,
          address: unifiedConfig.address,
          addressPattern: unifiedConfig.addressPattern,
          enabled: unifiedConfig.enabled
        };
        
      case 'osc_output':
        return {
          targetHost: unifiedConfig.targetHost,
          targetPort: unifiedConfig.targetPort,
          enabled: unifiedConfig.enabled
        };
        
      case 'http_input':
        return {
          httpPort: unifiedConfig.httpPort,
          httpPath: unifiedConfig.httpPath,
          threshold: unifiedConfig.threshold,
          logicOperator: unifiedConfig.logicOperator,
          enabled: unifiedConfig.enabled
        };
        
      case 'http_output':
        return {
          url: unifiedConfig.url,
          method: unifiedConfig.method,
          headers: unifiedConfig.headers,
          enabled: unifiedConfig.enabled
        };
        
      case 'serial_input':
        return {
          serialPort: unifiedConfig.serialPort,
          baudRate: unifiedConfig.baudRate,
          enabled: unifiedConfig.enabled
        };
        
      case 'frames_input':
        return {
          sACNUniverse: unifiedConfig.sACNUniverse,
          frameMode: unifiedConfig.frameMode,
          enabled: unifiedConfig.enabled
        };
        
      default:
        // For unknown modules, return all properties
        return { ...unifiedConfig };
    }
  }
  
  /**
   * Get default values for a module based on its manifest
   */
  public getDefaultConfig(moduleName: string, manifest?: ModuleManifest): any {
    // Convert display name to internal name for consistent processing
    const internalModuleName = this.getInternalModuleName(moduleName);
    
    if (!manifest) {
      return this.getDefaultByModuleName(internalModuleName);
    }
    
    const defaults: any = {};
    
    if (manifest.configSchema?.properties) {
      Object.entries(manifest.configSchema.properties).forEach(([fieldName, fieldSchema]) => {
        if (fieldSchema.default !== undefined) {
          defaults[fieldName] = fieldSchema.default;
        }
      });
    }
    
    // Always include enabled default
    defaults.enabled = true;
    
    return defaults;
  }
  
  /**
   * Get default values by module name (fallback when manifest not available)
   */
  private getDefaultByModuleName(moduleName: string): any {
    switch (moduleName) {
      case 'time_input':
        return {
          mode: 'clock',
          targetTime: '12:00 PM',
          millisecondDelay: 1000,
          apiEnabled: false,
          apiEndpoint: '',
          enabled: true
        };
        
      case 'audio_output':
        return {
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
          enabled: true
        };
        
      case 'dmx_output':
        return {
          universe: 1,
          brightness: 1.0,
          protocol: {
            type: 'artnet',
            host: '127.0.0.1',
            port: 6454,
            baudRate: 57600
          },
          enableFileUpload: true,
          uploadPort: 3002,
          uploadHost: 'localhost',
          maxFileSize: 10485760,
          allowedExtensions: ['.csv'],
          enabled: true
        };
        
      case 'osc_input':
        return {
          port: 8000,
          address: '/osc',
          addressPattern: '/osc/*',
          enabled: true
        };
        
      case 'osc_output':
        return {
          targetHost: '127.0.0.1',
          targetPort: 8000,
          enabled: true
        };
        
      case 'http_input':
        return {
          httpPort: 3003,
          httpPath: '/trigger',
          threshold: 0.5,
          logicOperator: '>',
          enabled: true
        };
        
      case 'http_output':
        return {
          url: 'http://localhost:3004',
          method: 'POST',
          headers: {},
          enabled: true
        };
        
      case 'serial_input':
        return {
          serialPort: 'COM1',
          baudRate: 9600,
          enabled: true
        };
        
      case 'frames_input':
        return {
          sACNUniverse: 1,
          frameMode: 'trigger',
          enabled: true
        };
        
      default:
        return { enabled: true };
    }
  }
  
  /**
   * Merge module-specific config with defaults
   */
  public mergeWithDefaults(moduleConfig: any, moduleName: string, manifest?: ModuleManifest): any {
    const defaults = this.getDefaultConfig(moduleName, manifest);
    return { ...defaults, ...moduleConfig };
  }
  
  /**
   * Validate that a configuration has all required fields for a module
   */
  public validateConfig(moduleConfig: any, moduleName: string, manifest?: ModuleManifest): { valid: boolean; missing: string[] } {
    if (!manifest) {
      return { valid: true, missing: [] }; // Skip validation if no manifest
    }
    
    const missing: string[] = [];
    
    if (manifest.configSchema?.required) {
      manifest.configSchema.required.forEach(fieldName => {
        if (!moduleConfig.hasOwnProperty(fieldName) || moduleConfig[fieldName] === undefined) {
          missing.push(fieldName);
        }
      });
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
  
  /**
   * Clean configuration by removing any nested module ID structures
   */
  public cleanConfig(config: any): any {
    if (!config || typeof config !== 'object') {
      return config;
    }
    
    const validKeys = [
      // Common properties
      'enabled', 'lastUpdate', 'config',
      
      // Time Input properties
      'mode', 'targetTime', 'millisecondDelay', 'apiEnabled', 'apiEndpoint',
      
      // Audio Output properties
      'deviceId', 'sampleRate', 'channels', 'format', 'volume', 'bufferSize', 
      'loop', 'fadeInDuration', 'fadeOutDuration', 'enableFileUpload', 
      'uploadPort', 'uploadHost', 'maxFileSize', 'allowedExtensions',
      
      // DMX Output properties
      'universe', 'brightness', 'protocol',
      
      // OSC properties
      'port', 'address', 'addressPattern', 'targetHost', 'targetPort',
      
      // HTTP properties
      'httpPort', 'httpPath', 'threshold', 'logicOperator', 'url', 'method', 'headers',
      
      // Serial properties
      'serialPort', 'baudRate',
      
      // Frames properties
      'sACNUniverse', 'frameMode'
    ];
    
    const cleaned: any = {};
    Object.keys(config).forEach(key => {
      // Skip keys that look like module IDs (contain hyphens and numbers)
      if (key.includes('-') && /\d/.test(key)) {
        console.warn(`[ConfigParser] Skipping nested module ID key: ${key}`);
        return;
      }
      
      // Only include valid configuration keys
      if (validKeys.includes(key)) {
        cleaned[key] = config[key];
      } else {
        console.warn(`[ConfigParser] Skipping invalid config key: ${key}`);
      }
    });
    
    return cleaned;
  }
}

export const configParser = ConfigParser.getInstance();
