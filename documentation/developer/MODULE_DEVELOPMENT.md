# Module Development Guide

This guide provides a comprehensive overview of how to create custom modules for the Interactor system.

## Module Architecture

All modules in Interactor are built on a common set of base classes that provide a consistent structure and a rich set of features.

### Base Classes

-   **`ModuleBase`**: The abstract base class for all modules. It provides core functionality such as lifecycle methods (`onInit`, `onStart`, `onStop`), configuration management, and logging.
-   **`InputModuleBase`**: The abstract base class for all input modules. It extends `ModuleBase` and provides additional features for handling incoming data, such as trigger and streaming modes.
-   **`OutputModuleBase`**: The abstract base class for all output modules. It extends `ModuleBase` and provides features for sending data to external systems.

### Module Lifecycle

Every module follows a consistent lifecycle:

1.  **`onInit()`**: Called when the module is first initialized. Use this method to validate the module's configuration and set up any necessary resources.
2.  **`onStart()`**: Called when the module is started. Use this method to begin any long-running processes, such as listening for incoming connections.
3.  **`onStop()`**: Called when the module is stopped. Use this method to clean up any resources that were created in `onStart()`.
4.  **`onConfigUpdate()`**: Called when the module's configuration is updated.

## Creating a New Module

To create a new module, follow these steps:

1.  **Create a new directory** for your module in either `backend/src/modules/input` or `backend/src/modules/output`.
2.  **Create an `index.ts` file** in the new directory. This file will contain your module's implementation.
3.  **Create a `manifest.json` file** in the new directory. This file will describe your module's capabilities and configuration options.
4.  **Implement your module** by extending either `InputModuleBase` or `OutputModuleBase`.
5.  **Define your module's configuration** in the `manifest.json` file. This will be used to automatically generate a configuration UI in the frontend.

### Example: A Simple Input Module

```typescript
// backend/src/modules/input/my-simple-input/index.ts
import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig } from '@interactor/shared';

export class MySimpleInputModule extends InputModuleBase {
  constructor(config: ModuleConfig) {
    super('my-simple-input', config, { /* manifest */ });
  }

  protected async onStart(): Promise<void> {
    // Start a timer to emit a trigger every second
    setInterval(() => {
      this.emitTrigger('trigger', { value: Math.random() });
    }, 1000);
  }
}
```

## Best Practices

-   **Keep modules focused:** Each module should have a single, well-defined purpose.
-   **Use the shared type system:** All types should be defined in the `shared` package to ensure consistency between the frontend and backend.
-   **Provide a comprehensive manifest:** The manifest is used to automatically generate a UI for your module, so it's important to provide a complete and accurate description of your module's capabilities.
-   **Log important events:** Use the provided logger to log important events, such as when the module is started, stopped, or encounters an error.
