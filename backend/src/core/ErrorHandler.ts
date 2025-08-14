import { Request, Response } from 'express';
import { Logger } from './Logger';

export enum ErrorType {
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  MODULE_ERROR = 'module_error',
  NETWORK_ERROR = 'network_error',
  FILE_ERROR = 'file_error',
  DATABASE_ERROR = 'database_error',
  INTERNAL = 'internal'
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  suggestions?: string[];
  retryable?: boolean;
  context?: Record<string, any>;
}

export interface StandardErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    code?: string;
    details?: any;
    suggestions?: string[];
    retryable?: boolean;
    timestamp: number;
    requestId?: string;
  };
}

export class InteractorError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly details?: any;
  public readonly suggestions?: string[];
  public readonly retryable?: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    type: ErrorType,
    message: string,
    options: {
      code?: string;
      details?: any;
      suggestions?: string[];
      retryable?: boolean;
      context?: Record<string, any>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'InteractorError';
    this.type = type;
    this.code = options.code;
    this.details = options.details;
    this.suggestions = options.suggestions;
    this.retryable = options.retryable ?? false;
    this.context = options.context;

    if (options.cause) {
      this.stack = options.cause.stack;
    }
  }

  static validation(message: string, details?: any, suggestions?: string[]): InteractorError {
    return new InteractorError(ErrorType.VALIDATION, message, {
      details,
      suggestions: suggestions || ['Please check your input and try again.'],
      retryable: false
    });
  }

  static notFound(resource: string, id?: string): InteractorError {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    return new InteractorError(ErrorType.NOT_FOUND, message, {
      details: { resource, id },
      suggestions: ['Check the resource ID and try again.'],
      retryable: false
    });
  }

  static moduleError(moduleName: string, operation: string, cause?: Error, retryable = false): InteractorError {
    return new InteractorError(
      ErrorType.MODULE_ERROR,
      `Module '${moduleName}' failed during ${operation}`,
      {
        code: `MODULE_${operation.toUpperCase()}_FAILED`,
        details: { moduleName, operation, originalError: cause?.message },
        suggestions: retryable 
          ? ['Try again in a few seconds.', 'Check module configuration.']
          : ['Check module configuration and logs.'],
        retryable,
        context: { moduleName, operation },
        cause
      }
    );
  }

  static networkError(message: string, cause?: Error): InteractorError {
    const opts: any = {
      code: 'NETWORK_ERROR',
      suggestions: [
        'Check your network connection.',
        'Verify the target host is reachable.',
        'Try again in a few seconds.'
      ],
      retryable: true
    };
    if (cause) opts.cause = cause;
    return new InteractorError(ErrorType.NETWORK_ERROR, message, opts);
  }

  static fileError(operation: string, filename: string, cause?: Error): InteractorError {
    return new InteractorError(
      ErrorType.FILE_ERROR,
      `File ${operation} failed for '${filename}'`,
      (() => { const o: any = {
        code: `FILE_${operation.toUpperCase()}_ERROR`,
        details: { operation, filename, originalError: cause?.message },
        suggestions: [
          'Check file permissions.',
          'Verify the file path is correct.',
          'Ensure sufficient disk space.'
        ],
        retryable: operation === 'read'
      }; if (cause) o.cause = cause; return o; })()
    );
  }

  static conflict(message: string, details?: any): InteractorError {
    return new InteractorError(ErrorType.CONFLICT, message, {
      details,
      suggestions: ['Resolve the conflict and try again.'],
      retryable: false
    });
  }

  static internal(message: string, cause?: Error): InteractorError {
    const opts: any = {
      code: 'INTERNAL_ERROR',
      suggestions: [
        'Try again in a few seconds.',
        'Contact support if the problem persists.'
      ],
      retryable: true
    };
    if (cause) opts.cause = cause;
    return new InteractorError(ErrorType.INTERNAL, message, opts);
  }
}

export class ErrorHandler {
  private static logger = Logger.getInstance();

  /**
   * Convert error to standardized response format
   */
  static toResponse(error: Error, requestId?: string): StandardErrorResponse {
    const timestamp = Date.now();

    if (error instanceof InteractorError) {
      return {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          ...(error.code ? { code: error.code } : {}),
          details: error.details,
          suggestions: error.suggestions,
          retryable: error.retryable,
          timestamp,
          ...(requestId ? { requestId } : {}),
        }
      };
    }

    // Handle known error types
    if (error.name === 'ValidationError') {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: 'Validation failed',
          details: error.message,
          suggestions: ['Please check your input and try again.'],
          retryable: false,
          timestamp,
          ...(requestId ? { requestId } : {}),
        }
      };
    }

    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: {
          type: ErrorType.NETWORK_ERROR,
          message: 'Network connection failed',
          details: error.message,
          suggestions: [
            'Check your network connection.',
            'Verify the target host is reachable.',
            'Try again in a few seconds.'
          ],
          retryable: true,
          timestamp,
          ...(requestId ? { requestId } : {}),
        }
      };
    }

    if (error.message.includes('ENOENT') || error.message.includes('EACCES')) {
      return {
        success: false,
        error: {
          type: ErrorType.FILE_ERROR,
          message: 'File operation failed',
          details: error.message,
          suggestions: [
            'Check file permissions.',
            'Verify the file path is correct.',
            'Ensure sufficient disk space.'
          ],
          retryable: false,
          timestamp,
          ...(requestId ? { requestId } : {}),
        }
      };
    }

    // Generic error fallback
    return {
      success: false,
      error: {
        type: ErrorType.INTERNAL,
        message: 'An unexpected error occurred',
        details: error.message,
        suggestions: [
          'Try again in a few seconds.',
          'Contact support if the problem persists.'
        ],
        retryable: true,
        timestamp,
        requestId
      }
    };
  }

  /**
   * Get appropriate HTTP status code for error type
   */
  static getStatusCode(error: Error): number {
    if (error instanceof InteractorError) {
      switch (error.type) {
        case ErrorType.VALIDATION:
          return 400;
        case ErrorType.UNAUTHORIZED:
          return 401;
        case ErrorType.FORBIDDEN:
          return 403;
        case ErrorType.NOT_FOUND:
          return 404;
        case ErrorType.CONFLICT:
          return 409;
        case ErrorType.RATE_LIMIT:
          return 429;
        case ErrorType.MODULE_ERROR:
        case ErrorType.NETWORK_ERROR:
        case ErrorType.FILE_ERROR:
        case ErrorType.DATABASE_ERROR:
          return 500;
        default:
          return 500;
      }
    }

    // Check for validation errors
    if (error.name === 'ValidationError') {
      return 400;
    }

    // Default to 500 for unknown errors
    return 500;
  }

  /**
   * Express error handling middleware
   */
  static middleware() {
    return (error: Error, req: Request, res: Response, next: any) => {
      const requestId = req.headers['x-request-id'] as string;
      const statusCode = ErrorHandler.getStatusCode(error);
      const response = ErrorHandler.toResponse(error, requestId);

      // Log the error with context
      ErrorHandler.logger.error(
        `API Error: ${error.message}`,
        'ErrorHandler',
        {
          path: req.path,
          method: req.method,
          statusCode,
          requestId,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          error: error.stack
        }
      );

      res.status(statusCode).json(response);
    };
  }

  /**
   * Wrap async route handlers to catch errors
   */
  static asyncHandler(fn: (req: Request, res: Response, next: any) => Promise<any>) {
    return (req: Request, res: Response, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Log error with appropriate level based on severity
   */
  static logError(error: Error, context?: Record<string, any>): void {
    const isRetryable = error instanceof InteractorError ? error.retryable : false;
    const logLevel = isRetryable ? 'warn' : 'error';

    ErrorHandler.logger[logLevel](
      `Error: ${error.message}`,
      'ErrorHandler',
      {
        type: error instanceof InteractorError ? error.type : 'unknown',
        retryable: isRetryable,
        stack: error.stack,
        ...context
      }
    );
  }
}