import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig } from '@interactor/shared';
import express, { Request, Response } from 'express';
import { Server } from 'http';

interface HttpInputConfig extends ModuleConfig {
  port: number;
  host: string;
  endpoint: string;
  methods: string[];
  enabled: boolean;
  rateLimit: number;
  contentType: string;
}

interface HttpRequestData {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  query: Record<string, string>;
  timestamp: number;
  requestId: string;
  rateLimitRemaining: number;
}

export class HttpInputModule extends InputModuleBase {
  private server?: Server;
  private app: express.Application;
  private port: number;
  private host: string;
  private endpoint: string;
  private methods: string[];
  private enabled: boolean;
  private rateLimit: number;
  private contentType: string;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private requestTimestamps: number[] = [];
  private lastRequestData?: HttpRequestData;

  constructor(config: HttpInputConfig) {
    super('http_input', config, {
      name: 'HTTP Input',
      type: 'input',
      version: '1.0.0',
      description: 'Receives HTTP requests and triggers/streams events with parsed numeric data',
      author: 'Interactor Team',
      configSchema: {
        type: 'object',
        properties: {
          port: {
            type: 'number',
            description: 'HTTP server port to listen on',
            minimum: 1024,
            maximum: 65535,
            default: 3000
          },
          host: {
            type: 'string',
            description: 'Host address to bind to',
            default: '0.0.0.0'
          },
          endpoint: {
            type: 'string',
            description: 'HTTP endpoint to listen on (e.g., /webhook)',
            default: '/webhook'
          },
          methods: {
            type: 'array',
            items: { type: 'string' },
            description: 'HTTP methods to accept',
            default: ['POST']
          },
          rateLimit: {
            type: 'number',
            description: 'Maximum requests per minute',
            minimum: 1,
            maximum: 1000,
            default: 60
          },
          contentType: {
            type: 'string',
            description: 'Expected content type for requests',
            default: 'application/json'
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the HTTP server',
            default: true
          }
        },
        required: ['port', 'host', 'endpoint', 'methods', 'rateLimit']
      },
      events: [
        {
          name: 'httpRequest',
          type: 'output',
          description: 'Emitted when HTTP request is received'
        },
        {
          name: 'httpTrigger',
          type: 'output',
          description: 'Emitted when HTTP request contains valid numeric data (trigger mode)'
        },
        {
          name: 'stateUpdate',
          type: 'output',
          description: 'Emitted when module state changes'
        }
      ]
    });

    this.port = config.port || 3000;
    this.host = config.host || '0.0.0.0';
    this.endpoint = config.endpoint || '/webhook';
    this.methods = config.methods || ['POST'];
    this.rateLimit = config.rateLimit ?? 60;
    this.contentType = config.contentType || 'application/json';
    this.enabled = config.enabled !== false;

    // Initialize Express app
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  protected async onInit(): Promise<void> {
    if (this.logger) {
      this.logger.info(`Initializing HTTP Input Module on ${this.host}:${this.port}${this.endpoint}`);
    }
    
    // Validate port range
    if (this.port < 1024 || this.port > 65535) {
      throw new Error(`Invalid port number: ${this.port}. Must be between 1024 and 65535.`);
    }

    // Validate host format
    if (!this.isValidHost(this.host)) {
      throw new Error(`Invalid host address: ${this.host}`);
    }

    // Validate endpoint format
    if (!this.endpoint.startsWith('/')) {
      throw new Error(`Invalid endpoint: ${this.endpoint}. Must start with '/'`);
    }

    // Validate rate limit
    if (this.rateLimit < 1 || this.rateLimit > 1000) {
      throw new Error(`Invalid rate limit: ${this.rateLimit}. Must be between 1 and 1000 requests per minute.`);
    }
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      await this.initHttpServer();
    }
  }

  protected async onStop(): Promise<void> {
    await this.stopHttpServer();
  }

  protected async onDestroy(): Promise<void> {
    await this.stopHttpServer();
  }

  protected async onConfigUpdate(oldConfig: HttpInputConfig, newConfig: HttpInputConfig): Promise<void> {
    const oldPort = this.port;
    const oldHost = this.host;
    const oldEndpoint = this.endpoint;
    const oldEnabled = this.enabled;

    this.port = newConfig.port || 3000;
    this.host = newConfig.host || '0.0.0.0';
    this.endpoint = newConfig.endpoint || '/webhook';
    this.methods = newConfig.methods || ['POST'];
    this.rateLimit = newConfig.rateLimit ?? 60;
    this.contentType = newConfig.contentType || 'application/json';
    this.enabled = newConfig.enabled !== false;

    // Restart server if port, host, endpoint, or enabled state changed
    if (oldPort !== this.port || oldHost !== this.host || oldEndpoint !== this.endpoint || oldEnabled !== this.enabled) {
      await this.stopHttpServer();
      if (this.enabled) {
        await this.initHttpServer();
      }
    }
  }

  protected async onStartListening(): Promise<void> {
    if (!this.server && this.enabled) {
      await this.initHttpServer();
    }
  }

  protected async onStopListening(): Promise<void> {
    await this.stopHttpServer();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json({ limit: '1mb' }));
    
    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    
    // Add request logging
    this.app.use((req: Request, res: Response, next) => {
      if (this.logger) {
        this.logger.info(`${req.method} ${req.url} - ${req.ip}`);
      }
      next();
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Handle all methods for the configured endpoint
    this.methods.forEach(method => {
      this.app[method.toLowerCase() as keyof typeof this.app](this.endpoint, (req: Request, res: Response) => {
        this.handleHttpRequest(req, res);
      });
    });

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', module: 'http_input' });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  /**
   * Initialize HTTP server
   */
  private async initHttpServer(): Promise<void> {
    try {
      this.server = this.app.listen(this.port, this.host, () => {
        if (this.logger) {
          this.logger.info(`HTTP Input Module listening on ${this.host}:${this.port}${this.endpoint}`);
        }
      });

      this.server.on('error', (error: Error) => {
        if (this.logger) {
          this.logger.error(`HTTP server error: ${error.message}`);
        }
      });

    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to initialize HTTP server: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Stop HTTP server
   */
  private async stopHttpServer(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = undefined as any;
      if (this.logger) {
        this.logger.info(`HTTP server stopped for ${this.host}:${this.port}${this.endpoint}`);
      }
    }
  }

  /**
   * Handle incoming HTTP request
   */
  public handleHttpRequest(req: Request, res: Response): void {
    try {
      // Check rate limit
      if (!this.checkRateLimit()) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        if (this.logger) {
          this.logger.warn(`Rate limit exceeded for ${req.ip}`);
        }
        return;
      }

      // Validate content type if specified
      if (this.contentType && req.get('content-type') !== this.contentType) {
        res.status(400).json({ error: `Expected content-type: ${this.contentType}` });
        if (this.logger) {
          this.logger.warn(`Invalid content-type: ${req.get('content-type')} from ${req.ip}`);
        }
        return;
      }

      // Parse numeric value from request
      const numericValue = this.parseNumericValue(req);
      
      if (numericValue === null) {
        res.status(400).json({ error: 'No valid numeric value found in request' });
        if (this.logger) {
          this.logger.warn(`No numeric value found in request from ${req.ip}`);
        }
        return;
      }

      // Create request data
      const requestData: HttpRequestData = {
        method: req.method,
        url: req.url,
        headers: req.headers as Record<string, string>,
        body: req.body,
        query: req.query as Record<string, string>,
        timestamp: Date.now(),
        requestId: this.generateRequestId(),
        rateLimitRemaining: this.getRateLimitRemaining()
      };

      this.lastRequestData = requestData;
      this.requestCount++;
      this.lastRequestTime = Date.now();

      // Emit HTTP request event
      this.emit('httpRequest', requestData);

      // Emit trigger or stream based on mode
      if (this.mode === 'trigger') {
        this.emitTrigger('httpTrigger', {
          value: numericValue,
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.body,
          query: req.query,
          timestamp: requestData.timestamp,
          requestId: requestData.requestId,
          rateLimitRemaining: requestData.rateLimitRemaining,
          requestCount: this.requestCount
        });
      } else {
        // Streaming mode: emit stream with numeric value
        this.emitStream({
          value: numericValue,
          method: req.method,
          url: req.url,
          data: req.body,
          timestamp: requestData.timestamp,
          rateLimitRemaining: requestData.rateLimitRemaining
        });
      }

      // Emit state update
      this.emit('stateUpdate', {
        status: this.server ? 'listening' : 'stopped',
        port: this.port,
        host: this.host,
        endpoint: this.endpoint,
        currentValue: numericValue,
        requestCount: this.requestCount,
        rateLimit: this.rateLimit,
        rateLimitRemaining: requestData.rateLimitRemaining,
        mode: this.mode,
        lastUpdate: requestData.timestamp
      });

      // Send success response
      res.status(200).json({ 
        success: true, 
        value: numericValue,
        rateLimitRemaining: requestData.rateLimitRemaining 
      });

    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error processing HTTP request: ${error}`);
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Parse numeric value from HTTP request
   */
  private parseNumericValue(req: Request): number | null {
    try {
      // Try to extract from request body first
      if (req.body) {
        const bodyValue = this.extractNumericFromObject(req.body);
        if (bodyValue !== null) {
          return bodyValue;
        }
      }

      // Try to extract from query parameters
      if (req.query) {
        const queryValue = this.extractNumericFromObject(req.query);
        if (queryValue !== null) {
          return queryValue;
        }
      }

      // Try to extract from URL path parameters
      if (req.params) {
        const paramValue = this.extractNumericFromObject(req.params);
        if (paramValue !== null) {
          return paramValue;
        }
      }

      return null;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error parsing numeric value: ${error}`);
      }
      return null;
    }
  }

  /**
   * Extract numeric value from object (recursively searches for numbers)
   */
  private extractNumericFromObject(obj: any): number | null {
    if (typeof obj === 'number') {
      return obj;
    }

    if (typeof obj === 'string') {
      const num = parseFloat(obj);
      return isNaN(num) ? null : num;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = this.extractNumericFromObject(item);
        if (result !== null) {
          return result;
        }
      }
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        const result = this.extractNumericFromObject(obj[key]);
        if (result !== null) {
          return result;
        }
      }
    }

    return null;
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);

    // Check if we're under the limit
    if (this.requestTimestamps.length >= this.rateLimit) {
      return false;
    }

    // Add current timestamp
    this.requestTimestamps.push(now);
    return true;
  }

  /**
   * Get remaining rate limit
   */
  private getRateLimitRemaining(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    return Math.max(0, this.rateLimit - recentRequests.length);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate host format
   */
  private isValidHost(host: string): boolean {
    // Basic validation - could be enhanced
    return host === '0.0.0.0' || host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
  }

  /**
   * Get current HTTP parameters
   */
  public getHttpParameters() {
    return {
      port: this.port,
      host: this.host,
      endpoint: this.endpoint,
      methods: this.methods,
      rateLimit: this.rateLimit,
      contentType: this.contentType,
      enabled: this.enabled,
      status: this.server ? 'listening' : 'stopped',
      currentValue: this.lastRequestData ? this.parseNumericValue({ 
        method: this.lastRequestData.method,
        url: this.lastRequestData.url,
        body: this.lastRequestData.body,
        query: this.lastRequestData.query,
        headers: this.lastRequestData.headers,
        params: {}
      } as Request) : null,
      requestCount: this.requestCount,
      rateLimitRemaining: this.getRateLimitRemaining(),
      mode: this.mode,
      lastRequestData: this.lastRequestData
    };
  }

  /**
   * Reset request counter and last request data
   */
  public reset(): void {
    this.requestCount = 0;
    this.lastRequestData = undefined as any;
    this.requestTimestamps = [];
    if (this.logger) {
      this.logger.info('HTTP request counter and data reset');
    }
  }

  /**
   * Handle incoming HTTP data
   */
  protected handleInput(data: any): void {
    // This method is called by the base class when data is received
    // The actual processing is done in handleHttpRequest
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
      host: this.host,
      endpoint: this.endpoint,
      methods: this.methods,
      rateLimit: this.rateLimit,
      contentType: this.contentType,
      enabled: this.enabled,
      status: this.state.status,
      currentValue: this.lastRequestData ? this.parseNumericValue({ 
        method: this.lastRequestData.method,
        url: this.lastRequestData.url,
        body: this.lastRequestData.body,
        query: this.lastRequestData.query,
        headers: this.lastRequestData.headers,
        params: {}
      } as Request) : null,
      requestCount: this.requestCount,
      rateLimitRemaining: this.getRateLimitRemaining(),
      mode: this.getMode(),
      lastRequestData: this.lastRequestData,
      messageCount: this.state.messageCount,
      config: this.config
    };
  }
} 