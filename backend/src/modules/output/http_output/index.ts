import { OutputModuleBase } from '../../OutputModuleBase';
import { ModuleConfig } from '@interactor/shared';

interface HttpOutputConfig extends ModuleConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  timeout?: number;
  enabled?: boolean;
}

interface HttpRequestData {
  url: string;
  method: string;
  status: number;
  response: string;
  timestamp: number;
}

interface HttpErrorData {
  url: string;
  method: string;
  error: string;
  timestamp: number;
}

export class HttpOutputModule extends OutputModuleBase {
  private url: string;
  private method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  private headers: Record<string, string>;
  private timeout: number;
  private enabled: boolean;
  private lastRequest?: HttpRequestData;
  private lastError?: HttpErrorData;
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

    this.logger?.info(`HTTP Output module initialized: ${this.method} ${this.url}`);
  }

  protected async onStart(): Promise<void> {
    this.setConnectionStatus(true);
    this.emitStatus('ready', { url: this.url, method: this.method });
    this.logger?.info(`HTTP Output module started: ${this.method} ${this.url}`);
  }

  protected async onStop(): Promise<void> {
    this.setConnectionStatus(false);
    this.emitStatus('stopped');
    this.logger?.info(`HTTP Output module stopped`);
  }

  protected async onDestroy(): Promise<void> {
    this.logger?.info(`HTTP Output module destroyed`);
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Always sync private properties from the base class config
    const cfg = this.config as HttpOutputConfig;
    
    this.url = cfg.url;
    this.method = cfg.method ?? this.method;
    this.headers = cfg.headers ?? this.headers;
    this.timeout = cfg.timeout ?? this.timeout;
    this.enabled = cfg.enabled !== false;

    // Validate URL after updating
    if (!this.isValidUrl(this.url)) {
      throw new Error(`Invalid URL format: ${this.url}`);
    }

    this.logger?.info(`HTTP Output module configuration updated: ${this.method} ${this.url}`);
    this.emitStatus('configUpdated', { url: this.url, method: this.method });
  }

  protected async onSend(data: any): Promise<void> {
    if (!this.enabled) {
      this.logger?.warn(`HTTP Output module is disabled, ignoring send request`);
      return;
    }
    await this.sendHttpRequest(data);
  }

  protected async handleTriggerEvent(event: any): Promise<void> {
    if (!this.enabled) {
      this.logger?.warn(`HTTP Output module is disabled, ignoring trigger event`);
      return;
    }
    // For trigger events, send the event payload
    await this.sendHttpRequest(event.payload || event);
  }

  protected async handleStreamingEvent(event: any): Promise<void> {
    if (!this.enabled) {
      this.logger?.warn(`HTTP Output module is disabled, ignoring streaming event`);
      return;
    }
    // For streaming events, send the streamed value
    await this.sendHttpRequest({ value: event.value });
  }

  protected async onManualTrigger(): Promise<void> {
    if (!this.enabled) {
      this.logger?.warn(`HTTP Output module is disabled, ignoring manual trigger`);
      return;
    }
    // Send a test request
    await this.sendHttpRequest({
      type: 'manualTrigger',
      timestamp: Date.now(),
      message: 'Manual trigger from Interactor'
    });
  }

  /**
   * Send HTTP request to the configured endpoint
   */
  private async sendHttpRequest(data: any): Promise<void> {
    try {
      this.logger?.debug(`Sending HTTP request: ${this.method} ${this.url}`, data);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const requestOptions: RequestInit = {
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        signal: controller.signal
      };

      // Add body for non-GET requests
      if (this.method !== 'GET') {
        requestOptions.body = JSON.stringify(data);
      }

      const response = await fetch(this.url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.text();
      
      this.lastRequest = {
        url: this.url,
        method: this.method,
        status: response.status,
        response: responseData,
        timestamp: Date.now()
      };

      this.requestCount++;
      
      this.emitOutput('httpResponse', this.lastRequest);
      this.emitStatus('requestCompleted', {
        status: response.status,
        responseSize: responseData.length
      });

      this.logger?.debug(`HTTP request successful: ${this.method} ${this.url}`, {
        status: response.status,
        responseSize: responseData.length
      });

    } catch (error) {
      this.lastError = {
        url: this.url,
        method: this.method,
        error: (error as Error).message,
        timestamp: Date.now()
      };

      this.errorCount++;
      
      this.emitError(error as Error, 'HTTP request failed');
      this.emitStatus('requestFailed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): HttpOutputConfig {
    return this.config as HttpOutputConfig;
  }

  /**
   * Get module state
   */
  public getState(): any {
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
   * Reset module statistics
   */
  public reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastRequest = undefined as any;
    this.lastError = undefined as any;
    this.logger?.info(`HTTP Output module statistics reset`);
  }

  /**
   * Test the HTTP connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.onManualTrigger();
      return true;
    } catch (error) {
      this.logger?.error(`Connection test failed:`, error);
      return false;
    }
  }
} 