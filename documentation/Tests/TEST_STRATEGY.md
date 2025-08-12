# Interactor Test Strategy & Framework

## Overview

This document outlines a comprehensive testing strategy for the Interactor system using **Vitest** as the primary testing framework. The strategy is designed to provide granular control over test execution while maintaining high coverage and reliability.

## Testing Framework: Vitest

**Why Vitest?**
- **Unified Framework**: Single tool for unit, integration, and E2E tests
- **TypeScript Native**: Full TypeScript support without additional configuration
- **Fast Execution**: Parallel test execution with intelligent caching
- **Rich Ecosystem**: Built-in coverage, UI, and reporting tools
- **Flexible Configuration**: Easy test categorization and selective execution
- **React Support**: Native JSX/TSX support for frontend testing

## Test Organization Structure

```
Tests/
├── core/                    # Core backend services
│   ├── Logger.test.ts
│   ├── StateManager.test.ts
│   ├── MessageRouter.test.ts
│   └── SystemStats.test.ts
├── modules/                 # Module system tests
│   ├── input/              # Input module tests
│   ├── output/             # Output module tests
│   └── ModuleLoader.test.ts
├── integration/            # Integration tests
│   ├── API.test.ts
│   ├── WebSocket.test.ts
│   └── FileUpload.test.ts
├── frontend/              # Frontend component tests
│   ├── components/
│   ├── hooks/
│   └── services/
└── e2e/                   # End-to-end tests
    ├── UI.test.ts
    ├── Workflow.test.ts
    └── Performance.test.ts
```

## Test Execution Commands

### Individual Feature Testing
```bash
# Core Features
npm run test:core:logger
npm run test:core:state
npm run test:core:router
npm run test:core:stats

# Module Testing
npm run test:modules:input
npm run test:modules:output
npm run test:modules:audio
npm run test:modules:dmx

# Frontend Features
npm run test:frontend:components
npm run test:frontend:hooks
npm run test:frontend:services
```

### Group Testing
```bash
# All Core Tests
npm run test:core

# All Module Tests
npm run test:modules

# All Frontend Tests
npm run test:frontend

# All Tests
npm run test:all
```

### Integration Testing
```bash
# Start real servers first, then run integration tests
npm run start:servers
npm run test:integration

# Or use the automated integration runner
npm run test:integration:auto  # Starts servers, runs tests, shuts down
```

## Integration Test Strategy

### Real Server Integration
Integration tests run against **real, running servers** to ensure authentic behavior:

1. **Server Startup**: Tests automatically start backend and frontend servers
2. **Real Communication**: Tests communicate via actual HTTP/WebSocket connections
3. **State Validation**: Tests verify actual state changes in the system
4. **Cleanup**: Tests clean up after themselves to prevent state pollution

### UI Interaction Testing
Integration tests can interact with the actual UI:

```typescript
// Example: UI Interaction Test
test('can add audio module via UI', async () => {
  // Navigate to module panel
  await page.click('[data-testid="add-module-button"]');
  
  // Select audio module
  await page.click('[data-testid="audio-module-option"]');
  
  // Verify module appears in workspace
  const module = await page.waitForSelector('[data-testid="audio-module"]');
  expect(module).toBeTruthy();
  
  // Configure module settings
  await page.fill('[data-testid="volume-input"]', '0.8');
  await page.click('[data-testid="save-settings"]');
  
  // Verify settings are saved
  const volume = await page.inputValue('[data-testid="volume-input"]');
  expect(volume).toBe('0.8');
});
```

### Automatic Pass/Fail Detection
Tests automatically determine pass/fail based on:

1. **HTTP Status Codes**: Expected vs actual response codes
2. **WebSocket Messages**: Message content and timing validation
3. **State Changes**: Database/state file modifications
4. **UI Updates**: DOM element presence and content
5. **Performance Metrics**: Response times and resource usage

## Test Categories

### 1. Unit Tests
- **Scope**: Individual functions and methods
- **Speed**: Fast execution (< 100ms per test)
- **Isolation**: Mocked dependencies
- **Coverage**: High code coverage targets

### 2. Integration Tests
- **Scope**: Service interactions and API endpoints
- **Speed**: Medium execution (1-5 seconds per test)
- **Real Dependencies**: Actual database and file system
- **Coverage**: Critical path validation

### 3. E2E Tests
- **Scope**: Complete user workflows
- **Speed**: Slower execution (5-30 seconds per test)
- **Real UI**: Actual browser interactions
- **Coverage**: User journey validation

## Test Data Management

### Mock Data Strategy
```typescript
// Centralized mock data
export const mockModules = {
  audio: { id: 'audio-1', type: 'audio_output', config: { volume: 0.8 } },
  dmx: { id: 'dmx-1', type: 'dmx_output', config: { channels: 512 } }
};

export const mockInteractions = [
  { id: 'int-1', triggers: ['time'], actions: ['audio'] }
];
```

### Test State Management
- **Pre-test Setup**: Initialize clean state
- **Test Execution**: Perform operations
- **Post-test Cleanup**: Restore original state
- **State Validation**: Verify expected changes

## Performance Testing

### Load Testing
```typescript
test('handles 100 concurrent WebSocket connections', async () => {
  const connections = await createMultipleConnections(100);
  expect(connections.length).toBe(100);
  
  // Send messages to all connections
  await sendMessagesToAll(connections, 'test-message');
  
  // Verify all messages are processed
  const responses = await waitForResponses(connections);
  expect(responses.every(r => r.success)).toBe(true);
});
```

### Memory Testing
```typescript
test('memory usage stays within limits', async () => {
  const initialMemory = process.memoryUsage();
  
  // Perform memory-intensive operations
  await performMemoryIntensiveOperation();
  
  const finalMemory = process.memoryUsage();
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  
  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
});
```

## Continuous Integration

### Automated Test Execution
```yaml
# GitHub Actions example
- name: Run Core Tests
  run: npm run test:core

- name: Run Module Tests
  run: npm run test:modules

- name: Run Integration Tests
  run: npm run test:integration:auto

- name: Run Frontend Tests
  run: npm run test:frontend
```

### Test Reporting
- **Coverage Reports**: HTML and JSON coverage output
- **Test Results**: Detailed pass/fail reporting
- **Performance Metrics**: Response time and resource usage
- **Error Logs**: Detailed error information for debugging

## Development Workflow

### Test-Driven Development
1. **Write Test**: Define expected behavior
2. **Run Test**: Verify it fails (red)
3. **Write Code**: Implement functionality
4. **Run Test**: Verify it passes (green)
5. **Refactor**: Improve code while maintaining green

### Debugging Tests
```bash
# Run specific test with verbose output
npm run test:core:logger -- --verbose

# Run tests in watch mode
npm run test:core -- --watch

# Run tests with UI
npm run test:ui
```

## Best Practices

### Test Naming
```typescript
// Descriptive test names
test('Logger should create log file when initialized', () => {});
test('StateManager should persist state changes to disk', () => {});
test('MessageRouter should route messages to correct modules', () => {});
```

### Test Organization
```typescript
describe('Logger Service', () => {
  describe('Initialization', () => {
    test('creates log directory if not exists', () => {});
    test('loads existing log files', () => {});
  });
  
  describe('Logging', () => {
    test('writes info messages', () => {});
    test('writes error messages', () => {});
    test('rotates log files', () => {});
  });
});
```

### Error Handling
```typescript
test('handles file system errors gracefully', async () => {
  // Mock file system to throw error
  jest.spyOn(fs, 'writeFile').mockRejectedValue(new Error('Disk full'));
  
  // Verify error is handled gracefully
  await expect(logger.log('test')).rejects.toThrow('Disk full');
});
```

This testing strategy provides comprehensive coverage while maintaining flexibility for different testing needs. The Vitest framework serves as the single tool for all testing requirements, from unit tests to complex integration scenarios. 