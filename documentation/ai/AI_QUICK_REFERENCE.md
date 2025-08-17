# AI Quick Reference

## Current State Management (Updated 2025-08-16)

### State JSON Endpoint
- **URL**: `http://localhost:3001/api/state`
- **Purpose**: Complete application state (no runtime data)
- **Structure**: Interactions with unified module configurations
- **Persistence**: Only saved when "Register" button is pressed

### Combined Runtime Updates
- **WebSocket Message Type**: `module_runtime_update`
- **Module ID**: `"combined"` (contains all runtime data)
- **Frequency**: Every 1 second, synchronized
- **Content**: System current time + all module runtime data
- **Change Detection**: `newChanges` flag for state re-fetch

### Frontend State Hooks
```typescript
// State synchronization
const { backendState, localState, hasChanges, registerChanges } = useStateSync();

// Real-time runtime data
const { getCountdown, getCurrentTime } = useRuntimeData();

// WebSocket connection
const { modules, interactions } = useBackendSync();
```

### Configuration Architecture
- **Unified Structure**: All modules use same flat config with defaults
- **Backend**: `ConfigNormalizer` ensures consistency
- **Frontend**: `ConfigParser` extracts module-specific properties
- **Name Mapping**: Display names ↔ internal folder names

## Module Development

### File Structure
```
backend/src/modules/input/my_module/
├── index.ts          # Module implementation
├── manifest.json     # Module configuration
└── wiki.md          # Documentation (optional)
```

### Base Classes
- **Input modules**: Extend `InputModuleBase`
- **Output modules**: Extend `OutputModuleBase`

### Lifecycle Methods
```typescript
export class MyModule extends InputModuleBase {
  protected async onInit(): Promise<void> {
    // Setup and validation
  }
  
  protected async onStart(): Promise<void> {
    // Begin processing
  }
  
  protected async onStop(): Promise<void> {
    // Cleanup
  }
}
```

### Manifest Schema
```json
{
  "name": "Module Name",
  "type": "input|output",
  "description": "Module description",
  "configSchema": {
    "type": "object",
    "properties": {
      "enabled": { "type": "boolean", "default": true }
    }
  }
}
```

## API Endpoints

### Core Endpoints
- `GET /api/modules` - Get all modules
- `GET /api/interactions` - Get all interactions
- `POST /api/interactions/register` - Register interactions (atomic)
- `PUT /api/modules/instances/:id` - Update module config

### WebSocket Events
- `state_update` - Debounced state snapshot (structural state still flows via REST)
- `module_runtime_update` - Immediate, targeted runtime-only updates (no config)
- `trigger_event` - Pulse notifications for UI effects
- `error` - Error frames with codes/suggestions

## Common Patterns

### Error Handling
```typescript
import { InteractorError } from '../../../core/ErrorHandler';

// Validation errors
throw InteractorError.validation('Invalid config', { config });

// Network errors
throw InteractorError.networkError('Connection failed', originalError);

// Module errors
throw InteractorError.moduleError(moduleName, 'start', error);
```

### Retry Logic
```typescript
import { RetryHandler } from '../../../core/RetryHandler';

await RetryHandler.withNetworkRetry(async () => {
  return await fetch(url);
});
```

## Troubleshooting Common Issues

### State Synchronization Issues

**Problem**: "Unregistered Interactions" indicator not working or phantom modules appearing after deletion.

**Root Causes**:
1. **Immutable state snapshots**: Using shallow copies that can be modified
2. **Race conditions in node updates**: Preserving old state instead of using latest data

**Solutions**:
```typescript
// ❌ Wrong: Shallow copy
setOriginalState([...interactions]);

// ✅ Correct: Deep copy
setOriginalState(JSON.parse(JSON.stringify(interactions)));

// ❌ Wrong: Conditional updates
if (hasDifferentIds) {
  return newNodes;
} else {
  return currentNodes; // Can preserve old state
}

// ✅ Correct: Force updates
return newNodes; // Always use latest data
```

### Configuration Not Updating

**Problem**: Module settings appear to reset or not persist.

**Solution**: Ensure both data structures are synced:
```typescript
// After updating module instances
await this.stateManager.replaceState({ modules: moduleInstances });

// CRITICAL: Sync interactions with updated modules
await this.syncInteractionsWithModules();
```

### WebSocket Race Conditions

**Problem**: UI not updating or showing incorrect state.

**Solution**: Use WebSocket only for real-time data, not structural changes:
```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'module_runtime_update') {
    // Handle runtime-only data
  }
};
```

### React State Race Conditions

**Problem**: "Cannot update during render" errors or inconsistent UI state.

**Solution**: Defer state updates to next tick:
```typescript
// ❌ Wrong: Can cause render errors
setNodes(newNodes);
setEdges(newEdges);

// ✅ Correct: Defer to next tick
setTimeout(() => {
  setNodes(newNodes);
  setEdges(newEdges);
}, 0);
```

### State Comparison Issues

**Problem**: Changes not detected when they should be.

**Solution**: Use deep comparison with exclusions:
```typescript
// Remove position data (doesn't affect backend behavior)
const originalWithoutPosition = JSON.parse(JSON.stringify(original));
const currentWithoutPosition = JSON.parse(JSON.stringify(current));

originalWithoutPosition.modules?.forEach(m => delete m.position);
currentWithoutPosition.modules?.forEach(m => delete m.position);

const hasChanges = JSON.stringify(originalWithoutPosition) !== JSON.stringify(currentWithoutPosition);
```

## Debugging Techniques

### State Tracking
```typescript
// Add detailed logging
console.log('State comparison:', {
  original: originalState,
  current: currentState,
  hasChanges: hasChanges
});
```

### Node Updates
```typescript
// Track node ID changes
console.log('Node update:', {
  currentIds: currentNodes.map(n => n.id),
  newIds: newNodes.map(n => n.id),
  shouldUpdate: hasDifferentIds
});
```

### WebSocket Debugging
```typescript
// Monitor WebSocket messages
ws.onmessage = (event) => {
  console.log('WebSocket message:', JSON.parse(event.data));
};
```

## Performance Best Practices

### React Optimization
- Use `useCallback` for expensive operations
- Use `useMemo` for computed values
- Avoid unnecessary re-renders with proper dependencies

### State Management
- Use immutable updates
- Batch related state updates
- Defer updates with `setTimeout(..., 0)`

### Error Handling
- Always use `InteractorError` for structured errors
- Include helpful error messages and suggestions
- Use retry logic for transient failures

## File Locations

- **Backend modules**: `backend/src/modules/`
- **Frontend components**: `frontend/src/components/`
- **Shared types**: `shared/src/types/`
- **Configuration**: `config/`
- **Documentation**: `documentation/`