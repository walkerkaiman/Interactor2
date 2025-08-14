# Template for Input Modules

This template provides a standardized structure for input modules that properly handles comprehensive state management and prevents overwriting user configuration changes.

> Routing note: Routes match the event emitted by the input (e.g., `timeTrigger`). Do not rely on remapping to target input events; the server wires outputs by `moduleId` and forwards based on `{ source, event }`.

## Structure

```
modules/input/<your_module>
  api/
    index.ts           # public factory + exports only
  domain/
    <domain files>     # pure logic
  infra/
    <adapters>         # IO, device, network
  index.ts             # re-export during transition only
  manifest.json
  wiki.md
```

## Public API

- Expose only via `api/index.ts`.
- Register your factory with `ModuleRegistry`:

```ts
import { moduleRegistry } from '../../../app/ModuleRegistry';
import { MyInputModule } from '../index';

// Factory should be side-effect imported by ModuleLoader or server composition
moduleRegistry.register('My Input', (config) => new MyInputModule(config as any));
```

## Comprehensive State Management

### 1. All Settings Preserved Regardless of Mode

The module should store ALL possible settings, even if they're not currently in use:

```typescript
// ✅ CORRECT: Comprehensive state with all possible settings
interface MyInputConfig extends ModuleConfig {
  mode: 'trigger' | 'streaming' | 'advanced';
  
  // Clock mode settings
  targetTime?: string;
  timeFormat?: '12h' | '24h';
  
  // Metronome mode settings  
  millisecondDelay?: number;
  pulsePattern?: string;
  
  // Advanced mode settings
  customAlgorithm?: string;
  precision?: number;
  
  // Common settings
  enabled: boolean;
  apiEnabled?: boolean;
  apiEndpoint?: string;
}
```

### 2. Mode-Based UI Exposure

The UI should show different settings based on the current mode:

```typescript
// ✅ CORRECT: Mode-specific UI configuration
protected getConfigForMode(mode: string): Record<string, any> {
  const baseConfig = { ...this.config };
  
  switch (mode) {
    case 'clock':
      return {
        ...baseConfig,
        // Primary settings for clock mode
        targetTime: baseConfig.targetTime,
        timeFormat: baseConfig.timeFormat,
        mode: 'clock',
        // Secondary settings (still available but not prominent)
        millisecondDelay: baseConfig.millisecondDelay,
        pulsePattern: baseConfig.pulsePattern,
        customAlgorithm: baseConfig.customAlgorithm,
        precision: baseConfig.precision,
      };
      
    case 'metronome':
      return {
        ...baseConfig,
        // Primary settings for metronome mode
        millisecondDelay: baseConfig.millisecondDelay,
        pulsePattern: baseConfig.pulsePattern,
        mode: 'metronome',
        // Secondary settings
        targetTime: baseConfig.targetTime,
        timeFormat: baseConfig.timeFormat,
        customAlgorithm: baseConfig.customAlgorithm,
        precision: baseConfig.precision,
      };
      
    default:
      return baseConfig;
  }
}
```

### 3. Mode-Specific UI Schema

Provide different UI schemas for each mode:

```typescript
protected getUISchemaForMode(mode: string): any {
  const baseSchema = {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['clock', 'metronome', 'advanced'],
        default: 'clock'
      },
      enabled: {
        type: 'boolean',
        default: true
      }
    }
  };

  switch (mode) {
    case 'clock':
      return {
        ...baseSchema,
        properties: {
          ...baseSchema.properties,
          targetTime: {
            type: 'string',
            description: 'Target time (primary in clock mode)',
            pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$'
          },
          timeFormat: {
            type: 'string',
            enum: ['12h', '24h'],
            default: '12h'
          },
          // Secondary settings
          millisecondDelay: {
            type: 'number',
            description: 'Delay (secondary in clock mode)',
            minimum: 100,
            maximum: 60000
          }
        }
      };
      
    case 'metronome':
      return {
        ...baseSchema,
        properties: {
          ...baseSchema.properties,
          millisecondDelay: {
            type: 'number',
            description: 'Delay between pulses (primary in metronome mode)',
            minimum: 100,
            maximum: 60000
          },
          pulsePattern: {
            type: 'string',
            description: 'Pulse pattern (primary in metronome mode)'
          },
          // Secondary settings
          targetTime: {
            type: 'string',
            description: 'Target time (secondary in metronome mode)',
            pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$'
          }
        }
      };
      
    default:
      return baseSchema;
  }
}
```

## Complete Example

```typescript
import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig } from '@interactor/shared';

interface MyInputConfig extends ModuleConfig {
  mode: 'clock' | 'metronome' | 'advanced';
  targetTime?: string;
  millisecondDelay?: number;
  pulsePattern?: string;
  customAlgorithm?: string;
  precision?: number;
  enabled: boolean;
  apiEnabled?: boolean;
  apiEndpoint?: string;
}

export class MyInputModule extends InputModuleBase {
  private currentValue: any = null;
  private mode: string = 'clock';
  private enabled: boolean = true;

  constructor(config: MyInputConfig, externalId?: string) {
    super('my_input', config, {
      name: 'My Input',
      type: 'input',
      version: '1.0.0',
      description: 'My input module with multiple modes',
      author: 'Your Name',
      configSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['clock', 'metronome', 'advanced'],
            default: 'clock'
          },
          targetTime: {
            type: 'string',
            description: 'Target time for clock mode',
            pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$'
          },
          millisecondDelay: {
            type: 'number',
            description: 'Delay for metronome mode',
            minimum: 100,
            maximum: 60000,
            default: 1000
          },
          pulsePattern: {
            type: 'string',
            description: 'Pulse pattern for metronome mode'
          },
          customAlgorithm: {
            type: 'string',
            description: 'Custom algorithm for advanced mode'
          },
          precision: {
            type: 'number',
            description: 'Precision for advanced mode',
            minimum: 1,
            maximum: 10,
            default: 5
          },
          enabled: {
            type: 'boolean',
            default: true
          },
          apiEnabled: {
            type: 'boolean',
            default: false
          },
          apiEndpoint: {
            type: 'string',
            description: 'API endpoint URL',
            pattern: '^wss?://.+'
          }
        },
        required: ['mode']
      },
      events: [
        {
          name: 'dataReceived',
          type: 'output',
          description: 'Emitted when data is received'
        }
      ]
    });

    this.mode = config.mode || 'clock';
    this.enabled = config.enabled !== false;
  }

  protected async onInit(): Promise<void> {
    // Initialize your module
    this.logger?.info('My Input module initialized');
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      // Start your input processing based on mode
      this.startProcessing();
    }
  }

  protected async onStop(): Promise<void> {
    // Stop your input processing
    this.stopProcessing();
  }

  protected async onDestroy(): Promise<void> {
    // Clean up resources
    this.stopProcessing();
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    const newInputConfig = newConfig as MyInputConfig;
    
    // Update internal state
    this.mode = newInputConfig.mode || this.mode;
    this.enabled = newInputConfig.enabled ?? this.enabled;
    
    // Apply configuration changes
    if (this.enabled) {
      this.startProcessing();
    } else {
      this.stopProcessing();
    }
    
    // The base class will automatically emit config update
  }

  protected async onStartListening(): Promise<void> {
    // Start listening for input
    this.logger?.info('Started listening for input');
  }

  protected async onStopListening(): Promise<void> {
    // Stop listening for input
    this.logger?.info('Stopped listening for input');
  }

  protected handleInput(data: any): void {
    // Handle incoming data
    this.currentValue = data;
    this.emitTrigger('dataReceived', data);
    
    // Emit runtime state update (not config update)
    this.emitRuntimeStateUpdate({
      currentValue: this.currentValue,
      lastUpdate: Date.now(),
    });
  }

  // Comprehensive state management methods
  protected getRuntimeState(): Record<string, any> {
    return {
      isRunning: this.isRunning,
      isInitialized: this.isInitialized,
      currentValue: this.currentValue,
      mode: this.mode,
    };
  }

  protected getConfigForMode(mode: string): Record<string, any> {
    const baseConfig = { ...this.config };
    
    switch (mode) {
      case 'clock':
        return {
          ...baseConfig,
          // Primary settings for clock mode
          targetTime: baseConfig.targetTime,
          mode: 'clock',
          // Secondary settings
          millisecondDelay: baseConfig.millisecondDelay,
          pulsePattern: baseConfig.pulsePattern,
          customAlgorithm: baseConfig.customAlgorithm,
          precision: baseConfig.precision,
        };
        
      case 'metronome':
        return {
          ...baseConfig,
          // Primary settings for metronome mode
          millisecondDelay: baseConfig.millisecondDelay,
          pulsePattern: baseConfig.pulsePattern,
          mode: 'metronome',
          // Secondary settings
          targetTime: baseConfig.targetTime,
          customAlgorithm: baseConfig.customAlgorithm,
          precision: baseConfig.precision,
        };
        
      case 'advanced':
        return {
          ...baseConfig,
          // Primary settings for advanced mode
          customAlgorithm: baseConfig.customAlgorithm,
          precision: baseConfig.precision,
          mode: 'advanced',
          // Secondary settings
          targetTime: baseConfig.targetTime,
          millisecondDelay: baseConfig.millisecondDelay,
          pulsePattern: baseConfig.pulsePattern,
        };
        
      default:
        return baseConfig;
    }
  }

  public getAvailableModes(): string[] {
    return ['clock', 'metronome', 'advanced'];
  }

  protected getUISchemaForMode(mode: string): any {
    const baseSchema = {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['clock', 'metronome', 'advanced'],
          default: 'clock'
        },
        enabled: {
          type: 'boolean',
          default: true
        }
      },
      required: ['mode']
    };

    switch (mode) {
      case 'clock':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            targetTime: {
              type: 'string',
              description: 'Target time (primary in clock mode)',
              pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$'
            },
            // Secondary settings
            millisecondDelay: {
              type: 'number',
              description: 'Delay (secondary in clock mode)',
              minimum: 100,
              maximum: 60000
            }
          }
        };
        
      case 'metronome':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            millisecondDelay: {
              type: 'number',
              description: 'Delay between pulses (primary in metronome mode)',
              minimum: 100,
              maximum: 60000
            },
            pulsePattern: {
              type: 'string',
              description: 'Pulse pattern (primary in metronome mode)'
            },
            // Secondary settings
            targetTime: {
              type: 'string',
              description: 'Target time (secondary in metronome mode)',
              pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$'
            }
          }
        };
        
      case 'advanced':
        return {
          ...baseSchema,
          properties: {
            ...baseSchema.properties,
            customAlgorithm: {
              type: 'string',
              description: 'Custom algorithm (primary in advanced mode)'
            },
            precision: {
              type: 'number',
              description: 'Precision (primary in advanced mode)',
              minimum: 1,
              maximum: 10
            },
            // Secondary settings
            targetTime: {
              type: 'string',
              description: 'Target time (secondary in advanced mode)',
              pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$'
            },
            millisecondDelay: {
              type: 'number',
              description: 'Delay (secondary in advanced mode)',
              minimum: 100,
              maximum: 60000
            }
          }
        };
        
      default:
        return baseSchema;
    }
  }

  private startProcessing(): void {
    // Start your processing logic based on mode
    this.logger?.info(`Starting processing in ${this.mode} mode`);
  }

  private stopProcessing(): void {
    // Stop your processing logic
    this.logger?.info('Stopping processing');
  }
}
```

## Key Points

1. **Store ALL possible settings** regardless of current mode
2. **Use mode-based UI exposure** to show relevant settings prominently
3. **Preserve settings when switching modes** - don't lose configuration
4. **Provide comprehensive state management** methods
5. **Use standardized runtime state updates** to prevent overwriting user changes
6. **Implement mode-specific UI schemas** for better UX

This ensures that user configuration changes are never lost when switching modes, and all settings are preserved for future use.