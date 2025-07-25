import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpInputModule } from '../../backend/src/modules/input/http_input/index';
import request from 'supertest';

interface HttpInputConfig {
  port: number;
  host: string;
  endpoint: string;
  methods: string[];
  enabled: boolean;
  rateLimit: number;
  contentType: string;
}

// Mock Express to avoid actual HTTP server creation in tests
vi.mock('express', () => {
  const mockApp = {
    use: vi.fn(),
    listen: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    head: vi.fn(),
    options: vi.fn(),
    trace: vi.fn(),
    copy: vi.fn(),
    lock: vi.fn(),
    mkcol: vi.fn(),
    move: vi.fn(),
    purge: vi.fn(),
    propfind: vi.fn(),
    proppatch: vi.fn(),
    unlock: vi.fn(),
    report: vi.fn(),
    mkactivity: vi.fn(),
    checkout: vi.fn(),
    merge: vi.fn(),
    'm-search': vi.fn(),
    notify: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    search: vi.fn(),
    connect: vi.fn(),
    all: vi.fn()
  };

  const mockExpress = vi.fn(() => mockApp);
  mockExpress.json = vi.fn(() => vi.fn());
  mockExpress.urlencoded = vi.fn(() => vi.fn());

  return {
    default: mockExpress,
    json: vi.fn(() => vi.fn()),
    urlencoded: vi.fn(() => vi.fn())
  };
});

// Mock http.Server
vi.mock('http', () => ({
  Server: vi.fn().mockImplementation(() => ({
    listen: vi.fn(),
    close: vi.fn(),
    on: vi.fn()
  }))
}));

describe('HTTP Input Module', () => {
  let module: HttpInputModule;
  let mockConfig: HttpInputConfig;

  beforeEach(() => {
    mockConfig = {
      port: 3000,
      host: '0.0.0.0',
      endpoint: '/webhook',
      methods: ['POST'],
      enabled: true,
      rateLimit: 60,
      contentType: 'application/json'
    };

    module = new HttpInputModule(mockConfig);
  });

  afterEach(() => {
    if (module) {
      module.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with correct default values', () => {
      expect(module.getHttpParameters()).toEqual({
        port: 3000,
        host: '0.0.0.0',
        endpoint: '/webhook',
        methods: ['POST'],
        rateLimit: 60,
        contentType: 'application/json',
        enabled: true,
        status: 'stopped',
        currentValue: null,
        requestCount: 0,
        rateLimitRemaining: 60,
        mode: 'trigger',
        lastRequestData: undefined
      });
    });

    it('should validate port range correctly', async () => {
      const invalidConfig = { ...mockConfig, port: 80 }; // Below minimum
      const invalidModule = new HttpInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid port number: 80. Must be between 1024 and 65535.');
    });

    it('should validate port maximum correctly', async () => {
      const invalidConfig = { ...mockConfig, port: 70000 }; // Above maximum
      const invalidModule = new HttpInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid port number: 70000. Must be between 1024 and 65535.');
    });

    it('should validate host format correctly', async () => {
      const invalidConfig = { ...mockConfig, host: 'invalid-host' };
      const invalidModule = new HttpInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid host address: invalid-host');
    });

    it('should validate endpoint format correctly', async () => {
      const invalidConfig = { ...mockConfig, endpoint: 'webhook' }; // Missing leading slash
      const invalidModule = new HttpInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid endpoint: webhook. Must start with \'/\'');
    });

    it('should validate rate limit range correctly', async () => {
      const invalidConfig = { ...mockConfig, rateLimit: 0 }; // Below minimum
      const invalidModule = new HttpInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid rate limit: 0. Must be between 1 and 1000 requests per minute.');
    });

    it('should validate rate limit maximum correctly', async () => {
      const invalidConfig = { ...mockConfig, rateLimit: 1500 }; // Above maximum
      const invalidModule = new HttpInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('Invalid rate limit: 1500. Must be between 1 and 1000 requests per minute.');
    });

    it('should accept valid configurations', async () => {
      const validConfigs = [
        { ...mockConfig, port: 3000, host: '0.0.0.0' },
        { ...mockConfig, port: 8080, host: 'localhost' },
        { ...mockConfig, port: 9000, host: '127.0.0.1' },
        { ...mockConfig, endpoint: '/trigger' },
        { ...mockConfig, endpoint: '/sensor' },
        { ...mockConfig, rateLimit: 30 },
        { ...mockConfig, rateLimit: 120 },
        { ...mockConfig, rateLimit: 500 }
      ];
      
      for (const config of validConfigs) {
        const testModule = new HttpInputModule(config);
        await expect(testModule.init()).resolves.not.toThrow();
        await testModule.destroy();
      }
    });
  });

  describe('Numeric Data Parsing', () => {
    beforeEach(async () => {
      await module.init();
    });

    it('should extract numeric value from JSON body', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5, sensor: 'temperature' },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' }
      };

      const result = (module as any).parseNumericValue(mockRequest);
      expect(result).toBe(75.5);
    });

    it('should extract numeric value from nested JSON', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { data: { temperature: 25.5, humidity: 60 } },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' }
      };

      const result = (module as any).parseNumericValue(mockRequest);
      expect(result).toBe(25.5);
    });

    it('should extract numeric value from array', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { sensors: [{ temp: 20 }, { temp: 30 }] },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' }
      };

      const result = (module as any).parseNumericValue(mockRequest);
      expect(result).toBe(20); // First numeric value found
    });

    it('should extract numeric value from query parameters', () => {
      const mockRequest = {
        method: 'GET',
        url: '/webhook',
        body: {},
        query: { value: '100', action: 'trigger' },
        params: {},
        headers: { 'content-type': 'application/json' }
      };

      const result = (module as any).parseNumericValue(mockRequest);
      expect(result).toBe(100);
    });

    it('should extract numeric value from path parameters', () => {
      const mockRequest = {
        method: 'GET',
        url: '/webhook',
        body: {},
        query: {},
        params: { value: '75.5' },
        headers: { 'content-type': 'application/json' }
      };

      const result = (module as any).parseNumericValue(mockRequest);
      expect(result).toBe(75.5);
    });

    it('should handle string numbers', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: '42.5' },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' }
      };

      const result = (module as any).parseNumericValue(mockRequest);
      expect(result).toBe(42.5);
    });

    it('should return null for non-numeric data', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { message: 'hello world', action: 'trigger' },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' }
      };

      const result = (module as any).parseNumericValue(mockRequest);
      expect(result).toBeNull();
    });

    it('should return null for empty request', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: {},
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' }
      };

      const result = (module as any).parseNumericValue(mockRequest);
      expect(result).toBeNull();
    });

    it('should handle malformed data gracefully', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: null,
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' }
      };

      const result = (module as any).parseNumericValue(mockRequest);
      expect(result).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await module.init();
    });

    it('should allow requests within rate limit', () => {
      const now = Date.now();
      
      // Simulate 30 requests in the last minute (under limit of 60)
      for (let i = 0; i < 30; i++) {
        const result = (module as any).checkRateLimit();
        expect(result).toBe(true);
      }
    });

    it('should block requests exceeding rate limit', () => {
      const now = Date.now();
      
      // Simulate 70 requests in the last minute (over limit of 60)
      for (let i = 0; i < 60; i++) {
        const result = (module as any).checkRateLimit();
        expect(result).toBe(true);
      }
      
      // 61st request should be blocked
      const result = (module as any).checkRateLimit();
      expect(result).toBe(false);
    });

    it('should calculate remaining rate limit correctly', () => {
      const remaining = (module as any).getRateLimitRemaining();
      expect(remaining).toBe(60); // No requests made yet
    });

    it('should decrease remaining rate limit after requests', () => {
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        (module as any).checkRateLimit();
      }
      
      const remaining = (module as any).getRateLimitRemaining();
      expect(remaining).toBe(50); // 60 - 10 = 50
    });

    it('should reset rate limit after time window', () => {
      // Make 30 requests
      for (let i = 0; i < 30; i++) {
        (module as any).checkRateLimit();
      }
      
      // Simulate time passing (older than 1 minute)
      const oldTimestamp = Date.now() - 70000; // 70 seconds ago
      (module as any).requestTimestamps = Array(30).fill(oldTimestamp);
      
      const remaining = (module as any).getRateLimitRemaining();
      expect(remaining).toBe(60); // Should reset to full limit
    });
  });

  describe('Event Emission', () => {
    let eventSpy: any;

    beforeEach(async () => {
      await module.init();
      eventSpy = vi.fn();
      module.on('httpRequest', eventSpy);
    });

    it('should emit httpRequest for all received requests', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5 },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('application/json')
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      module.handleHttpRequest(mockRequest, mockResponse);

      expect(eventSpy).toHaveBeenCalledWith({
        method: 'POST',
        url: '/webhook',
        headers: { 'content-type': 'application/json' },
        body: { value: 75.5 },
        query: {},
        timestamp: expect.any(Number),
        requestId: expect.any(String),
        rateLimitRemaining: expect.any(Number)
      });
    });

    it('should emit trigger when numeric data is found in trigger mode', () => {
      const triggerSpy = vi.fn();
      module.on('trigger', triggerSpy);

      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5 },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('application/json')
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      module.handleHttpRequest(mockRequest, mockResponse);

      expect(triggerSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'http_input',
        event: 'httpTrigger',
        payload: {
          value: 75.5,
          method: 'POST',
          url: '/webhook',
          headers: { 'content-type': 'application/json' },
          body: { value: 75.5 },
          query: {},
          timestamp: expect.any(Number),
          requestId: expect.any(String),
          rateLimitRemaining: expect.any(Number),
          requestCount: 1
        },
        timestamp: expect.any(Number)
      });
    });

    it('should emit stream when numeric data is found in streaming mode', () => {
      module.setMode('streaming');
      const streamSpy = vi.fn();
      module.on('stream', streamSpy);

      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5 },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('application/json')
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      module.handleHttpRequest(mockRequest, mockResponse);

      expect(streamSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'http_input',
        value: {
          value: 75.5,
          method: 'POST',
          url: '/webhook',
          data: { value: 75.5 },
          timestamp: expect.any(Number),
          rateLimitRemaining: expect.any(Number)
        },
        timestamp: expect.any(Number)
      });
    });

    it('should not emit trigger for requests without numeric data', () => {
      const triggerSpy = vi.fn();
      module.on('trigger', triggerSpy);

      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { message: 'hello world' },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1'
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      (module as any).handleHttpRequest(mockRequest, mockResponse);

      expect(triggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await module.init();
    });

    it('should track request count correctly', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5 },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('application/json')
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      expect(module.getHttpParameters().requestCount).toBe(0);
      
      module.handleHttpRequest(mockRequest, mockResponse);
      expect(module.getHttpParameters().requestCount).toBe(1);
      
      module.handleHttpRequest(mockRequest, mockResponse);
      expect(module.getHttpParameters().requestCount).toBe(2);
    });

    it('should track last request data correctly', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5 },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('application/json')
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      module.handleHttpRequest(mockRequest, mockResponse);
      
      const lastRequestData = module.getHttpParameters().lastRequestData;
      expect(lastRequestData?.method).toBe('POST');
      expect(lastRequestData?.url).toBe('/webhook');
      expect(lastRequestData?.body).toEqual({ value: 75.5 });
    });

    it('should reset request counter and last request data', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5 },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('application/json')
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      module.handleHttpRequest(mockRequest, mockResponse);
      expect(module.getHttpParameters().requestCount).toBe(1);
      expect(module.getHttpParameters().lastRequestData).toBeDefined();
      
      module.reset();
      
      expect(module.getHttpParameters().requestCount).toBe(0);
      expect(module.getHttpParameters().lastRequestData).toBeUndefined();
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      await module.init();
      await module.start();
    });

    it('should update rate limit without restart', async () => {
      const newConfig = { ...mockConfig, rateLimit: 120 };
      
      await module.updateConfig(newConfig);
      
      expect(module.getHttpParameters().rateLimit).toBe(120);
    });

    it('should update content type without restart', async () => {
      const newConfig = { ...mockConfig, contentType: 'text/plain' };
      
      await module.updateConfig(newConfig);
      
      expect(module.getHttpParameters().contentType).toBe('text/plain');
    });

    it('should restart server when port changes', async () => {
      const newConfig = { ...mockConfig, port: 3001 };
      
      await module.updateConfig(newConfig);
      
      expect(module.getHttpParameters().port).toBe(3001);
    });

    it('should restart server when host changes', async () => {
      const newConfig = { ...mockConfig, host: 'localhost' };
      
      await module.updateConfig(newConfig);
      
      expect(module.getHttpParameters().host).toBe('localhost');
    });

    it('should restart server when endpoint changes', async () => {
      const newConfig = { ...mockConfig, endpoint: '/trigger' };
      
      await module.updateConfig(newConfig);
      
      expect(module.getHttpParameters().endpoint).toBe('/trigger');
    });

    it('should enable/disable server correctly', async () => {
      const newConfig = { ...mockConfig, enabled: false };
      
      await module.updateConfig(newConfig);
      
      expect(module.getHttpParameters().enabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await module.init();
    });

    it('should handle malformed request data gracefully', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: null,
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1'
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      expect(() => {
        (module as any).handleHttpRequest(mockRequest, mockResponse);
      }).not.toThrow();
    });

    it('should handle missing headers gracefully', () => {
      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5 },
        query: {},
        params: {},
        headers: {},
        ip: '127.0.0.1'
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      expect(() => {
        (module as any).handleHttpRequest(mockRequest, mockResponse);
      }).not.toThrow();
    });
  });

  describe('Integration with Output Modules', () => {
    let mockOutputModule: any;

    beforeEach(async () => {
      await module.init();
      
      // Create a mock output module
      mockOutputModule = {
        onTriggerEvent: vi.fn(),
        onStreamingEvent: vi.fn(),
        send: vi.fn()
      };
    });

    it('should send trigger events to output modules', () => {
      // Simulate connecting to an output module
      module.on('trigger', (data) => {
        mockOutputModule.onTriggerEvent(data);
      });

      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5 },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('application/json')
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      module.handleHttpRequest(mockRequest, mockResponse);

      expect(mockOutputModule.onTriggerEvent).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'http_input',
        event: 'httpTrigger',
        payload: {
          value: 75.5,
          method: 'POST',
          url: '/webhook',
          headers: { 'content-type': 'application/json' },
          body: { value: 75.5 },
          query: {},
          timestamp: expect.any(Number),
          requestId: expect.any(String),
          rateLimitRemaining: expect.any(Number),
          requestCount: 1
        },
        timestamp: expect.any(Number)
      });
    });

    it('should send streaming events to output modules', () => {
      module.setMode('streaming');
      
      // Simulate connecting to an output module
      module.on('stream', (data) => {
        mockOutputModule.onStreamingEvent(data);
      });

      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { value: 75.5 },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('application/json')
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      module.handleHttpRequest(mockRequest, mockResponse);

      expect(mockOutputModule.onStreamingEvent).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'http_input',
        value: {
          value: 75.5,
          method: 'POST',
          url: '/webhook',
          data: { value: 75.5 },
          timestamp: expect.any(Number),
          rateLimitRemaining: expect.any(Number)
        },
        timestamp: expect.any(Number)
      });
    });

    it('should pass correct numeric values to output modules', () => {
      module.setMode('streaming');
      
      const streamSpy = vi.fn();
      module.on('stream', streamSpy);

      const mockRequest = {
        method: 'POST',
        url: '/webhook',
        body: { temperature: 25.5, humidity: 60 },
        query: {},
        params: {},
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('application/json')
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      module.handleHttpRequest(mockRequest, mockResponse);

      expect(streamSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'http_input',
        value: {
          value: 25.5, // First numeric value found
          method: 'POST',
          url: '/webhook',
          data: { temperature: 25.5, humidity: 60 },
          timestamp: expect.any(Number),
          rateLimitRemaining: expect.any(Number)
        },
        timestamp: expect.any(Number)
      });
    });
  });
}); 