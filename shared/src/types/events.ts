// Event system types
export interface EventEmitter {
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, payload?: any): void;
  once(event: string, handler: EventHandler): void;
  removeAllListeners(event?: string): void;
}

export interface EventBus extends EventEmitter {
  // Event bus specific methods
  subscribe(pattern: string, handler: EventHandler): void;
  unsubscribe(pattern: string, handler: EventHandler): void;
  publish(topic: string, payload?: any): void;
  
  // Pattern matching support
  addPattern(pattern: string, handler: EventHandler): void;
  removePattern(pattern: string, handler: EventHandler): void;
}

// Event patterns and routing
export interface EventPattern {
  pattern: string;
  handler: EventHandler;
  options?: EventPatternOptions;
}

export interface EventPatternOptions {
  priority?: number;
  once?: boolean;
  timeout?: number;
}

// Event middleware types
export interface EventMiddleware {
  name: string;
  handler: (message: Message, next: () => void) => void | Promise<void>;
  priority?: number;
}

export interface EventPipeline {
  use(middleware: EventMiddleware): void;
  process(message: Message): Promise<void>;
}

// Event validation
export interface EventValidator {
  validate(event: string, payload?: any): ValidationResult;
  addSchema(event: string, schema: PayloadSchema): void;
  removeSchema(event: string): void;
}

// Event metrics and monitoring
export interface EventMetrics {
  eventCount: number;
  eventRate: number;
  errorCount: number;
  errorRate: number;
  averageLatency: number;
  lastEventTime: number;
}

export interface EventMonitor {
  getMetrics(): EventMetrics;
  reset(): void;
  onEvent(event: string, latency: number): void;
  onError(event: string, error: Error): void;
} 