# Interactor Integration Test Suite

This directory contains comprehensive integration tests for the Interactor backend system. These tests verify that all components work together correctly in a realistic environment.

## Test Overview

The integration test suite consists of four main test files, each focusing on different aspects of the system:

### 1. BackendIntegration.test.ts
**Core backend functionality and system integration**

- **Module Registration and Discovery**: Tests module discovery, manifest validation, and hot reloading
- **Message Routing and Signal Flow**: Tests one-to-one, one-to-many, and many-to-one message routing
- **Trigger and Streaming Events**: Tests event handling and real-time data flow
- **API Updates and State Management**: Tests configuration updates and state persistence
- **Error Handling and Recovery**: Tests graceful error handling and system recovery
- **Performance and Metrics**: Tests system performance under load
- **System Integration**: Tests complete system lifecycle and concurrent operations

### 2. MessageRouting.test.ts
**Message routing system and middleware**

- **Complex Routing Patterns**: Tests wildcard patterns, nested patterns, and multiple conditions
- **Middleware Integration**: Tests middleware chains, error handling, and processing order
- **Message Queue and Performance**: Tests queue overflow handling and message ordering
- **Route Management**: Tests dynamic route addition/removal and enabling/disabling
- **Error Recovery and Resilience**: Tests error recovery and circular route detection

### 3. ModuleLifecycle.test.ts
**Module lifecycle and management**

- **Module Discovery and Loading**: Tests valid/invalid manifests and duplicate handling
- **Module Instance Lifecycle**: Tests creation, initialization, and destruction
- **Hot Reloading**: Tests file watching, module updates, and rapid changes
- **State Persistence and Recovery**: Tests state saving and restoration
- **Module Configuration Updates**: Tests runtime configuration changes
- **Module Dependencies and Loading Order**: Tests dependency resolution

### 4. APIWebSocket.test.ts
**REST API and WebSocket communication**

- **REST API Endpoints**: Tests all API endpoints (status, modules, instances, routes, triggers)
- **WebSocket Communication**: Tests connection handling, authentication, and message validation
- **Real-time Event Broadcasting**: Tests event broadcasting to multiple clients
- **Performance and Load Testing**: Tests high load scenarios and concurrent connections
- **Error Recovery and Resilience**: Tests connection failures and server restart handling

## Running the Tests

### Prerequisites

1. Ensure all dependencies are installed:
   ```bash
   cd Tests
   npm install
   ```

2. Make sure the backend and shared packages are built:
   ```bash
   cd ../backend && npm run build
   cd ../shared && npm run build
   ```

### Running All Integration Tests

```bash
# Run all integration tests with the test runner
npm run integration

# Run with verbose output
npm run integration:verbose

# Run with coverage
npm run integration:coverage

# Run in watch mode
npm run integration:watch
```

### Running Individual Test Suites

```bash
# Run specific test suites
npm run test:backend    # BackendIntegration.test.ts
npm run test:routing    # MessageRouting.test.ts
npm run test:modules    # ModuleLifecycle.test.ts
npm run test:api        # APIWebSocket.test.ts
```

### Running All Tests (Unit + Integration)

```bash
# Run all tests
npm run test:all

# Run all tests with coverage
npm run test:all:coverage

# Generate and open coverage report
npm run test:report
```

## Test Configuration

### Environment Variables

- `VITEST_VERBOSE=true`: Enable verbose console output
- `VITEST_UI=true`: Launch the Vitest UI interface

### Test Timeouts

- Individual tests: 30 seconds
- Setup/teardown hooks: 10 seconds
- Integration test runner: 5 minutes total

### Test Isolation

Tests run in isolated processes to prevent interference. Each test suite:
- Creates its own test directories
- Uses unique port numbers
- Cleans up after completion

## Test Data and Artifacts

### Generated Directories

- `test-modules/`: Temporary modules for testing
- `test-modules-lifecycle/`: Modules for lifecycle tests
- `test-data/`: Test data files
- `test-logs/`: Test log files

### Output Files

- `test-results.json`: Detailed test results
- `coverage/`: Code coverage reports
- `*.log`: Test log files

## Understanding Test Results

### Test Runner Output

The integration test runner provides:
- **Progress indicators**: Shows which test suite is running
- **Pass/fail counts**: Number of tests passed and failed
- **Error details**: Specific error messages for failed tests
- **Summary report**: Overall success rate and duration

### Coverage Reports

Coverage reports show:
- **Line coverage**: Percentage of code lines executed
- **Branch coverage**: Percentage of code branches taken
- **Function coverage**: Percentage of functions called
- **Statement coverage**: Percentage of statements executed

## Troubleshooting

### Common Issues

1. **Port conflicts**: Tests use ports 3001-3010. Ensure these are available
2. **File permissions**: Tests create temporary files. Ensure write permissions
3. **Memory issues**: Large test suites may require more memory
4. **Timeout errors**: Increase timeout values for slow systems

### Debug Mode

Run tests in debug mode for more information:

```bash
# Enable verbose output
VITEST_VERBOSE=true npm run integration

# Run specific test with debugging
VITEST_VERBOSE=true npm run test:backend
```

### Cleaning Up

Clean up test artifacts:

```bash
npm run test:clean
```

## Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.ts`
3. Use descriptive test names and descriptions
4. Include proper setup and teardown
5. Add to test runner if needed

### Test Best Practices

- **Isolation**: Each test should be independent
- **Cleanup**: Always clean up resources
- **Descriptive names**: Use clear, descriptive test names
- **Error handling**: Test both success and failure scenarios
- **Performance**: Keep tests fast and efficient

### Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something specific', async () => {
    // Test implementation
  });
});
```

## Performance Considerations

### Test Optimization

- **Parallel execution**: Tests run in parallel where possible
- **Resource pooling**: Reuse expensive resources
- **Mocking**: Mock external dependencies
- **Caching**: Cache test data where appropriate

### Monitoring

Monitor test performance:
- Test execution time
- Memory usage
- Resource utilization
- Coverage trends

## Continuous Integration

### CI/CD Integration

The test suite is designed for CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    cd Tests
    npm run integration
```

### Automated Reporting

- Test results are saved to `test-results.json`
- Coverage reports are generated automatically
- Failed tests provide detailed error information

## Support

For issues with the integration test suite:

1. Check the troubleshooting section above
2. Review test logs in `test-logs/` directory
3. Run tests in verbose mode for more details
4. Check the main project documentation

---

**Note**: These integration tests are designed to be comprehensive and may take several minutes to complete. They provide confidence that the entire system works correctly together. 