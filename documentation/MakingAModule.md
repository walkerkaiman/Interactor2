# Making a Module

This guide describes best practices and the step-by-step process for packaging modules to ensure extensibility and seamless integration with the Interactor V2 system.

---

## 1. Standardized Module Interface

- All modules (input/output) must extend the common abstract base class (`ModuleBase`), which defines required lifecycle methods:
  - `onInit`, `onStart`, `onStop`, `onDestroy`
  - Consistent API for event handling
- Enforce TypeScript interfaces for module configuration, state, and events, shared via the `shared` package.

## 2. Manifest-Driven Design

- Each module must include a `manifest.json` file describing:
  - Module name, type (`input` or `output`), version, author, and description
  - Configuration schema (for validation and UI generation)
  - Supported events (input/output), data types, and any dependencies
- The backend’s `ModuleLoader` validates the manifest before loading the module, ensuring compatibility.

## 3. Directory and Packaging Convention

- Each module lives in its own directory under `backend/src/modules/<module_name>_<type>/`.
- Directory contains:
  - `index.ts` (main module implementation)
  - `manifest.json` (metadata/config)
  - `wiki.md` (documentation)
  - Optional: tests, assets, helper files
- This structure allows for easy discovery, loading, and hot-reloading.

## 4. Loose Coupling and Dependency Injection

- Modules should not import or depend on each other directly. All communication goes through the `MessageRouter` (event bus).
- Use dependency injection for core services (logger, state manager, etc.) so modules remain decoupled from backend internals.

## 5. Shared Types and Utilities

- Place all shared types, event definitions, and utility functions in the `shared` package.
- Modules should import from `@interactor/shared` to ensure type safety and compatibility.

## 6. Automated Validation and Testing

- On load, validate each module’s manifest and configuration against the shared schema.
- Provide a test harness or CLI for module developers to test modules in isolation before integration.

## 7. Documentation and Examples

- Require a `wiki.md` or similar documentation file in each module directory, describing:
  - Purpose and usage
  - Configuration options
  - Example events and data flows
- Maintain example modules as templates for new development.

## 8. Versioning and Compatibility

- Include a version field in each manifest.
- Optionally, support a compatibility field to specify required backend or shared package versions.

---

### Example Module Directory Structure

```
my_input_trigger/
├── index.ts         # Module implementation (extends ModuleBase)
├── manifest.json    # Metadata, config schema, event definitions
├── wiki.md          # Documentation and usage
├── tests/           # Unit/integration tests (optional)
└── assets/          # Static assets (optional)
```

---

## Summary Table

| File/Folder         | Purpose                                      |
|---------------------|----------------------------------------------|
| `index.ts`          | Module implementation (extends `ModuleBase`) |
| `manifest.json`     | Metadata, config schema, event definitions   |
| `wiki.md`           | Documentation and usage                      |
| `tests/`            | Unit/integration tests (optional)            |
| `assets/`           | Static assets (optional)                     |

---

By following these conventions, you ensure:
- New modules are plug-and-play
- The system can validate and load modules dynamically
- Developers have a clear template and contract to follow
- The backend remains robust, type-safe, and easy to extend 