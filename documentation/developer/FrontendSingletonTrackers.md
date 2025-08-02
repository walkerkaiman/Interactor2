# Frontend Singleton Trackers

## Overview

The frontend application uses several singleton trackers to manage global state and ensure consistent behavior across components. All trackers follow the same singleton pattern to prevent multiple instances and potential state conflicts.

## Singleton Pattern Implementation

All frontend trackers use the following singleton pattern:

```typescript
class TrackerClass {
  private static instance: TrackerClass;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): TrackerClass {
    if (!TrackerClass.instance) {
      TrackerClass.instance = new TrackerClass();
    }
    return TrackerClass.instance;
  }
}

export const trackerInstance = TrackerClass.getInstance();
```

## Trackers

### 1. TriggerEventTracker

**Location**: `frontend/src/utils/triggerEventTracker.ts`

**Purpose**: Manages pulse animation states for trigger events on output modules.

**Key Features**:
- Tracks which modules are currently pulsing
- Emits events for trigger events and pulse endings
- Automatically clears pulse states after animation duration
- Extends EventEmitter for event-driven communication

**Methods**:
- `recordTriggerEvent(moduleId, source)`: Records a trigger event and starts pulse animation
- `isPulsing(moduleId)`: Checks if a module is currently pulsing
- `getActivePulses()`: Returns all currently pulsing modules
- `clearAllPulses()`: Clears all pulse states

**Events**:
- `triggerEvent`: Emitted when a trigger event is recorded
- `pulseEnded`: Emitted when a pulse animation completes
- `allPulsesCleared`: Emitted when all pulses are cleared

**Usage**:
```typescript
import { triggerEventTracker } from '../utils/triggerEventTracker';

// Record a trigger event
triggerEventTracker.recordTriggerEvent('module-1', 'manual');

// Listen for trigger events
triggerEventTracker.on('triggerEvent', (event) => {
  console.log('Trigger event:', event);
});
```

### 2. EdgeRegistrationTracker

**Location**: `frontend/src/utils/edgeRegistrationTracker.ts`

**Purpose**: Tracks the registration state of edges (connections) between modules.

**Key Features**:
- Distinguishes between registered (backend) and unregistered (local) edges
- Provides visual feedback for edge states
- Updates from interaction configurations
- Maintains edge registration history

**Methods**:
- `isEdgeRegistered(edgeId)`: Checks if an edge is registered
- `registerEdge(edgeId)`: Marks an edge as registered
- `unregisterEdge(edgeId)`: Marks an edge as unregistered
- `updateFromInteractions(registered, local)`: Updates from interaction configs
- `registerNewBackendEdges(interactions)`: Registers new backend edges
- `clear()`: Clears all edge states

**Usage**:
```typescript
import { edgeRegistrationTracker } from '../utils/edgeRegistrationTracker';

// Check edge registration status
const isRegistered = edgeRegistrationTracker.isEdgeRegistered('edge-1');

// Update from interactions
edgeRegistrationTracker.updateFromInteractions(registeredInteractions, localInteractions);
```

### 3. ApiService

**Location**: `frontend/src/api/index.ts`

**Purpose**: Provides a centralized interface for all backend API communications.

**Key Features**:
- Handles all HTTP requests to the backend
- Provides type-safe API methods
- Manages request headers and error handling
- Centralizes API configuration

**Methods**:
- `getModules()`: Fetch available modules
- `getInteractions()`: Fetch registered interactions
- `registerInteractions(interactions)`: Register new interactions
- `triggerModule(moduleId, payload)`: Trigger a module manually
- `getSettings()`: Fetch application settings
- `updateSetting(key, value)`: Update a setting
- `getStats()`: Fetch system statistics
- `getHealth()`: Check system health

**Usage**:
```typescript
import { apiService } from '../api';

// Fetch modules
const modules = await apiService.getModules();

// Trigger a module
await apiService.triggerModule('module-1', { type: 'manualTrigger' });
```

## Benefits of Singleton Pattern

### 1. State Consistency
- Ensures all components access the same state instance
- Prevents state conflicts between different parts of the application
- Maintains data integrity across the entire frontend

### 2. Memory Efficiency
- Only one instance of each tracker exists in memory
- Reduces memory footprint
- Prevents memory leaks from multiple instances

### 3. Global Access
- Any component can access the same tracker instance
- No need to pass trackers through props or context
- Simplifies component communication

### 4. Thread Safety
- Single instance prevents race conditions
- Consistent state updates across all components
- Predictable behavior in concurrent scenarios

## Testing

All singleton trackers have comprehensive test coverage in `Tests/core/SingletonTrackers.test.ts`. The tests verify:

- Singleton instance consistency
- State tracking functionality
- Event emission and handling
- Method availability and behavior
- Pattern consistency across all trackers

## Best Practices

### 1. Import Pattern
Always import the singleton instance, not the class:

```typescript
// ✅ Correct
import { triggerEventTracker } from '../utils/triggerEventTracker';

// ❌ Incorrect
import { TriggerEventTracker } from '../utils/triggerEventTracker';
```

### 2. State Management
- Use tracker methods to modify state, don't access internal properties directly
- Always call appropriate cleanup methods when done
- Listen for events rather than polling state

### 3. Error Handling
- Wrap tracker method calls in try-catch blocks
- Handle potential errors gracefully
- Log errors for debugging

### 4. Performance
- Remove event listeners when components unmount
- Avoid creating new listeners on every render
- Use appropriate cleanup methods

## Troubleshooting

### Common Issues

1. **State Not Updating**
   - Ensure you're using the singleton instance
   - Check that event listeners are properly attached
   - Verify that state updates are being called

2. **Memory Leaks**
   - Always remove event listeners in cleanup
   - Use appropriate cleanup methods
   - Check for circular references

3. **Race Conditions**
   - Use async/await for state updates
   - Wait for state changes before proceeding
   - Use event-driven patterns

### Debugging

1. **Check Instance Identity**
   ```typescript
   console.log('Tracker instance:', triggerEventTracker);
   ```

2. **Monitor State Changes**
   ```typescript
   triggerEventTracker.on('triggerEvent', (event) => {
     console.log('Trigger event:', event);
   });
   ```

3. **Verify Singleton Pattern**
   ```typescript
   const instance1 = triggerEventTracker;
   const instance2 = triggerEventTracker;
   console.log('Same instance:', instance1 === instance2);
   ```

## Future Considerations

1. **Persistence**: Consider adding persistence layer for critical state
2. **Validation**: Add input validation for tracker methods
3. **Metrics**: Implement usage metrics and performance monitoring
4. **Extensibility**: Design for easy addition of new trackers
5. **Type Safety**: Enhance TypeScript types for better type safety

## Related Documentation

- [Trigger Pulse Animation](./TriggerPulseAnimation.md)
- [Module Development Guide](./ModuleDevelopmentGuide.md)
- [Frontend Design](./FrontendDesign.md) 