# Interactor Module Development Guide

Welcome to the Interactor module development guide! This document will walk you through creating custom modules for the Interactor system, from understanding the architecture to implementing your first module.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Module Architecture](#module-architecture)
3. [Creating Your First Module](#creating-your-first-module)
4. [Module Types and Patterns](#module-types-and-patterns)
5. [Type Safety and Shared Types](#type-safety-and-shared-types)
6. [Testing Your Module](#testing-your-module)
7. [Best Practices](#best-practices)
8. [Example Modules](#example-modules)

---

## System Overview

Interactor V2 is a modular event-driven system that connects various input sources (sensors, APIs, time triggers) to output destinations (lights, audio, displays). The system uses a layered architecture with:

- **Input Modules**: Receive data from external sources and emit events
- **Output Modules**: Consume events and control external devices
- **Message Router**: Handles communication between modules
- **Type System**: Ensures type safety across the entire system

### Key Features

- **Real-time Event Processing**: Modules communicate through typed events
- **Dual Mode Support**: Input modules support both trigger and streaming modes
- **Type Safety**: Full TypeScript support with shared type definitions
- **Hot Reloading**: Modules can be loaded/unloaded without restarting the system
- **UI Integration**: Automatic UI generation from module manifests

---

## Module Architecture

### Base Classes

All modules inherit from a common hierarchy:

```
ModuleBase (abstract)
├── InputModuleBase (abstract)
│   ├── HttpInputModule
│   ├── OscInputModule
│   ├── SerialInputModule
│   └── TimeInputModule
└── OutputModuleBase (abstract)
    ├── HttpOutputModule
    ├── OscOutputModule
    └── AudioOutputModule
```

### Module Lifecycle

Every module follows this lifecycle:

1. **Initialization** (`onInit`): Validate configuration, setup resources
2. **Starting** (`onStart`): Begin listening/processing
3. **Running**: Handle events and maintain state
4. **Stopping** (`onStop`): Clean shutdown
5. **Destruction** (`onDestroy`): Release all resources

### Directory Structure (canonical)

```
backend/src/
├── app/         # application services & composition (e.g., ModuleRegistry, InteractorApp)
├── appapi/      # HTTP/WS edge controllers (no business logic)
├── core/        # cross-cutting (Logger, StateManager, MessageRouter, ErrorHandler)
└── modules/
    ├── input/
    │   └── <my_input>/
    │       ├── api/      # public API (moduleRegistry.register factory)
    │       ├── domain/   # pure logic (no IO)
    │       ├── infra/    # IO/adapters
    │       ├── index.ts  # thin glue or re-export (during transition)
    │       └── manifest.json
    └── output/
        └── <my_output>/
            ├── api/
            ├── domain/
            ├── infra/
            ├── index.ts
            └── manifest.json
```

### Public API & Registry (must follow)

- Each module exposes a tiny `api/index.ts` that registers a factory:

```ts
import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { MyInputModule } from '../index';

moduleRegistry.register('My Input', (config) => new MyInputModule(config as any));
```

- Other code must import a module only via its `api/` entry. Do not import `domain/` or `infra/` from outside the module.
- The app layer uses the registry to instantiate modules. Do not hardcode module classes in the server.

---

## Creating Your First Module

### Step 1: Choose Your Module Type

**Input Module**: Receives data from external sources
- Examples: HTTP webhooks, OSC messages, serial sensors
- Emits events when data is received
- Supports trigger mode (fire on condition) and streaming mode (continuous data)

**Output Module**: Controls external devices
- Examples: HTTP requests, OSC messages, audio playback
- Consumes events from input modules
- Adapts behavior based on event type (trigger vs streaming)

### Step 2: Create Module Directory

```bash
mkdir backend/src/modules/input/my_custom_input
cd backend/src/modules/input/my_custom_input
```

### Step 3: Define Your Module

Create `index.ts`:

```typescript
import { InputModuleBase } from '../../InputModuleBase';
import { 
  ModuleConfig, 
  MyCustomConfig,
  MyCustomTriggerPayload,
  MyCustomStreamPayload,
  isMyCustomConfig
} from '@interactor/shared';

export class MyCustomInputModule extends InputModuleBase {
  private enabled: boolean;
  private customProperty: string;

  constructor(config: MyCustomConfig) {
    super('my_custom_input', config, {
      name: 'My Custom Input',
      type: 'input',
      version: '1.0.0',
      description: 'A custom input module for demonstration',
      author: 'Your Name',
      configSchema: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the module',
            default: true
          },
          customProperty: {
            type: 'string',
            description: 'A custom configuration property',
            default: 'default_value'
          }
        },
        required: ['enabled', 'customProperty']
      },
      events: [
        {
          name: 'myCustomEvent',
          type: 'output',
          description: 'Emitted when custom condition is met'
        }
      ]
    });

    this.enabled = config.enabled;
    this.customProperty = config.customProperty;
  }

  protected async onInit(): Promise<void> {
    // Validate configuration
    if (!this.customProperty || this.customProperty.length === 0) {
      throw new Error('customProperty cannot be empty');
    }
  }

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      // Start your custom logic here
      this.logger?.info('My custom input module started');
    }
  }

  protected async onStop(): Promise<void> {
    // Clean up resources
    this.logger?.info('My custom input module stopped');
  }

  protected async onDestroy(): Promise<void> {
    // Release all resources
    this.logger?.info('My custom input module destroyed');
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    if (!isMyCustomConfig(newConfig)) {
      throw new Error('Invalid configuration provided');
    }

    this.enabled = newConfig.enabled;
    this.customProperty = newConfig.customProperty;
  }

  // Your custom methods here
  public processCustomData(data: unknown): void {
    if (!this.enabled) return;

    // Process the data and emit events
    if (this.mode === 'trigger') {
      // Emit trigger event
      this.emitTrigger<MyCustomTriggerPayload>('myCustomEvent', {
        value: 42,
        data: data,
        timestamp: Date.now()
      });
    } else {
      // Emit streaming event
      this.emitStream<MyCustomStreamPayload>({
        value: 42,
        data: data,
        timestamp: Date.now()
      });
    }
  }
}
```

### Step 4: Create Manifest

Create `manifest.json`:

```json
{
  "name": "My Custom Input",
  "type": "input",
  "version": "1.0.0",
  "description": "A custom input module for demonstration",
  "author": "Your Name",
  "configSchema": {
    "type": "object",
    "properties": {
      "enabled": {
        "type": "boolean",
        "description": "Enable/disable the module",
        "default": true
      },
      "customProperty": {
        "type": "string",
        "description": "A custom configuration property",
        "default": "default_value"
      }
    },
    "required": ["enabled", "customProperty"]
  },
  "events": [
    {
      "name": "myCustomEvent",
      "type": "output",
      "description": "Emitted when custom condition is met"
    }
  ]
}
```

### Step 5: Add Documentation

Create `wiki.md`:

```markdown
# My Custom Input Module

## Overview

This module demonstrates how to create a custom input module for Interactor V2.

## Configuration

- **enabled**: Enable or disable the module
- **customProperty**: A custom configuration property

## Events

### myCustomEvent

Emitted when the custom condition is met.

**Payload:**
```typescript
{
  value: number;
  data: unknown;
  timestamp: number;
}
```

## Usage

1. Add the module to your Interactor configuration
2. Configure the customProperty as needed
3. Connect to output modules to handle the events

## Examples

```javascript
// Example configuration
{
  "enabled": true,
  "customProperty": "my_value"
}
```
```

---

## Module Types and Patterns

### Input Module Patterns

#### HTTP Input Pattern
```typescript
export class HttpInputModule extends InputModuleBase {
  private server: Server | undefined = undefined;
  private app: express.Application;

  protected async onStart(): Promise<void> {
    if (this.enabled) {
      await this.initHttpServer();
    }
  }

  public handleHttpRequest(req: Request, res: Response): void {
    // Process HTTP request
    const numericValue = this.parseNumericValue(req);
    
    if (this.mode === 'trigger' && numericValue !== null) {
      this.emitTrigger('httpTrigger', { value: numericValue, ... });
    } else if (this.mode === 'streaming') {
      this.emitStream({ value: numericValue || 0, ... });
    }
  }
}
```

#### OSC Input Pattern
```typescript
export class OscInputModule extends InputModuleBase {
  private udpPort: osc.UDPPort | undefined = undefined;

  private handleOscMessage(oscMsg: osc.OscMessage): void {
    // Process OSC message
    if (this.matchesAddressPattern(oscMsg.address)) {
      if (this.mode === 'trigger') {
        this.emitTrigger('oscTrigger', { address: oscMsg.address, ... });
      } else {
        this.emitStream({ value: oscMsg.args[0] || 1, ... });
      }
    }
  }
}
```

### Output Module Patterns

#### HTTP Output Pattern
```typescript
export class HttpOutputModule extends OutputModuleBase {
  protected async handleTriggerEvent(event: TriggerEvent): Promise<void> {
    if (!this.enabled) {
      throw new Error('Module is disabled');
    }
    await this.sendHttpRequest(event.payload);
  }

  protected async handleStreamingEvent(event: StreamEvent): Promise<void> {
    if (!this.enabled) {
      throw new Error('Module is disabled');
    }
    await this.sendHttpRequest(event.value);
  }
}
```

---

## Type Safety and Shared Types

### Adding Custom Types

1. **Define your types** in `shared/src/types/modules.ts`:

```typescript
/**
 * Configuration for my custom input module
 * @interface MyCustomConfig
 * @extends {ModuleConfig}
 */
export interface MyCustomConfig extends ModuleConfig {
  /** Enable/disable the module */
  enabled: boolean;
  /** Custom configuration property */
  customProperty: string;
}

/**
 * Payload for my custom trigger events
 * @interface MyCustomTriggerPayload
 */
export interface MyCustomTriggerPayload {
  /** Numeric value */
  value: number;
  /** Raw data */
  data: unknown;
  /** Timestamp when event occurred */
  timestamp: number;
}

/**
 * Payload for my custom streaming events
 * @interface MyCustomStreamPayload
 */
export interface MyCustomStreamPayload {
  /** Numeric value */
  value: number;
  /** Raw data */
  data: unknown;
  /** Timestamp when event occurred */
  timestamp: number;
}
```

2. **Add type guard**:

```typescript
/**
 * Type guard for my custom configuration
 * @param config - Configuration object to check
 * @returns True if config is valid MyCustomConfig
 */
export function isMyCustomConfig(config: ModuleConfig): config is MyCustomConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'enabled' in config &&
    'customProperty' in config &&
    typeof (config as MyCustomConfig).enabled === 'boolean' &&
    typeof (config as MyCustomConfig).customProperty === 'string'
  );
}
```

3. **Export from index**:

```typescript
// In shared/src/types/index.ts
export * from './modules';
```

### Using Shared Types

```typescript
import { 
  ModuleConfig, 
  MyCustomConfig,
  MyCustomTriggerPayload,
  isMyCustomConfig
} from '@interactor/shared';
```

---

## Testing Your Module

### Create Test File

Create `Tests/core/MyCustom.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MyCustomInputModule } from '../../backend/src/modules/input/my_custom_input';

describe('My Custom Input Module', () => {
  let module: MyCustomInputModule;
  const mockConfig = {
    enabled: true,
    customProperty: 'test_value'
  };

  beforeEach(async () => {
    module = new MyCustomInputModule(mockConfig);
    await module.init();
  });

  afterEach(async () => {
    await module.destroy();
  });

  describe('Configuration', () => {
    it('should initialize with correct default values', () => {
      expect(module.getCustomParameters()).toEqual({
        enabled: true,
        customProperty: 'test_value',
        status: 'stopped'
      });
    });

    it('should validate configuration correctly', async () => {
      const invalidConfig = { ...mockConfig, customProperty: '' };
      const invalidModule = new MyCustomInputModule(invalidConfig);
      
      await expect(invalidModule.init()).rejects.toThrow('customProperty cannot be empty');
    });
  });

  describe('Event Emission', () => {
    it('should emit trigger event in trigger mode', () => {
      const triggerSpy = vi.fn();
      module.on('trigger', triggerSpy);

      module.processCustomData({ test: 'data' });

      expect(triggerSpy).toHaveBeenCalledWith({
        moduleId: expect.any(String),
        moduleName: 'my_custom_input',
        event: 'myCustomEvent',
        payload: {
          value: 42,
          data: { test: 'data' },
          timestamp: expect.any(Number)
        },
        timestamp: expect.any(Number)
      });
    });
  });
});
```

### Running Tests

```bash
cd Tests
npm test MyCustom.test.ts
```

---

## Best Practices

### 1. Type Safety
- Always use TypeScript interfaces for configuration and events
- Implement type guards for configuration validation
- Use shared types from `@interactor/shared`

### 2. Error Handling
- Validate configuration in `onInit()`
- Handle errors gracefully and emit error events
- Provide meaningful error messages

### 3. Resource Management
- Clean up resources in `onDestroy()`
- Handle configuration updates properly
- Implement proper start/stop logic

### 4. Event Emission
- Emit events for all significant state changes
- Use typed payloads for all events
- Follow the established event naming conventions

### 5. Logging
- Use the provided logger for all messages
- Log at appropriate levels (debug, info, warn, error)
- Include context in log messages

### 6. Configuration
- Provide sensible defaults
- Validate all configuration values
- Support hot-reloading of configuration

### 7. Testing
- Write comprehensive tests for all functionality
- Test both trigger and streaming modes
- Test error conditions and edge cases

---

## Example Modules

### Complete Input Module Example

See the existing modules for complete examples:
- `backend/src/modules/input/http_input/` - HTTP webhook receiver
- `backend/src/modules/input/osc_input/` - OSC message receiver
- `backend/src/modules/input/serial_input/` - Serial port data receiver

### Complete Output Module Example

- `backend/src/modules/output/http_output/` - HTTP request sender
- `backend/src/modules/output/osc_output/` - OSC message sender

---

## Getting Help

1. **Check existing modules** for patterns and examples
2. **Review the test files** to understand expected behavior
3. **Examine the shared types** to understand the type system
4. **Look at the base classes** to understand available methods

### Common Issues

1. **Type errors**: Make sure you're using the correct interfaces and type guards
2. **Event not firing**: Check that you're calling the correct emit methods
3. **Configuration not updating**: Ensure you're handling `onConfigUpdate` properly
4. **Resource leaks**: Make sure to clean up in `onDestroy`

---

## Contributing

When contributing a module:

1. Follow the established patterns and conventions
2. Include comprehensive tests
3. Add proper documentation
4. Use the shared type system
5. Handle errors gracefully
6. Support both trigger and streaming modes (where applicable)

Your module will be automatically discovered and loaded by the system, and the UI will be generated from your manifest. Happy coding! 