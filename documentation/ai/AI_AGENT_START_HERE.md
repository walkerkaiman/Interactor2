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

## Backend Direction Updates (2025-08)

- Routing semantics
  - Routes preserve the source event name (e.g., `timeTrigger`). Do not remap route events to target module "input events" at registration time.
  - The server wires outputs by `moduleId` and delivers messages matched by `{ source, event }` via `MessageRouter`.
- Live instance lifecycle
  - The server maintains a canonical `moduleInstances` registry for live module instances.
  - On restore/register, create live instances for both input and output modules and wire router subscriptions from the server (not via `ModuleLoader`).
  - Do not rely on `ModuleLoader.getInstance()` for live instances.
- WebSocket envelopes (runtime-only)
  - `state_update` (debounced): structural snapshots suitable for UI state.
  - `module_runtime_update` (immediate): runtime-only updates; must not include config.
  - `trigger_event`: pulse notifications for UI effects.
  - Structural changes flow via REST; WS is not used to mutate structure.
  - Optional: `data.originClientId` may be included on `state_update` when a registration originated from a client. Frontend should generate a persistent `clientId` (e.g., localStorage `interactorClientId`) and ignore structural `state_update` frames where `originClientId === clientId` (the registering client already updated its draft and will refresh via REST).
- Interaction validation
  - On `/api/interactions/register`, validate: unique ids; manifests exist; routes reference valid ids; source manifest emits route.event.

## Frontend/Backend State Sync Contract (Behavior Intent)

This is the definitive behavior AI agents must preserve when modifying sync logic.

1) Startup (authoritative load)
- Frontend loads from REST only: `GET /api/modules`, `GET /api/interactions`, `GET /api/settings`.
- Frontend initializes an in-memory draft for unregistered changes (`useUnregisteredChanges`). This draft is the only source for edits before registration.

2) Local draft (temporary memory)
- Drag/drop, connect, and per-node config edits update ONLY the local draft state.
- The draft is not written to the backend until the user clicks Register.
- Node positions are non-authoritative (purely UX). Do not persist or rely on positions in backend logic.

3) Registration
- On Register, the frontend POSTs `/api/interactions/register` with the full draft (interactions + module configs merged with local changes).
- The backend persists, (re)creates live instances, rewires routing, and then broadcasts a `state_update` to all clients. The broadcast includes an `originClientId` field in `data` for the submitting client.

4) Post-register fanout (multi-client consistency)
- All clients accept the non-empty `interactions` snapshot from `state_update` and replace their local authoritative structure with it.
- The submitting client MAY ignore the `state_update` if `originClientId` matches its own persistent client id to avoid flicker while it already displays the submitted draft; it should refresh via REST to confirm persistence shortly after.
- Clients must never treat an empty `moduleInstances` array in `state_update` as an instruction to clear structure. Ignore empty `moduleInstances` payloads; structure comes from REST and non-empty snapshots.

5) Runtime updates via WS (never structural mutations)
- `module_runtime_update` is merged into local module instances to update runtime-only fields (e.g., `currentTime`, `countdown`). It must never overwrite user config or draft edits.
- `trigger_event` is for visual pulses and has no structural impact.

6) Do / Don’t
- Do: Keep REST the source of truth for structure; keep WS for runtime and fanout snapshots only.
- Do: Preserve user config edits locally until Register.
- Don’t: Clear the canvas/graph on transient WS frames; never derive structure from empty WS payloads.
- Don’t: Remap route events at registration; event equality must be preserved end-to-end.

## Config vs Runtime: Strict Separation (Very Important)

When implementing UI or backend logic, treat configuration and runtime data as different channels.

- Configuration (persistent): lives on `interaction.modules[*].config` and is edited only in the local draft until Register. The backend persists it and includes it in non-empty `state_update` snapshots and REST responses. It should not be included in `module_runtime_update` frames.
- Runtime (ephemeral): values such as `countdown`, `currentTime`, `isPlaying`, etc., may stream at high frequency. These are delivered via `module_runtime_update` and merged into the module instance in memory. They must never overwrite the local draft configuration or cause a re-render that resets form inputs.

Frontend rules to uphold:
- Per-field config inputs use a hook that: (1) prefers the local draft value if present, (2) falls back to backend config when no local edits exist, (3) ignores runtime updates entirely.
- When a user edits a single config field, store only the delta for that field in the unregistered-changes memory and notify the parent with the full merged draft for rendering.
- Do not mutate `instance.config` objects passed into components; treat them as snapshots coming from the draft/authoritative state.

Backend rules to uphold:
- Do not emit runtime messages that contain persistent configuration. Use dedicated config endpoints (REST) and structural broadcasts (`state_update`) for persisted changes.
- After registration, broadcast a structural snapshot and optionally include `originClientId` so the registering client can ignore the echo and refresh via REST.

## Backend layout and module structure (must follow)

- Layered layout:
  - `backend/src/app/` — application services and composition (e.g., `ModuleRegistry`, `InteractorApp`)
  - `backend/src/appapi/` — HTTP/WS edge controllers only (no business logic)
  - `backend/src/core/` — cross-cutting services (logging, state, router, errors)
  - `backend/src/modules/<feature>/` — module code split into:
    - `api/` (public API + `moduleRegistry.register(...)` factory)
    - `domain/` (pure logic; no IO)
    - `infra/` (IO/adapters)
- Import rules:
  - Only import another module via its `api/` entry. Never import `domain/` or `infra/` from outside the module.
  - The router implements the shared `EventBus` interface (`publish/subscribe/unsubscribe/once`).
- Registry:
  - Every module registers a factory in `api/index.ts` with `moduleRegistry.register('<Manifest Name>', (config, id) => new Module(...))`.
  - The app uses the registry to instantiate modules; do not hardcode module classes in the server.
- See `documentation/ai/ArchitectureAtAGlance.md` and the templates `TEMPLATE_INPUT_MODULE.md`, `TEMPLATE_OUTPUT_MODULE.md` for canonical structure.

## Module Development

### Input Modules
Extend `InputModuleBase` and implement:
- `onInit()`: Setup and validation
- `onStart()`: Begin processing (gate on `config.enabled !== false`)
- `onStop()`: Cleanup

### Output Modules  
Extend `OutputModuleBase` and implement:
- `onInit()`: Setup and validation
- `onStart()`: Mark ready/connected; wait for routed messages
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

## Configuration Change Flow (Updated)

For individual configuration changes (not structural registration):

1) User makes change in UI
- Frontend immediately updates local memory for responsive UI
- Frontend sends change to backend via API (`updateModuleConfig`)

2) Backend processes change
- Backend updates its state and persists the change
- Backend broadcasts `state_update` to all clients via WebSocket

3) All clients update memory
- All clients (including the one that made the change) receive WebSocket message
- All clients update their memory with backend's authoritative state
- Local change tracking is cleared when backend value matches local value

4) UI re-renders
- Components re-render based on updated memory state

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