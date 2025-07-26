import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Test execution settings
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 10000, // 10 seconds for setup/teardown
    teardownTimeout: 10000,
    
    // Test isolation
    isolate: true,
    pool: 'forks', // Use separate processes for better isolation
    
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.ts',
        'setup.ts',
        '**/test-*/**', // Exclude test directories
        '**/integration/run-integration-tests.ts'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Reporter settings
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../backend/src'),
      '@interactor/shared': resolve(__dirname, '../shared/src')
    }
  }
}); 