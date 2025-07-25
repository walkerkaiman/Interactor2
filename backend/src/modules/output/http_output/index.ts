import { OutputModuleBase } from '../../OutputModuleBase';
import { ModuleConfig } from '@interactor/shared';

interface HttpOutputConfig extends ModuleConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  timeout?: number;
}

export class HttpOutputModule extends OutputModuleBase {
  private url: string;
  private method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  private headers: Record<string, string>;
  private timeout: number;

  constructor(config: HttpOutputConfig) {
    super('http_output', config, {
      name: 'HTTP Output',
      type: 'output',
      category: 'trigger',
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
          }
        },
        required: ['url']
      },
      events: [
        {
          name: 'httpRequest',
          type: 'input',
          description: 'Triggers an HTTP request'
        }
      ]
    }, 'trigger');

    this.url = config.url;
    this.method = config.method || 'POST';
    this.headers = config.headers || {};
    this.timeout = config.timeout || 5000;
  }

  protected async onInit(): Promise<void> {
    // Validate URL format
    if (!this.isValidUrl(this.url)) {
      throw new Error(`Invalid URL format: ${this.url}`);
    }
  }

  protected async onStart(): Promise<void> {
    this.setConnectionStatus(true);
  }

  protected async onStop(): Promise<void> {
    this.setConnectionStatus(false);
  }

  protected async onDestroy(): Promise<void> {
    // Cleanup if needed
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    const newHttpConfig = newConfig as HttpOutputConfig;
    
    if (newHttpConfig.url !== this.url) {
      this.url = newHttpConfig.url;
      if (!this.isValidUrl(this.url)) {
        throw new Error(`Invalid URL format: ${this.url}`);
      }
    }
    
    this.method = newHttpConfig.method || this.method;
    this.headers = newHttpConfig.headers || this.headers;
    this.timeout = newHttpConfig.timeout || this.timeout;
  }

  protected async onSend(data: any): Promise<void> {
    await this.sendHttpRequest(data);
  }

  protected async handleTriggerEvent(event: any): Promise<void> {
    // For trigger events, send the event payload
    await this.sendHttpRequest(event.payload || event);
  }

  protected async handleStreamingEvent(event: any): Promise<void> {
    // For streaming events, send the streamed value
    await this.sendHttpRequest({ value: event.value });
  }

  protected async onManualTrigger(): Promise<void> {
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
      
      this.emitOutput('httpRequest', {
        url: this.url,
        method: this.method,
        status: response.status,
        response: responseData,
        timestamp: Date.now()
      });

      this.logger?.debug(`HTTP request successful: ${this.method} ${this.url}`, {
        status: response.status,
        responseSize: responseData.length
      });

    } catch (error) {
      this.emitError(error as Error, 'HTTP request failed');
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
    return {
      url: this.url,
      method: this.method,
      headers: this.headers,
      timeout: this.timeout
    };
  }
} 