import { InteractorError, ErrorType } from './ErrorHandler';
import { Logger } from './Logger';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
}

export class RetryHandler {
  private static logger = Logger.getInstance();

  /**
   * Execute a function with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = RetryHandler.defaultRetryCondition,
      onRetry
    } = options;

    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        const totalTime = Date.now() - startTime;
        
        if (attempt > 1) {
          RetryHandler.logger.info(
            `Operation succeeded after ${attempt} attempts`,
            'RetryHandler',
            { attempts: attempt, totalTime }
          );
        }
        
        return { result, attempts: attempt, totalTime };
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt
        if (attempt >= maxAttempts) {
          break;
        }
        
        // Check if we should retry this error
        if (!retryCondition(lastError, attempt)) {
          RetryHandler.logger.info(
            `Retry condition not met for error: ${lastError.message}`,
            'RetryHandler',
            { attempt, error: lastError.message }
          );
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
        
        RetryHandler.logger.warn(
          `Operation failed on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms`,
          'RetryHandler',
          { 
            attempt, 
            maxAttempts, 
            delay, 
            error: lastError.message,
            errorType: lastError.constructor.name
          }
        );
        
        // Call retry callback if provided
        if (onRetry) {
          try {
            onRetry(lastError, attempt, delay);
          } catch (callbackError) {
            RetryHandler.logger.error(
              'Error in retry callback',
              'RetryHandler',
              { error: String(callbackError) }
            );
          }
        }
        
        // Wait before retrying
        await RetryHandler.delay(delay);
      }
    }
    
    // All attempts failed
    const totalTime = Date.now() - startTime;
    RetryHandler.logger.error(
      `Operation failed after ${maxAttempts} attempts`,
      'RetryHandler',
      { maxAttempts, totalTime, finalError: lastError.message }
    );
    
    // Wrap the final error with retry context
    if (lastError instanceof InteractorError) {
      throw new InteractorError(
        lastError.type,
        `${lastError.message} (failed after ${maxAttempts} attempts)`,
        {
          ...lastError,
          context: {
            ...lastError.context,
            retryAttempts: maxAttempts,
            totalRetryTime: totalTime
          }
        }
      );
    }
    
    throw InteractorError.internal(
      `Operation failed after ${maxAttempts} retry attempts: ${lastError.message}`,
      lastError
    );
  }

  /**
   * Default retry condition - retry on network errors and some specific conditions
   */
  private static defaultRetryCondition(error: Error, attempt: number): boolean {
    // Don't retry validation errors or other non-retryable errors
    if (error instanceof InteractorError) {
      return error.retryable ?? false;
    }
    
    const errorMessage = error.message.toLowerCase();
    
    // Retry on network-related errors
    if (errorMessage.includes('enotfound') || 
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('socket hang up')) {
      return true;
    }
    
    // Retry on HTTP 5xx server errors
    if (errorMessage.includes('http 5') || 
        errorMessage.includes('internal server error') ||
        errorMessage.includes('service unavailable') ||
        errorMessage.includes('gateway timeout')) {
      return true;
    }
    
    // Don't retry on HTTP 4xx client errors (except 429 rate limit)
    if (errorMessage.includes('http 4') && !errorMessage.includes('429')) {
      return false;
    }
    
    // Retry on temporary file system errors
    if (errorMessage.includes('ebusy') || 
        errorMessage.includes('eacces') ||
        errorMessage.includes('eagain')) {
      return true;
    }
    
    // Don't retry by default for unknown errors
    return false;
  }

  /**
   * Retry specifically for network operations
   */
  static async withNetworkRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    return RetryHandler.withRetry(operation, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffFactor: 2,
      retryCondition: (error) => {
        if (error instanceof InteractorError && error.type === ErrorType.NETWORK_ERROR) {
          return true;
        }
        return RetryHandler.defaultRetryCondition(error, 1);
      },
      ...options
    });
  }

  /**
   * Retry for file operations
   */
  static async withFileRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    return RetryHandler.withRetry(operation, {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 2000,
      backoffFactor: 2,
      retryCondition: (error) => {
        if (error instanceof InteractorError && error.type === ErrorType.FILE_ERROR) {
          return true;
        }
        const errorMessage = error.message.toLowerCase();
        return errorMessage.includes('ebusy') || 
               errorMessage.includes('eagain') ||
               errorMessage.includes('locked');
      },
      ...options
    });
  }

  /**
   * Retry for module operations
   */
  static async withModuleRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    return RetryHandler.withRetry(operation, {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 3000,
      backoffFactor: 1.5,
      retryCondition: (error) => {
        if (error instanceof InteractorError && error.type === ErrorType.MODULE_ERROR) {
          return error.retryable ?? false;
        }
        return false;
      },
      ...options
    });
  }

  /**
   * Simple delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry decorator for methods
   */
  static retryable(options: RetryOptions = {}) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args: any[]) {
        const { result } = await RetryHandler.withRetry(
          () => originalMethod.apply(this, args),
          options
        );
        return result;
      };
      
      return descriptor;
    };
  }
}