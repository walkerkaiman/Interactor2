# Integration Tests

This directory contains integration tests that run against **real, running servers** to ensure authentic behavior and validate the complete system functionality.

## Overview

Integration tests use real HTTP requests, real WebSocket connections, and real state changes to validate that the Interactor system works as expected in production-like conditions.

## Prerequisites

### Required Servers

Before running integration tests, ensure these servers are running:

1. **Backend Server** (Required)
   - URL: `http://localhost:3001`
   - Start: `cd backend && npm start`
   - Must include WebSocket support

2. **Frontend Server** (Optional for API tests)
   - URL: `http://localhost:5173`
   - Start: `cd frontend && npm run dev`

3. **File Uploader Service** (Optional for API tests)
   - URL: `http://localhost:4000`
   - Start: `cd backend && npm run start:uploader`

### Quick Start

```bash
# Start all servers (if you have the scripts)
npm run start:servers

# Or start them individually
cd backend && npm start &
cd frontend && npm run dev &
cd backend && npm run start:uploader &
```

## Test Files

### API.test.ts
Tests all HTTP API endpoints with real server communication.

**What it tests:**
- Health and status endpoints
- Module management (create, read, update, start, stop)
- Interaction management (register, update)
- Manual triggering
- Settings management
- Error handling
- State persistence

**To run:**
```bash
npm run test:integration:api
```

### WebSocket.test.ts
Tests real-time WebSocket communication with the server.

**What it tests:**
- WebSocket connection establishment
- Initial state reception
- State update broadcasting
- Trigger event broadcasting
- Multiple concurrent connections
- Message format validation
- Error handling

**To run:**
```bash
npm run test:integration:websocket
```

## Test Strategy

### Real Server Integration
- Tests communicate with actual running servers
- Uses real HTTP requests and WebSocket connections
- Validates actual state changes in the system
- Tests real error conditions and edge cases

### State Management
- Tests backup original state before running
- Clear test data between tests
- Restore original state after tests complete
- Clean up running module instances

### Error Handling
- Tests validate proper error responses
- Tests handle network failures gracefully
- Tests verify error message formats
- Tests ensure system remains stable

## Running Tests

### Individual Test Files
```bash
# Run API tests only
npm run test:integration:api

# Run WebSocket tests only
npm run test:integration:websocket

# Run all integration tests
npm run test:integration
```

### With Coverage
```bash
# Run with coverage reporting
npm run test:integration:coverage
```

### With Verbose Output
```bash
# Run with detailed logging
npm run test:integration:verbose
```

### Automated Integration Runner
```bash
# Start servers, run tests, shut down (if available)
npm run test:integration:auto
```

## Test Configuration

### Timeouts
- Default timeout: 15 seconds per test
- WebSocket tests: 5-10 second timeouts for message reception
- State change tests: 5 second timeouts for updates

### Test Data
- Tests use isolated test data to avoid conflicts
- Each test cleans up after itself
- Test data is prefixed with `test-` or `ws-test-`

### Server Verification
- Tests verify servers are running before starting
- Tests provide helpful error messages if servers are unavailable
- Tests continue with available servers (frontend/uploader optional)

## Debugging

### Common Issues

1. **Server Not Running**
   ```
   Error: Backend server not responding: 500
   ```
   **Solution:** Start the backend server first

2. **WebSocket Connection Failed**
   ```
   Error: WebSocket connection failed
   ```
   **Solution:** Ensure backend has WebSocket support enabled

3. **Test Timeouts**
   ```
   Error: No state update received within timeout
   ```
   **Solution:** Check server performance, increase timeouts if needed

### Debug Commands

```bash
# Run single test with verbose output
npm run test:integration:api -- --reporter=verbose

# Run specific test
npm run test:integration:api -- --grep "GET /health"

# Run with UI
npm run test:integration:api -- --ui
```

### Manual Testing

You can also test the APIs manually:

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test modules endpoint
curl http://localhost:3001/api/modules

# Test WebSocket connection
wscat -c ws://localhost:3001
```

## Test Structure

### API Tests
```typescript
describe('API Integration Tests', () => {
  beforeAll(async () => {
    await verifyServersRunning();
    originalState = await getCurrentState();
  });

  afterAll(async () => {
    await restoreState(originalState);
  });

  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // Test cases...
});
```

### WebSocket Tests
```typescript
describe('WebSocket Integration Tests', () => {
  let ws: WebSocket;

  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    await cleanupTestData();
  });

  // Test cases...
});
```

## Adding New Tests

### API Test Pattern
```typescript
test('descriptive test name', async () => {
  // 1. Setup test data
  const testData = { /* ... */ };

  // 2. Make API call
  const response = await fetch(`${BACKEND_URL}/api/endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });

  // 3. Validate response
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);

  // 4. Verify side effects
  const verifyResponse = await fetch(`${BACKEND_URL}/api/verify`);
  const verifyData = await verifyResponse.json();
  expect(verifyData).toMatchObject(expectedData);
});
```

### WebSocket Test Pattern
```typescript
test('receives message when event occurs', (done) => {
  ws = new WebSocket(WS_URL);
  
  ws.on('open', async () => {
    // Trigger event via HTTP API
    await fetch(`${BACKEND_URL}/api/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* ... */ })
    });
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === 'expected_type') {
      expect(message.data).toMatchObject(expectedData);
      done();
    }
  });
  
  // Timeout for safety
  setTimeout(() => {
    done(new Error('No message received within timeout'));
  }, 5000);
});
```

## Best Practices

1. **Always clean up** - Tests should not leave state behind
2. **Use timeouts** - WebSocket tests need timeouts to prevent hanging
3. **Verify servers** - Check server availability before testing
4. **Isolate test data** - Use unique IDs to avoid conflicts
5. **Handle errors gracefully** - Tests should provide helpful error messages
6. **Test real scenarios** - Focus on actual use cases, not edge cases only

## Troubleshooting

### Server Issues
- Check server logs for errors
- Verify ports are not in use
- Ensure all dependencies are installed
- Check firewall settings

### Test Issues
- Increase timeouts if tests are slow
- Check server performance
- Verify test data isolation
- Review error messages for clues

### Network Issues
- Check localhost connectivity
- Verify no proxy interference
- Ensure consistent network environment
- Test with curl/wscat first 