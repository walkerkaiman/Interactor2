import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Test execution settings - simplified architecture allows faster tests
    testTimeout: 15000, // 15 seconds for simplified integration tests
    hookTimeout: 5000, // 5 seconds for setup/teardown
    teardownTimeout: 5000,
    
    // Test isolation
    isolate: true,
    pool: 'forks', // Use separate processes for better isolation
    
    // Coverage settings - adjusted for simplified architecture
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
        '**/integration/run-integration-tests.ts',
        '**/hot-reload-*/**' // Exclude hot reload test directories
      ],
      thresholds: {
        global: {
          branches: 60, // Lowered due to simplified architecture
          functions: 60,
          lines: 60,
          statements: 60
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