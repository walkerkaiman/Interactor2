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
import { InteractorError } from '../../../core/ErrorHandler';

export class HttpOutputModule extends OutputModuleBase {
  private url: string;
  private method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  private headers: Record<string, string>;
  private timeout: number;
  private enabled: boolean;

  // Runtime state
  private lastRequestTime?: number;
  private lastResponseTime?: number;
  private lastStatusCode?: number;
  private lastResponseBody?: string;
  private lastError?: string;
  private requestCount = 0;
  private successCount = 0;
  private errorCount = 0;
  private isRequesting = false;

  constructor(config: HttpOutputConfig) {
    // Apply defaults to config before passing to base class
    const configWithDefaults: HttpOutputConfig = {
      ...config,
      method: config.method || 'POST',
      headers: config.headers || { 'Content-Type': 'application/json' },
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
            default: { 'Content-Type': 'application/json' }
          },
          timeout: {
            type: 'number',
            description: 'Request timeout in milliseconds',
            minimum: 100,
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

    // Extract configuration
    this.url = configWithDefaults.url;
    this.method = configWithDefaults.method;
    this.headers = configWithDefaults.headers || { 'Content-Type': 'application/json' };
    this.timeout = configWithDefaults.timeout || 5000;
    this.enabled = configWithDefaults.enabled !== false;
  }

  protected async onInit(): Promise<void> {
    this.logger?.info(`HTTP Output module ${this.id} initializing...`);
    
    // Validate URL format
    if (!this.isValidUrl(this.url)) {
      throw new Error(`Invalid URL format: ${this.url}`);
    }
    
    this.logger?.info(`HTTP Output module ${this.id} initialized with URL: ${this.url}`);
  }

  protected async onStart(): Promise<void> {
    this.logger?.info(`HTTP Output module ${this.id} starting...`);
    this.isConnected = true;
    this.logger?.info(`HTTP Output module ${this.id} started`);
  }

  protected async onStop(): Promise<void> {
    this.logger?.info(`HTTP Output module ${this.id} stopping...`);
    this.isConnected = false;
    this.logger?.info(`HTTP Output module ${this.id} stopped`);
  }

  protected async onDestroy(): Promise<void> {
    this.logger?.info(`HTTP Output module ${this.id} destroying...`);
    this.isConnected = false;
    this.logger?.info(`HTTP Output module ${this.id} destroyed`);
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    this.logger?.info(`HTTP Output module ${this.id} config updated`);
    
    // Update local properties
    if (isHttpOutputConfig(newConfig)) {
      this.url = newConfig.url;
      this.method = newConfig.method || 'POST';
      this.headers = newConfig.headers || { 'Content-Type': 'application/json' };
      this.timeout = newConfig.timeout || 5000;
      this.enabled = newConfig.enabled !== false;
      
      // Validate new URL
      if (!this.isValidUrl(this.url)) {
        throw new Error(`Invalid URL format: ${this.url}`);
      }
    }
  }

  protected async onSend<T = unknown>(data: T): Promise<void> {
    if (!this.enabled) {
      this.logger?.warn(`HTTP Output module ${this.id} is disabled, ignoring send request`);
      return;
    }
    
    await this.sendHttpRequest(data);
  }

  protected async handleTriggerEvent(event: TriggerEvent): Promise<void> {
    if (!this.enabled) {
      this.logger?.warn(`HTTP Output module ${this.id} is disabled, ignoring trigger event`);
      return;
    }
    
    await this.sendHttpRequest(event.payload);
  }

  protected async handleStreamingEvent(event: StreamEvent): Promise<void> {
    if (!this.enabled) {
      this.logger?.warn(`HTTP Output module ${this.id} is disabled, ignoring streaming event`);
      return;
    }
    
    await this.sendHttpRequest(event.value);
  }

  protected async handleManualTrigger(): Promise<void> {
    if (!this.enabled) {
      this.logger?.warn(`HTTP Output module ${this.id} is disabled, ignoring manual trigger`);
      return;
    }
    
    // Send a test payload
    const testData = {
      type: 'manual_trigger',
      timestamp: Date.now(),
      moduleId: this.id
    };
    
    await this.sendHttpRequest(testData);
  }

  private async sendHttpRequest<T = unknown>(data: T): Promise<void> {
    if (!this.enabled) {
      this.logger?.debug('HTTP Output module is disabled');
      return;
    }

    if (this.isRequesting) {
      this.logger?.debug('HTTP request already in progress, skipping');
      return;
    }

    this.isRequesting = true;
    this.requestCount++;
    this.lastRequestTime = Date.now();

    try {
      const requestBody = data ? JSON.stringify(data) : undefined;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const fetchOptions: RequestInit = {
          method: this.method,
          headers: this.headers,
          signal: controller.signal
        };

        if (requestBody) {
          fetchOptions.body = requestBody;
        }

        const response = await fetch(this.url, fetchOptions);

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseBody = await response.text();
        
        this.lastResponseTime = Date.now();
        this.lastStatusCode = response.status;
        this.lastResponseBody = responseBody;
        this.lastError = undefined;
        this.successCount++;

        this.logger?.info(`HTTP request successful: ${response.status} - ${responseBody.substring(0, 100)}`);
        
        // Emit success response
        const responsePayload: HttpResponsePayload = {
          url: this.url,
          method: this.method,
          status: response.status,
          response: responseBody,
          timestamp: this.lastResponseTime
        };
        
        this.emitOutput<HttpResponsePayload>('httpResponse', responsePayload);
        
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
      
    } catch (error) {
      this.lastResponseTime = Date.now();
      this.lastError = error instanceof Error ? error.message : String(error);
      this.errorCount++;

      this.logger?.error(`HTTP request failed: ${this.lastError}`);
      
      // Emit error response
      const errorPayload: HttpErrorPayload = {
        url: this.url,
        method: this.method,
        error: this.lastError,
        timestamp: this.lastResponseTime
      };
      
      this.emitOutput<HttpErrorPayload>('httpError', errorPayload);
      
    } finally {
      this.isRequesting = false;
      
      // Emit state update
      this.emit('stateUpdate', {
        status: this.isConnected ? 'ready' : 'stopped',
        requestCount: this.requestCount,
        successCount: this.successCount,
        errorCount: this.errorCount,
        lastRequestTime: this.lastRequestTime,
        lastResponseTime: this.lastResponseTime,
        lastStatusCode: this.lastStatusCode,
        lastResponseBody: this.lastResponseBody,
        lastError: this.lastError,
        isRequesting: this.isRequesting
      });
    }
  }

  protected getRuntimeState(): Record<string, any> {
    return {
      lastRequestTime: this.lastRequestTime,
      lastResponseTime: this.lastResponseTime,
      lastStatusCode: this.lastStatusCode,
      lastResponseBody: this.lastResponseBody,
      lastError: this.lastError,
      requestCount: this.requestCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      isRequesting: this.isRequesting
    };
  }

  public getConfig(): HttpOutputConfig {
    return {
      url: this.url,
      method: this.method,
      headers: this.headers,
      timeout: this.timeout,
      enabled: this.enabled
    };
  }

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

  public getDetailedState(): {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    enabled: boolean;
    isConnected: boolean;
    lastRequestTime?: number;
    lastResponseTime?: number;
    lastStatusCode?: number;
    lastResponseBody?: string;
    lastError?: string;
    requestCount: number;
    successCount: number;
    errorCount: number;
    isRequesting: boolean;
    status: string;
  } {
    return {
      url: this.url,
      method: this.method,
      enabled: this.enabled,
      isConnected: this.isConnected,
      lastRequestTime: this.lastRequestTime,
      lastResponseTime: this.lastResponseTime,
      lastStatusCode: this.lastStatusCode,
      lastResponseBody: this.lastResponseBody,
      lastError: this.lastError,
      requestCount: this.requestCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      isRequesting: this.isRequesting,
      status: this.isConnected ? 'ready' : 'stopped'
    };
  }

  public reset(): void {
    this.requestCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.lastRequestTime = undefined;
    this.lastResponseTime = undefined;
    this.lastStatusCode = undefined;
    this.lastResponseBody = undefined;
    this.lastError = undefined;
    this.isRequesting = false;
    
    this.emit('stateUpdate', {
      status: this.isConnected ? 'ready' : 'stopped',
      requestCount: this.requestCount,
      successCount: this.successCount,
      errorCount: this.errorCount
    });
  }

  public async testConnection(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }
    
    try {
      const testData = {
        type: 'connection_test',
        timestamp: Date.now(),
        moduleId: this.id
      };
      
      await this.sendHttpRequest(testData);
      return true;
    } catch (error) {
      this.logger?.error(`Connection test failed:`, error);
      return false;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }
}

export default HttpOutputModule; 