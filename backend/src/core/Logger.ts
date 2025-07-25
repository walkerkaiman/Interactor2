import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { EventEmitter } from 'events';
import { LogEntry } from '@interactor/shared';

export class Logger extends EventEmitter {
  private logger: winston.Logger;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;
  private frontendClients: Set<any> = new Set();

  constructor(config: {
    level?: string;
    file?: string;
    maxSize?: string;
    maxFiles?: number;
    enableConsole?: boolean;
  } = {}) {
    super();

    const {
      level = 'info',
      file = 'logs/interactor.log',
      maxSize = '10m',
      maxFiles = 5,
      enableConsole = true
    } = config;

    // Create transports
    const transports: winston.transport[] = [];

    // Console transport
    if (enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
              const moduleStr = module ? `[${module}] ` : '';
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} ${level}: ${moduleStr}${message}${metaStr}`;
            })
          )
        })
      );
    }

    // File transport with rotation
    if (file) {
      transports.push(
        new DailyRotateFile({
          filename: file,
          datePattern: 'YYYY-MM-DD',
          maxSize,
          maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    // Create logger
    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      exitOnError: false
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new DailyRotateFile({
        filename: file.replace('.log', '-exceptions.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize,
        maxFiles
      })
    );

    // Handle unhandled rejections
    this.logger.rejections.handle(
      new DailyRotateFile({
        filename: file.replace('.log', '-rejections.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize,
        maxFiles
      })
    );
  }

  /**
   * Log a debug message
   */
  public debug(message: string, module?: string, metadata?: Record<string, any>): void {
    this.log('debug', message, module, metadata);
  }

  /**
   * Log an info message
   */
  public info(message: string, module?: string, metadata?: Record<string, any>): void {
    this.log('info', message, module, metadata);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, module?: string, metadata?: Record<string, any>): void {
    this.log('warn', message, module, metadata);
  }

  /**
   * Log an error message
   */
  public error(message: string, module?: string, metadata?: Record<string, any>): void {
    this.log('error', message, module, metadata);
  }

  /**
   * Log a message with the specified level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, module?: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      ...(module && { module }),
      ...(metadata && { metadata })
    };

    // Add to buffer
    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Log to winston
    this.logger.log(level, message, { module, ...metadata });

    // Emit to frontend clients
    this.broadcastToFrontend(logEntry);
  }

  /**
   * Get recent log entries
   */
  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  public clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Set log level
   */
  public setLevel(level: string): void {
    this.logger.level = level;
    this.info(`Log level changed to: ${level}`);
  }

  /**
   * Get current log level
   */
  public getLevel(): string {
    return this.logger.level;
  }

  /**
   * Register a frontend client for real-time log streaming
   */
  public registerFrontendClient(client: any): void {
    this.frontendClients.add(client);
    this.debug('Frontend client registered for log streaming');
  }

  /**
   * Unregister a frontend client
   */
  public unregisterFrontendClient(client: any): void {
    this.frontendClients.delete(client);
    this.debug('Frontend client unregistered from log streaming');
  }

  /**
   * Broadcast log entry to all frontend clients
   */
  private broadcastToFrontend(logEntry: LogEntry): void {
    if (this.frontendClients.size === 0) {
      return;
    }

    const message = JSON.stringify({
      type: 'log',
      data: logEntry
    });

    for (const client of this.frontendClients) {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      } catch (error) {
        // Remove broken clients
        this.frontendClients.delete(client);
      }
    }
  }

  /**
   * Create a child logger for a specific module
   */
  public createModuleLogger(moduleName: string): ModuleLogger {
    return new ModuleLogger(this, moduleName);
  }

  /**
   * Get logger statistics
   */
  public getStats(): {
    bufferSize: number;
    frontendClients: number;
    level: string;
  } {
    return {
      bufferSize: this.logBuffer.length,
      frontendClients: this.frontendClients.size,
      level: this.logger.level
    };
  }
}

/**
 * Module-specific logger that automatically includes module name
 */
export class ModuleLogger {
  constructor(private parentLogger: Logger, private moduleName: string) {}

  public debug(message: string, metadata?: Record<string, any>): void {
    this.parentLogger.debug(message, this.moduleName, metadata);
  }

  public info(message: string, metadata?: Record<string, any>): void {
    this.parentLogger.info(message, this.moduleName, metadata);
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    this.parentLogger.warn(message, this.moduleName, metadata);
  }

  public error(message: string, metadata?: Record<string, any>): void {
    this.parentLogger.error(message, this.moduleName, metadata);
  }
} 