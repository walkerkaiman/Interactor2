import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import '@testing-library/jest-dom';

// React testing setup
import React from 'react';
import { render } from '@testing-library/react';

// Increase event emitter limit for tests
EventEmitter.defaultMaxListeners = 50;

// Global test timeout
beforeAll(() => {
  // Set up any global test configuration
  console.log('🧪 Setting up test environment...');
  
  // Create test directories if they don't exist
  const testDirs = [
    'test-modules',
    'test-modules-lifecycle',
    'test-data',
    'test-logs'
  ];

  for (const dir of testDirs) {
    const fullPath = join(__dirname, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }
});

afterAll(() => {
  // Clean up any global test resources
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up test directories
  const testDirs = [
    'test-modules',
    'test-modules-lifecycle',
    'test-data',
    'test-logs'
  ];

  for (const dir of testDirs) {
    const fullPath = join(__dirname, dir);
    if (existsSync(fullPath)) {
      rmSync(fullPath, { recursive: true, force: true });
    }
  }
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  // Only mock console in non-verbose mode
  if (process.env.VITEST_VERBOSE !== 'true') {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  }
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test utilities
export const testUtils = {
  // React testing utilities
  renderWithProviders: (component: React.ReactElement) => {
    return render(component);
  },
  
  // Create a temporary test module
  createTestModule: (name: string, manifest: any) => {
    const moduleDir = join(__dirname, 'test-modules', name);
    if (!existsSync(moduleDir)) {
      mkdirSync(moduleDir, { recursive: true });
    }
    
    const manifestPath = join(moduleDir, 'manifest.json');
    require('fs').writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    return moduleDir;
  },
  
  // Clean up test module
  cleanupTestModule: (name: string) => {
    const moduleDir = join(__dirname, 'test-modules', name);
    if (existsSync(moduleDir)) {
      rmSync(moduleDir, { recursive: true, force: true });
    }
  },
  
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate unique test ID
  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
};

// Global test configuration
export const testConfig = {
        server: { port: 3003, host: 'localhost' },
  logging: { level: 'debug', file: 'test.log' },
  modules: { autoLoad: false, hotReload: false }
}; 