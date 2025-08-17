# Current State Management Architecture

*Last Updated: 2025-08-16*

This document describes the current state management architecture that was implemented to resolve synchronization and timing issues.

## Overview

The system uses a hybrid approach combining HTTP for structural state and WebSocket for real-time runtime data, with sophisticated frontend state management to handle local changes and backend synchronization.

## Backend State Architecture

### State JSON Endpoint

**URL**: `http://localhost:3001/api/state`

**Purpose**: Complete application state (structural data only, no runtime data)

**Structure**:
```json
{
  "timestamp": "2025-08-16T23:55:03.453Z",
  "interactions": [
    {
      "id": "interaction-1755386192542",
      "name": "New Interaction",
      "modules": [
        {
          "id": "Time Input-1755386356386",
          "moduleName": "Time Input",
          "position": {"x": 91.36, "y": 184.14},
          "config": {
            "enabled": true,
            "mode": "metronome",
            "targetTime": "12:00 PM",
            "millisecondDelay": 5000,
            "apiEnabled": false,
            // ... unified config with all possible properties
          },
          "enabled": true,
          "lastUpdate": 1755386383638
        }
      ],
      "routes": [
        {
          "id": "r_1755386376923",
          "source": "Time Input-1755386356386",
          "target": "Audio Output-1755386374741",
          "event": "trigger"
        }
      ],
      "enabled": true
    }
  ]
}
```

**Key Characteristics**:
- **No runtime data**: Current time, countdown, status are not included
- **Unified configuration**: All modules use the same flat structure
- **Persistent storage**: Saved to `data/state.json` only when "Register" is pressed
- **Complete state**: Contains all interactions, modules, and routes

### Unified Configuration Structure

All modules use a single configuration interface that includes all possible properties:

```typescript
interface UnifiedModuleConfig {
  // Time Input properties
  mode: 'clock' | 'metronome';
  targetTime: string;
  millisecondDelay: number;
  
  // Audio Output properties
  deviceId: string;
  sampleRate: number;
  channels: number;
  format: string;
  volume: number;
  
  // DMX Output properties
  universe: number;
  brightness: number;
  
  // OSC properties
  port: number;
  address: string;
  
  // ... all other module properties with defaults
}
```

**Benefits**:
- **Consistency**: All modules treated the same way
- **No corruption**: Prevents nested configuration objects
- **Default values**: Irrelevant properties have sensible defaults
- **Extensibility**: Easy to add new module types

## Runtime Updates via WebSocket

### Combined Runtime Update Messages

**Message Type**: `module_runtime_update`

**Frequency**: Every 1 second, synchronized

**Structure**:
```json
{
  "type": "module_runtime_update",
  "data": {
    "moduleId": "combined",
    "runtimeData": {
      "system": {
        "currentTime": "2025-08-16T23:55:03.453Z"
      },
      "Time Input-1755386356386": {
        "countdown": "1s to next",
        "currentTime": "2025-08-16T23:55:02.445Z"
      },
      "Audio Output-1755386374741": {
        "status": "stopped",
        "isRunning": false
      }
    },
    "newChanges": false
  }
}
```

**Key Features**:
- **Single message**: All runtime data combined into one WebSocket message
- **Synchronized timing**: Updates sent every second, no desync
- **Change detection**: `newChanges` flag indicates when to re-fetch state
- **Module-specific data**: Each module's runtime data in its own key

### Backend Implementation

**InteractorApp Buffering**:
```typescript
private bufferRuntimeUpdate(moduleId: string, runtimeData: any): void {
  this.runtimeUpdateBuffer.set(moduleId, runtimeData);
  
  if (!this.runtimeUpdateTimer) {
    this.runtimeUpdateTimer = setTimeout(() => {
      this.flushRuntimeUpdates();
    }, this.RUNTIME_UPDATE_INTERVAL);
  }
}

private flushRuntimeUpdates(): void {
  const combinedRuntimeData: Record<string, any> = {};
  
  // Add module updates
  this.runtimeUpdateBuffer.forEach((runtimeData, moduleId) => {
    combinedRuntimeData[moduleId] = runtimeData;
  });
  
  // Always add system current time
  combinedRuntimeData.system = { currentTime: new Date().toISOString() };
  
  // Send single combined update
  this.emit('module_runtime_update', { 
    moduleId: 'combined', 
    runtimeData: combinedRuntimeData,
    newChanges: this.hasInteractionChanges 
  });
}
```

**Periodic Updates**:
```typescript
// Ensure updates are sent even when no modules are active
setInterval(() => {
  this.flushRuntimeUpdates();
}, this.RUNTIME_UPDATE_INTERVAL);
```

## Frontend State Management

### State Management Hooks

**useStateSync**: Manages local vs backend state synchronization
```typescript
const { 
  backendState, 
  localState, 
  hasChanges, 
  registerChanges, 
  updateLocalState 
} = useStateSync({
  onStateUpdate: (state) => {
    console.log('Backend state updated:', state);
  }
});
```

**useRuntimeData**: Handles real-time WebSocket updates
```typescript
const { getCountdown, getCurrentTime } = useRuntimeData((newChanges: boolean) => {
  if (newChanges) {
    console.log('[App] New changes detected, fetching state');
    fetchStateIfNeeded(newChanges);
  }
});
```

**useBackendSync**: Establishes WebSocket connection
```typescript
const { modules: wsModules, interactions: wsInteractions } = useBackendSync();
```

### Configuration Parsing

**ConfigParser**: Extracts module-specific settings from unified state
```typescript
class ConfigParser {
  private moduleNameMapping = new Map([
    ['Time Input', 'time_input'],
    ['Audio Output', 'audio_output'],
    // ... other mappings
  ]);
  
  public extractModuleConfig(moduleName: string, unifiedConfig: UnifiedModuleConfig): any {
    const internalName = this.getInternalModuleName(moduleName);
    
    switch (internalName) {
      case 'time_input':
        return {
          mode: unifiedConfig.mode,
          targetTime: unifiedConfig.targetTime,
          millisecondDelay: unifiedConfig.millisecondDelay,
          enabled: unifiedConfig.enabled
        };
      case 'audio_output':
        return {
          deviceId: unifiedConfig.deviceId,
          sampleRate: unifiedConfig.sampleRate,
          channels: unifiedConfig.channels,
          format: unifiedConfig.format,
          volume: unifiedConfig.volume
        };
      // ... other modules
    }
  }
}
```

### State Flow

1. **Initial Load**:
   - Frontend fetches state from `/api/state`
   - WebSocket connection established
   - Runtime data starts flowing

2. **Local Changes**:
   - User modifies settings in UI
   - Changes stored in local state
   - "Unregistered Changes" indicator shows

3. **Registration**:
   - User clicks "Register" button
   - Local state sent to backend
   - Backend updates state JSON
   - `newChanges: true` sent via WebSocket

4. **State Sync**:
   - Frontend detects `newChanges: true`
   - Re-fetches state from `/api/state`
   - Updates local state with backend state

## Key Benefits

### Synchronization
- **No desync**: Current time and countdown always from same message
- **Smooth updates**: Consistent 1-second intervals
- **Change detection**: Clear indication when state has changed

### Performance
- **Efficient**: Single WebSocket message instead of multiple
- **Throttled**: Updates limited to 1 per second
- **Buffered**: Module updates batched together

### Reliability
- **Persistent**: State saved to disk on registration
- **Consistent**: Unified configuration structure
- **Robust**: Handles connection drops and reconnections

### Maintainability
- **Clear separation**: Structural vs runtime data
- **Modular**: Each hook has single responsibility
- **Extensible**: Easy to add new modules and properties

## Troubleshooting

### Common Issues

**Updates not appearing**:
- Check WebSocket connection in browser dev tools
- Verify `useBackendSync` is being called in App component
- Check backend logs for WebSocket message broadcasting

**Configuration not saving**:
- Ensure "Register" button is pressed
- Check `data/state.json` for corruption
- Verify `ConfigNormalizer` is working correctly

**Desync between current time and countdown**:
- Should not happen with combined messages
- Check if old separate message format is still being used
- Verify `flushRuntimeUpdates` is being called

### Debug Logging

**Backend**:
```typescript
this.logger.debug(`Emitting combined runtime update: ${JSON.stringify(combinedRuntimeData)}`);
```

**Frontend**:
```typescript
console.log('[useRuntimeData] Received runtime update:', update);
console.log('[useStateSync] State changed, hasChanges:', hasChanges);
```

## Future Considerations

### Potential Improvements
- **Compression**: WebSocket messages could be compressed for large states
- **Incremental updates**: Only send changed properties
- **Caching**: Frontend could cache state to reduce API calls
- **Optimistic updates**: UI could update immediately, rollback on error

### Scalability
- **Multiple clients**: Current architecture supports multiple frontend clients
- **Module isolation**: Each module's runtime data is independent
- **State partitioning**: Could split state by interaction for very large applications
