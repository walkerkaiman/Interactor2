# React Flow Performance Optimization Guide

## Core Performance Principles

### 1. **Memoize Everything**
React Flow can trigger many re-renders. Protect your components:

```typescript
// Memoize node types object
const nodeTypes = useMemo(() => ({
  custom: CustomNode,
  timeInput: TimeInputNode,
}), []);

// Memoize edge types object
const edgeTypes = useMemo(() => ({
  custom: CustomEdge,
}), []);

// Memoize callbacks
const onNodesChange = useCallback((changes) => {
  // Handle changes
}, [/* stable dependencies */]);
```

### 2. **Wrap Custom Components in React.memo**
```typescript
const CustomNode = React.memo(({ data, selected }) => {
  // Component implementation
});

const CustomEdge = React.memo(({ id, source, target, data }) => {
  // Component implementation
});
```

### 3. **Avoid Creating Objects in Render**
```typescript
// ❌ Bad - Creates new object every render
<ReactFlow
  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
  style={{ background: '#1a1a1a' }}
/>

// ✅ Good - Stable references
const defaultViewport = { x: 0, y: 0, zoom: 1 };
const flowStyle = { background: '#1a1a1a' };

<ReactFlow
  defaultViewport={defaultViewport}
  style={flowStyle}
/>
```

## Node Optimization

### 1. **Keep Node Data Minimal**
```typescript
// ❌ Bad - Storing everything in node data
const node = {
  id: '1',
  data: {
    label: 'Node',
    heavyObject: { /* ... */ },
    callbacks: { /* ... */ },
    // ... lots of data
  }
};

// ✅ Good - Store only essentials
const node = {
  id: '1',
  data: {
    label: 'Node',
    configId: 'config-1', // Reference to external data
  }
};
```

### 2. **Lazy Load Heavy Content**
```typescript
const CustomNode = React.memo(({ data }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div>
      <div>{data.label}</div>
      {showDetails && <HeavyComponent />}
    </div>
  );
});
```

### 3. **Use Virtual Rendering for Many Nodes**
```typescript
// Enable only rendering visible elements
<ReactFlow
  nodes={nodes}
  edges={edges}
  onlyRenderVisibleElements={true}
/>
```

## Edge Optimization

### 1. **Simplify Edge Paths**
```typescript
// Use simpler edge types when possible
const edges = nodes.map(edge => ({
  ...edge,
  type: 'straight', // Faster than 'bezier' or 'smoothstep'
}));
```

### 2. **Minimize Edge Label Updates**
```typescript
// ❌ Bad - Label updates on every render
const EdgeLabel = ({ value }) => {
  return <div>{new Date().toISOString()}: {value}</div>;
};

// ✅ Good - Stable label content
const EdgeLabel = React.memo(({ value }) => {
  return <div>{value}</div>;
});
```

## State Management Optimization

### 1. **Batch Node Updates**
```typescript
// ❌ Bad - Multiple state updates
nodes.forEach(node => {
  setNodes(prev => updateNode(prev, node));
});

// ✅ Good - Single state update
setNodes(prev => {
  return nodes.reduce((acc, node) => updateNode(acc, node), prev);
});
```

### 2. **Use Refs for Non-Visual State**
```typescript
const CustomNode = () => {
  // Visual state - causes re-render
  const [isSelected, setIsSelected] = useState(false);
  
  // Non-visual state - no re-render
  const metadata = useRef({ lastUpdate: Date.now() });
  
  return <div className={isSelected ? 'selected' : ''}>Node</div>;
};
```

## React Flow Specific Optimizations

### 1. **Viewport Performance**
```typescript
// Debounce viewport changes
const onViewportChange = useMemo(
  () => debounce((viewport) => {
    // Handle viewport change
  }, 100),
  []
);
```

### 2. **Connection Validation**
```typescript
// ❌ Bad - Heavy validation on every connection attempt
const isValidConnection = useCallback((connection) => {
  // Complex validation logic
  return performHeavyValidation(connection);
}, []);

// ✅ Good - Quick validation with deferred heavy checks
const isValidConnection = useCallback((connection) => {
  // Quick checks first
  if (!connection.source || !connection.target) return false;
  
  // Defer heavy validation
  return true; // Validate fully on connect
}, []);
```

### 3. **Drag Performance**
```typescript
// Enable snap to grid for better performance
<ReactFlow
  snapToGrid={true}
  snapGrid={[15, 15]}
/>
```

## Common Performance Pitfalls

### 1. **Subscribing to Frequent Updates**
```typescript
// ❌ Bad - Re-render on every mouse move
const { project } = useReactFlow();
const onMouseMove = (event) => {
  const position = project({ x: event.clientX, y: event.clientY });
  setMousePosition(position); // Causes re-render
};

// ✅ Good - Use refs or throttle
const mousePositionRef = useRef({ x: 0, y: 0 });
const onMouseMove = useCallback(
  throttle((event) => {
    const position = project({ x: event.clientX, y: event.clientY });
    mousePositionRef.current = position;
  }, 16), // ~60fps
  [project]
);
```

### 2. **Heavy Node Counts**
```typescript
// For 1000+ nodes, consider:
// 1. Virtual rendering (onlyRenderVisibleElements)
// 2. Node clustering/grouping
// 3. Level of detail (LOD) rendering
// 4. Web Workers for heavy computations
```

### 3. **Uncontrolled Re-renders**
```typescript
// Use React DevTools Profiler to identify:
// - Which components re-render frequently
// - What props are changing
// - Where memoization would help
```

## Performance Checklist

- [ ] All node/edge types are memoized
- [ ] Custom nodes/edges wrapped in React.memo
- [ ] Callbacks wrapped in useCallback
- [ ] Objects/arrays wrapped in useMemo
- [ ] No object creation in render
- [ ] Virtual rendering enabled for large graphs
- [ ] Heavy computations moved to Web Workers
- [ ] Viewport changes debounced/throttled
- [ ] Non-visual state in refs
- [ ] React DevTools Profiler shows good performance

## Measuring Performance

```typescript
// Add performance markers
const onNodesChange = useCallback((changes) => {
  performance.mark('nodes-change-start');
  
  // Handle changes
  
  performance.mark('nodes-change-end');
  performance.measure(
    'nodes-change',
    'nodes-change-start',
    'nodes-change-end'
  );
}, []);

// Monitor in console
// performance.getEntriesByName('nodes-change');
```

## Advanced Techniques

### 1. **Web Workers for Heavy Computation**
```typescript
// offload-worker.js
self.addEventListener('message', (e) => {
  const { nodes, edges } = e.data;
  // Heavy computation
  const result = calculateLayout(nodes, edges);
  self.postMessage(result);
});

// In React component
const worker = useMemo(() => new Worker('./offload-worker.js'), []);
```

### 2. **Progressive Rendering**
```typescript
// Render nodes in batches
const [visibleNodes, setVisibleNodes] = useState([]);

useEffect(() => {
  const batchSize = 50;
  let currentBatch = 0;
  
  const renderBatch = () => {
    const start = currentBatch * batchSize;
    const end = start + batchSize;
    const batch = nodes.slice(start, end);
    
    setVisibleNodes(prev => [...prev, ...batch]);
    
    if (end < nodes.length) {
      currentBatch++;
      requestIdleCallback(renderBatch);
    }
  };
  
  renderBatch();
}, [nodes]);
```

Remember: Profile first, optimize second. Not all optimizations are needed for every use case.