# Interactor V2: Developer Documentation

---

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Module System & Base Classes](#module-system--base-classes)
5. [Backend](#backend)
6. [Frontend](#frontend)
7. [Shared Package](#shared-package)
8. [Configuration](#configuration)
9. [Message Routing & Event Processing](#message-routing--event-processing)
10. [Extensibility & Making a Module](#extensibility--making-a-module)
11. [Testing](#testing)
12. [Development Workflow](#development-workflow)
13. [Appendices](#appendices)

---

## Introduction

Interactor V2 is a modular, event-driven interaction system for building complex workflows in interactive art installations. It features a visual node-based editor, a robust backend, and a manifest-driven module/plugin system. The architecture is designed for extensibility, type safety, and real-time operation.

---

## Architecture Overview

Interactor V2 is a monorepo with clear separation between backend, frontend, and shared components:

```
Interactor_V2/
├── backend/          # Node.js/TypeScript server with core logic and modules
├── frontend/         # React/TypeScript SPA with visual node editor
├── shared/           # TypeScript types and JSON manifests
├── config/           # System and interaction configuration
├── tests/            # Automated tests for backend and frontend
├── documentation/    # Design docs, checklists, and guides
```

---

## Core Concepts

- **Event-Driven:** All communication is routed through a central MessageRouter (event bus).
- **Modular:** All logic is encapsulated in modules (input/output, trigger/streaming).
- **Manifest-Driven:** Modules describe their capabilities and config via JSON manifests.
- **Type-Safe:** Shared TypeScript interfaces and schemas ensure consistency across layers.
- **Visual:** Node-based editor for configuring and wiring modules.
- **Real-Time:** WebSocket communication for live updates and state sync.
- **Extensible:** New modules can be added with minimal changes to the core.

---

## Module System & Base Classes

### Conceptual Scaffolding

Interactor V2 uses a clear, layered base class structure to maximize code reuse, enforce contracts, and clarify module responsibilities:

- **ModuleBase:**
  - The root abstract class for all modules.
  - Provides shared features: lifecycle management (`onInit`, `onStart`, `onStop`, `onDestroy`), configuration, logging, event emitter, and manifest access.
  - All modules (input or output) inherit from this class.

- **InputModuleBase (extends ModuleBase):**
  - Abstract base for all input modules.
  - Adds input-specific features and contracts (e.g., `receive()`, trigger/streaming mode logic, event firing, input formatting, debouncing, etc.).
  - Enforces that all input modules implement required input behaviors.

- **OutputModuleBase (extends ModuleBase):**
  - Abstract base for all output modules.
  - Adds output-specific features and contracts (e.g., `send()`, value consumption, output formatting, batching, etc.).
  - Enforces that all output modules implement required output behaviors.

**Diagram:**
```
ModuleBase
├── InputModuleBase
│    └── (Your input modules)
└── OutputModuleBase
     └── (Your output modules)
```

### Directory Structure
```
backend/src/modules/
  my_input_trigger/
    ├── index.ts         # Module implementation (extends InputModuleBase)
    ├── manifest.json    # Metadata, config schema, event definitions
    ├── wiki.md          # Documentation and usage
    ├── tests/           # Unit/integration tests (optional)
    └── assets/          # Static assets (optional)
  my_output_streaming/
    ├── index.ts         # Module implementation (extends OutputModuleBase)
    ├── ...
```

### Module Interface & Manifest
- All modules extend either `InputModuleBase` or `OutputModuleBase` (which both extend `ModuleBase`).
- Each module provides a `manifest.json` describing:
  - Name, type (input/output)
  - Configurable parameters (with types, defaults, validation)
  - Supported events/messages
  - Asset references
- Modules are decoupled and communicate only via the MessageRouter.

---

## Backend

### Core Services
- **ModuleLoader:** Discovers, validates, and instantiates modules based on config. Handles lifecycle and hot-reloading.
- **MessageRouter:** Central event bus for routing messages/events between modules. Supports one-to-one, one-to-many, and many-to-one topologies.
- **Logger:** Multi-level logging (info, warn, error, debug) with output to console, files, and optionally frontend.
- **SystemStats:** Tracks and exposes system performance metrics (CPU, memory, event throughput, module health).
- **StateManager:** Maintains all backend state (modules, connections, settings) and persists to disk.
- **REST API & WebSocket:** Exposes endpoints for modules, manifests, stats, routes, and real-time state/events.

### Message Routing & Event Processing
- **One-to-One:** Direct message from a single sender to a single receiver.
- **One-to-Many:** Broadcast from one sender to multiple receivers.
- **Many-to-One:** Aggregate messages from multiple senders to a single receiver.
- **Efficient Processing:** Prevents duplicate event delivery, supports pattern-based subscriptions, and uses middleware for transformation/validation.

---

## Frontend

- **React + TypeScript SPA** with Vite for fast development/builds.
- **Node Editor:** Visual drag-and-drop interface for configuring interactions.
- **Module Management:** UI for managing modules and their settings.
- **Real-time Monitoring:** Live logs and system state visualization.
- **State Management:** Zustand for frontend state.
- **API Layer:** Communicates with backend via REST and WebSocket.
- **Auto-Generated Forms:** Module settings forms are generated from shared manifests.
- **Responsive Design:** Mobile-friendly layout.

---

## Shared Package

- **Type Definitions:** Comprehensive TypeScript interfaces for modules, events, and config.
- **Manifests:** JSON schemas describing module capabilities and configuration.
- **Event Contracts:** Standardized event and message formats.
- **Configuration Schemas:** Type-safe configuration definitions.

---

## Configuration

- **System Config:** `config/system.json` for server, logging, module, and security settings.
- **Interaction Config:** `config/interactions/` for wiring modules and defining data flow.
- **Manifest Sync:** `config/sync_manifests.js` for keeping manifests in sync.
- **Persistence:** All state, settings, and connection graphs are saved to disk (JSON) and auto-saved on change.

---

## Extensibility & Making a Module

### Best Practices
- Extend `InputModuleBase` or `OutputModuleBase` (which both extend `ModuleBase`).
- Implement required lifecycle and type-specific methods (`receive()` for inputs, `send()` for outputs, etc.).
- Provide a complete `manifest.json` (name, type, config schema, events, version, compatibility).
- Place all shared types and utilities in the `shared` package.
- Use dependency injection for logger, state manager, etc.
- Document each module with a `wiki.md` (purpose, config, events, usage).
- Validate manifests and configs on load.
- Test modules in isolation before integration.

### Example Directory
```
my_input_trigger/
├── index.ts         # Module implementation (extends InputModuleBase)
├── manifest.json    # Metadata, config schema, event definitions
├── wiki.md          # Documentation and usage
├── tests/           # Unit/integration tests (optional)
└── assets/          # Static assets (optional)
my_output_streaming/
├── index.ts         # Module implementation (extends OutputModuleBase)
├── ...
```

### Summary Table
| Class                | Purpose                                      |
|----------------------|----------------------------------------------|
| `ModuleBase`         | Shared features for all modules              |
| `InputModuleBase`    | Shared features/contracts for inputs         |
| `OutputModuleBase`   | Shared features/contracts for outputs        |

| File/Folder         | Purpose                                      |
|---------------------|----------------------------------------------|
| `index.ts`          | Module implementation (extends Input/Output)  |
| `manifest.json`     | Metadata, config schema, event definitions   |
| `wiki.md`           | Documentation and usage                      |
| `tests/`            | Unit/integration tests (optional)            |
| `assets/`           | Static assets (optional)                     |

---

## Testing

- **Backend:** Vitest/Jest for core logic and modules.
- **Frontend:** Vitest/React Testing Library for UI and state.
- **Integration:** End-to-end tests for workflows from input to output.
- **Test Organization:** `tests/` directory, mirroring backend/frontend structure.
- **Coverage:** ModuleLoader, MessageRouter, Logger, SystemStats, configuration validation, plugin loading, hot reloading, UI state sync, and more.

---

## Development Workflow

### Quick Start
- Install dependencies: `npm install`
- Start dev servers: `npm run dev` (or `npm run dev:backend` / `npm run dev:frontend`)
- Run tests: `npm run test`
- Build: `npm run build`

### Checklist for Production Readiness
- Centralize all backend state and persist to disk
- Implement dynamic ModuleLoader and register modules with MessageRouter
- Finalize MessageRouter for all routing topologies
- Expose REST API and WebSocket endpoints
- Implement file-based persistence and auto-save
- Ensure frontend integration and real-time sync
- Document all backend APIs, state structures, and schemas
- Log key events, errors, and state changes
- Expose system/module health to the UI

---

## Appendices

### A. Design Decisions & Rationale
- Layered base class structure for clarity and contract enforcement
- Unified module interface for shared features
- InputModuleBase and OutputModuleBase for type-specific logic
- Declarative, schema-driven wiring for interactions
- Plugin system for modules (dynamic import, npm packages, etc.)
- Hot reloading for modules and configuration
- Schema-driven UI for auto-generated forms
- Strict typing across all layers
- Centralized event bus for decoupling
- Documentation automation from code and manifests
- Unified test runner and fixtures

### B. Example Mermaid Diagram
```
graph TD
  subgraph Backend
    A[Core Services]
    B[Module Loader]
    C[Event Bus]
    D[InputModuleBase]
    E[OutputModuleBase]
    F[Input Modules]
    G[Output Modules]
  end
  subgraph Frontend
    H[UI Shell]
    I[Auto-Generated Module Forms]
    J[Live Logs/Events]
  end
  subgraph Shared
    K[Types & Schemas]
    L[Manifests]
  end
  A --> B
  B --> D
  B --> E
  D --> F
  E --> G
  F --> C
  G --> C
  C --> F
  C --> G
  H --> I
  I --> L
  J --> C
  H --> J
  K --> A
  K --> H
  K --> D
  K --> E
  L --> D
  L --> E
  L --> I
```

### C. Module Inventory
- **Input Modules:** frames_input, http_input, osc_input, serial_input, time_input
- **Output Modules:** audio_output, dmx_output, http_output, osc_output

### D. Technology Stack
- **Backend:** Node.js, TypeScript, Express, WebSocket, Winston
- **Frontend:** React, TypeScript, Vite, React Flow, Tailwind CSS, Zustand
- **Shared:** TypeScript interfaces, JSON schemas
- **Testing:** Vitest, React Testing Library
- **Build Tools:** npm workspaces, TypeScript compiler

---

For further details, see the full design document (`documentation/redesign.txt`) and module creation guide (`documentation/MakingAModule.md`). 