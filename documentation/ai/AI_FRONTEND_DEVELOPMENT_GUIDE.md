# AI Frontend Development Guide

This document provides strict guardrails for AI agents developing frontend code in the Interactor application. Follow these rules precisely to maintain consistency and prevent common frontend issues.

## 🚨 **CRITICAL RULES - NEVER VIOLATE**

### **1. State Management Architecture**
- **ONE source of truth per concern**: Each piece of state has exactly one owner
- **NO prop drilling**: Use hooks to share state, never pass props through 3+ levels
- **NO inline state calculations**: All derived state goes in `useMemo` or custom hooks
- **NO mixing concerns**: One hook = one responsibility

### **2. Component Structure**
- **FUNCTIONAL components only**: No class components, no exceptions
- **HOOKS at the top**: All hooks must be called before any other logic
- **CLEAN returns**: Component JSX should be the last thing in the function
- **NO side effects in render**: All side effects go in `useEffect`

### **3. TypeScript Enforcement**
- **STRICT types**: No `any` unless absolutely necessary
- **INTERFACE over type**: Use interfaces for object shapes
- **EXPLICIT returns**: All functions must have explicit return types
- **NO implicit any**: Fix all TypeScript errors before committing

### **4. Performance Rules**
- **MEMOIZE expensive calculations**: `useMemo` for object/array creation
- **CALLBACK for event handlers**: `useCallback` for all event handlers
- **REF for mutable values**: `useRef` for values that don't trigger re-renders
- **NO inline object creation**: Objects in JSX go in `useMemo`

## WebSocket Usage (Backend Direction Update)
- The WebSocket is for runtime-only updates, not structural changes.
- Event types:
  - `state_update` (debounced snapshot)
  - `module_runtime_update` (immediate runtime deltas)
  - `trigger_event` (UI pulse)
  - `error` (structured error frames)
- Structural operations (modules, routes, scenes) flow via REST first; then the backend broadcasts updated `state_update`.

## ✅ **REQUIRED PATTERNS**

### **1. Hook Architecture Pattern**
```typescript
// ✅ CORRECT: Single responsibility hooks
export function useBackendSync() {
  // One concern: backend communication
  return { modules, interactions, settings };
}

export function useInteractionsDiff(interactions, original) {
  // One concern: diffing logic
  return { local, registered, hasChanges };
}

export function useFlowBuilder(modules, interactions) {
  // One concern: graph building
  return { nodes, edges, handlers };
}
```

### **2. Component Structure Pattern**
```typescript
// ✅ CORRECT: Clean component structure
function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // 1. Hooks first
  const { data } = useMyHook();
  const [state, setState] = useState();
  
  // 2. Memoized values
  const memoizedValue = useMemo(() => expensiveCalc(data), [data]);
  
  // 3. Event handlers
  const handleClick = useCallback(() => {
    // handler logic
  }, [dependencies]);
  
  // 4. Effects
  useEffect(() => {
    // side effects
  }, [dependencies]);
  
  // 5. Clean return
  return <div>{memoizedValue}</div>;
}
```

### **3. State Update Pattern**
```typescript
// ✅ CORRECT: Immutable updates
const [state, setState] = useState({ count: 0, items: [] });

// Update single field
setState(prev => ({ ...prev, count: prev.count + 1 }));

// Update nested object
setState(prev => ({
  ...prev,
  items: [...prev.items, newItem]
}));

// Update array
setState(prev => ({
  ...prev,
  items: prev.items.map(item => 
    item.id === targetId ? { ...item, updated: true } : item
  )
}));
```

### **4. Event Handler Pattern**
```typescript
// ✅ CORRECT: Proper event handling
const handleSubmit = useCallback((event: React.FormEvent) => {
  event.preventDefault();
  // handler logic
}, [dependencies]);

const handleClick = useCallback((id: string) => {
  // handler logic
}, [dependencies]);
```

## ❌ **FORBIDDEN PATTERNS**

### **1. State Management Anti-Patterns**
```typescript
// ❌ WRONG: Multiple state sources
const [modules, setModules] = useState([]);
const [interactions, setInteractions] = useState([]);
// Later in component...
const [localModules, setLocalModules] = useState([]); // Duplicate!

// ❌ WRONG: Inline state calculations
return <div>{expensiveCalculation(data)}</div>;

// ❌ WRONG: Prop drilling
function GrandChild({ deeplyNestedProp }) {
  return <div>{deeplyNestedProp}</div>;
}
```

### **2. Component Anti-Patterns**
```typescript
// ❌ WRONG: Side effects in render
function BadComponent() {
  const [state, setState] = useState();
  
  // This will cause infinite re-renders!
  if (someCondition) {
    setState(newValue);
  }
  
  return <div>...</div>;
}

// ❌ WRONG: Inline object creation
return <div style={{ color: 'red', fontSize: '14px' }}>...</div>;

// ❌ WRONG: Missing dependencies
useEffect(() => {
  // effect logic
}, []); // Missing dependencies!
```

### **3. TypeScript Anti-Patterns**
```typescript
// ❌ WRONG: Implicit any
function badFunction(param) {
  return param.someProperty;
}

// ❌ WRONG: Loose typing
const data: any = fetchData();

// ❌ WRONG: No return type
function calculateValue(input: string) {
  return input.length;
}
```

## 🏗️ **ARCHITECTURE PATTERNS**

### **1. Hook Organization**
```
frontend/src/
├── state/           # State management hooks
│   ├── useBackendSync.ts
│   ├── useInteractionsDiff.ts
│   └── useAppState.ts
├── graph/           # React-Flow specific hooks
│   ├── useFlowBuilder.ts
│   └── useGraphEvents.ts
├── hooks/           # Reusable utility hooks
│   ├── useNodeConfig.ts
│   └── useInstanceData.ts
└── components/      # UI components
    ├── NodeEditor.tsx
    └── Sidebar.tsx
```

### **2. Data Flow Pattern**
```
Backend API → useBackendSync → Components
     ↓
WebSocket → useBackendSync → Components
     ↓
User Actions → useFlowBuilder → Components
```

### **3. Component Hierarchy**
```
App.tsx (orchestrator)
├── useBackendSync (data)
├── useInteractionsDiff (business logic)
└── Components (UI only)
    ├── NodeEditor (graph)
    ├── Sidebar (navigation)
    └── Toolbar (actions)
```

## 🔧 **DEVELOPMENT WORKFLOW**

### **1. Before Writing Code**
1. **Identify the concern**: What single responsibility does this code have?
2. **Choose the pattern**: Hook, component, or utility function?
3. **Plan the data flow**: Where does data come from and where does it go?
4. **Consider performance**: Will this cause unnecessary re-renders?

### **2. Writing Code**
1. **Start with types**: Define interfaces first
2. **Write the hook**: If it's state management, make it a hook
3. **Test the logic**: Ensure the business logic works
4. **Add the UI**: Keep components thin and focused

### **3. Code Review Checklist**
- [ ] No `any` types (unless absolutely necessary)
- [ ] All hooks called at top level
- [ ] No side effects in render
- [ ] Proper dependency arrays in `useEffect`/`useCallback`
- [ ] Immutable state updates
- [ ] No prop drilling beyond 2 levels
- [ ] Memoized expensive calculations
- [ ] Clean component structure

## 🐛 **DEBUGGING PATTERNS**

### **1. State Debugging**
```typescript
// Add to component for debugging
useEffect(() => {
  console.log('State changed:', { modules, interactions });
}, [modules, interactions]);
```

### **2. Performance Debugging**
```typescript
// Check for unnecessary re-renders
const renderCount = useRef(0);
renderCount.current += 1;
console.log('Component rendered:', renderCount.current);
```

### **3. Hook Debugging**
```typescript
// Debug hook dependencies
useEffect(() => {
  console.log('Effect dependencies:', { modules, interactions });
}, [modules, interactions]);
```

## 📋 **COMMON TASKS**

### **1. Adding a New Hook**
```typescript
// 1. Create the hook file
// frontend/src/hooks/useNewFeature.ts
export function useNewFeature(data: SomeType) {
  const [state, setState] = useState<StateType>(initialState);
  
  const handler = useCallback(() => {
    // handler logic
  }, [dependencies]);
  
  const memoizedValue = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);
  
  return { state, handler, memoizedValue };
}
```

### **2. Adding a New Component**
```typescript
// 1. Define types
interface NewComponentProps {
  data: SomeType;
  onAction: (id: string) => void;
}

// 2. Create component
export function NewComponent({ data, onAction }: NewComponentProps) {
  const [localState, setLocalState] = useState();
  
  const handleClick = useCallback(() => {
    onAction(data.id);
  }, [data.id, onAction]);
  
  return <div onClick={handleClick}>{data.name}</div>;
}
```

### **3. Updating State**
```typescript
// Always use immutable updates
setState(prev => ({ ...prev, newField: newValue }));

// For arrays
setItems(prev => [...prev, newItem]);

// For nested objects
setState(prev => ({
  ...prev,
  nested: { ...prev.nested, field: newValue }
}));
```

## 🎯 **SUCCESS METRICS**

A good frontend implementation should:
- ✅ **Compile without TypeScript errors**
- ✅ **Have no console warnings about missing dependencies**
- ✅ **Not cause infinite re-render loops**
- ✅ **Follow the single responsibility principle**
- ✅ **Be easily testable in isolation**
- ✅ **Have clear data flow**
- ✅ **Be performant (no unnecessary re-renders)**

## 🚨 **EMERGENCY FIXES**

If you encounter these issues:

### **Infinite Re-renders**
```typescript
// ❌ Problem
useEffect(() => {
  setState(newValue);
}, [state]); // This causes infinite loop!

// ✅ Fix
useEffect(() => {
  setState(newValue);
}, [dependency]); // Use actual dependency
```

### **Missing Dependencies**
```typescript
// ❌ Problem
useCallback(() => {
  doSomething(value);
}, []); // Missing value dependency

// ✅ Fix
useCallback(() => {
  doSomething(value);
}, [value]); // Include all dependencies
```

### **Type Errors**
```typescript
// ❌ Problem
const data: any = fetchData();

// ✅ Fix
const data: SpecificType = fetchData();
```

---

**Remember**: The frontend should be a thin layer that displays data and handles user interactions. Keep business logic in hooks, keep components focused on UI, and always prioritize maintainability over cleverness. 