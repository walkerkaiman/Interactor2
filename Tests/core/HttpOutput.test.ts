import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpOutputModule } from '../../backend/src/modules/output/http_output/index';

// Mock fetch globally
global.fetch = vi.fn();

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('HTTP Output Module', () => {
  let module: HttpOutputModule;
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = global.fetch as any;
    
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve('Success response')
    });

    module = new HttpOutputModule({
      url: 'https://api.example.com/webhook',
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      timeout: 5000,
      enabled: true
    });

    // Mock logger
    (module as any).logger = mockLogger;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with valid configuration', async () => {
      await module.init();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Output module initialized: POST https://api.example.com/webhook'
      );
    });

    it('should throw error for invalid URL', async () => {
      const invalidModule = new HttpOutputModule({
        url: 'invalid-url',
        method: 'POST'
      });

      await expect(invalidModule.init()).rejects.toThrow('Invalid URL format: invalid-url');
    });

    it('should use default values when not provided', () => {
      const defaultModule = new HttpOutputModule({
        url: 'https://api.example.com/test'
      });

      expect(defaultModule.getConfig()).toEqual({
        url: 'https://api.example.com/test',
        method: 'POST',
        headers: {},
        timeout: 5000,
        enabled: true
      });
    });
  });

  describe('Lifecycle Management', () => {
    it('should start and stop correctly', async () => {
      await module.init();
      await module.start();
      
      expect(module.isOutputConnected()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Output module started: POST https://api.example.com/webhook'
      );

      await module.stop();
      
      expect(module.isOutputConnected()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Output module stopped');
    });

    it('should destroy correctly', async () => {
      await module.init();
      await module.destroy();
      
      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Output module destroyed');
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration correctly', async () => {
      await module.init();
      
      const oldConfig = module.getConfig();
      const newConfig = {
        url: 'https://api.example.com/new',
        method: 'PUT' as const,
        headers: { 'X-New-Header': 'value' },
        timeout: 10000,
        enabled: false
      };

      await module.updateConfig(newConfig);
      
      const updatedConfig = module.getConfig();
      expect(updatedConfig.url).toBe(newConfig.url);
      expect(updatedConfig.method).toBe(newConfig.method);
      expect(updatedConfig.headers).toEqual(newConfig.headers);
      expect(updatedConfig.timeout).toBe(newConfig.timeout);
      expect(updatedConfig.enabled).toBe(newConfig.enabled);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Output module configuration updated: PUT https://api.example.com/new'
      );
    });

    it('should validate URL on configuration update', async () => {
      await module.init();
      
      const invalidConfig = {
        url: 'invalid-url',
        method: 'POST' as const
      };

      await expect(module.updateConfig(invalidConfig))
        .rejects.toThrow('Invalid URL format: invalid-url');
    });
  });

  describe('HTTP Request Handling', () => {
    it('should send HTTP request with correct parameters', async () => {
      await module.init();
      await module.start();

      const testData = { message: 'test', value: 123 };
      await module.send(testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify(testData)
        })
      );
    });

    it('should handle GET requests without body', async () => {
      const getModule = new HttpOutputModule({
        url: 'https://api.example.com/data',
        method: 'GET'
      });
      (getModule as any).logger = mockLogger;

      await getModule.init();
      await getModule.start();
      await getModule.send({});

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      // Should not have body for GET requests
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBeUndefined();
    });

    it('should handle successful responses', async () => {
      await module.init();
      await module.start();

      const responseSpy = vi.fn();
      module.on('output', responseSpy);

      await module.send({ test: 'data' });

      expect(responseSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'httpResponse',
          payload: expect.objectContaining({
            url: 'https://api.example.com/webhook',
            method: 'POST',
            status: 200,
            response: 'Success response'
          })
        })
      );
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not found')
      });

      await module.init();
      await module.start();

      const errorSpy = vi.fn();
      module.on('error', errorSpy);

      await expect(module.send({ test: 'data' })).rejects.toThrow('HTTP 404: Not Found');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'HTTP 404: Not Found'
        })
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await module.init();
      await module.start();

      const errorSpy = vi.fn();
      module.on('error', errorSpy);

      await expect(module.send({ test: 'data' })).rejects.toThrow('Network error');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network error'
        })
      );
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AbortError')), 100);
      }));

      const timeoutModule = new HttpOutputModule({
        url: 'https://api.example.com/slow',
        method: 'POST',
        timeout: 50 // Very short timeout
      });
      (timeoutModule as any).logger = mockLogger;

      await timeoutModule.init();
      await timeoutModule.start();

      const errorSpy = vi.fn();
      timeoutModule.on('error', errorSpy);

      await expect(timeoutModule.send({ test: 'data' })).rejects.toThrow('AbortError');
    });
  });

  describe('Event Handling', () => {
    it('should handle trigger events', async () => {
      await module.init();
      await module.start();

      const triggerEvent = {
        moduleId: 'test-input',
        moduleName: 'Test Input',
        event: 'trigger',
        payload: { action: 'test' },
        timestamp: Date.now()
      };

      await module.onTriggerEvent(triggerEvent);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          body: JSON.stringify({ action: 'test' })
        })
      );
    });

    it('should handle streaming events', async () => {
      await module.init();
      await module.start();

      const streamEvent = {
        moduleId: 'test-input',
        moduleName: 'Test Input',
        event: 'stream',
        value: 42.5,
        timestamp: Date.now()
      };

      await module.onStreamingEvent(streamEvent);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          body: JSON.stringify({ value: 42.5 })
        })
      );
    });

    it('should handle manual trigger', async () => {
      await module.init();
      await module.start();

      await module.manualTrigger();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          body: expect.stringContaining('"type":"manualTrigger"')
        })
      );
      
      // Verify the body contains the expected structure
      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.type).toBe('manualTrigger');
      expect(body.message).toBe('Manual trigger from Interactor');
      expect(typeof body.timestamp).toBe('number');
    });
  });

  describe('Disabled State', () => {
    it('should ignore requests when disabled', async () => {
      const disabledModule = new HttpOutputModule({
        url: 'https://api.example.com/webhook',
        method: 'POST',
        enabled: false
      });
      (disabledModule as any).logger = mockLogger;

      await disabledModule.init();
      await disabledModule.start();

      await disabledModule.send({ test: 'data' });
      await disabledModule.onTriggerEvent({ payload: { test: 'trigger' } });
      await disabledModule.onStreamingEvent({ value: 123 });
      await disabledModule.manualTrigger();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledTimes(4);
    });

    it('should enable/disable via configuration update', async () => {
      await module.init();
      await module.start();

      // Clear any previous calls
      vi.clearAllMocks();

      // Disable
      const oldConfig = module.getConfig();
      const disabledConfig = {
        url: 'https://api.example.com/webhook',
        method: 'POST' as const,
        headers: { 'Authorization': 'Bearer test-token' },
        timeout: 5000,
        enabled: false
      };
      await module.updateConfig(disabledConfig);
      await module.send({ test: 'data' });
      expect(mockFetch).not.toHaveBeenCalled();

      // Enable
      const newOldConfig = module.getConfig();
      const enabledConfig = {
        url: 'https://api.example.com/webhook',
        method: 'POST' as const,
        headers: { 'Authorization': 'Bearer test-token' },
        timeout: 5000,
        enabled: true
      };
      await module.updateConfig(enabledConfig);
      await module.send({ test: 'data' });
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should track request statistics', async () => {
      await module.init();
      await module.start();

      await module.send({ test: 'data1' });
      await module.send({ test: 'data2' });

      const state = module.getState();
      expect(state.requestCount).toBe(2);
      expect(state.errorCount).toBe(0);
      expect(state.lastRequest).toBeDefined();
      expect(state.lastRequest?.status).toBe(200);
    });

    it('should track error statistics', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error')
      });

      await module.init();
      await module.start();

      try {
        await module.send({ test: 'data' });
      } catch (error) {
        // Expected to throw
      }

      const state = module.getState();
      expect(state.requestCount).toBe(0);
      expect(state.errorCount).toBe(1);
      expect(state.lastError).toBeDefined();
      expect(state.lastError?.error).toContain('HTTP 500');
    });

    it('should reset statistics', async () => {
      await module.init();
      await module.start();

      await module.send({ test: 'data' });
      expect(module.getState().requestCount).toBe(1);

      module.reset();
      
      const state = module.getState();
      expect(state.requestCount).toBe(0);
      expect(state.errorCount).toBe(0);
      expect(state.lastRequest).toBeUndefined();
      expect(state.lastError).toBeUndefined();
    });

    it('should provide correct state information', async () => {
      await module.init();
      await module.start();

      const state = module.getState();
      expect(state).toEqual({
        url: 'https://api.example.com/webhook',
        method: 'POST',
        enabled: true,
        isConnected: true,
        lastRequest: undefined,
        lastError: undefined,
        requestCount: 0,
        errorCount: 0,
        status: 'ready'
      });
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      await module.init();
      await module.start();

      const result = await module.testConnection();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle connection test failures', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      await module.init();
      await module.start();

      const result = await module.testConnection();
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Connection test failed:', expect.any(Error));
    });
  });

  describe('URL Validation', () => {
    it('should validate various URL formats', async () => {
      const validUrls = [
        'http://example.com',
        'https://api.example.com',
        'http://localhost:3000',
        'https://subdomain.example.com/path'
      ];

      for (const url of validUrls) {
        const testModule = new HttpOutputModule({ url, method: 'POST' });
        (testModule as any).logger = mockLogger;
        await expect(testModule.init()).resolves.not.toThrow();
      }
    });

    it('should reject invalid URL formats', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'example.com',
        'http://',
        'https://'
      ];

      for (const url of invalidUrls) {
        const testModule = new HttpOutputModule({ url, method: 'POST' });
        (testModule as any).logger = mockLogger;
        await expect(testModule.init()).rejects.toThrow('Invalid URL format:');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      // Mock fetch to reject with AbortError after a delay
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 50);
        })
      );

      const timeoutModule = new HttpOutputModule({
        url: 'https://api.example.com/slow',
        method: 'POST',
        timeout: 100 // Short timeout
      });
      (timeoutModule as any).logger = mockLogger;

      await timeoutModule.init();
      await timeoutModule.start();

      // This should timeout and throw an error
      await expect(timeoutModule.send({ test: 'data' })).rejects.toThrow('The operation was aborted');
    }, 1000); // Shorter test timeout

    it('should handle response text parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.reject(new Error('Text parsing failed'))
      });

      await module.init();
      await module.start();

      await expect(module.send({ test: 'data' })).rejects.toThrow('Text parsing failed');
    });
  });
}); 