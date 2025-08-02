# Interactor TypeScript Type System Guide

Welcome to the Interactor TypeScript type system guide! This document will help you understand how types are organized, used, and extended in the Interactor system.

---

## Table of Contents

1. [Overview](#overview)
2. [Type System Architecture](#type-system-architecture)
3. [Core Type Categories](#core-type-categories)
4. [Using the Type System](#using-the-type-system)
5. [Adding New Types](#adding-new-types)
6. [Type Guards and Validation](#type-guards-and-validation)
7. [Best Practices](#best-practices)
8. [Migration Guide](#migration-guide)

---

## Overview

The Interactor type system provides comprehensive type safety across all modules, ensuring compile-time error detection, better developer experience, and runtime safety. The system is built around a centralized type architecture with shared definitions.

### Key Principles

- **Centralized Types**: All module types are defined in `shared/src/types/`
- **Type Safety**: Full TypeScript support with strict configuration
- **Runtime Validation**: Type guards for configuration validation
- **Consistency**: Standardized patterns across all modules
- **Documentation**: Comprehensive JSDoc comments for all types

---

## Type System Architecture

### Directory Structure

```
shared/src/types/
├── index.ts              # Main export file
├── module.ts             # Base module types
├── modules.ts            # Module-specific types
└── events.ts             # Event system types
```

### Type Hierarchy

```
ModuleConfig (base)
├── OscInputConfig
├── HttpInputConfig
├── SerialInputConfig
├── TimeInputConfig
├── FramesInputConfig
└── HttpOutputConfig

Event Payloads
├── TriggerEvent
│   ├── OscTriggerPayload
│   ├── HttpTriggerPayload
│   ├── SerialTriggerPayload
│   └── TimeTriggerPayload
└── StreamEvent
    ├── OscStreamPayload
    ├── HttpStreamPayload
    └── SerialStreamPayload

Module States
├── OscModuleState
├── HttpInputModuleState
├── SerialModuleState
└── HttpOutputModuleState
```

---

## Core Type Categories

### 1. Configuration Types

Configuration types define the structure of module settings. All configuration types extend the base `ModuleConfig` interface.

#### Base Configuration
```typescript
/**
 * Base configuration interface for all modules
 * @interface ModuleConfig
 */
export interface ModuleConfig {
  /** Unique module identifier */
  id: string;
  /** Module name for display */
  name: string;
  /** Module type (input/output) */
  type: 'input' | 'output';
  /** Module version */
  version: string;
  /** Module description */
  description: string;
  /** Module author */
  author: string;
  /** Whether module is enabled */
  enabled?: boolean;
}
```

#### Module-Specific Configurations
```typescript
/**
 * Configuration for HTTP input module
 * @interface HttpInputConfig
 * @extends {ModuleConfig}
 */
export interface HttpInputConfig extends ModuleConfig {
  /** HTTP server port to listen on (1024-65535) */
  port: number;
  /** Host address to bind to */
  host: string;
  /** HTTP endpoint to listen on (e.g., '/webhook') */
  endpoint: string;
  /** HTTP methods to accept (e.g., ['POST', 'GET']) */
  methods: string[];
  /** Enable/disable the HTTP server */
  enabled: boolean;
  /** Maximum requests per minute */
  rateLimit: number;
  /** Expected content type for requests */
  contentType: string;
}
```

### 2. Event Payload Types

Event payload types define the structure of data passed between modules.

#### Trigger Event Payloads
```typescript
/**
 * Payload for HTTP trigger events
 * @interface HttpTriggerPayload
 */
export interface HttpTriggerPayload {
  /** Numeric value extracted from request */
  value: number;
  /** HTTP method */
  method: string;
  /** Request URL */
  url: string;
  /** HTTP headers */
  headers: Record<string, string>;
  /** Request body */
  body: any;
  /** Query parameters */
  query: Record<string, string>;
  /** Timestamp when request was received */
  timestamp: number;
  /** Unique request identifier */
  requestId: string;
  /** Remaining rate limit requests */
  rateLimitRemaining: number;
  /** Total number of requests received since module start */
  requestCount: number;
}
```

#### Stream Event Payloads
```typescript
/**
 * Payload for HTTP streaming events
 * @interface HttpStreamPayload
 */
export interface HttpStreamPayload {
  /** Numeric value extracted from request */
  value: number;
  /** HTTP method */
  method: string;
  /** Request URL */
  url: string;
  /** Request data */
  data: any;
  /** Timestamp when request was received */
  timestamp: number;
  /** Remaining rate limit requests */
  rateLimitRemaining: number;
}
```

### 3. Module State Types

Module state types define the structure of module state information.

```typescript
/**
 * State information for HTTP input module
 * @interface HttpInputModuleState
 */
export interface HttpInputModuleState {
  /** Current module status */
  status: 'listening' | 'stopped' | 'error';
  /** HTTP server port */
  port: number;
  /** Host address bound to */
  host: string;
  /** HTTP endpoint being listened on */
  endpoint: string;
  /** Current numeric value from last request */
  currentValue: number | null;
  /** Total number of requests received */
  requestCount: number;
  /** Rate limit configuration */
  rateLimit: number;
  /** Remaining rate limit requests */
  rateLimitRemaining: number;
  /** Current input mode (trigger/streaming) */
  mode: string;
  /** Timestamp of last update */
  lastUpdate: number;
  /** Error message if status is 'error' */
  error?: string;
}
```

### 4. Event System Types

Core event system types for module communication.

```typescript
/**
 * Trigger event structure
 * @interface TriggerEvent
 */
export interface TriggerEvent {
  /** Event type */
  type: 'trigger';
  /** Event payload */
  payload: any;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Source module name */
  source: string;
}

/**
 * Stream event structure
 * @interface StreamEvent
 */
export interface StreamEvent {
  /** Event type */
  type: 'stream';
  /** Streamed value */
  value: number;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Source module name */
  source: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}
```

---

## Using the Type System

### Importing Types

```typescript
import { 
  ModuleConfig, 
  HttpInputConfig, 
  HttpTriggerPayload, 
  HttpStreamPayload,
  HttpInputModuleState,
  isHttpInputConfig
} from '@interactor/shared';
```

### Using Types in Modules

```typescript
export class HttpInputModule extends InputModuleBase {
  constructor(config: HttpInputConfig) {
    super('http_input', config, {
      // Module manifest
    });
    
    // Type-safe property access
    this.port = config.port;
    this.host = config.host;
    this.endpoint = config.endpoint;
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Use type guard for runtime validation
    if (!isHttpInputConfig(newConfig)) {
      throw new Error('Invalid HTTP input configuration provided');
    }
    
    // Now TypeScript knows newConfig is HttpInputConfig
    this.port = newConfig.port;
    this.host = newConfig.host;
  }

  private emitTriggerEvent(payload: HttpTriggerPayload): void {
    // Type-safe event emission
    this.emitTrigger<HttpTriggerPayload>('httpTrigger', payload);
  }

  public getState(): HttpInputModuleState {
    // Type-safe state return
    return {
      status: this.server ? 'listening' : 'stopped',
      port: this.port,
      host: this.host,
      endpoint: this.endpoint,
      currentValue: this.currentValue,
      requestCount: this.requestCount,
      rateLimit: this.rateLimit,
      rateLimitRemaining: this.getRateLimitRemaining(),
      mode: this.mode,
      lastUpdate: Date.now()
    };
  }
}
```

### Generic Type Usage

The base classes provide generic methods for type-safe operations:

```typescript
// In InputModuleBase
protected emitTrigger<T>(eventName: string, payload: T): void
protected emitStream<T>(payload: T): void

// In OutputModuleBase
protected async send<T>(data: T): Promise<void>
protected emitOutput<T>(eventName: string, payload: T): void
```

---

## Adding New Types

### Step 1: Define Your Types

Add your types to `shared/src/types/modules.ts`:

```typescript
/**
 * Configuration for my custom module
 * @interface MyCustomConfig
 * @extends {ModuleConfig}
 */
export interface MyCustomConfig extends ModuleConfig {
  /** Enable/disable the module */
  enabled: boolean;
  /** Custom configuration property */
  customProperty: string;
  /** Custom numeric setting */
  customNumber: number;
}

/**
 * Payload for my custom trigger events
 * @interface MyCustomTriggerPayload
 */
export interface MyCustomTriggerPayload {
  /** Numeric value */
  value: number;
  /** Custom data */
  customData: unknown;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Custom identifier */
  customId: string;
}

/**
 * Payload for my custom streaming events
 * @interface MyCustomStreamPayload
 */
export interface MyCustomStreamPayload {
  /** Numeric value */
  value: number;
  /** Custom data */
  customData: unknown;
  /** Timestamp when event occurred */
  timestamp: number;
}

/**
 * State information for my custom module
 * @interface MyCustomModuleState
 */
export interface MyCustomModuleState {
  /** Current module status */
  status: 'listening' | 'stopped' | 'error';
  /** Custom property value */
  customProperty: string;
  /** Current numeric value */
  currentValue: number;
  /** Total number of events processed */
  eventCount: number;
  /** Current mode */
  mode: string;
  /** Timestamp of last update */
  lastUpdate: number;
  /** Error message if status is 'error' */
  error?: string;
}
```

### Step 2: Add Type Guard

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
    'customNumber' in config &&
    typeof (config as MyCustomConfig).enabled === 'boolean' &&
    typeof (config as MyCustomConfig).customProperty === 'string' &&
    typeof (config as MyCustomConfig).customNumber === 'number'
  );
}
```

### Step 3: Export from Index

Ensure your types are exported in `shared/src/types/index.ts`:

```typescript
export * from './modules';
```

### Step 4: Use in Your Module

```typescript
import { 
  ModuleConfig, 
  MyCustomConfig,
  MyCustomTriggerPayload,
  MyCustomStreamPayload,
  MyCustomModuleState,
  isMyCustomConfig
} from '@interactor/shared';

export class MyCustomModule extends InputModuleBase {
  constructor(config: MyCustomConfig) {
    super('my_custom', config, {
      // Module manifest
    });
    
    // Type-safe initialization
    this.enabled = config.enabled;
    this.customProperty = config.customProperty;
    this.customNumber = config.customNumber;
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    if (!isMyCustomConfig(newConfig)) {
      throw new Error('Invalid configuration provided');
    }
    
    // Type-safe config update
    this.enabled = newConfig.enabled;
    this.customProperty = newConfig.customProperty;
    this.customNumber = newConfig.customNumber;
  }

  public getState(): MyCustomModuleState {
    return {
      status: this.isListening ? 'listening' : 'stopped',
      customProperty: this.customProperty,
      currentValue: this.currentValue,
      eventCount: this.eventCount,
      mode: this.mode,
      lastUpdate: Date.now()
    };
  }
}
```

---

## Type Guards and Validation

### Purpose of Type Guards

Type guards provide runtime validation of configuration objects, ensuring type safety at runtime as well as compile time.

### Built-in Type Guards

```typescript
// Configuration type guards
export function isOscConfig(config: ModuleConfig): config is OscInputConfig
export function isHttpInputConfig(config: ModuleConfig): config is HttpInputConfig
export function isSerialConfig(config: ModuleConfig): config is SerialInputConfig
export function isTimeConfig(config: ModuleConfig): config is TimeInputConfig
export function isFramesConfig(config: ModuleConfig): config is FramesInputConfig
export function isHttpOutputConfig(config: ModuleConfig): config is HttpOutputConfig
```

### Using Type Guards

```typescript
protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
  // Validate configuration type
  if (!isHttpInputConfig(newConfig)) {
    throw new Error('Invalid HTTP input configuration provided');
  }
  
  // Now TypeScript knows newConfig is HttpInputConfig
  // All properties are type-safe
  this.port = newConfig.port;
  this.host = newConfig.host;
  this.endpoint = newConfig.endpoint;
  this.methods = newConfig.methods;
  this.rateLimit = newConfig.rateLimit;
  this.contentType = newConfig.contentType;
  this.enabled = newConfig.enabled;
}
```

### Creating Custom Type Guards

```typescript
/**
 * Type guard for validating numeric range
 * @param value - Value to check
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns True if value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Type guard for validating string format
 * @param value - String to validate
 * @param pattern - Regex pattern to match
 * @returns True if string matches pattern
 */
export function matchesPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}
```

---

## Best Practices

### 1. Type Safety

- **Always use interfaces** for configuration and event payloads
- **Extend base types** when creating new module types
- **Use generic types** for flexible, type-safe operations
- **Avoid `any` types** - use `unknown` when type is truly unknown

### 2. Documentation

- **Add JSDoc comments** to all interfaces and complex types
- **Document property constraints** and valid value ranges
- **Provide usage examples** in comments
- **Keep documentation updated** with code changes

### 3. Validation

- **Implement type guards** for all configuration types
- **Validate at runtime** using type guards
- **Provide meaningful error messages** for validation failures
- **Test type guards** thoroughly

### 4. Consistency

- **Follow naming conventions** (e.g., `ModuleNameConfig`, `ModuleNamePayload`)
- **Use consistent property types** across similar interfaces
- **Maintain consistent structure** for related types
- **Follow established patterns** from existing types

### 5. Performance

- **Use type guards efficiently** - avoid redundant checks
- **Minimize type assertions** - prefer type guards
- **Use const assertions** for literal types
- **Consider type inference** when possible

### 6. Maintainability

- **Keep types focused** - single responsibility principle
- **Use composition** over complex inheritance
- **Version types** when making breaking changes
- **Document breaking changes** clearly

---

## Migration Guide

### From Local Types to Shared Types

If you have existing modules with local type definitions:

#### Before (Local Types)
```typescript
// In your module file
interface MyModuleConfig {
  port: number;
  host: string;
}

export class MyModule {
  constructor(config: MyModuleConfig) {
    // Implementation
  }
}
```

#### After (Shared Types)
```typescript
// In shared/src/types/modules.ts
export interface MyModuleConfig extends ModuleConfig {
  port: number;
  host: string;
}

export function isMyModuleConfig(config: ModuleConfig): config is MyModuleConfig {
  return 'port' in config && 'host' in config;
}

// In your module file
import { MyModuleConfig, isMyModuleConfig } from '@interactor/shared';

export class MyModule extends InputModuleBase {
  constructor(config: MyModuleConfig) {
    super('my_module', config, {
      // Module manifest
    });
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    if (!isMyModuleConfig(newConfig)) {
      throw new Error('Invalid configuration provided');
    }
    // Handle config update
  }
}
```

### Steps for Migration

1. **Move type definitions** to `shared/src/types/modules.ts`
2. **Add JSDoc comments** to all types
3. **Create type guards** for configuration validation
4. **Update imports** in your module files
5. **Add type guards** to configuration update methods
6. **Test thoroughly** to ensure type safety

### Common Migration Issues

1. **Missing properties**: Ensure all required properties are included
2. **Type mismatches**: Check property types match exactly
3. **Import errors**: Verify correct import paths
4. **Runtime errors**: Test type guards thoroughly

---

## TypeScript Configuration

The project uses strict TypeScript settings in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Strict Mode Benefits

- **Prevents implicit `any` types**
- **Ensures all code paths return values**
- **Catches switch statement fallthrough**
- **Safe array/object access**
- **Strict optional property handling**

---

## Getting Help

### Resources

1. **Existing modules** - See how types are used in practice
2. **Test files** - Understand expected type behavior
3. **Base classes** - Learn available type-safe methods
4. **TypeScript documentation** - Official TypeScript guides

### Common Issues

1. **Type errors**: Check import paths and type definitions
2. **Runtime errors**: Verify type guards are working correctly
3. **Compilation errors**: Ensure strict mode compliance
4. **Performance issues**: Optimize type guard usage

### Best Practices Summary

- Use shared types from `@interactor/shared`
- Implement type guards for all configurations
- Add comprehensive JSDoc documentation
- Follow established naming conventions
- Test type safety thoroughly
- Keep types focused and maintainable

The type system is designed to provide maximum safety and developer experience while maintaining flexibility for future extensions. Happy typing! 