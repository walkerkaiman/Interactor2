# Frontend Base Module Node Architecture

## Overview

The `BaseModuleNode` provides a foundation for all module components in the frontend, offering shared functionality for consistent behavior, layout, and state management across different module types.

## Key Features

### Shared Functionality

1. **Layout Structure**: Consistent header, configuration sections, handles, and meta information
2. **Event Handling**: Delete button, selection handling, configuration changes
3. **Pulse Animation**: Automatic trigger event animation for output modules
4. **Configuration Management**: Centralized config state with validation
5. **Instance Data Tracking**: Real-time data updates from WebSocket
6. **Drag/Drop Support**: ReactFlow integration for node positioning

### Architecture Components

#### `useBaseModuleNode` Hook
- Manages shared state (pulsing, selection)
- Provides event handlers (delete, select, manual trigger)
- Renders common UI elements (header, handles, meta)
- Handles pulse animation logic

#### `createModuleNode` HOC
- Creates functional components with shared functionality
- Manages configuration and instance data
- Provides customizable render functions
- Handles layout composition

## Usage

### Basic Module Node

```typescript
import { createModuleNode } from './BaseModuleNode';

const BasicNodeConfig = {
  enablePulseAnimation: true,
  defaultConfig: {},
  instanceDataKeys: [],
  renderConfig: (config, updateConfig) => {
    // Custom configuration UI
  },
  renderActions: (instance) => {
    // Custom action buttons
  }
};

const BasicNode = createModuleNode(BasicNodeConfig);
export default memo(BasicNode);
```

### Advanced Module Node

```typescript
const AdvancedNodeConfig = {
  enablePulseAnimation: true,
  pulseAnimationDuration: 600,
  defaultConfig: {
    mode: 'default',
    threshold: 100
  },
  validators: {
    threshold: (value) => Math.max(0, Math.min(1000, Number(value) || 0))
  },
  instanceDataKeys: ['status', 'count'],
  onManualTrigger: async (nodeId) => {
    await apiService.triggerModule(nodeId, { type: 'manual' });
  },
  renderConfig: (config, updateConfig) => {
    // Complex configuration UI
  },
  renderActions: (instance) => {
    // Multiple action buttons
  },
  renderInputHandles: (manifest, edges) => {
    // Custom input handle layout
  },
  renderOutputHandles: (manifest) => {
    // Custom output handle layout
  }
};
```

## Configuration Options

### `ModuleNodeConfig` Interface

```typescript
interface ModuleNodeConfig {
  // Animation settings
  enablePulseAnimation?: boolean;
  pulseAnimationDuration?: number;
  
  // Configuration management
  defaultConfig?: Record<string, any>;
  validators?: Record<string, (value: any) => any>;
  
  // Instance data tracking
  instanceDataKeys?: string[];
  
  // Custom event handlers
  onManualTrigger?: (nodeId: string) => Promise<void>;
  
  // Custom render functions
  renderHeader?: (moduleName: string, manifest: any) => React.ReactNode;
  renderConfig?: (config: any, updateConfig: (key: string, value: any) => void) => React.ReactNode;
  renderInputHandles?: (manifest: any, edges: any[]) => React.ReactNode;
  renderOutputHandles?: (manifest: any) => React.ReactNode;
  renderActions?: (instance: any) => React.ReactNode;
}
```

## Shared Layout Structure

All module nodes follow this consistent layout:

```
┌─────────────────────────────────┐
│ × Delete Button                 │
├─────────────────────────────────┤
│ Header (Name, Type, Description)│
├─────────────────────────────────┤
│ Configuration Section            │
│ (Mode, Settings, etc.)          │
├─────────────────────────────────┤
│ Actions Section                 │
│ (Trigger buttons, etc.)         │
├─────────────────────────────────┤
│ Handles (Input/Output)          │
├─────────────────────────────────┤
│ Meta (Version, Author)          │
└─────────────────────────────────┘
```

## Benefits

### Consistency
- All modules have the same visual structure
- Consistent behavior for common actions
- Unified styling and animations

### Maintainability
- Shared code reduces duplication
- Centralized updates affect all modules
- Easier to add new features

### Extensibility
- Easy to create new module types
- Customizable render functions
- Flexible configuration system

### Performance
- Optimized re-renders with memo
- Efficient state management
- Minimal bundle size impact

## Migration Guide

### From Custom Implementation

1. **Replace class component with functional component**
   ```typescript
   // Before
   class CustomNode extends React.Component {
     // Implementation
   }
   
   // After
   const CustomNode = createModuleNode(config);
   ```

2. **Extract configuration**
   ```typescript
   const config = {
     enablePulseAnimation: true,
     defaultConfig: { /* your defaults */ },
     renderConfig: (config, updateConfig) => {
       // Your config UI
     }
   };
   ```

3. **Remove duplicated code**
   - Delete manual header rendering
   - Remove manual handle rendering
   - Remove manual event handling
   - Remove manual state management

### Example Migration

```typescript
// Before: CustomNode.tsx (193 lines)
const CustomNode: React.FC<CustomNodeProps> = ({ data, selected, id }) => {
  // Manual state management
  const [isPulsing, setIsPulsing] = useState(false);
  
  // Manual event handling
  useEffect(() => {
    // Pulse animation logic
  }, [id]);
  
  // Manual layout rendering
  return (
    <div className={styles.node}>
      {/* Manual delete button */}
      {/* Manual header */}
      {/* Manual handles */}
      {/* Manual config */}
      {/* Manual meta */}
    </div>
  );
};

// After: CustomNode.tsx (50 lines)
const CustomNodeConfig = {
  enablePulseAnimation: true,
  defaultConfig: {},
  renderConfig: (config, updateConfig) => {
    // Only custom config UI
  }
};

const CustomNode = createModuleNode(CustomNodeConfig);
export default memo(CustomNode);
```

## Best Practices

1. **Use the base class for all new modules**
2. **Keep custom render functions focused on specific functionality**
3. **Leverage the configuration system for state management**
4. **Use validators for input validation**
5. **Enable pulse animation for output modules**
6. **Track instance data for real-time updates**

## Future Enhancements

- **Plugin System**: Allow third-party module types
- **Theme Support**: Customizable styling per module type
- **Advanced Animations**: More sophisticated trigger effects
- **Accessibility**: Enhanced keyboard navigation
- **Testing**: Comprehensive test coverage for shared functionality 