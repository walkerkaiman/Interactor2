# AI Agent Start Here

This document provides essential information for AI agents working on the Interactor project.

## Core Rules

1. **Never restart the server automatically** - The user runs the server themselves
2. **Avoid inline CSS** - Use proper CSS files for styling
3. **Follow the modular architecture** - Each module should be self-contained
4. **Maintain backward compatibility** - Changes should not break existing functionality
5. **Use TypeScript strictly** - No `any` types unless absolutely necessary

## Recent Lessons Learned

### State Synchronization and Race Conditions (2025-01-27)

**Issues Resolved:**
1. **"Unregistered Interactions" indicator not working** - The indicator wasn't appearing when dragging new modules or connecting them
2. **Phantom module appearing after deletion** - A duplicate module would appear after deleting the last new module

**Root Causes:**
1. **Immutable state snapshots**: The original state was being modified when current state changed, causing incorrect comparisons
2. **Race conditions in node updates**: The node update logic was preserving old state instead of using the latest interactions data

**Solutions Applied:**
1. **True immutable snapshots**: Used `JSON.parse(JSON.stringify(interactions))` instead of `[...interactions]` to create deep copies
2. **Force updates instead of conditional updates**: Changed node update logic from conditional updates to always using the latest interactions data
3. **Simplified WebSocket handling**: Removed complex structural change detection from WebSocket, using only for real-time data updates

**Key Technical Insights:**
- **Deep vs shallow copying**: `[...array]` creates a shallow copy that can still reference mutable objects
- **State comparison logic**: When comparing states, ensure you're comparing the actual data, not references
- **Race condition prevention**: Force updates can prevent race conditions where old state is preserved incorrectly
- **WebSocket simplification**: Using WebSocket only for real-time data and fetch for structural changes reduces complexity

**Code Patterns:**
```typescript
// ❌ Wrong: Shallow copy that can be modified
setOriginalState([...interactions]);

// ✅ Correct: Deep copy that's truly immutable
setOriginalState(JSON.parse(JSON.stringify(interactions)));

// ❌ Wrong: Conditional updates that can preserve old state
if (hasDifferentIds) {
  return newNodes;
} else {
  return currentNodes; // Can preserve old state incorrectly
}

// ✅ Correct: Force updates that always use latest data
return newNodes; // Always use latest interactions data
```

**Debugging Techniques:**
- Add detailed logging to track state changes
- Compare actual node IDs, not just counts
- Log before/after states to identify race conditions
- Use immutable snapshots for reliable comparisons

## Configuration Synchronization Issues

The backend maintains two related data structures:
- `modules` array: Contains module instances with their configurations
- `interactions` array: Contains interaction definitions that reference modules

**Problem**: These structures can get out of sync, causing modules to appear with incorrect settings.

**Solution Pattern**: After any module configuration update, synchronize the interactions:

```typescript
// In backend/src/index.ts
private syncInteractionsWithModules() {
  const moduleInstances = this.stateManager.getModuleInstances();
  const interactions = this.stateManager.getInteractions();
  
  // Update interactions to match current module configurations
  const updatedInteractions = interactions.map(interaction => ({
    ...interaction,
    modules: interaction.modules?.map(module => {
      const matchingInstance = moduleInstances.find(instance => instance.id === module.id);
      return matchingInstance ? { ...module, config: matchingInstance.config } : module;
    }) || []
  }));
  
  this.stateManager.updateInteractions(updatedInteractions);
}
```

**When to call**: After any module instance configuration update (PUT /api/modules/instances/:id)

**Debugging steps**:
1. Check `data/state.json` for inconsistencies between `modules` and `interactions`
2. Verify module configurations are being persisted immediately (not debounced)
3. Ensure the sync function is called after configuration updates

## Frontend State Management Lessons

### React State Race Conditions

**Problem**: Multiple state updates happening simultaneously can cause inconsistent UI state.

**Solution**: Use `setTimeout(..., 0)` to defer state updates and prevent render-phase updates:

```typescript
// ❌ Wrong: Can cause "Cannot update during render" errors
setNodes(newNodes);
setEdges(newEdges);

// ✅ Correct: Defer to next tick
setTimeout(() => {
  setNodes(newNodes);
  setEdges(newEdges);
}, 0);
```

### State Comparison Logic

**Problem**: Comparing complex objects can be unreliable due to reference equality.

**Solution**: Use deep comparison with specific exclusions:

```typescript
// Remove position data before comparison (it doesn't affect backend behavior)
const originalWithoutPosition = JSON.parse(JSON.stringify(original));
const currentWithoutPosition = JSON.parse(JSON.stringify(current));

// Remove position from modules
originalWithoutPosition.modules?.forEach(m => delete m.position);
currentWithoutPosition.modules?.forEach(m => delete m.position);

const hasChanges = JSON.stringify(originalWithoutPosition) !== JSON.stringify(currentWithoutPosition);
```

## Error Handling

The system uses structured error handling with `InteractorError` class:

```typescript
class InteractorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'InteractorError';
  }
}
```

**Best practices**:
- Always include error codes for programmatic handling
- Provide meaningful error messages
- Include relevant context in error details
- Use try-catch blocks around async operations

## Module Development

### Input Modules
Extend `InputModuleBase` and implement:
- `onInit()`: Setup and validation
- `onStart()`: Begin processing
- `onStop()`: Cleanup

### Output Modules  
Extend `OutputModuleBase` and implement:
- `onInit()`: Setup and validation
- `onStart()`: Begin processing
- `onStop()`: Cleanup

### Configuration

#### Shared File Uploader (NEW ― Aug 2025)
There is now a single `FileUploader` service running on `http://0.0.0.0:4000` for the entire backend.

1. Modules that need uploads register their own rules in the constructor:
```typescript
this.registerUploads('audio-output', {
  allowedExtensions: ['.wav', '.mp3', '.ogg'],
  maxFileSize: 50 * 1024 * 1024 // 50 MB
});
```
2. HTTP routes (moduleType = `audio-output`, `dmx-output`, etc.)
```
POST   /upload/:moduleType        // multipart field name "file"
GET    /files/:moduleType         // list files
DELETE /files/:moduleType/:name   // delete
GET    /health                   // service health
```
3. No per-module ports anymore — all uploads share port 4000.

Each module needs a `manifest.json`:
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

## File Locations

- **Backend modules**: `backend/src/modules/`
- **Frontend components**: `frontend/src/components/`
- **Shared types**: `shared/src/types/`
- **Configuration**: `config/`
- **Documentation**: `documentation/`

## Common Patterns

### API Communication
```typescript
// GET data
const data = await apiService.getInteractions();

// POST registration
await apiService.registerInteractions(interactions);

// PUT configuration
await apiService.updateModuleConfig(moduleId, config);
```

### WebSocket Usage
```typescript
// Real-time data updates only
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'state_update') {
    // Handle real-time data only
    // Don't process structural changes via WebSocket
  }
};
```

### State Management
```typescript
// Local state for unregistered changes
const [localInteractions, setLocalInteractions] = useState([]);
const [registeredInteractions, setRegisteredInteractions] = useState([]);

// Original state for comparison
const [originalRegisteredInteractions, setOriginalRegisteredInteractions] = useState([]);
```

## Frontend Lessons

### Performance
- Use `useCallback` and `useMemo` for expensive operations
- Avoid unnecessary re-renders with proper dependency arrays
- Consider `useLayoutEffect` for DOM measurements

### State Updates
- Defer state updates with `setTimeout(..., 0)` to avoid render-phase updates
- Use immutable updates to prevent reference equality issues
- Batch related state updates together

### Error Boundaries
- Wrap components in error boundaries for graceful failure handling
- Provide fallback UI for error states
- Log errors for debugging

## Backend Lessons

### Module Lifecycle
- Always implement proper cleanup in `onStop()`
- Validate configuration in `onInit()`
- Handle async operations gracefully

### State Persistence
- Use immediate persistence for critical state changes
- Implement proper error handling for file operations
- Consider backup strategies for state corruption

### WebSocket Management
- Implement reconnection logic
- Handle connection failures gracefully
- Limit message frequency to prevent flooding

## Testing

### Unit Tests
- Test module lifecycle methods
- Verify configuration validation
- Test error handling scenarios

### Integration Tests
- Test API endpoints
- Verify WebSocket communication
- Test state persistence

### Frontend Tests
- Test component rendering
- Verify state management
- Test user interactions

## Deployment

### Backend
- Ensure all dependencies are installed
- Verify configuration files are present
- Test module loading on target system

### Frontend
- Build with production optimizations
- Verify all assets are included
- Test in target browser environment

## Troubleshooting

### Common Issues
1. **Module not loading**: Check manifest.json syntax and file structure
2. **Configuration not saving**: Verify file permissions and disk space
3. **WebSocket connection failed**: Check port availability and firewall settings
4. **State corruption**: Restore from backup or reset state.json

### Debugging Steps
1. Check console logs for error messages
2. Verify file permissions and disk space
3. Test API endpoints directly
4. Check network connectivity for WebSocket
5. Validate configuration files

## Contributing

### Code Style
- Use TypeScript strictly
- Follow existing naming conventions
- Add proper error handling
- Include relevant documentation

### Testing
- Add tests for new functionality
- Update existing tests as needed
- Verify integration with existing modules

### Documentation
- Update relevant documentation files
- Include usage examples
- Document any breaking changes