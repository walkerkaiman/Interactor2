import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { EventEmitter } from 'events';
import { LogEntry } from '@interactor/shared';

export class Logger extends EventEmitter {
  private static instance: Logger;
  private logger: winston.Logger;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;
  private frontendClients: any[] = [];

  private constructor(config: {
    level?: string;
    file?: string;
    maxSize?: string;
    maxFiles?: number;
    enableConsole?: boolean;
  } = {}) {
    super(); // Call EventEmitter constructor
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

  public static getInstance(config?: {
    level?: string;
    file?: string;
    maxSize?: string;
    maxFiles?: number;
    enableConsole?: boolean;
  }): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
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
    level: string;
    frontendClients: number;
  } {
    return {
      bufferSize: this.logBuffer.length,
      level: this.logger.level,
      frontendClients: this.frontendClients.length
    };
  }

  /**
   * Register frontend client (for compatibility with tests)
   */
  public registerFrontendClient(client: any): void {
    this.frontendClients.push(client);
  }

  /**
   * Unregister frontend client (for compatibility with tests)
   */
  public unregisterFrontendClient(client: any): void {
    const index = this.frontendClients.indexOf(client);
    if (index > -1) {
      this.frontendClients.splice(index, 1);
    }
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