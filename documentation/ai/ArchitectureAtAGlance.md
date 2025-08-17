## Architecture at a Glance

This app is a modular monolith: one deployable server split into independent modules with clear boundaries and contracts.

### Source layout

- `backend/src`
  - `app/` — application services and composition (e.g., `ModuleRegistry`, `InteractorApp`)
  - `appapi/` — HTTP/WebSocket edge (controllers and transport-specific code)
  - `core/` — cross-cutting services (logging, state, router, errors, `ConfigNormalizer`)
  - `modules/` — feature modules
    - `<feature>/api/` — public API and factory registration only
    - `<feature>/domain/` — pure domain logic (no IO)
    - `<feature>/infra/` — adapters and IO (file system, websockets, devices)
- `shared/` — shared types only (no logic)
- `frontend/` — UI; reads values from backend (no domain math)
  - `hooks/` — state management (`useStateSync`, `useRuntimeData`)
  - `core/` — configuration parsing (`ConfigParser`)
  - `state/` — WebSocket connection (`useBackendSync`, `runtimeBus`)

### State Management Architecture

**Backend State:**
- `StateManager` owns persisted state in `data/state.json`
- State JSON hosted at `/api/state` (no runtime data)
- Unified configuration structure for all modules
- State only saved when "Register" button is pressed

**Runtime Updates:**
- Combined WebSocket messages every second
- Single `module_runtime_update` with `moduleId: "combined"`
- Contains system current time + all module runtime data
- Synchronized timing prevents desync issues

**Frontend State:**
- `useStateSync`: Local vs backend state synchronization
- `useRuntimeData`: Real-time WebSocket data processing
- `useBackendSync`: WebSocket connection management
- `ConfigParser`: Module-specific config extraction

### Boundaries and import rules

- Only import a module via its `api/` entry. `domain/` and `infra/` are internal.
- Core services are cross-cutting and do not import module internals.
- The edge layer (`appapi/`) depends on application services, not module internals.

### Event flow

- In-process event bus: `MessageRouter` implements the shared `EventBus` interface.
- Inputs emit `trigger`/`stream` events → routed via `MessageRouter` → outputs handle events.
- Runtime-only updates are pushed to the frontend via WebSocket frames (`module_runtime_update`).
- Combined runtime updates ensure synchronized timing across all modules.

### Data ownership

- `StateManager` owns persisted state in `data/state.json`.
- Each module owns its runtime and configuration; other modules do not write its state.
- `InteractorApp` buffers and combines runtime updates for synchronized delivery.

### Contracts

- Manifests define the module's name, type, and config schema.
- Public API exposed from `api/` is the module contract. A factory is registered with `ModuleRegistry`.
- Unified configuration structure ensures consistent module configuration handling.

### Testing

- Unit tests: domain logic inside each module.
- Integration tests: through module public API.
- System tests: end-to-end via HTTP/WS.

### Extraction ready

- Modules depend inward (to shared types) and expose factories; adapters are swappable.
- The event bus and state access are replaceable, keeping extraction to services cheap.


