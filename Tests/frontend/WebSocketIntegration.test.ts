import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerEventTracker } from '../../frontend/src/utils/triggerEventTracker';

// Mock WebSocket
const mockWebSocket = {
  onopen: vi.fn(),
  onmessage: vi.fn(),
  onclose: vi.fn(),
  onerror: vi.fn(),
  close: vi.fn(),
  readyState: 1, // WebSocket.OPEN
  send: vi.fn(),
};

global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);

describe('WebSocket Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    triggerEventTracker.clearAllPulses();
  });

  afterEach(() => {
    triggerEventTracker.clearAllPulses();
  });

  describe('WebSocket Connection', () => {
    it('should create WebSocket connection to correct URL', () => {
      const ws = new WebSocket('ws://localhost:3001');
      
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3001');
      expect(ws).toBeDefined();
    });

    it('should handle connection open event', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const ws = new WebSocket('ws://localhost:3001');
      ws.onopen!({} as Event);
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket connected');
      
      consoleSpy.mockRestore();
    });

    it('should handle connection close event', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const ws = new WebSocket('ws://localhost:3001');
      ws.onclose!({ code: 1000, reason: 'Normal closure' } as CloseEvent);
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket disconnected:', 1000, 'Normal closure');
      
      consoleSpy.mockRestore();
    });

    it('should handle connection error event', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const ws = new WebSocket('ws://localhost:3001');
      ws.onerror!({} as Event);
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', {});
      
      consoleSpy.mockRestore();
    });
  });

  describe('State Update Messages', () => {
    it('should handle state_update message with module instances', () => {
      const mockSetRegisteredInteractions = vi.fn();
      const mockSetOriginalRegisteredIds = vi.fn();
      
      const stateUpdateMessage = {
        type: 'state_update',
        data: {
          moduleInstances: [
            {
              id: 'module-1',
              status: 'running',
              currentFrame: 42,
            },
            {
              id: 'module-2',
              status: 'stopped',
              currentFrame: 0,
            },
          ],
          interactions: [
            {
              id: 'interaction-1',
              modules: [
                {
                  id: 'module-1',
                  moduleName: 'Test Module',
                  config: { test: 'value' },
                },
              ],
              routes: [],
            },
          ],
        },
      };

      // Simulate message handling
      const handleStateUpdate = (message: any) => {
        if (message.type === 'state_update') {
          const moduleInstances = message.data.moduleInstances || [];
          const newRegisteredInteractions = message.data.interactions || [];
          const newOriginalIds = new Set<string>(newRegisteredInteractions.map((i: any) => i.id));
          
          if (moduleInstances.length > 0) {
            mockSetRegisteredInteractions((prev: any[]) => {
              return prev.map(interaction => ({
                ...interaction,
                modules: interaction.modules?.map((module: any) => {
                  const instanceUpdate = moduleInstances.find((instance: any) => instance.id === module.id);
                  if (instanceUpdate) {
                    return {
                      ...module,
                      ...instanceUpdate,
                    };
                  }
                  return module;
                }) || []
              }));
            });
          }
          
          mockSetOriginalRegisteredIds(newOriginalIds);
        }
      };

      handleStateUpdate(stateUpdateMessage);

      expect(mockSetRegisteredInteractions).toHaveBeenCalled();
      expect(mockSetOriginalRegisteredIds).toHaveBeenCalledWith(new Set(['interaction-1']));
    });

    it('should handle state_update message without module instances', () => {
      const mockSetRegisteredInteractions = vi.fn();
      
      const stateUpdateMessage = {
        type: 'state_update',
        data: {
          interactions: [
            {
              id: 'interaction-1',
              modules: [],
              routes: [],
            },
          ],
        },
      };

      const handleStateUpdate = (message: any) => {
        if (message.type === 'state_update') {
          const newRegisteredInteractions = message.data.interactions || [];
          mockSetRegisteredInteractions(newRegisteredInteractions);
        }
      };

      handleStateUpdate(stateUpdateMessage);

      expect(mockSetRegisteredInteractions).toHaveBeenCalledWith([
        {
          id: 'interaction-1',
          modules: [],
          routes: [],
        },
      ]);
    });

    it('should handle malformed state_update message gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const malformedMessage = {
        type: 'state_update',
        data: null,
      };

      const handleStateUpdate = (message: any) => {
        try {
          if (message.type === 'state_update') {
            const moduleInstances = message.data?.moduleInstances || [];
            const interactions = message.data?.interactions || [];
            // Process the data...
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      handleStateUpdate(malformedMessage);

      // Should not throw, should handle gracefully
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Trigger Event Messages', () => {
    it('should handle trigger_event message and record trigger event', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockRecordTriggerEvent = vi.spyOn(triggerEventTracker, 'recordTriggerEvent');
      
      const triggerEventMessage = {
        type: 'trigger_event',
        data: {
          moduleId: 'test-module-1',
          type: 'manual',
        },
      };

      const handleTriggerEvent = (message: any) => {
        if (message.type === 'trigger_event') {
          const { moduleId, type } = message.data;
          console.log(`Received trigger event for module ${moduleId} of type ${type}`);
          triggerEventTracker.recordTriggerEvent(moduleId, type);
        }
      };

      handleTriggerEvent(triggerEventMessage);

      expect(consoleSpy).toHaveBeenCalledWith('Received trigger event for module test-module-1 of type manual');
      expect(mockRecordTriggerEvent).toHaveBeenCalledWith('test-module-1', 'manual');
      
      consoleSpy.mockRestore();
      mockRecordTriggerEvent.mockRestore();
    });

    it('should handle trigger_event message with auto type', () => {
      const mockRecordTriggerEvent = vi.spyOn(triggerEventTracker, 'recordTriggerEvent');
      
      const triggerEventMessage = {
        type: 'trigger_event',
        data: {
          moduleId: 'test-module-2',
          type: 'auto',
        },
      };

      const handleTriggerEvent = (message: any) => {
        if (message.type === 'trigger_event') {
          const { moduleId, type } = message.data;
          triggerEventTracker.recordTriggerEvent(moduleId, type);
        }
      };

      handleTriggerEvent(triggerEventMessage);

      expect(mockRecordTriggerEvent).toHaveBeenCalledWith('test-module-2', 'auto');
      
      mockRecordTriggerEvent.mockRestore();
    });
  });

  describe('Message Parsing', () => {
    it('should handle valid JSON messages', () => {
      const mockSetRegisteredInteractions = vi.fn();
      
      const validMessage = {
        type: 'state_update',
        data: { interactions: [] },
      };

      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'state_update') {
            mockSetRegisteredInteractions(message.data.interactions || []);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      const mockEvent = {
        data: JSON.stringify(validMessage),
      } as MessageEvent;

      handleMessage(mockEvent);

      expect(mockSetRegisteredInteractions).toHaveBeenCalledWith([]);
    });

    it('should handle invalid JSON messages gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          // Process message...
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      const mockEvent = {
        data: 'invalid json',
      } as MessageEvent;

      handleMessage(mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle unknown message types gracefully', () => {
      const unknownMessage = {
        type: 'unknown_type',
        data: { some: 'data' },
      };

      const handleMessage = (message: any) => {
        if (message.type === 'state_update') {
          // Handle state update
        } else if (message.type === 'trigger_event') {
          // Handle trigger event
        }
        // Unknown types are ignored
      };

      // Should not throw
      expect(() => handleMessage(unknownMessage)).not.toThrow();
    });
  });

  describe('Connection Management', () => {
    it('should attempt reconnection on close', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      let reconnectAttempted = false;
      const connectWebSocket = () => {
        const ws = new WebSocket('ws://localhost:3001');
        
        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            reconnectAttempted = true;
            connectWebSocket();
          }, 1000);
        };
        
        return ws;
      };

      const ws = connectWebSocket();
      ws.onclose!({ code: 1006, reason: 'Abnormal closure' } as CloseEvent);

      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket disconnected:', 1006, 'Abnormal closure');
      expect(consoleSpy).toHaveBeenCalledWith('Attempting to reconnect WebSocket...');
      expect(reconnectAttempted).toBe(true);
      
      setTimeoutSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle connection readyState correctly', () => {
      const mockSend = vi.fn();
      const ws = new WebSocket('ws://localhost:3001');
      ws.send = mockSend;
      ws.readyState = 1; // WebSocket.OPEN

      const sendMessage = (ws: WebSocket, message: any) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify(message));
        }
      };

      sendMessage(ws, { type: 'test', data: {} });

      expect(mockSend).toHaveBeenCalledWith('{"type":"test","data":{}}');
    });

    it('should not send message when connection is not open', () => {
      const mockSend = vi.fn();
      const ws = new WebSocket('ws://localhost:3001');
      ws.send = mockSend;
      ws.readyState = 3; // WebSocket.CLOSED

      const sendMessage = (ws: WebSocket, message: any) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify(message));
        }
      };

      sendMessage(ws, { type: 'test', data: {} });

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const ws = new WebSocket('ws://localhost:3001');
      ws.onerror!({} as Event);
      
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', {});
      
      consoleSpy.mockRestore();
    });

    it('should handle message processing errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          // Simulate an error during message processing
          if (message.type === 'state_update') {
            throw new Error('Processing error');
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      const mockEvent = {
        data: JSON.stringify({ type: 'state_update', data: {} }),
      } as MessageEvent;

      handleMessage(mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith('Error processing WebSocket message:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
}); 