# Interactor Simplified Test Suite

This directory contains the test suite for the simplified Interactor backend architecture. The tests have been updated to reflect the new headless singleton service design with minimal complexity.

## Test Structure

### Core Tests (`core/`)
Tests for individual core services and modules:

- **API.test.ts** - Simplified REST API endpoints
- **StateManager.test.ts** - State management without auto-save
- **Logger.test.ts** - Logging functionality
- **MessageRouter.test.ts** - Message routing (simplified)
- **ModuleLoader.test.ts** - Module loading (no hot reload)
- **SystemStats.test.ts** - System statistics
- **Module Tests** - Individual input/output module tests

### Integration Tests (`integration/`)
End-to-end tests for the simplified system:

- **BackendIntegration.test.ts** - Core services integration
- **APIWebSocket.test.ts** - REST API integration (no WebSocket)
- **ModuleLifecycle.test.ts** - Module lifecycle (no hot reload)
- **MessageRouting.test.ts** - Message routing integration

## Key Changes from Original Architecture

### Removed Features
- **WebSocket Testing** - No real-time communication tests
- **Hot Reload Testing** - No dynamic module loading tests
- **Auto-Save Testing** - No automatic state persistence tests
- **Complex Routing** - Simplified message routing tests
- **Multi-Tenancy** - No multi-instance testing

### Simplified Features
- **Singleton Services** - All core services are singletons
- **Atomic State Updates** - Full state replacement testing
- **Static Module Loading** - Modules loaded once at startup
- **REST-Only API** - No WebSocket endpoint testing
- **Manual Registration** - Interaction map registration testing

## Running Tests

### Prerequisites
- Node.js 18+
- npm

### Quick Start
```bash
# Run all tests
./run-tests.bat

# Run specific test types
./run-tests.bat core          # Core service tests only
./run-tests.bat integration   # Integration tests only
./run-tests.bat coverage      # Tests with coverage report
./run-tests.bat watch         # Watch mode for development
./run-tests.bat clean         # Clean test artifacts
```

### Manual Commands
```bash
# Install dependencies
npm install

# Run all tests
npx vitest run

# Run specific test files
npx vitest run core/API.test.ts
npx vitest run integration/BackendIntegration.test.ts

# Run with coverage
npx vitest run --coverage

# Watch mode
npx vitest
```

## Test Configuration

### Timeouts
- **Test Timeout**: 15 seconds (reduced from 30s)
- **Hook Timeout**: 5 seconds (reduced from 10s)
- **Teardown Timeout**: 5 seconds (reduced from 10s)

### Coverage Thresholds
- **Branches**: 60% (reduced from 70%)
- **Functions**: 60% (reduced from 70%)
- **Lines**: 60% (reduced from 70%)
- **Statements**: 60% (reduced from 70%)

## Test Data Management

### Temporary Files
- Test data is stored in `test-data/` directory
- Automatically cleaned up after tests
- Use `./run-tests.bat clean` to manually clean

### Log Files
- Test logs are written to timestamped files
- Format: `test-YYYY-MM-DD.log`
- Exception logs: `test-exceptions-YYYY-MM-DD.log`
- Rejection logs: `test-rejections-YYYY-MM-DD.log`

## Writing Tests

### Core Service Tests
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateManager } from '../../backend/src/core/StateManager';

describe('Simplified StateManager', () => {
  let stateManager: StateManager;

  beforeEach(async () => {
    stateManager = StateManager.getInstance();
    await stateManager.init();
  });

  afterEach(async () => {
    await stateManager.destroy();
  });

  it('should handle atomic state replacement', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { InteractorServer } from '../../backend/src/index';

describe('Simplified API Integration', () => {
  let server: InteractorServer;

  beforeAll(async () => {
    server = new InteractorServer();
    await server.init();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should register interaction map', async () => {
    // Test implementation
  });
});
```

## Test Patterns

### Singleton Service Testing
- Use `getInstance()` to get service instances
- Test singleton behavior across multiple calls
- Verify proper cleanup in `afterEach`

### Atomic State Testing
- Test full state replacement with `replaceState()`
- Verify state consistency after updates
- Test state persistence across restarts

### REST API Testing
- Use `supertest` for HTTP endpoint testing
- Test minimal API surface (no WebSocket)
- Verify atomic interaction registration

### Error Handling
- Test graceful error handling
- Verify system stability under error conditions
- Test invalid input handling

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Tests use different ports (3001, 3002, 3003, 3004)
   - Ensure ports are available before running tests

2. **File System Issues**
   - Tests create temporary files in `test-data/`
   - Ensure write permissions in test directory

3. **Module Loading Issues**
   - Tests use simplified module loading
   - No hot reload functionality in tests

4. **Timeout Issues**
   - Reduced timeouts for faster test execution
   - Increase timeouts in `vitest.config.ts` if needed

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npx vitest run

# Run specific test with debug
DEBUG=* npx vitest run core/StateManager.test.ts
```

## Continuous Integration

### GitHub Actions
Tests are configured to run in CI with:
- Node.js 18+ environment
- Automatic dependency installation
- Coverage reporting
- Test result artifacts

### Local CI Simulation
```bash
# Simulate CI environment
npm ci
npm run test:ci
```

## Performance

### Test Execution Time
- **Core Tests**: ~30 seconds
- **Integration Tests**: ~60 seconds
- **Full Suite**: ~2 minutes
- **With Coverage**: ~3 minutes

### Memory Usage
- **Peak Memory**: ~200MB
- **Average Memory**: ~100MB
- **Cleanup**: Automatic after each test

## Contributing

When adding new tests:

1. Follow the simplified architecture patterns
2. Use singleton services where appropriate
3. Test atomic operations for state changes
4. Avoid complex real-time features
5. Keep tests focused and fast
6. Update this README if adding new test categories 