import { expect, vi, beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom';

// Mock React and React DOM for frontend tests
vi.mock('react', () => {
  const originalReact = vi.importActual('react');
  return {
    ...originalReact,
    useState: vi.fn(),
    useEffect: vi.fn(),
    useCallback: vi.fn(),
    useRef: vi.fn(),
    useMemo: vi.fn(),
  };
});

vi.mock('react-dom', () => {
  const originalReactDom = vi.importActual('react-dom');
  return {
    ...originalReactDom,
  };
});

// Global test setup
beforeAll(() => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  process.env.WS_PORT = '3002';
  process.env.UPLOAD_PORT = '4000';
});

// Global test teardown
afterAll(() => {
  // Clean up any global resources
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
process.exit = vi.fn() as any;

// Restore process.exit after tests
afterAll(() => {
  process.exit = originalExit;
});

// Test utilities
export const createMockLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

export const createMockStateManager = () => ({
  getState: vi.fn(),
  setState: vi.fn(),
  updateState: vi.fn(),
  getModuleInstances: vi.fn(),
  getInteractions: vi.fn(),
  updateInteractions: vi.fn(),
});

export const createMockMessageRouter = () => ({
  routeMessage: vi.fn(),
  broadcastMessage: vi.fn(),
  addRoute: vi.fn(),
  removeRoute: vi.fn(),
});

export const createMockSystemStats = () => ({
  getStats: vi.fn(),
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
});

// Test data factories
export const createTestModuleConfig = (overrides = {}) => ({
  id: 'test-module-1',
  type: 'test_input',
  config: {
    enabled: true,
    ...overrides
  }
});

export const createTestInteraction = (overrides = {}) => ({
  id: 'test-interaction-1',
  triggers: ['test-trigger'],
  actions: ['test-action'],
  ...overrides
});

// Async test utilities
export const waitFor = (condition: () => boolean, timeout = 5000) => {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
};

// Network test utilities
export const createTestServer = async (app: any, port = 3001) => {
  return new Promise<{ server: any; url: string }>((resolve) => {
    const server = app.listen(port, () => {
      resolve({ server, url: `http://localhost:${port}` });
    });
  });
};

export const closeTestServer = (server: any) => {
  return new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}; 