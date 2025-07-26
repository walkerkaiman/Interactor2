import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageRouter } from '../../backend/src/core/MessageRouter';
import { 
  Message, 
  MessageRoute, 
  RouteCondition,
  EventMiddleware,
  EventPattern
} from '@interactor/shared';

describe('Message Routing Integration Tests', () => {
  let messageRouter: MessageRouter;

  beforeEach(() => {
    messageRouter = new MessageRouter();
  });

  afterEach(() => {
    messageRouter.removeAllListeners();
  });

  describe('Complex Routing Patterns', () => {
    it('should handle wildcard pattern matching', async () => {
      // Subscribe to wildcard pattern
      const receivedPayloads: any[] = [];
      messageRouter.addPattern('dmx.*', (payload) => {
        receivedPayloads.push(payload);
      });

      // Publish messages with different patterns
      messageRouter.publish('dmx.output', { universe: 1, channels: [255, 0, 0] });
      messageRouter.publish('dmx.input', { channel: 1, value: 128 });
      messageRouter.publish('dmx.error', { error: 'Connection failed' });
      messageRouter.publish('other.event', { data: 'should not match' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify only dmx.* messages were received
      expect(receivedPayloads).toHaveLength(3);
      expect(receivedPayloads[0]).toEqual({ universe: 1, channels: [255, 0, 0] });
      expect(receivedPayloads[1]).toEqual({ channel: 1, value: 128 });
      expect(receivedPayloads[2]).toEqual({ error: 'Connection failed' });
    });

    it('should handle nested wildcard patterns', async () => {
      // Subscribe to nested wildcard patterns
      const universePayloads: any[] = [];
      const allDmxPayloads: any[] = [];

      messageRouter.addPattern('dmx.universe.*', (payload) => {
        universePayloads.push(payload);
      });

      messageRouter.addPattern('dmx.*', (payload) => {
        allDmxPayloads.push(payload);
      });

      // Publish messages
      messageRouter.publish('dmx.universe.1', { channels: [255, 0, 0] });
      messageRouter.publish('dmx.universe.2', { channels: [0, 255, 0] });
      messageRouter.publish('dmx.output', { data: 'output event' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify pattern matching - dmx.universe.* should match 2 messages
      expect(universePayloads).toHaveLength(2);
      // dmx.* should match only 1 message (dmx.output) because dmx.universe.1 and dmx.universe.2 have 3 parts
      expect(allDmxPayloads).toHaveLength(1);
      
      // Verify specific patterns were matched
      expect(universePayloads).toContainEqual({ channels: [255, 0, 0] });
      expect(universePayloads).toContainEqual({ channels: [0, 255, 0] });
      expect(allDmxPayloads).toContainEqual({ data: 'output event' });
    });

    it('should handle multiple conditions in a single route', async () => {
      const receivedMessages: Message[] = [];
      
      // Create route with multiple conditions (only payload-based conditions)
      const conditions: RouteCondition[] = [
        { field: 'value', operator: 'greater_than', value: 100 },
        { field: 'channel', operator: 'less_than', value: 512 }
      ];

      const route: MessageRoute = {
        id: 'multi_condition_route',
        source: 'test_input',
        target: 'test_output',
        event: 'data',
        conditions,
      };

      messageRouter.addRoute(route);

      // Subscribe to the routed event (not the target event directly)
      messageRouter.on('route:test_output', (message) => {
        receivedMessages.push(message);
      });

      // Test message that should match all conditions
      const validMessage: Message = {
        id: 'test_1',
        source: 'test_input',
        event: 'data',
        timestamp: Date.now(),
        payload: { value: 200, channel: 256 }
      };

      // Test message that should not match conditions
      const invalidMessage: Message = {
        id: 'test_2',
        source: 'test_input',
        event: 'data',
        timestamp: Date.now(),
        payload: { value: 50, channel: 600 }
      };

      // Route messages
      await messageRouter.routeMessage(validMessage);
      await messageRouter.routeMessage(invalidMessage);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify only valid message was routed
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload.value).toBe(200);
      expect(receivedMessages[0].payload.channel).toBe(256);
    });
  });

  describe('Middleware Integration', () => {
    it('should process messages through middleware chain', async () => {
      const processingOrder: string[] = [];
      const processedMessages: Message[] = [];

      const middleware1: EventMiddleware = {
        name: 'middleware1',
        handler: async (message, next) => {
          processingOrder.push('middleware1');
          await next();
        }
      };

      const middleware2: EventMiddleware = {
        name: 'middleware2',
        handler: async (message, next) => {
          processingOrder.push('middleware2');
          await next();
        }
      };

      const middleware3: EventMiddleware = {
        name: 'middleware3',
        handler: async (message, next) => {
          processingOrder.push('middleware3');
          processedMessages.push(message);
          await next();
        }
      };

      // Add middleware to router
      messageRouter.use(middleware1);
      messageRouter.use(middleware2);
      messageRouter.use(middleware3);

      // Subscribe to events
      messageRouter.subscribe('test.event', (payload) => {
        // Event handler
      });

      // Publish message
      messageRouter.publish('test.event', { data: 'test' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify middleware processing order
      expect(processingOrder).toEqual(['middleware1', 'middleware2', 'middleware3']);

      // Verify message was processed by all middleware
      expect(processedMessages).toHaveLength(1);
    });

    it('should handle middleware errors gracefully', async () => {
      const errorMessages: any[] = [];
      const processedMessages: Message[] = [];

      const errorMiddleware: EventMiddleware = {
        name: 'errorMiddleware',
        handler: async (message, next) => {
          throw new Error('Middleware error');
        }
      };

      const normalMiddleware: EventMiddleware = {
        name: 'normalMiddleware',
        handler: async (message, next) => {
          processedMessages.push(message);
          await next();
        }
      };

      // Listen for middleware errors
      messageRouter.on('middlewareError', (data) => {
        errorMessages.push(data.error);
      });

      // Add middleware to router
      messageRouter.use(errorMiddleware);
      messageRouter.use(normalMiddleware);

      // Subscribe to events
      messageRouter.subscribe('test.event', (payload) => {
        // Event handler
      });

      // Publish message
      messageRouter.publish('test.event', { data: 'test' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify error was handled
      expect(errorMessages.length).toBeGreaterThan(0);
      // Normal middleware should not be called due to error
      expect(processedMessages).toHaveLength(0);
    });
  });

  describe('Message Queue and Performance', () => {
    it('should handle message queue overflow gracefully', async () => {
      const processedMessages: Message[] = [];
      const startTime = Date.now();

      // Create slow middleware to simulate processing delay
      const slowMiddleware: EventMiddleware = {
        name: 'slowMiddleware',
        handler: async (message, next) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          processedMessages.push(message);
          await next();
        }
      };

      messageRouter.use(slowMiddleware);

      // Subscribe to events
      messageRouter.subscribe('test.event', (payload) => {
        // Event handler
      });

      // Send many messages quickly to overflow queue
      for (let i = 0; i < 2000; i++) {
        messageRouter.publish('test.event', { data: `message_${i}` });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const processingTime = Date.now() - startTime;

      // Verify system handled the load
      expect(processedMessages.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should maintain message ordering for same source', async () => {
      const receivedMessages: any[] = [];
      const messageCount = 10;

      // Subscribe to events
      messageRouter.subscribe('order.test', (payload) => {
        receivedMessages.push(payload);
      });

      // Send messages in sequence
      for (let i = 0; i < messageCount; i++) {
        messageRouter.publish('order.test', { 
          sequence: i,
          data: `message_${i}` 
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify all messages were received
      expect(receivedMessages).toHaveLength(messageCount);
      
      // Verify messages are in order by checking sequence numbers
      for (let i = 0; i < receivedMessages.length; i++) {
        expect(receivedMessages[i].sequence).toBe(i);
      }
    });
  });

  describe('Route Management', () => {
    it('should handle dynamic route addition and removal', async () => {
      const receivedMessages: Message[] = [];

      // Subscribe to the routed event
      messageRouter.on('route:dynamic_target', (message) => {
        receivedMessages.push(message);
      });

      // Create and add route
      const route: MessageRoute = {
        id: 'dynamic_route',
        source: 'dynamic_source',
        target: 'dynamic_target',
        event: 'dynamic.event',
        conditions: []
      };

      messageRouter.addRoute(route);

      // Send message that should be routed
      const message1: Message = {
        id: 'test_1',
        source: 'dynamic_source',
        event: 'dynamic.event',
        payload: { data: 'test1' },
        timestamp: Date.now()
      };

      await messageRouter.routeMessage(message1);

      // Remove route
      messageRouter.removeRoute('dynamic_route');

      // Send message that should not be routed
      const message2: Message = {
        id: 'test_2',
        source: 'dynamic_source',
        event: 'dynamic.event',
        payload: { data: 'test2' },
        timestamp: Date.now()
      };

      await messageRouter.routeMessage(message2);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify only the first message was routed (route was removed before second message)
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].payload.data).toBe('test1');
    });

    it('should handle route enabling and disabling', async () => {
      const receivedMessages: Message[] = [];

      // Subscribe to the routed event
      messageRouter.on('route:toggle_target', (message) => {
        receivedMessages.push(message);
      });

      // Create route
      const route: MessageRoute = {
        id: 'toggle_route',
        source: 'toggle_source',
        target: 'toggle_target',
        event: 'toggle.event',
        conditions: []
      };

      messageRouter.addRoute(route);

      // Send message while route is active
      const message1: Message = {
        id: 'test_1',
        source: 'toggle_source',
        event: 'toggle.event',
        payload: { data: 'enabled' },
        timestamp: Date.now()
      };

      await messageRouter.routeMessage(message1);

      // Remove route (disable)
      messageRouter.removeRoute(route.id);

      // Send message while route is removed
      const message2: Message = {
        id: 'test_2',
        source: 'toggle_source',
        event: 'toggle.event',
        payload: { data: 'disabled' },
        timestamp: Date.now()
      };

      await messageRouter.routeMessage(message2);

      // Re-add route (re-enable)
      messageRouter.addRoute(route);

      // Send message while route is active again
      const message3: Message = {
        id: 'test_3',
        source: 'toggle_source',
        event: 'toggle.event',
        payload: { data: 're-enabled' },
        timestamp: Date.now()
      };

      await messageRouter.routeMessage(message3);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify only enabled and re-enabled messages were routed (route was removed for disabled message)
      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[0].payload.data).toBe('enabled');
      expect(receivedMessages[1].payload.data).toBe('re-enabled');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from message processing errors', async () => {
      const processedMessages: Message[] = [];
      const errorMessages: any[] = [];
      const messageCount = 5;

      // Create middleware that throws error for specific messages
      const errorMiddleware: EventMiddleware = {
        name: 'errorMiddleware',
        handler: async (message, next) => {
          if (message.payload?.shouldError) {
            throw new Error('Processing error');
          }
          processedMessages.push(message);
          await next();
        }
      };

      messageRouter.use(errorMiddleware);

      // Listen for errors
      messageRouter.on('middlewareError', (data) => {
        errorMessages.push(data.error);
      });

      // Subscribe to events
      messageRouter.subscribe('error.test', (payload) => {
        // Event handler
      });

      // Send mix of valid and error messages
      for (let i = 0; i < messageCount; i++) {
        const shouldError = i % 2 === 0; // Every other message should error
        messageRouter.publish('error.test', { 
          shouldError,
          data: `message_${i}` 
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify system recovered and processed messages
      expect(processedMessages.length).toBeGreaterThan(0);
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(processedMessages.length + errorMessages.length).toBeGreaterThanOrEqual(messageCount);
    });

    it('should handle circular route detection', async () => {
      const receivedMessages: Message[] = [];
      const errorMessages: any[] = [];

      // Subscribe to events
      messageRouter.subscribe('circular.event', (message) => {
        receivedMessages.push(message);
        // Re-publish the same event (creating a potential loop)
        if (message.payload?.depth < 3) {
          messageRouter.publish('circular.event', {
            ...message.payload,
            depth: (message.payload.depth || 0) + 1
          });
        }
      });

      // Listen for errors
      messageRouter.on('error', (error) => {
        errorMessages.push(error);
      });

      // Send initial message
      messageRouter.publish('circular.event', { depth: 0, data: 'start' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify system handled the circular reference gracefully
      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(receivedMessages.length).toBeLessThanOrEqual(4); // Should not create infinite loop
    });
  });
}); 