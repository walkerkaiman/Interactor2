import { InputModuleBase } from '../../InputModuleBase';
import { 
  ModuleConfig, 
  HttpInputConfig, 
  HttpRequestData, 
  HttpTriggerPayload, 
  HttpStreamPayload,
  TriggerEvent,
  StreamEvent,
  isHttpInputConfig
} from '@interactor/shared';
import { InteractorError } from '../../../core/ErrorHandler';
import express, { Request, Response } from 'express';
import { Server } from 'http';

export class HttpInputModule extends InputModuleBase {
  private server: Server | undefined = undefined;
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
  private lastRequestData: HttpRequestData | undefined = undefined;
  private currentValue: number | null = null;

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

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  protected async onInit(): Promise<void> {
    // Validate port range
    if (this.port < 1024 || this.port > 65535) {
      throw InteractorError.validation(
        `HTTP server port must be between 1024-65535`,
        { provided: this.port, min: 1024, max: 65535 },
        ['Use 3000 for development', 'Use 8000 for webhooks', 'Avoid ports below 1024 (system reserved)']
      );
    }

    // Validate host format
    if (!this.isValidHost(this.host)) {
      throw InteractorError.validation(
        `Invalid HTTP server host address`,
        { provided: this.host, expected: 'valid IP address or hostname' },
        ['Use "0.0.0.0" to listen on all interfaces', 'Use "127.0.0.1" for localhost only', 'Use specific IP for network binding']
      );
    }

    // Validate endpoint format
    if (!this.endpoint.startsWith('/')) {
      throw InteractorError.validation(
        `HTTP endpoint must start with '/'`,
        { provided: this.endpoint, expected: 'path starting with /' },
        ['Use "/webhook" for webhooks', 'Use "/api/trigger" for API endpoints', 'Use "/data" for data ingestion']
      );
    }

    // Validate rate limit
    if (this.rateLimit < 1 || this.rateLimit > 1000) {
      throw InteractorError.validation(
        `HTTP rate limit must be between 1-1000 requests per minute`,
        { provided: this.rateLimit, min: 1, max: 1000 },
        ['Use 60 for moderate traffic (1 per second)', 'Use 10 for low traffic', 'Use 300 for high traffic applications']
      );
    }

    // Validate methods
    if (!Array.isArray(this.methods) || this.methods.length === 0) {
      throw InteractorError.validation(
        'At least one HTTP method must be specified',
        { provided: this.methods, expected: 'array with at least one method' },
        ['Use ["POST"] for receiving data', 'Use ["GET", "POST"] for both reading and writing', 'Include only needed methods for security']
      );
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

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Use type guard to ensure we have HTTP input config
    if (!isHttpInputConfig(newConfig)) {
      throw InteractorError.validation(
        'Invalid HTTP input configuration provided',
        { providedConfig: newConfig },
        ['Check that all required fields are present: port, host, endpoint, methods', 'Ensure port is between 1024-65535', 'Verify methods array is not empty']
      );
    }
    
    let needsRestart = false;
    
    if (newConfig.port !== this.port) {
      this.port = newConfig.port;
      needsRestart = true;
    }
    
    if (newConfig.host !== this.host) {
      this.host = newConfig.host;
      needsRestart = true;
    }
    
    if (newConfig.endpoint !== this.endpoint) {
      this.endpoint = newConfig.endpoint;
      needsRestart = true;
    }
    
    if (JSON.stringify(newConfig.methods) !== JSON.stringify(this.methods)) {
      this.methods = newConfig.methods;
      needsRestart = true;
    }
    
    if (newConfig.rateLimit !== this.rateLimit) {
      this.rateLimit = newConfig.rateLimit;
    }
    
    if (newConfig.contentType !== this.contentType) {
      this.contentType = newConfig.contentType;
    }
    
    if (newConfig.enabled !== this.enabled) {
      this.enabled = newConfig.enabled;
      if (this.enabled && !this.isListening) {
        await this.startListening();
      } else if (!this.enabled && this.isListening) {
        await this.stopListening();
      }
    }
    
    if (needsRestart && this.isListening) {
      await this.stopHttpServer();
      if (this.enabled) {
        await this.initHttpServer();
      }
    }
  }

  protected async onStartListening(): Promise<void> {
    if (this.enabled) {
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
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Handle all methods for the configured endpoint
    this.methods.forEach(method => {
      const methodLower = method.toLowerCase() as keyof typeof this.app;
      if (typeof this.app[methodLower] === 'function') {
        (this.app as any)[methodLower](this.endpoint, (req: Request, res: Response) => {
          this.handleHttpRequest(req, res);
        });
      }
    });

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', module: this.name, timestamp: Date.now() });
    });
  }

  /**
   * Initialize HTTP server with proper error handling
   */
  private async initHttpServer(): Promise<void> {
    if (this.server) {
      return; // Already initialized
    }

    try {
      this.server = this.app.listen(this.port, this.host, () => {
        this.logger?.info(`HTTP server listening on ${this.host}:${this.port}`);
        this.emit('status', {
          moduleId: this.id,
          moduleName: this.name,
          status: 'listening',
          details: { host: this.host, port: this.port, endpoint: this.endpoint }
        });
      });

      this.server.on('error', (error: Error) => {
        this.logger?.error(`HTTP server error:`, error);
        this.emit('error', {
          moduleId: this.id,
          moduleName: this.name,
          error: error.message,
          context: 'http_server'
        });
      });
    } catch (error) {
      this.logger?.error(`Failed to initialize HTTP server:`, error);
      throw error;
    }
  }

  /**
   * Stop HTTP server
   */
  private async stopHttpServer(): Promise<void> {
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.server = undefined;
          this.logger?.info(`HTTP server stopped`);
          this.emit('status', {
            moduleId: this.id,
            moduleName: this.name,
            status: 'stopped'
          });
          resolve();
        });
      });
    }
  }

  /**
   * Handle HTTP request with proper typing
   */
  public handleHttpRequest(req: Request, res: Response): void {
    const requestId = this.generateRequestId();
    const timestamp = Date.now();

    // Check rate limit
    if (!this.checkRateLimit()) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        requestId,
        timestamp
      });
      return;
    }

    // Parse numeric value from request
    const numericValue = this.parseNumericValue(req);
    
         // Create request data object with all required fields
     const requestData: HttpRequestData = {
       method: req.method,
       url: req.url,
       headers: req.headers as Record<string, string>,
       body: req.body,
       query: req.query as Record<string, string>,
       timestamp,
       requestId,
       rateLimitRemaining: this.getRateLimitRemaining()
     };

    this.lastRequestData = requestData;
    this.requestCount++;
    this.lastRequestTime = timestamp;
    this.currentValue = numericValue;

    this.logger?.debug(`HTTP request received: ${req.method} ${req.url}`, {
      requestId,
      numericValue,
      rateLimitRemaining: requestData.rateLimitRemaining
    });

    // Emit httpRequest event
    this.emit('httpRequest', {
      method: req.method,
      url: req.url,
      headers: req.headers as Record<string, string>,
      body: req.body,
      query: req.query as Record<string, string>,
      timestamp,
      requestId,
      rateLimitRemaining: requestData.rateLimitRemaining
    });

    // Send response
    res.status(200).json({
      success: true,
      requestId,
      timestamp,
      numericValue,
      rateLimitRemaining: requestData.rateLimitRemaining
    });

    // Emit events based on mode
    if (this.mode === 'trigger' && numericValue !== null) {
           // Trigger mode: emit trigger event with typed payload
     const triggerPayload: HttpTriggerPayload = {
       method: req.method,
       url: req.url,
       value: numericValue,
       headers: req.headers as Record<string, string>,
       body: req.body,
       query: req.query as Record<string, string>,
       timestamp,
       requestId,
       rateLimitRemaining: requestData.rateLimitRemaining,
       requestCount: this.requestCount
     };
     this.emitTrigger<HttpTriggerPayload>('httpTrigger', triggerPayload);
   } else if (this.mode === 'streaming') {
     // Streaming mode: emit stream with typed payload
     const streamPayload: HttpStreamPayload = {
       method: req.method,
       url: req.url,
       value: numericValue || 0,
       data: req.body,
       timestamp,
       rateLimitRemaining: requestData.rateLimitRemaining
     };
     this.emitStream<number>(streamPayload.value);
    }

    // Emit state update
    this.emit('stateUpdate', {
      status: 'listening',
      lastRequest: requestData,
      requestCount: this.requestCount,
      rateLimitRemaining: requestData.rateLimitRemaining,
      mode: this.mode
    });
  }

  /**
   * Parse numeric value from HTTP request with proper typing
   */
  private parseNumericValue(req: Request): number | null {
    // Try to extract from path parameters first
    for (const key in req.params) {
      const value = req.params[key];
      if (typeof value === 'string') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return num;
        }
      }
    }

    // Try to extract from query parameters
    for (const key in req.query) {
      const value = req.query[key];
      if (typeof value === 'string') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return num;
        }
      }
    }

    // Try to extract from body
    if (req.body && typeof req.body === 'object') {
      const bodyValue = this.extractNumericFromObject(req.body);
      if (bodyValue !== null) {
        return bodyValue;
      }
    }

    // Try to extract from headers
    for (const key in req.headers) {
      const value = req.headers[key];
      if (typeof value === 'string') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return num;
        }
      }
    }

    return null;
  }

  /**
   * Extract numeric value from object recursively with proper typing
   */
  private extractNumericFromObject(obj: Record<string, unknown>): number | null {
    for (const key in obj) {
      const value = obj[key];
      
      if (typeof value === 'number') {
        return value;
      }
      
      if (typeof value === 'string') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return num;
        }
      }
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nestedValue = this.extractNumericFromObject(value as Record<string, unknown>);
        if (nestedValue !== null) {
          return nestedValue;
        }
      }
      
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'number') {
            return item;
          }
          if (typeof item === 'string') {
            const num = parseFloat(item);
            if (!isNaN(num)) {
              return num;
            }
          }
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            const nestedValue = this.extractNumericFromObject(item as Record<string, unknown>);
            if (nestedValue !== null) {
              return nestedValue;
            }
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Check rate limit with proper return type
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
   * Get remaining rate limit with proper return type
   */
  private getRateLimitRemaining(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    
    return Math.max(0, this.rateLimit - this.requestTimestamps.length);
  }

  /**
   * Generate unique request ID with proper return type
   */
  private generateRequestId(): string {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate host address format with proper return type
   */
  private isValidHost(host: string): boolean {
    if (host === '0.0.0.0' || host === 'localhost' || host === '127.0.0.1') {
      return true;
    }
    
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(host);
  }

  /**
   * Get HTTP server parameters for UI display with proper return type
   */
  public getHttpParameters(): {
    port: number;
    host: string;
    endpoint: string;
    methods: string[];
    enabled: boolean;
    rateLimit: number;
    contentType: string;
    status: string;
    requestCount: number;
    rateLimitRemaining: number;
    mode: string;
    currentValue: number | null;
    lastRequestData: HttpRequestData | undefined;
  } {
    return {
      port: this.port,
      host: this.host,
      endpoint: this.endpoint,
      methods: this.methods,
      enabled: this.enabled,
      rateLimit: this.rateLimit,
      contentType: this.contentType,
      status: this.server ? 'listening' : 'stopped',
      requestCount: this.requestCount,
      rateLimitRemaining: this.getRateLimitRemaining(),
      mode: this.mode,
      currentValue: this.currentValue,
      lastRequestData: this.lastRequestData
    };
  }

  /**
   * Reset request counter
   */
  public reset(): void {
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.requestTimestamps = [];
    this.lastRequestData = undefined;
    this.currentValue = null;
    this.emit('stateUpdate', {
      status: this.server ? 'listening' : 'stopped',
      requestCount: this.requestCount,
      lastRequest: undefined
    });
  }

  /**
   * Handle input data with proper typing
   */
  protected handleInput(data: unknown): void {
    // This module doesn't handle external input - it only responds to HTTP requests
    this.logger?.debug(`HTTP input module received external data:`, data);
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
       status: this.server ? 'running' : 'stopped',
       messageCount: this.requestCount,
       config: this.config
     };
   }
} 