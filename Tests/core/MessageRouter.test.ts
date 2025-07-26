import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageRouter } from '../../backend/src/core/MessageRouter';
import { EventHandler, EventMiddleware } from '@interactor/shared';

describe('MessageRouter', () => {
  let messageRouter: MessageRouter;

  beforeEach(() => {
    messageRouter = new MessageRouter();
  });

  afterEach(() => {
    messageRouter.removeAllListeners();
  });

  describe('Basic Functionality', () => {
    it('should subscribe and publish messages', async () => {
      const receivedMessages: any[] = [];
      const handler: EventHandler = (payload: any) => { receivedMessages.push(payload); };

      messageRouter.subscribe('test.topic', handler);
      messageRouter.publish('test.topic', { data: 'test' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toEqual({ data: 'test' });
    });

    it('should handle multiple subscribers', async () => {
      const received1: any[] = [];
      const received2: any[] = [];
      
      const handler1: EventHandler = (payload: any) => { received1.push(payload); };
      const handler2: EventHandler = (payload: any) => { received2.push(payload); };

      messageRouter.subscribe('test.topic', handler1);
      messageRouter.subscribe('test.topic', handler2);
      messageRouter.publish('test.topic', { data: 'test' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
      expect(received1[0]).toEqual({ data: 'test' });
      expect(received2[0]).toEqual({ data: 'test' });
    });

    it('should unsubscribe handlers', async () => {
      const received: any[] = [];
      const handler: EventHandler = (payload: any) => { received.push(payload); };

      messageRouter.subscribe('test.topic', handler);
      messageRouter.publish('test.topic', { data: 'test1' });
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      messageRouter.unsubscribe('test.topic', handler);
      messageRouter.publish('test.topic', { data: 'test2' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ data: 'test1' });
    });
  });

  describe('Pattern Subscriptions', () => {
    it('should handle pattern subscriptions', async () => {
      const received: any[] = [];
      const handler: EventHandler = (payload: any) => { received.push(payload); };

      messageRouter.addPattern('user.*', handler);
      messageRouter.publish('user.created', { id: 1 });
      messageRouter.publish('user.updated', { id: 2 });
      messageRouter.publish('system.log', { message: 'log' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received).toHaveLength(2);
      expect(received[0]).toEqual({ id: 1 });
      expect(received[1]).toEqual({ id: 2 });
    });

    it('should remove pattern subscriptions', async () => {
      const received: any[] = [];
      const handler: EventHandler = (payload: any) => { received.push(payload); };

      messageRouter.addPattern('user.*', handler);
      messageRouter.publish('user.created', { id: 1 });
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      messageRouter.removePattern('user.*', handler);
      messageRouter.publish('user.updated', { id: 2 });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ id: 1 });
    });
  });

  describe('Route Management', () => {
    it('should add and remove routes', () => {
      const route = {
        id: 'test-route',
        source: 'test.source',
        target: 'test.target',
        event: 'test.event',
        conditions: []
      };

      messageRouter.addRoute(route);
      expect(messageRouter.getRoutes()).toHaveLength(1);
      expect(messageRouter.getRoute('test-route')).toEqual(route);

      expect(messageRouter.removeRoute('test-route')).toBe(true);
      expect(messageRouter.getRoutes()).toHaveLength(0);
      expect(messageRouter.getRoute('test-route')).toBeUndefined();
    });

    it('should return undefined for non-existent route', () => {
      expect(messageRouter.getRoute('non-existent')).toBeUndefined();
    });
  });

  describe('Middleware', () => {
    it('should process middleware', async () => {
      const processed: any[] = [];
      const middleware: EventMiddleware = {
        name: 'test-middleware',
        handler: async (message, next) => {
          processed.push(message);
          await next();
        }
      };

      const received: any[] = [];
      const handler: EventHandler = (payload: any) => { received.push(payload); };

      messageRouter.use(middleware);
      messageRouter.subscribe('test.topic', handler);
      messageRouter.publish('test.topic', { data: 'test' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(processed).toHaveLength(1);
      expect(processed[0].event).toBe('test.topic');
      expect(processed[0].payload).toEqual({ data: 'test' });
      expect(received).toHaveLength(1);
    });

    it('should handle middleware errors', async () => {
      const middleware: EventMiddleware = {
        name: 'error-middleware',
        handler: async (message, next) => {
          throw new Error('Middleware error');
        }
      };

      const received: any[] = [];
      const handler: EventHandler = (payload: any) => { received.push(payload); };

      messageRouter.use(middleware);
      messageRouter.subscribe('test.topic', handler);
      
      // This should not throw but should be handled internally
      messageRouter.publish('test.topic', { data: 'test' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(received).toHaveLength(0); // Handler should not be called due to middleware error
    });
  });

  describe('Metrics', () => {
    it('should provide metrics', () => {
      const metrics = messageRouter.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.eventCount).toBe('number');
      expect(typeof metrics.errorCount).toBe('number');
      expect(typeof metrics.averageLatency).toBe('number');
    });

    it('should reset metrics', () => {
      messageRouter.resetMetrics();
      const metrics = messageRouter.getMetrics();
      expect(metrics.eventCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      const errorHandler: EventHandler = (payload: any) => {
        throw new Error('Handler error');
      };

      const normalHandler: EventHandler = (payload: any) => {
        // This should still be called
      };

      messageRouter.subscribe('test.topic', errorHandler);
      messageRouter.subscribe('test.topic', normalHandler);
      
      // This should not throw
      messageRouter.publish('test.topic', { data: 'test' });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  });
}); 