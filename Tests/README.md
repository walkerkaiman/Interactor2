# Interactor V2 Backend Test Suite

This directory contains comprehensive unit tests for the Interactor V2 Backend, built with Vitest and focusing on promise-based operations and async functionality.

## Test Structure

### Core Services Tests

#### 1. Logger Tests (`core/Logger.test.ts`)
- **Initialization**: Default and custom configuration tests
- **Logging Methods**: Different log levels, module context, metadata
- **Promise-based Operations**: Async logging, concurrent file writes
- **Log Buffer Management**: Size limits, overflow handling
- **File Logging**: File writes, rotation, backup management
- **WebSocket Streaming**: Real-time log streaming, multiple listeners
- **Error Handling**: Graceful error handling, concurrent operations
- **Performance**: High-volume logging efficiency

#### 2. MessageRouter Tests (`core/MessageRouter.test.ts`)
- **Initialization**: Default and custom configuration tests
- **Route Management**: Add, update, remove routes, concurrent operations
- **Message Routing**: Message publishing, multiple subscribers, concurrent messages
- **Middleware Pipeline**: Middleware execution order, error handling
- **Message Filtering**: Conditional routing, message filtering
- **Metrics and Monitoring**: Message metrics, route performance tracking
- **Error Handling**: Handler errors, unsubscribe operations
- **Performance**: High-volume message routing

#### 3. ModuleLoader Tests (`core/ModuleLoader.test.ts`)
- **Initialization**: Default and custom configuration tests
- **Module Discovery**: Directory scanning, concurrent discovery
- **Module Loading**: Module loading, error handling, multiple types
- **Module Validation**: Manifest validation, configuration validation
- **Module Lifecycle**: Loading events, module reloading
- **Hot Reloading**: File watching, concurrent changes
- **Module Registry**: Registration, unregistration, duplicates
- **Error Handling**: Loading failures, invalid paths, concurrent operations
- **Performance**: Loading many modules efficiently

#### 4. StateManager Tests (`core/StateManager.test.ts`)
- **Initialization**: Default and custom configuration tests
- **State Loading**: File loading, corrupted files, missing files
- **State Updates**: State updates, concurrent updates, section updates
- **State Persistence**: File saving, error handling
- **Auto-Save**: Periodic saving, shutdown handling
- **Backup Management**: Backup creation, rotation, restoration
- **State Events**: Change events, save events
- **Error Handling**: Concurrent operations, invalid data
- **Performance**: Large state handling

#### 5. SystemStats Tests (`core/SystemStats.test.ts`)
- **Initialization**: Default and custom configuration tests
- **Metrics Collection**: Basic metrics, detailed metrics, concurrent collection
- **Performance Tracking**: Event throughput, response times, high-frequency events
- **Metrics History**: History maintenance, size limits, trends
- **Health Monitoring**: Health status, performance issues, recommendations
- **Real-time Monitoring**: Metrics updates, health changes
- **Resource Monitoring**: CPU, memory, uptime tracking
- **Error Handling**: Collection errors, concurrent access
- **Performance**: High-frequency updates, load handling
- **Configuration**: Update intervals, configuration changes

## Test Categories

### Promise-Based Operations
All tests focus on async operations and promise handling:
- Async initialization and shutdown
- Concurrent operations
- Promise resolution and rejection
- Error handling in async contexts
- Performance under load

### Core Features
- Event-driven communication
- Module system lifecycle
- State persistence and recovery
- Real-time monitoring
- System health and performance

### Error Scenarios
- Invalid configurations
- Corrupted data
- Network failures
- Resource exhaustion
- Concurrent access conflicts

### Performance Tests
- High-volume operations
- Memory usage
- Response times
- Throughput limits
- Load testing

## Running Tests

### Prerequisites
```bash
cd Tests
npm install
```

### Test Commands
```bash
# Run all tests
npm test

# Run tests once (no watch mode)
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Individual Test Files
```bash
# Run specific test file
npx vitest core/Logger.test.ts

# Run tests matching pattern
npx vitest --run Logger

# Run tests with specific environment
npx vitest --environment node
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- Node.js environment
- TypeScript support
- Path aliases for imports
- Coverage reporting
- Test file patterns

### Test Setup (`setup.ts`)
- Global test configuration
- Console mocking
- Event emitter limits
- Test environment setup

## Development Guidelines

### Writing Tests
1. **Use descriptive test names** that explain what is being tested
2. **Group related tests** using `describe` blocks
3. **Test both success and failure scenarios**
4. **Focus on promise-based operations** as requested
5. **Test concurrent operations** where applicable
6. **Include performance tests** for critical paths
7. **Mock external dependencies** appropriately

### Test Structure
```typescript
describe('ComponentName', () => {
  let component: Component;
  
  beforeEach(async () => {
    // Setup
  });
  
  afterEach(async () => {
    // Cleanup
  });
  
  describe('Feature', () => {
    it('should handle async operation', async () => {
      // Test implementation
    });
  });
});
```

### Async Testing Patterns
```typescript
// Promise resolution
await expect(asyncOperation()).resolves.toBe(expectedValue);

// Promise rejection
await expect(asyncOperation()).rejects.toThrow(ErrorType);

// Concurrent operations
await Promise.all(operationPromises);

// Time-based testing
await new Promise(resolve => setTimeout(resolve, 100));
```

### Performance Testing
```typescript
it('should handle high load efficiently', async () => {
  const startTime = Date.now();
  
  // Perform operations
  await Promise.all(operationPromises);
  
  const endTime = Date.now();
  expect(endTime - startTime).toBeLessThan(threshold);
});
```

## Coverage Goals

- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: >95%
- **Statement Coverage**: >90%

## Continuous Integration

Tests are designed to run in CI/CD pipelines:
- Fast execution (<30 seconds for full suite)
- Deterministic results
- Proper cleanup
- No external dependencies
- Cross-platform compatibility

## Debugging Tests

### Common Issues
1. **Async timing**: Use appropriate timeouts and waits
2. **Resource cleanup**: Ensure proper cleanup in `afterEach`
3. **File system**: Use temporary directories for file tests
4. **Event listeners**: Remove listeners to prevent memory leaks
5. **Mock restoration**: Restore mocked functions after tests

### Debug Commands
```bash
# Run with verbose output
npx vitest --reporter=verbose

# Run single test with debugger
npx vitest --run --reporter=verbose Logger.test.ts

# Run with coverage and HTML report
npm run test:coverage
```

## Test Data

Test data is generated dynamically to avoid external dependencies:
- Mock modules with realistic manifests
- Generated state data
- Simulated performance metrics
- Temporary file structures

## Future Enhancements

- Integration tests with real modules
- End-to-end API testing
- Load testing with realistic scenarios
- Browser-based testing for WebSocket functionality
- Performance benchmarking suite 