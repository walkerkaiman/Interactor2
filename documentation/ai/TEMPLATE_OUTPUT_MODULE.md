# Template for Output Modules

This template provides a standardized structure for output modules that properly handles state management and prevents overwriting user configuration changes.

> Routing note: Outputs receive messages via server wiring by `moduleId`. The router matches `{ source, event }` from the input; no event remapping occurs during registration. Implement `onTriggerEvent`/`onStreamingEvent` accordingly.

## State Management Best Practices

### 1. Use Standardized State Update Methods

Always use the base class methods for state updates:

```typescript
// ✅ CORRECT: Use standardized runtime state updates
protected emitRuntimeStateUpdate(runtimeData: Record<string, any> = {}): void {
  // This prevents overwriting user's unregistered configuration changes
  super.emitRuntimeStateUpdate({
    currentStatus: this.currentStatus,
    lastUpdate: Date.now(),
    // Add any runtime data here
  });
}

// ✅ CORRECT: Use standardized config updates
protected emitConfigUpdate(): void {
  // This is called automatically by the base class
  // Only call manually if you need custom config update logic
  super.emitConfigUpdate();
}
```

### 2. Separate Runtime State from Configuration

```typescript
// ❌ WRONG: Don't include config data in runtime state updates
private emitStateUpdate(): void {
  this.emit('stateUpdate', {
    id: this.id,
    deviceId: this.deviceId, // This will overwrite user changes!
    volume: this.volume, // This will overwrite user changes!
    currentStatus: this.currentStatus,
  });
}

// ✅ CORRECT: Only include runtime data
private emitStateUpdate(): void {
  this.emitRuntimeStateUpdate({
    currentStatus: this.currentStatus,
    isPlaying: this.isPlaying,
  });
}
```

### 3. Configuration Updates

```typescript
protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
  // Update internal state
  this.deviceId = newConfig.deviceId;
  this.volume = newConfig.volume;
  
  // Apply configuration changes
  await this.applyConfigChanges(newConfig);
  
  // The base class will automatically emit config update
  // No need to call emitConfigUpdate() manually
}
```

## Complete Example

```typescript
import { OutputModuleBase } from '../../OutputModuleBase';
import { ModuleConfig } from '@interactor/shared';

export class MyOutputModule extends OutputModuleBase {
  private currentStatus: string = 'idle';
  private isPlaying: boolean = false;
  private deviceId: string = 'default';
  private volume: number = 1.0;

  constructor(config: ModuleConfig, externalId?: string) {
    super('my_output', config, {
      name: 'My Output',
      type: 'output',
      version: '1.0.0',
      description: 'My output module',
      author: 'Your Name',
      configSchema: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'Output device ID',
            default: 'default'
          },
          volume: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 1.0
          },
          enabled: {
            type: 'boolean',
            default: true
          }
        }
      },
      events: [
        {
          name: 'dataReceived',
          type: 'input',
          description: 'Receives data to process'
        }
      ]
    });

    this.deviceId = config.deviceId || 'default';
    this.volume = config.volume ?? 1.0;
  }

  protected async onInit(): Promise<void> {
    // Initialize your module
    this.logger?.info('My Output module initialized');
  }

  protected async onStart(): Promise<void> {
    if (this.config.enabled !== false) {
      // Start your output processing
      this.startProcessing();
    }
  }

  protected async onStop(): Promise<void> {
    // Stop your output processing
    this.stopProcessing();
  }

  protected async onDestroy(): Promise<void> {
    // Clean up resources
    this.stopProcessing();
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Update internal state
    this.deviceId = newConfig.deviceId || this.deviceId;
    this.volume = newConfig.volume ?? this.volume;
    
    // Apply configuration changes
    if (newConfig.enabled !== false) {
      this.startProcessing();
    } else {
      this.stopProcessing();
    }
    
    // The base class will automatically emit config update
  }

  protected handleInput(data: any): void {
    // Handle incoming data
    this.processData(data);
    
    // Emit runtime state update (not config update)
    this.emitRuntimeStateUpdate({
      currentStatus: this.currentStatus,
      isPlaying: this.isPlaying,
      lastUpdate: Date.now(),
    });
  }

  private startProcessing(): void {
    // Start your processing logic
    this.currentStatus = 'ready';
    this.emitRuntimeStateUpdate({
      currentStatus: this.currentStatus,
    });
  }

  private stopProcessing(): void {
    // Stop your processing logic
    this.currentStatus = 'stopped';
    this.isPlaying = false;
    this.emitRuntimeStateUpdate({
      currentStatus: this.currentStatus,
      isPlaying: this.isPlaying,
    });
  }

  private processData(data: any): void {
    // Process the incoming data
    this.currentStatus = 'processing';
    this.isPlaying = true;
    
    // Your processing logic here
    
    this.emitRuntimeStateUpdate({
      currentStatus: this.currentStatus,
      isPlaying: this.isPlaying,
    });
  }
}
```

## Key Points

1. **Always use `emitRuntimeStateUpdate()`** for periodic state updates
2. **Never include configuration data** in runtime state updates
3. **Let the base class handle config updates** automatically
4. **Separate runtime data** from configuration data clearly
5. **Use proper logging** for debugging state management
6. **Handle input events** properly in `handleInput()` method

This ensures that user configuration changes are never overwritten by automatic state updates from modules.