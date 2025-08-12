# End-to-End Integration Tests

This directory contains comprehensive end-to-end tests that validate the complete Interactor system using real browser automation.

## Overview

These tests use **Playwright** to automate real browser interactions and test the complete user workflow from frontend to backend. They ensure that:

- The frontend loads correctly and connects to the backend
- Users can interact with the UI to create and configure modules
- Real-time communication works between frontend and backend
- Error handling works properly in real scenarios
- The complete system works as expected in production

## Prerequisites

Before running E2E tests, ensure all servers are running:

1. **Backend Server**: `npm run start:backend` (runs on http://127.0.0.1:3001)
2. **Frontend Server**: `npm run start:frontend` (runs on http://127.0.0.1:3000)
3. **File Uploader**: `npm run start:file-uploader` (runs on http://127.0.0.1:4000)

## Running Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run E2E Tests with Browser Visible
```bash
npm run test:e2e:headed
```

### Run E2E Tests in Debug Mode
```bash
npm run test:e2e:debug
```

### Run E2E Tests with Playwright UI
```bash
npm run test:e2e:ui
```

## Test Categories

### Frontend-Backend Integration
- **Module Loading**: Verifies that modules are loaded from backend and displayed in UI
- **Drag and Drop**: Tests creating module instances by dragging from sidebar to canvas
- **Navigation**: Tests page navigation between Modules, Wikis, Performance, and Console
- **Settings Panel**: Tests opening and closing the settings panel
- **Manual Triggers**: Tests triggering modules manually through UI

### Real-time Communication
- **Backend Updates**: Tests that frontend receives real-time updates from backend
- **Frontend Commands**: Tests that frontend can send commands to backend

### Error Handling
- **Connection Errors**: Tests graceful handling of backend connection failures
- **Invalid Configurations**: Tests handling of invalid module configurations

### Performance and Monitoring
- **Performance Metrics**: Tests viewing system performance metrics
- **System Logs**: Tests viewing system logs in console

### Complete Workflow
- **End-to-End Workflow**: Tests the complete user workflow from module creation to interaction

## Test Structure

Each test follows this pattern:

1. **Setup**: Navigate to frontend and clear test data
2. **Action**: Perform UI interactions (clicks, drags, typing)
3. **Verification**: Check that expected changes occurred
4. **Cleanup**: Restore original state

## Browser Support

Tests run against multiple browsers:
- **Chromium**: Primary browser for testing
- **Firefox**: Cross-browser compatibility
- **WebKit**: Safari compatibility

## Configuration

The tests use the following configuration:

- **Base URL**: http://127.0.0.1:3000 (frontend)
- **Backend URL**: http://127.0.0.1:3001
- **File Uploader URL**: http://127.0.0.1:4000
- **Timeout**: 10-15 seconds for most operations
- **Retries**: 2 retries on CI, 0 locally

## Debugging

### View Test Results
After running tests, view the HTML report:
```bash
npx playwright show-report
```

### Debug Individual Tests
```bash
npx playwright test --debug e2e/E2E.test.ts
```

### Run Tests with Video Recording
```bash
npx playwright test --video=on e2e/
```

## Common Issues

### Server Not Running
If tests fail with connection errors, ensure all servers are running:
```bash
# Terminal 1
cd backend && npm run start:backend

# Terminal 2  
cd frontend && npm run dev

# Terminal 3
cd backend && npm run start:file-uploader
```

### Browser Installation
If Playwright browsers are not installed:
```bash
npx playwright install
```

### Test Audio File
The tests use a placeholder audio file. For real testing, replace `test-audio.wav` with an actual WAV file.

## Integration with CI/CD

These tests are designed to run in CI/CD pipelines:

- **Headless Mode**: Tests run without browser UI
- **Screenshot Capture**: Failed tests capture screenshots
- **Video Recording**: Failed tests record video
- **Trace Files**: Detailed execution traces for debugging

## Contributing

When adding new E2E tests:

1. **Follow the Pattern**: Use the existing test structure
2. **Real Interactions**: Test actual UI interactions, not just API calls
3. **Error Scenarios**: Include tests for error conditions
4. **Documentation**: Update this README with new test descriptions
5. **Performance**: Keep tests fast and focused

## Test Data Management

Tests automatically:
- **Backup State**: Save original system state before tests
- **Clear Data**: Remove test data between tests
- **Restore State**: Restore original state after tests

This ensures tests don't interfere with each other and don't leave the system in an inconsistent state. 