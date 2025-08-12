# Frontend Test Suite

This directory contains comprehensive tests for the Interactor frontend application, covering components, hooks, services, and utilities.

## Test Structure

```
Tests/frontend/
├── components/           # Component tests
│   ├── App.test.tsx     # Main App component tests
│   ├── NodeEditor.test.tsx # React Flow integration tests
│   └── Sidebar.test.tsx # Navigation component tests
├── hooks/               # Custom hook tests
│   ├── useBackendSync.test.ts # Backend synchronization tests
│   ├── useNodeConfig.test.ts  # Node configuration tests
│   └── useUnregisteredChanges.test.ts # Change tracking tests
├── services/            # Service tests
│   └── WebSocketService.test.ts # WebSocket communication tests
└── README.md           # This file
```

## Test Categories

### Component Tests (`components/`)

Tests for React components that handle UI rendering and user interactions.

**App.test.tsx**
- Initial rendering and loading states
- Backend synchronization
- UI state management (sidebar, panels, navigation)
- Registration system for unregistered changes
- Error handling and display
- WebSocket integration
- Performance with large datasets

**NodeEditor.test.tsx**
- React Flow integration
- Node and edge management
- User interactions (click, drag, connect)
- Complex interaction structures
- Empty state handling
- Performance with many nodes
- Error handling for malformed data

**Sidebar.test.tsx**
- Navigation between pages
- Sidebar toggle functionality
- Unregistered changes indicator
- Responsive behavior
- Accessibility (ARIA labels, keyboard navigation)
- Performance with rapid navigation

### Hook Tests (`hooks/`)

Tests for custom React hooks that manage state and business logic.

**useBackendSync.test.ts**
- Initial data loading from API
- WebSocket connection management
- Real-time state updates
- Module manifest and runtime data merging
- Error handling for network issues
- Performance with large datasets
- Cleanup on unmount

**useNodeConfig.test.ts**
- Configuration initialization
- Configuration updates (single and nested values)
- Configuration saving and validation
- Change tracking and reset functionality
- Performance with frequent updates
- Error handling for save failures

**useUnregisteredChanges.test.ts**
- Change tracking for module configurations
- Merging changes with interactions
- Change persistence across re-renders
- Complex configuration handling
- Performance with many changes
- Edge cases and error handling

### Service Tests (`services/`)

Tests for utility services that handle external communication and data processing.

**WebSocketService.test.ts**
- Connection establishment and management
- Message sending and receiving
- Error handling and reconnection
- Event handler management
- Performance with high message volume
- Cleanup and memory leak prevention

## Running Tests

### Run All Frontend Tests
```bash
npm run test:frontend
```

### Run Specific Categories
```bash
# Component tests only
npm run test:frontend:components

# Hook tests only
npm run test:frontend:hooks

# Service tests only
npm run test:frontend:services
```

### Run with Coverage
```bash
npm run test:frontend:coverage
```

### Run Individual Test Files
```bash
# Run specific test file
npx vitest run Tests/frontend/components/App.test.tsx

# Run with watch mode
npx vitest Tests/frontend/components/App.test.tsx --watch
```

### Using the Test Runner
```bash
# List available categories
ts-node Tests/frontend/run-frontend-tests.ts --list

# Run specific category
ts-node Tests/frontend/run-frontend-tests.ts components

# Run with coverage
ts-node Tests/frontend/run-frontend-tests.ts hooks --coverage
```

## Test Patterns

### Component Testing
- **Rendering**: Verify components render without crashing
- **Props**: Test with various prop combinations
- **User Interactions**: Test clicks, form submissions, navigation
- **State Changes**: Verify UI updates when state changes
- **Error Handling**: Test error states and recovery
- **Accessibility**: Test ARIA labels and keyboard navigation

### Hook Testing
- **Initial State**: Verify correct initial values
- **State Updates**: Test state changes and side effects
- **Cleanup**: Ensure proper cleanup on unmount
- **Error Handling**: Test error scenarios
- **Performance**: Test with large datasets

### Service Testing
- **Connection Management**: Test connection establishment and cleanup
- **Message Handling**: Test message sending and receiving
- **Error Recovery**: Test reconnection and error handling
- **Memory Management**: Ensure no memory leaks

## Mocking Strategy

### API Service Mocking
```typescript
vi.mock('../../../frontend/src/api', () => ({
  apiService: {
    getModules: vi.fn(),
    getInteractions: vi.fn(),
    registerInteractions: vi.fn(),
  }
}));
```

### WebSocket Mocking
```typescript
const mockWebSocket = {
  close: vi.fn(),
  send: vi.fn(),
  onopen: null as any,
  onmessage: null as any,
  onerror: null as any,
  onclose: null as any,
};

global.WebSocket = vi.fn(() => mockWebSocket) as any;
```

### React Flow Mocking
```typescript
vi.mock('reactflow', () => ({
  ReactFlowProvider: ({ children }) => <div data-testid="react-flow-provider">{children}</div>,
  ReactFlow: ({ nodes, edges, onNodesChange, onEdgesChange, onConnect }) => (
    <div data-testid="react-flow">
      {/* Mock implementation */}
    </div>
  ),
}));
```

## Test Data

### Mock Modules
```typescript
const mockModules = [
  { id: 'time-1', name: 'time_input', type: 'input', description: 'Time input module' },
  { id: 'audio-1', name: 'audio_output', type: 'output', description: 'Audio output module' }
];
```

### Mock Interactions
```typescript
const mockInteractions = [
  {
    id: 'int-1',
    triggers: ['time_input'],
    actions: ['audio_output'],
    modules: [
      { id: 'time-1', moduleName: 'time_input', config: { enabled: true } },
      { id: 'audio-1', moduleName: 'audio_output', config: { volume: 0.8 } }
    ]
  }
];
```

## Coverage Goals

- **Components**: 90%+ line coverage
- **Hooks**: 95%+ line coverage
- **Services**: 90%+ line coverage
- **Overall**: 85%+ line coverage

## Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Test both success and failure scenarios
- Test edge cases and error conditions

### Async Testing
- Use `waitFor` for async operations
- Test loading states and error states
- Verify cleanup on unmount

### Performance Testing
- Test with large datasets
- Verify no memory leaks
- Test frequent updates

### Accessibility Testing
- Test keyboard navigation
- Verify ARIA labels
- Test screen reader compatibility

## Debugging Tests

### Enable Verbose Output
```bash
npx vitest run --reporter=verbose
```

### Run Single Test
```bash
npx vitest run -t "App Component"
```

### Debug with Console
```bash
npx vitest run --reporter=verbose --no-coverage
```

### View Coverage Report
```bash
npm run test:frontend:coverage
open coverage/index.html
```

## Common Issues

### Test Environment Setup
- Ensure `jsdom` is configured in `vitest.config.ts`
- Mock browser APIs (WebSocket, localStorage, etc.)
- Set up proper TypeScript configuration

### React Testing Library
- Use `data-testid` attributes for reliable element selection
- Avoid testing implementation details
- Focus on user behavior and outcomes

### Async Operations
- Use `waitFor` for async state updates
- Mock timers for time-based operations
- Clean up async operations in `afterEach`

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Test both success and failure scenarios
4. Include performance tests for complex operations
5. Add accessibility tests for UI components
6. Update this README if adding new test categories

## Integration with CI/CD

The frontend tests are integrated into the main test suite and will run:

- On every pull request
- Before deployment
- As part of the full test suite

To run frontend tests in CI:

```bash
npm run test:frontend
```

For coverage reporting in CI:

```bash
npm run test:frontend:coverage
``` 