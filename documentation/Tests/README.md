# Interactor Test Suite

This directory contains the comprehensive test suite for the Interactor system. The tests are organized according to the test strategy outlined in `documentation/Tests/TEST_STRATEGY.md`.

## Test Organization

```
Tests/
├── setup.ts                    # Global test setup and utilities
├── run-tests.ts               # Test runner script
├── vitest.config.ts           # Vitest configuration
├── core/                      # Core backend service tests
│   ├── Logger.test.ts         # Logger service tests
│   ├── StateManager.test.ts   # State manager tests
│   ├── MessageRouter.test.ts  # Message router tests
│   └── SystemStats.test.ts    # System stats tests
├── integration/               # Integration tests
│   └── API.test.ts           # API endpoint tests
├── modules/                   # Module system tests
│   └── ModuleLoader.test.ts   # Module loader tests
├── frontend/                  # Frontend component tests
└── e2e/                      # End-to-end tests
```

## Quick Start

### Prerequisites

1. Install dependencies:
```bash
cd Tests
npm install
```

2. Run all tests:
```bash
npm run test:all
```

### Individual Test Categories

```bash
# Core backend services
npm run test:core

# Module system
npm run test:modules

# Integration tests
npm run test:integration

# Frontend tests
npm run test:frontend

# End-to-end tests
npm run test:e2e
```

### Test Runner Script

The `run-tests.ts` script provides a convenient way to run different test categories:

```bash
# List available test categories
ts-node run-tests.ts list

# Check test file status
ts-node run-tests.ts check

# Run specific category
ts-node run-tests.ts core
ts-node run-tests.ts integration

# Run with coverage
ts-node run-tests.ts all --coverage
```

## Test Categories

### Core Services (`core/`)

Tests for the fundamental backend services:

- **Logger.test.ts**: Tests for structured logging, log rotation, error handling
- **StateManager.test.ts**: Tests for state persistence, validation, backup/recovery
- **MessageRouter.test.ts**: Tests for message routing, filtering, queuing
- **SystemStats.test.ts**: Tests for performance monitoring, metrics collection

### Integration Tests (`integration/`)

Tests that verify system components work together:

- **API.test.ts**: Tests for REST API endpoints, request/response handling

### Module System (`modules/`)

Tests for the module loading and management system:

- **ModuleLoader.test.ts**: Tests for module discovery, manifest validation, hot reloading

### Frontend Tests (`frontend/`)

Tests for React components and frontend functionality (to be implemented)

### End-to-End Tests (`e2e/`)

Tests for complete user workflows (to be implemented)

## Test Features

### Comprehensive Coverage

Each test category includes:

- **Unit Tests**: Individual function and method testing
- **Integration Tests**: Service interaction testing
- **Error Tests**: Error handling and recovery testing
- **Configuration Tests**: Configuration validation testing

### Test Utilities

The `setup.ts` file provides:

- Mock factories for common services
- Test data factories
- Async test utilities
- Network test utilities

### Test Data Management

- Mock data for modules, interactions, and configurations
- Test state management with cleanup
- File system utilities for test isolation

## Running Tests

### Basic Commands

```bash
# Run all tests
npm run test:all

# Run with coverage
npm run test:all:coverage

# Run specific category
npm run test:core
npm run test:integration

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

### Advanced Options

```bash
# Verbose output
npm run test:core -- --verbose

# Generate coverage report
npm run test:core -- --coverage

# Run specific test file
npx vitest run core/Logger.test.ts

# Run tests matching pattern
npx vitest run --reporter=verbose "**/*.test.ts"
```

## Test Implementation Status

### ✅ Completed

- **Core Services**: Logger, StateManager, MessageRouter, SystemStats
- **Integration**: API endpoints
- **Module System**: ModuleLoader

### 🔄 In Progress

- Frontend component tests
- WebSocket integration tests
- File upload tests

### 📋 Planned

- End-to-end tests
- Performance tests
- Load testing
- UI interaction tests

## Test Strategy

The test suite follows the strategy outlined in `documentation/Tests/TEST_STRATEGY.md`:

1. **Unit Tests**: Fast, isolated tests for individual functions
2. **Integration Tests**: Tests for service interactions
3. **E2E Tests**: Complete workflow testing

### Test Categories

- **Core**: Backend services (Logger, StateManager, etc.)
- **Modules**: Module system (ModuleLoader, Input/Output modules)
- **Integration**: API, WebSocket, File upload
- **Frontend**: React components, hooks, services
- **E2E**: Complete user workflows

## Coverage Goals

- **Unit Tests**: >90% code coverage
- **Integration Tests**: Critical path validation
- **E2E Tests**: User journey validation

## Debugging Tests

### Common Issues

1. **Import Errors**: Check that backend services are properly exported
2. **Mock Issues**: Verify mock implementations match expected interfaces
3. **Async Tests**: Use proper async/await patterns and timeouts

### Debug Commands

```bash
# Run single test with verbose output
npx vitest run core/Logger.test.ts --reporter=verbose

# Debug specific test
npx vitest run --reporter=verbose --grep "Logger creates log files"

# Run tests in watch mode
npm run test:watch
```

## Contributing

When adding new tests:

1. Follow the existing test patterns
2. Use the provided test utilities
3. Include comprehensive error testing
4. Add appropriate mocks and stubs
5. Update the test checkboxes in `BACKEND_FEATURES.md`

### Test Naming Convention

- Test files: `*.test.ts`
- Test descriptions: Clear, descriptive names
- Group related tests in `describe` blocks
- Use `beforeEach`/`afterEach` for setup/cleanup

### Example Test Structure

```typescript
describe('Service Name', () => {
  let service: Service;
  
  beforeEach(() => {
    service = new Service(mockLogger);
  });
  
  describe('Feature', () => {
    test('should do something', async () => {
      // Test implementation
    });
  });
});
```

## Configuration

The test suite uses Vitest with the following configuration:

- **Environment**: jsdom for React testing
- **Coverage**: v8 provider with HTML/JSON reports
- **Timeout**: 15 seconds for integration tests
- **Isolation**: Fork-based test isolation

See `vitest.config.ts` for detailed configuration. 