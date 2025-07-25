import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageRouter } from '@/core/MessageRouter';
import { Message, MessageRoute, EventHandler, EventMetrics } from '@interactor/shared';

describe('MessageRouter', () => {
  let messageRouter: MessageRouter;

  beforeEach(() => {
    messageRouter = new MessageRouter();
  });

  afterEach(async () => {
    await messageRouter.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize with empty routes', () => {
      expect(messageRouter.getRoutes()).toEqual([]);
      expect(messageRouter.getMetrics()).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customRouter = new MessageRouter({
        maxRoutes: 100,
        enableMetrics: true
      });
      expect(customRouter).toBeInstanceOf(MessageRouter);
    });
  });

  describe('Route Management', () => {
    it('should add routes successfully', async () => {
      const route: MessageRoute = {
        id: 'test-route',
        name: 'Test Route',
        source: 'test-source',
        target: 'test-target',
        enabled: true,
        conditions: [],
        transformations: []
      };

      await messageRouter.addRoute(route);
      
      const routes = messageRouter.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].id).toBe('test-route');
    });

    it('should handle concurrent route additions', async () => {
      const routePromises = [];
      
      for (let i = 0; i < 10; i++) {
        const route: MessageRoute = {
          id: `route-${i}`,
          name: `Route ${i}`,
          source: `source-${i}`,
          target: `target-${i}`,
          enabled: true,
          conditions: [],
          transformations: []
        };
        routePromises.push(messageRouter.addRoute(route));
      }

      await Promise.all(routePromises);
      
      const routes = messageRouter.getRoutes();
      expect(routes).toHaveLength(10);
    });

    it('should update existing routes', async () => {
      const route: MessageRoute = {
        id: 'update-test',
        name: 'Original Name',
        source: 'test-source',
        target: 'test-target',
        enabled: true,
        conditions: [],
        transformations: []
      };

      await messageRouter.addRoute(route);
      
      const updatedRoute = { ...route, name: 'Updated Name' };
      await messageRouter.updateRoute('update-test', updatedRoute);
      
      const routes = messageRouter.getRoutes();
      expect(routes[0].name).toBe('Updated Name');
    });

    it('should remove routes', async () => {
      const route: MessageRoute = {
        id: 'remove-test',
        name: 'Remove Test',
        source: 'test-source',
        target: 'test-target',
        enabled: true,
        conditions: [],
        transformations: []
      };

      await messageRouter.addRoute(route);
      expect(messageRouter.getRoutes()).toHaveLength(1);
      
      await messageRouter.removeRoute('remove-test');
      expect(messageRouter.getRoutes()).toHaveLength(0);
    });

    it('should handle route validation', async () => {
      const invalidRoute = {
        id: '',
        name: '',
        source: '',
        target: '',
        enabled: true,
        conditions: [],
        transformations: []
      } as MessageRoute;

      await expect(messageRouter.addRoute(invalidRoute)).rejects.toThrow();
    });
  });

  describe('Message Routing', () => {
    it('should route messages to registered handlers', async () => {
      const receivedMessages: Message[] = [];
      const handler: EventHandler = async (message: Message) => {
        receivedMessages.push(message);
      };

      messageRouter.subscribe('test-topic', handler);

      const testMessage: Message = {
        id: 'msg-1',
        topic: 'test-topic',
        payload: { data: 'test' },
        timestamp: Date.now(),
        source: 'test-source'
      };

      await messageRouter.publish(testMessage);
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload.data).toBe('test');
    });

    it('should handle multiple subscribers for same topic', async () => {
      const handler1Messages: Message[] = [];
      const handler2Messages: Message[] = [];

      const handler1: EventHandler = async (message: Message) => {
        handler1Messages.push(message);
      };

      const handler2: EventHandler = async (message: Message) => {
        handler2Messages.push(message);
      };

      messageRouter.subscribe('multi-topic', handler1);
      messageRouter.subscribe('multi-topic', handler2);

      const testMessage: Message = {
        id: 'msg-2',
        topic: 'multi-topic',
        payload: { data: 'multi-test' },
        timestamp: Date.now(),
        source: 'test-source'
      };

      await messageRouter.publish(testMessage);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(handler1Messages).toHaveLength(1);
      expect(handler2Messages).toHaveLength(1);
      expect(handler1Messages[0].payload.data).toBe('multi-test');
      expect(handler2Messages[0].payload.data).toBe('multi-test');
    });

    it('should handle concurrent message publishing', async () => {
      const receivedMessages: Message[] = [];
      const handler: EventHandler = async (message: Message) => {
        receivedMessages.push(message);
      };

      messageRouter.subscribe('concurrent-topic', handler);

      const publishPromises = [];
      
      for (let i = 0; i < 50; i++) {
        const message: Message = {
          id: `msg-${i}`,
          topic: 'concurrent-topic',
          payload: { index: i },
          timestamp: Date.now(),
          source: 'test-source'
        };
        publishPromises.push(messageRouter.publish(message));
      }

      await Promise.all(publishPromises);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(receivedMessages).toHaveLength(50);
    });

    it('should handle async message processing', async () => {
      const processingOrder: string[] = [];
      
      const slowHandler: EventHandler = async (message: Message) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        processingOrder.push(`slow-${message.payload.index}`);
      };

      const fastHandler: EventHandler = async (message: Message) => {
        processingOrder.push(`fast-${message.payload.index}`);
      };

      messageRouter.subscribe('async-topic', slowHandler);
      messageRouter.subscribe('async-topic', fastHandler);

      const messages = [];
      for (let i = 0; i < 3; i++) {
        messages.push({
          id: `msg-${i}`,
          topic: 'async-topic',
          payload: { index: i },
          timestamp: Date.now(),
          source: 'test-source'
        });
      }

      await Promise.all(messages.map(msg => messageRouter.publish(msg)));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(processingOrder.length).toBeGreaterThan(0);
    });
  });

  describe('Middleware Pipeline', () => {
    it('should execute middleware in order', async () => {
      const executionOrder: string[] = [];
      
      const middleware1 = async (message: Message, next: () => Promise<void>) => {
        executionOrder.push('middleware1-start');
        await next();
        executionOrder.push('middleware1-end');
      };

      const middleware2 = async (message: Message, next: () => Promise<void>) => {
        executionOrder.push('middleware2-start');
        await next();
        executionOrder.push('middleware2-end');
      };

      messageRouter.use(middleware1);
      messageRouter.use(middleware2);

      const handler: EventHandler = async (message: Message) => {
        executionOrder.push('handler');
      };

      messageRouter.subscribe('middleware-topic', handler);

      const testMessage: Message = {
        id: 'middleware-test',
        topic: 'middleware-topic',
        payload: { data: 'test' },
        timestamp: Date.now(),
        source: 'test-source'
      };

      await messageRouter.publish(testMessage);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(executionOrder).toEqual([
        'middleware1-start',
        'middleware2-start',
        'handler',
        'middleware2-end',
        'middleware1-end'
      ]);
    });

    it('should handle middleware errors gracefully', async () => {
      const errorMiddleware = async (message: Message, next: () => Promise<void>) => {
        throw new Error('Middleware error');
      };

      const handler: EventHandler = async (message: Message) => {
        // Should not be called due to middleware error
        throw new Error('Handler should not be called');
      };

      messageRouter.use(errorMiddleware);
      messageRouter.subscribe('error-topic', handler);

      const testMessage: Message = {
        id: 'error-test',
        topic: 'error-topic',
        payload: { data: 'test' },
        timestamp: Date.now(),
        source: 'test-source'
      };

      // Should not throw error
      await expect(messageRouter.publish(testMessage)).resolves.not.toThrow();
    });
  });

  describe('Message Filtering and Conditions', () => {
    it('should filter messages based on conditions', async () => {
      const receivedMessages: Message[] = [];
      
      const handler: EventHandler = async (message: Message) => {
        receivedMessages.push(message);
      };

      messageRouter.subscribe('filter-topic', handler);

      const route: MessageRoute = {
        id: 'filter-route',
        name: 'Filter Route',
        source: 'test-source',
        target: 'filter-topic',
        enabled: true,
        conditions: [
          {
            field: 'payload.type',
            operator: 'equals',
            value: 'important'
          }
        ],
        transformations: []
      };

      await messageRouter.addRoute(route);

      const importantMessage: Message = {
        id: 'important-msg',
        topic: 'source-topic',
        payload: { type: 'important', data: 'important data' },
        timestamp: Date.now(),
        source: 'test-source'
      };

      const regularMessage: Message = {
        id: 'regular-msg',
        topic: 'source-topic',
        payload: { type: 'regular', data: 'regular data' },
        timestamp: Date.now(),
        source: 'test-source'
      };

      await messageRouter.publish(importantMessage);
      await messageRouter.publish(regularMessage);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload.type).toBe('important');
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track message metrics', async () => {
      const handler: EventHandler = async (message: Message) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 10));
      };

      messageRouter.subscribe('metrics-topic', handler);

      const messages = [];
      for (let i = 0; i < 5; i++) {
        messages.push({
          id: `metrics-${i}`,
          topic: 'metrics-topic',
          payload: { data: `test-${i}` },
          timestamp: Date.now(),
          source: 'test-source'
        });
      }

      await Promise.all(messages.map(msg => messageRouter.publish(msg)));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = messageRouter.getMetrics();
      expect(metrics.totalMessages).toBeGreaterThanOrEqual(5);
      expect(metrics.activeRoutes).toBeGreaterThanOrEqual(0);
    });

    it('should track route performance', async () => {
      const route: MessageRoute = {
        id: 'perf-route',
        name: 'Performance Route',
        source: 'perf-source',
        target: 'perf-target',
        enabled: true,
        conditions: [],
        transformations: []
      };

      await messageRouter.addRoute(route);
      
      const metrics = messageRouter.getMetrics();
      expect(metrics.activeRoutes).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      const errorHandler: EventHandler = async (message: Message) => {
        throw new Error('Handler error');
      };

      messageRouter.subscribe('error-topic', errorHandler);

      const testMessage: Message = {
        id: 'handler-error-test',
        topic: 'error-topic',
        payload: { data: 'test' },
        timestamp: Date.now(),
        source: 'test-source'
      };

      // Should not throw error
      await expect(messageRouter.publish(testMessage)).resolves.not.toThrow();
    });

    it('should handle unsubscribe errors', async () => {
      const handler: EventHandler = async (message: Message) => {
        // Do nothing
      };

      messageRouter.subscribe('unsub-topic', handler);
      
      // Should not throw error
      expect(() => messageRouter.unsubscribe('unsub-topic', handler)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle high-volume message routing', async () => {
      const handler: EventHandler = async (message: Message) => {
        // Minimal processing
      };

      messageRouter.subscribe('perf-topic', handler);

      const startTime = Date.now();
      const publishPromises = [];
      
      for (let i = 0; i < 1000; i++) {
        const message: Message = {
          id: `perf-${i}`,
          topic: 'perf-topic',
          payload: { index: i },
          timestamp: Date.now(),
          source: 'test-source'
        };
        publishPromises.push(messageRouter.publish(message));
      }

      await Promise.all(publishPromises);
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
}); 