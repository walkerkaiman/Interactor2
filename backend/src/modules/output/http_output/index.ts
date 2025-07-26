import { OutputModuleBase } from '../../OutputModuleBase';
import {
  ModuleConfig,
  HttpOutputConfig,
  HttpOutputRequestData,
  HttpErrorData,
  HttpResponsePayload,
  HttpErrorPayload,
  TriggerEvent,
  StreamEvent,
  isHttpOutputConfig
} from '@interactor/shared';

export class HttpOutputModule extends OutputModuleBase {
  private url: string;
  private method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  private headers: Record<string, string>;
  private timeout: number;
  private enabled: boolean;
  private lastRequest: HttpOutputRequestData | undefined = undefined;
  private lastError: HttpErrorData | undefined = undefined;
  private requestCount = 0;
  private errorCount = 0;

  constructor(config: HttpOutputConfig) {
    // Apply defaults to config before passing to base class
    const configWithDefaults: HttpOutputConfig = {
      ...config,
      method: config.method || 'POST',
      headers: config.headers || {},
      timeout: config.timeout || 5000,
      enabled: config.enabled !== false
    };

    super('http_output', configWithDefaults, {
      name: 'HTTP Output',
      type: 'output',
      version: '1.0.0',
      description: 'Sends HTTP requests to external endpoints',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Target URL for HTTP requests',
            pattern: '^https?://.+'
          },
          method: {
            type: 'string',
            description: 'HTTP method to use',
            enum: ['GET', 'POST', 'PUT', 'DELETE'],
            default: 'POST'
          },
          headers: {
            type: 'object',
            description: 'Additional HTTP headers',
            default: {}
          },
          timeout: {
            type: 'number',
            description: 'Request timeout in milliseconds',
            minimum: 1000,
            maximum: 30000,
            default: 5000
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the module',
            default: true
          }
        },
        required: ['url']
      },
      events: [
        {
          name: 'httpRequest',
          type: 'input',
          description: 'Triggers an HTTP request'
        },
        {
          name: 'httpResponse',
          type: 'output',
          description: 'Emitted when an HTTP request is completed'
        },
        {
          name: 'httpError',
          type: 'output',
          description: 'Emitted when an HTTP request fails'
        },
        {
          name: 'stateUpdate',
          type: 'output',
          description: 'Emitted when module state changes'
        }
      ]
    });

    // Set private properties from the config with defaults
    this.url = configWithDefaults.url;
    this.method = configWithDefaults.method;
    this.headers = configWithDefaults.headers || {};
    this.timeout = configWithDefaults.timeout || 5000;
    this.enabled = configWithDefaults.enabled !== false;
  }

  protected async onInit(): Promise<void> {
    // Validate URL format
    if (!this.isValidUrl(this.url)) {
      throw new Error(`Invalid URL format: ${this.url}`);
    }

    // Validate timeout range
    if (this.timeout < 1000 || this.timeout > 30000) {
      throw new Error(`Invalid timeout: ${this.timeout}. Must be between 1000 and 30000 ms.`);
    }

    // Validate method
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(this.method)) {
      throw new Error(`Invalid HTTP method: ${this.method}`);
    }
  }

  protected async onStart(): Promise<void> {
    // HTTP output module doesn't need to start anything
    this.setConnectionStatus(true);
  }

  protected async onStop(): Promise<void> {
    // HTTP output module doesn't need to stop anything
    this.setConnectionStatus(false);
  }

  protected async onDestroy(): Promise<void> {
    // Clean up any pending requests if needed
    this.setConnectionStatus(false);
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Use type guard to ensure we have HTTP output config
    if (!isHttpOutputConfig(newConfig)) {
      throw new Error('Invalid HTTP output configuration provided');
    }
    
    // Validate URL format
    if (!this.isValidUrl(newConfig.url)) {
      throw new Error(`Invalid URL format: ${newConfig.url}`);
    }
    
    this.url = newConfig.url;
    this.method = newConfig.method || 'POST';
    this.headers = newConfig.headers || {};
    this.timeout = newConfig.timeout || 5000;
    this.enabled = newConfig.enabled !== false;
  }

  /**
   * Send data with proper typing
   */
  protected async onSend<T = unknown>(data: T): Promise<void> {
    if (!this.enabled) {
      throw new Error('HTTP output module is disabled');
    }
    await this.sendHttpRequest(data);
  }

  /**
   * Handle trigger events with proper typing
   */
  protected async handleTriggerEvent(event: TriggerEvent): Promise<void> {
    if (!this.enabled) {
      throw new Error('HTTP output module is disabled');
    }
    await this.sendHttpRequest(event.payload);
  }

  /**
   * Handle streaming events with proper typing
   */
  protected async handleStreamingEvent(event: StreamEvent): Promise<void> {
    if (!this.enabled) {
      throw new Error('HTTP output module is disabled');
    }
    await this.sendHttpRequest(event.value);
  }

  /**
   * Handle manual trigger with proper typing
   */
  protected async onManualTrigger(): Promise<void> {
    if (!this.enabled) {
      throw new Error('HTTP output module is disabled');
    }
    
    const testData = {
      message: 'Manual trigger from HTTP output module',
      timestamp: Date.now(),
      moduleId: this.id
    };
    
    await this.sendHttpRequest(testData);
  }

  /**
   * Send HTTP request with proper typing and error handling
   */
  private async sendHttpRequest<T = unknown>(data: T): Promise<void> {
    const timestamp = Date.now();
    
    try {
      this.logger?.debug(`Sending HTTP ${this.method} request to ${this.url}`, data);
      
      // Prepare request options
      const requestOptions: RequestInit = {
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        signal: AbortSignal.timeout(this.timeout)
      };

      // Add body for non-GET requests
      if (this.method !== 'GET') {
        requestOptions.body = JSON.stringify(data);
      }

      // Send the request
      const response = await fetch(this.url, requestOptions);
      const responseText = await response.text();
      
      // Create request data object
      const requestData: HttpOutputRequestData = {
        url: this.url,
        method: this.method,
        status: response.status,
        response: responseText,
        timestamp
      };
      
      this.lastRequest = requestData;
      this.lastSentValue = data;
      
      if (response.ok) {
        // Success response
        const responsePayload: HttpResponsePayload = {
          url: this.url,
          method: this.method,
          status: response.status,
          response: responseText,
          timestamp
        };
        
        this.requestCount++;
        this.emitOutput<HttpResponsePayload>('httpResponse', responsePayload);
        this.emitStatus('success', { status: response.status, responseLength: responseText.length });
        
        this.logger?.info(`HTTP request successful: ${response.status} ${response.statusText}`);
      } else {
        // Error response
        const errorData: HttpErrorData = {
          url: this.url,
          method: this.method,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp
        };
        
        const errorPayload: HttpErrorPayload = {
          url: this.url,
          method: this.method,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp
        };
        
        this.lastError = errorData;
        
        this.emitError(new Error(errorData.error), 'http_request');
        this.emitOutput<HttpErrorPayload>('httpError', errorPayload);
        
        this.logger?.error(`HTTP request failed: ${response.status} ${response.statusText}`, responseText);
        
        // Throw error for the calling method to handle
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      this.errorCount++;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData: HttpErrorData = {
        url: this.url,
        method: this.method,
        error: errorMessage,
        timestamp
      };
      
      const errorPayload: HttpErrorPayload = {
        url: this.url,
        method: this.method,
        error: errorMessage,
        timestamp
      };
      
      this.lastError = errorData;
      
      this.emitError(error instanceof Error ? error : new Error(errorMessage), 'http_request');
      this.emitOutput<HttpErrorPayload>('httpError', errorPayload);
      
      this.logger?.error(`HTTP request error:`, error);
      
      // Re-throw the error for the calling method to handle
      throw error;
    }
    
    // Emit state update
    this.emit('stateUpdate', {
      status: this.isConnected ? 'ready' : 'stopped',
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      lastRequest: this.lastRequest,
      lastError: this.lastError
    });
  }

  /**
   * Validate URL format with proper return type
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  /**
   * Get configuration with proper return type
   */
  public getConfig(): HttpOutputConfig {
    return {
      url: this.url,
      method: this.method,
      headers: this.headers,
      timeout: this.timeout,
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
      messageCount: this.requestCount,
      config: this.config
    };
  }

  /**
   * Get detailed state for testing purposes
   */
  public getDetailedState(): {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    enabled: boolean;
    isConnected: boolean;
    lastRequest: HttpOutputRequestData | undefined;
    lastError: HttpErrorData | undefined;
    requestCount: number;
    errorCount: number;
    status: string;
  } {
    return {
      url: this.url,
      method: this.method,
      enabled: this.enabled,
      isConnected: this.isConnected,
      lastRequest: this.lastRequest,
      lastError: this.lastError,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      status: this.isConnected ? 'ready' : 'stopped'
    };
  }

  /**
   * Reset counters
   */
  public reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastRequest = undefined;
    this.lastError = undefined;
    this.emit('stateUpdate', {
      status: this.isConnected ? 'ready' : 'stopped',
      requestCount: this.requestCount,
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
      await this.sendHttpRequest(testData);
      return true;
    } catch (error) {
      this.logger?.error('Connection test failed:', error);
      return false;
    }
  }
} 