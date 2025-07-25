import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageRoute,
  RouteCondition,
  EventHandler,
  EventBus,
  EventPattern,
  EventPatternOptions,
  EventMiddleware,
  EventPipeline,
  EventValidator,
  EventMonitor,
  EventMetrics,
  ValidationResult
} from '@interactor/shared';

export class MessageRouter extends EventEmitter implements EventBus {
  private routes: Map<string, MessageRoute> = new Map();
  private subscriptions: Map<string, Set<EventHandler>> = new Map();
  private patternSubscriptions: Map<string, Set<EventHandler>> = new Map();
  private middleware: EventMiddleware[] = [];
  private validator: EventValidator;
  private monitor: EventMonitor;
  private messageQueue: Message[] = [];
  private isProcessing = false;
  private maxQueueSize = 1000;

  constructor() {
    super();
    this.validator = new EventValidatorImpl();
    this.monitor = new EventMonitorImpl();
  }

  /**
   * Subscribe to a specific topic
   */
  public subscribe(pattern: string, handler: EventHandler): void {
    if (!this.subscriptions.has(pattern)) {
      this.subscriptions.set(pattern, new Set());
    }
    this.subscriptions.get(pattern)!.add(handler);
  }

  /**
   * Unsubscribe from a specific topic
   */
  public unsubscribe(pattern: string, handler: EventHandler): void {
    const handlers = this.subscriptions.get(pattern);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscriptions.delete(pattern);
      }
    }
  }

  /**
   * Publish a message to a topic
   */
  public publish(topic: string, payload?: any): void {
    const message: Message = {
      id: uuidv4(),
      source: 'system',
      event: topic,
      payload,
      timestamp: Date.now()
    };

    this.routeMessage(message);
  }

  /**
   * Add a pattern subscription with options
   */
  public addPattern(pattern: string, handler: EventHandler, options?: EventPatternOptions): void {
    if (!this.patternSubscriptions.has(pattern)) {
      this.patternSubscriptions.set(pattern, new Set());
    }
    this.patternSubscriptions.get(pattern)!.add(handler);
  }

  /**
   * Remove a pattern subscription
   */
  public removePattern(pattern: string, handler: EventHandler): void {
    const handlers = this.patternSubscriptions.get(pattern);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.patternSubscriptions.delete(pattern);
      }
    }
  }

  /**
   * Route a message through the system
   */
  public async routeMessage(message: Message): Promise<void> {
    const startTime = Date.now();

    try {
      // Add to queue if processing
      if (this.isProcessing) {
        if (this.messageQueue.length >= this.maxQueueSize) {
          this.messageQueue.shift(); // Remove oldest message
        }
        this.messageQueue.push(message);
        return;
      }

      this.isProcessing = true;

      // Validate message
      const validation = this.validator.validate(message.event, message.payload);
      if (!validation.valid) {
        throw new Error(`Message validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Process middleware
      await this.processMiddleware(message);

      // Route to direct subscribers
      await this.routeToSubscribers(message);

      // Route to pattern subscribers
      await this.routeToPatternSubscribers(message);

      // Route through configured routes
      await this.routeThroughRoutes(message);

      // Update metrics
      const latency = Date.now() - startTime;
      this.monitor.onEvent(message.event, latency);

      // Emit routed event
      this.emit('messageRouted', message);

    } catch (error) {
      this.monitor.onError(message.event, error as Error);
      this.emit('messageError', { message, error });
      throw error;
    } finally {
      this.isProcessing = false;

      // Process queued messages
      while (this.messageQueue.length > 0) {
        const queuedMessage = this.messageQueue.shift()!;
        await this.routeMessage(queuedMessage);
      }
    }
  }

  /**
   * Add a route for message routing
   */
  public addRoute(route: MessageRoute): void {
    this.routes.set(route.id, route);
    this.emit('routeAdded', route);
  }

  /**
   * Remove a route
   */
  public removeRoute(routeId: string): boolean {
    const removed = this.routes.delete(routeId);
    if (removed) {
      this.emit('routeRemoved', routeId);
    }
    return removed;
  }

  /**
   * Get all routes
   */
  public getRoutes(): MessageRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get route by ID
   */
  public getRoute(routeId: string): MessageRoute | undefined {
    return this.routes.get(routeId);
  }

  /**
   * Add middleware to the processing pipeline
   */
  public use(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
    this.middleware.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Get event metrics
   */
  public getMetrics(): EventMetrics {
    return this.monitor.getMetrics();
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.monitor.reset();
  }

  /**
   * Process middleware pipeline
   */
  private async processMiddleware(message: Message): Promise<void> {
    for (const mw of this.middleware) {
      await new Promise<void>((resolve, reject) => {
        try {
          mw.handler(message, resolve);
        } catch (error) {
          reject(error);
        }
      });
    }
  }

  /**
   * Route message to direct subscribers
   */
  private async routeToSubscribers(message: Message): Promise<void> {
    const handlers = this.subscriptions.get(message.event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(message.payload);
        } catch (error) {
          this.emit('handlerError', { handler, message, error });
        }
      }
    }
  }

  /**
   * Route message to pattern subscribers
   */
  private async routeToPatternSubscribers(message: Message): Promise<void> {
    for (const [pattern, handlers] of this.patternSubscriptions) {
      if (this.matchesPattern(message.event, pattern)) {
        for (const handler of handlers) {
          try {
            await handler(message.payload);
          } catch (error) {
            this.emit('handlerError', { handler, message, error });
          }
        }
      }
    }
  }

  /**
   * Route message through configured routes
   */
  private async routeThroughRoutes(message: Message): Promise<void> {
    for (const route of this.routes.values()) {
      if (route.source === message.source && route.event === message.event) {
        if (this.evaluateRouteConditions(message, route.conditions)) {
          const transformedPayload = route.transform ? route.transform(message.payload) : message.payload;
          
          const routedMessage: Message = {
            id: uuidv4(),
            source: route.source,
            target: route.target,
            event: route.event,
            payload: transformedPayload,
            timestamp: Date.now()
          };

          // Emit to target
          this.emit(`route:${route.target}`, routedMessage);
        }
      }
    }
  }

  /**
   * Check if event matches pattern
   */
  private matchesPattern(event: string, pattern: string): boolean {
    // Simple wildcard matching - can be extended for more complex patterns
    const patternParts = pattern.split('.');
    const eventParts = event.split('.');
    
    if (patternParts.length !== eventParts.length) {
      return false;
    }
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== '*' && patternParts[i] !== eventParts[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Evaluate route conditions
   */
  private evaluateRouteConditions(message: Message, conditions?: RouteCondition[]): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const value = this.getNestedValue(message.payload, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'not_equals':
          if (value === condition.value) return false;
          break;
        case 'contains':
          if (typeof value === 'string' && !value.includes(condition.value)) return false;
          break;
        case 'greater_than':
          if (typeof value !== 'number' || value <= condition.value) return false;
          break;
        case 'less_than':
          if (typeof value !== 'number' || value >= condition.value) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Event validator implementation
 */
class EventValidatorImpl implements EventValidator {
  private schemas: Map<string, any> = new Map();

  public validate(event: string, payload?: any): ValidationResult {
    const schema = this.schemas.get(event);
    if (!schema) {
      return { valid: true, errors: [], warnings: [] };
    }

    // Basic validation - can be extended with more sophisticated validation
    try {
      // For now, just check if payload is an object when schema expects it
      if (schema.type === 'object' && payload && typeof payload !== 'object') {
        return {
          valid: false,
          errors: [{ field: 'payload', message: 'Payload must be an object', code: 'TYPE_MISMATCH' }],
          warnings: []
        };
      }
      return { valid: true, errors: [], warnings: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [{ field: 'payload', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        warnings: []
      };
    }
  }

  public addSchema(event: string, schema: any): void {
    this.schemas.set(event, schema);
  }

  public removeSchema(event: string): void {
    this.schemas.delete(event);
  }
}

/**
 * Event monitor implementation
 */
class EventMonitorImpl implements EventMonitor {
  private metrics: EventMetrics = {
    eventCount: 0,
    eventRate: 0,
    errorCount: 0,
    errorRate: 0,
    averageLatency: 0,
    lastEventTime: 0
  };

  private eventTimes: number[] = [];
  private errorTimes: number[] = [];
  private latencies: number[] = [];
  private maxHistory = 1000;

  public getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  public reset(): void {
    this.metrics = {
      eventCount: 0,
      eventRate: 0,
      errorCount: 0,
      errorRate: 0,
      averageLatency: 0,
      lastEventTime: 0
    };
    this.eventTimes = [];
    this.errorTimes = [];
    this.latencies = [];
  }

  public onEvent(event: string, latency: number): void {
    const now = Date.now();
    
    this.metrics.eventCount++;
    this.metrics.lastEventTime = now;
    this.eventTimes.push(now);
    
    this.latencies.push(latency);
    
    // Keep history size manageable
    if (this.eventTimes.length > this.maxHistory) {
      this.eventTimes.shift();
    }
    if (this.latencies.length > this.maxHistory) {
      this.latencies.shift();
    }
    
    // Calculate rates (events per second over last minute)
    const oneMinuteAgo = now - 60000;
    this.metrics.eventRate = this.eventTimes.filter(time => time > oneMinuteAgo).length / 60;
    
    // Calculate average latency
    this.metrics.averageLatency = this.latencies.reduce((sum, l) => sum + l, 0) / this.latencies.length;
  }

  public onError(event: string, error: Error): void {
    const now = Date.now();
    
    this.metrics.errorCount++;
    this.errorTimes.push(now);
    
    if (this.errorTimes.length > this.maxHistory) {
      this.errorTimes.shift();
    }
    
    // Calculate error rate
    const oneMinuteAgo = now - 60000;
    this.metrics.errorRate = this.errorTimes.filter(time => time > oneMinuteAgo).length / 60;
  }
} 