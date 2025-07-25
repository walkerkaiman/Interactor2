import { beforeAll, afterAll } from 'vitest';
import { EventEmitter } from 'events';

// Increase event emitter limit for tests
EventEmitter.defaultMaxListeners = 50;

// Global test timeout
beforeAll(() => {
  // Set up any global test configuration
});

afterAll(() => {
  // Clean up any global test resources
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}); 