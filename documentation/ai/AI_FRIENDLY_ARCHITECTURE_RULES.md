# 🏗️ AI-Friendly Architecture Rules

These rules keep your codebase simple and predictable for AI agents. Follow these to maintain development velocity as the system grows.

---

## 🎯 **Core Principles**

### **1. Single Responsibility per Module**
- ✅ Each module does exactly one thing
- ✅ Clear input/output contracts
- ❌ No modules that "do everything"

### **2. Consistent Patterns**
- ✅ All input modules extend `InputModuleBase`
- ✅ All output modules extend `OutputModuleBase`  
- ✅ Same lifecycle: `onInit()` → `onStart()` → `onStop()`
- ❌ No custom base classes or different patterns

### **3. Declarative Configuration**
- ✅ Everything configurable via `manifest.json`
- ✅ Schema-validated configuration
- ❌ No hardcoded values in module code

---

## 🧱 Layers and Boundaries

- Edge (`backend/src/appapi/`): HTTP/WS handlers. Translate requests into commands/queries.
- Application (`backend/src/app/`): Composition, registries, orchestrators. No transport logic.
- Core (`backend/src/core/`): Cross-cutting services (logging, state, router, errors).
- Modules (`backend/src/modules/<feature>/`):
  - `api/` (public API, factory registration)
  - `domain/` (pure logic; no IO)
  - `infra/` (IO/adapters)
- Only import a module via its `api/` entry. `domain/` and `infra/` are internal.

## 🚫 **Forbidden Patterns** (These Confuse AI)

### **1. Singleton Services**
```typescript
// ❌ BAD - Global state, hard to test
export const globalTracker = new EdgeTracker();

// ✅ GOOD - Passed as props/parameters
function MyComponent({ edgeState }: { edgeState: EdgeState }) {
```

### **2. Multiple Architecture Versions**
```typescript
// ❌ BAD - Confusing alternatives
App.tsx
App.simplified.tsx
App.new.tsx

// ✅ GOOD - Single canonical version
App.tsx (only)
```

### **3. Complex State Management**
```typescript
// ❌ BAD - Multiple sources of truth
const [localState, setLocalState] = useState();
const wsState = useWebSocket();
const apiState = useApi();

// ✅ GOOD - Single source of truth
const appState = useAppState(); // One hook, one state
```

### **4. Side Effects in Render**
```typescript
// ❌ BAD - Creates objects every render
return <Component data={{ value: Math.random() }} />;

// ✅ GOOD - Stable references
const data = useMemo(() => ({ value: Math.random() }), []);
return <Component data={data} />;
```

### **5. Data Synchronization**
```typescript
// ❌ BAD - Multiple data structures that can get out of sync
await this.stateManager.replaceState({ modules: moduleInstances });
// Interactions not updated - frontend sees stale data

// ✅ GOOD - Keep all data structures in sync
await this.stateManager.replaceState({ modules: moduleInstances });
await this.syncInteractionsWithModules(); // Sync related data
this.broadcastStateUpdate();
```

### **6. Event remapping at registration time**
```typescript
// ❌ BAD - Remapping route.event to target input event breaks matching
route.event = outputManifest.events[0].name;

// ✅ GOOD - Preserve the source event name as declared in the route
route.event remains the event emitted by the source (e.g., 'timeTrigger')
```

---

## ✅ **Encouraged Patterns** (AI-Friendly)

### **1. Template-Based Development**
Provide complete working templates that AI can copy and modify:
- `TEMPLATE_INPUT_MODULE.md`
- `TEMPLATE_OUTPUT_MODULE.md`
- Common configuration patterns

### **2. Type-First Development**
```typescript
// ✅ Define interfaces first
interface MyModuleConfig extends ModuleConfig {
  endpoint: string;
  timeout: number;
}

// Then implement
export class MyModule extends InputModuleBase {
  constructor(config: MyModuleConfig) { ... }
}
```

### **3. Error-First Handling**
```typescript
// ✅ Handle errors explicitly
protected async onStart(): Promise<void> {
  try {
    await this.connect();
  } catch (error) {
    this.logger.error('Connection failed:', error);
    throw error; // Don't hide failures
  }
}
```

### **4. Lifecycle Consistency**

### **5. Helper-Layer Split (Clock / Engine / Network pattern)**
For any non-trivial module, separate concerns into focused files so that each can be unit-tested and debugged in isolation.

Example pattern taken from `time_input` refactor:
```
backend/src/modules/input/time_input/
├── index.ts         # Thin glue class (Interactor lifecycle only)
├── TimeEngine.ts    # Pure scheduler (clock/metronome math)
├── DisplayFormatter.ts # Pure time-format helpers (no side-effects)
├── WsClient.ts      # Reconnecting WebSocket wrapper (network only)
```
Guidelines:
1. **Pure helpers first** – any maths / string formatting lives in stand-alone functions.
2. **Event-emitting engines** – long-running logic (schedulers, parsers, etc.) emit events instead of calling Interactor APIs directly.
3. **Glue class last** – the `index.ts` file listens to engine events and maps them to `emitTrigger`, `emitStateUpdate`, etc.
4. **No cross-concern imports** – engine never imports WebSocket, network wrapper never imports Interactor.
5. **Frontend ≠ maths** – all calculations stay in the backend; the client only renders strings coming from state.

Benefit: one bug has one file.

```typescript
// ✅ Always implement cleanup
protected async onStart(): Promise<void> {
  this.timer = setInterval(...);
}

protected async onStop(): Promise<void> {
  if (this.timer) clearInterval(this.timer);
}
```

### **Router & Instance Registry**
- The server maintains a live instance registry (map of `moduleId` → instance). Use it for wiring.
- Router matches by `{ source, event }`. The server forwards to outputs by `moduleId` using `onTriggerEvent`/`onStreamingEvent`.
- The router must implement the shared `EventBus` interface, providing `publish`, `subscribe`, `unsubscribe`, and `once`.
- Do not fetch instances from `ModuleLoader` (it handles manifests only).

### **Validation at Register**
- Validate interaction maps before commit: unique ids, manifests exist, routes reference valid ids, source emits `route.event`.
- Return structured `InteractorError.validation` with suggestions.

---

## 📁 **File Organization Rules**

### **Module Structure** (Never Change This)
```
backend/src/modules/<type>/<my_module>/
├── api/        # public API entry (register factory)
├── domain/     # pure logic (no IO)
├── infra/      # IO/adapters
├── index.ts    # thin glue or re-export (during transition)
├── manifest.json
└── wiki.md
```

### **No Deep Nesting**
```
// ❌ BAD - Too complex
modules/input/sensors/motion/pir/advanced/index.ts

// ✅ GOOD - Flat structure  
modules/input/pir_motion/index.ts
```

### **Predictable Naming**
```
// ✅ Module names match directory names
modules/input/time_input/ → TimeInputModule
modules/output/dmx_output/ → DmxOutputModule
```

---

## 🎨 **Frontend Simplification Rules**

### **Single State Source**
```typescript
// ✅ App.tsx holds all state
function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  // Pass down as props, update via callbacks
}
```

### **No Business Logic in Components**
```typescript
// ❌ BAD - Complex logic in render
function MyComponent() {
  const complexCalculation = nodes.map(n => {
    // 50 lines of logic
  });
}

// ✅ GOOD - Extract to hooks
function MyComponent() {
  const processedNodes = useProcessedNodes(nodes);
}
```

### **Memoize Expensive Operations**
```typescript
// ✅ Prevent unnecessary re-renders
const MemoizedNode = React.memo(CustomNode);
const stableCallback = useCallback(handleClick, [dependency]);
```

---

## 🔬 **Testing Requirements**

### **Module Testing**
```typescript
// ✅ Every module needs basic tests
describe('MyModule', () => {
  test('starts without errors', async () => {
    const module = new MyModule(config);
    await expect(module.start()).resolves.not.toThrow();
  });
});
```

### **No Integration Tests for New Features**
- ✅ Unit test your module in isolation
- ❌ Don't create complex integration test setups
- The existing test suite handles integration

---

## 🚀 **Development Workflow for AI**

### **1. Always Start with Templates**
- Copy from `TEMPLATE_INPUT_MODULE.md` or `TEMPLATE_OUTPUT_MODULE.md`
- Modify for your specific use case
- Don't create from scratch

### **2. Test Early and Often**
```bash
# Check backend logs
npm run dev:backend

# Test API endpoints
curl http://localhost:3001/api/modules

# Check frontend integration
open http://localhost:3000
```

### **3. Keep Changes Atomic**
- One module per development session
- Complete the module before starting another
- Don't modify core services

---

## 🎯 **Success Metrics**

Your development is successful when:
- ✅ New module loads without backend errors
- ✅ Configuration UI appears in frontend
- ✅ Module can be connected to existing modules
- ✅ No impact on existing functionality
- ✅ Code follows existing patterns exactly

**Remember: Consistency is more important than creativity when working with AI agents.**