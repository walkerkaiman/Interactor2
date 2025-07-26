# Frontend Development Specification – Interactor Node-Based Interface

## 1. Product Vision
Create an intuitive, visually engaging, and highly-responsive web interface that enables end-users to orchestrate **modules** by visually connecting *input* nodes to *output* nodes in real time. The interface provides four main tabs for different aspects of system monitoring and control: **Wiki**, **Module Editor**, **Console**, and **Performance Dashboard**.

## 2. User Personas & Primary Use-Cases
| Persona | Goals | Pain-points Solved |
| ------- | ----- | ------------------ |
| Integrator (Power User) | Quickly prototype data flows, test integrations, debug connections. | Avoid manual JSON edits; visualize data paths. |
| Creative Technologist | Experiment with audio/visual pipelines during live performances. | Needs low latency & immediate feedback. |
| Educator | Demonstrate signal processing concepts to students. | Requires clarity, undo, and sandbox safety. |
| System Administrator | Monitor system health, manage modules, troubleshoot issues. | Real-time monitoring and centralized control. |

## 3. Application Architecture & Navigation

### 3.1 Tab-Based Navigation Structure
The application uses a tab-based interface with four main sections:

#### 3.1.1 Wiki Tab
- **Purpose**: Documentation and module reference
- **Content**: 
  - Module documentation grid
  - Usage tutorials and best practices
  - Searchable module library
- **Data Source**: `backend/src/modules` endpoint for module manifests

#### 3.1.2 Module Editor Tab (Node Editor)
- **Purpose**: Visual node-based module configuration and connection
- **Features**:
  - Drag-and-drop module instantiation
  - Visual connection management
  - Real-time configuration editing
  - Module state monitoring
  - Publish Button to send updates to backend
  - Updates with change to backend interactions
- **Data Sources**: 
  - `/api/modules` for available modules
  - `/api/module-instances` for current instances
  - `/api/routes` for connections
  - WebSocket for real-time updates

#### 3.1.3 Console Tab
- **Purpose**: Real-time log monitoring and system debugging
- **Features**:
  - Live log streaming with filtering
  - Log level filtering 
  - Search and copy capabilities
  - Module-specific log filtering
- **Data Sources**:
  - `/api/logs` for historical logs
  - WebSocket for real-time log streaming

#### 3.1.4 Performance Dashboard Tab
- **Purpose**: System health monitoring and performance metrics
- **Features**:
  - Real-time system statistics
  - CPU and memory usage graphs
  - Module performance metrics
  - Message routing statistics
  - System health indicators
- **Data Sources**:
  - `/api/stats` for system statistics
  - `/api/system` for detailed system info
  - WebSocket for real-time updates

## 4. Core Interaction Model

### 4.1 Module Editor (Node Editor) Workflow
1. **Module Palette** (sidebar) lists available modules (fetched from `/api/modules`).
2. Selecting a module via dropdown instantiates a **Node** on the **Canvas**.
3. **Ports** (input ⇢ left, output ⇢ right) appear on the node edge based on module manifest events. Ports that are not used by a module will be hidden by default.
4. **Connections** are created by *click-drag* from an input port to a compatible output port.
5. Node selections open the **Inspector Panel** for module-specific configuration.
6. All changes to the interactions will only exist in the GUI until a "Publish" button is pressed. The new interaction map will then be sent to the backend who will update all connected GUI web clients. 

### 4.2 Tab Navigation
- **Tab Switching**: Smooth transitions between tabs with state preservation
- **Global State**: Shared state across tabs (selected modules, system status)
- **Real-time Updates**: All tabs receive WebSocket updates for relevant data
- **Persistence**: Tab states and setting will persist in memory while navigating between tabs. It is not needed to persist after close or on load.

## 5. Visual & Motion Design

### 5.1 Aesthetic
• Flat, minimal UI with soft shadows and subtle gradients.  
• Color-coding by module type. The Chord connecting input and output module will be green if a trigger and blue if it's a streaming connection.  
• Dark theme first;

### 5.2 Animation Principles
| Interaction | Motion Spec | Purpose |
| ----------- | ---------- | ------- |
| Tab switching | Slide transition 200ms ease-out | Smooth navigation |
| Node spawn | Scale 0.8 → 1.0 & fade-in 150 ms | Reinforce creation |
| Drag | Node follows cursor @60 fps; ports glow | Convey liveness |
| Connection draw | Bézier line grows from source to cursor | Predict connection |
| Delete | Shrink & fade-out 120 ms | Closure |
| Log entry | Slide in from right 100ms | Real-time feedback |

All animations implemented with **Framer Motion** (prefers GPU transforms, accessibility respects `prefers-reduced-motion`).

## 6. Information Architecture
```
App (Provider)
├─ TopBar (tab navigation, system status, user controls)
├─ Main Content Area
│   ├─ Wiki Tab
│   │   ├─ ModuleLibrary (searchable grid/list)
│   │   ├─ ModuleDocumentation (markdown renderer)
│   │   └─ SearchPanel (filters, categories)
│   ├─ Module Editor Tab
│   │   ├─ ModulePalette ▸ searchable list / dropdown
│   │   ├─ Canvas
│   │   │   ├─ Node (draggable, selectable)
│   │   │   │   ├─ Port (Input / Output)
│   │   │   └─ Edge (SVG path)
│   │   ├─ InspectorPanel ▸ dynamic form
│   │   └─ MiniMap (optional)
│   ├─ Console Tab
│   │   ├─ LogViewer (virtualized list)
│   │   ├─ LogFilters (level, module, search)
│   │   ├─ LogControls (clear, export, pause)
│   └─ Performance Dashboard Tab
│       ├─ SystemOverview (cards with key metrics)
│       ├─ PerformanceCharts (CPU, memory, messages)
│       ├─ ModuleStatus (active/inactive modules)
│       └─ HealthIndicators (status lights, alerts, heartbeat)
└─ GlobalState (Zustand store)
```

## 7. Technology Stack
| Concern | Library / Tech | Rationale |
| ------- | -------------- | --------- |
| Framework | **React 18** + **TypeScript** | Aligns with current repo, type-safe |
| Canvas & DnD | **React Flow** | Purpose-built for node editors, extensible |
| State Mgmt | **Zustand** + **Immer** | Lightweight, selector-based updates |
| Animations | **Framer Motion** | Declarative, layout transitions |
| Styling | **Tailwind CSS** w/ CSS Variables | Rapid prototyping, themeable |
| Real-time | **Native WebSocket (browser)** | Directly connects to backend WS server |
| HTTP Client | **Axios** | Type-safe API calls with interceptors |
| Markdown | **React Markdown** | Wiki documentation rendering |
| Charts | **Recharts** | Performance dashboard visualizations |
| Virtualization | **React Window** | Console log performance |
| Testing | **Vitest**, **React Testing Library** | Consistency with backend tests |

## 8. Data Model (Frontend)

### 8.1 Core Types (from shared package)
```typescript
// Module and Instance Types
interface ModuleManifest {
  name: string;
  type: 'input' | 'output';
  version: string;
  description: string;
  author: string;
  configSchema: ConfigSchema;
  events: EventDefinition[];
  assets?: AssetReference[];
}

interface ModuleInstance {
  id: string;
  moduleName: string;
  config: ModuleConfig;
  position?: { x: number; y: number };
}

// Message Routing
interface MessageRoute {
  id: string;
  source: string;
  target: string;
  event: string;
  transform?: (payload: any) => any;
  conditions?: RouteCondition[];
}

// System Statistics
interface SystemStats {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  modules: {
    total: number;
    active: number;
    errors: number;
  };
  messages: {
    sent: number;
    received: number;
    errors: number;
  };
}

// Logging
interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  module?: string;
  message: string;
  metadata?: Record<string, any>;
}
```

### 8.2 Frontend-Specific Types
```typescript
// UI State Types
interface UINode {
  id: string;
  moduleId: string;   // reference to backend module instance
  type: "input" | "output" | "transform";
  position: { x: number; y: number };
  ports: UIPort[];
  status: 'active' | 'inactive' | 'error';
}

interface UIPort {
  id: string;
  direction: "in" | "out";
  dataType: string;  // OSC, HTTP, etc.
  connected: boolean;
}

interface UIEdge {
  id: string;
  from: { nodeId: string; portId: string };  // always an output
  to:   { nodeId: string; portId: string };  // always an input
}

// Tab State
interface TabState {
  activeTab: 'wiki' | 'editor' | 'console' | 'dashboard';
  tabData: {
    wiki: { selectedModule?: string; searchQuery?: string };
    editor: { selectedNode?: string; canvasPosition: { x: number; y: number } };
    console: { filters: LogFilters; paused: boolean };
    dashboard: { timeRange: string; refreshInterval: number };
  };
}

// Log Filters
interface LogFilters {
  levels: ('debug' | 'info' | 'warn' | 'error')[];
  modules: string[];
  searchQuery: string;
  timeRange: '1h' | '6h' | '24h' | '7d' | 'all';
}
```

### 8.3 Zustand Store Structure
```typescript
interface AppState {
  // Core data
  modules: Map<string, ModuleManifest>;
  moduleInstances: Map<string, ModuleInstance>;
  routes: Map<string, MessageRoute>;
  systemStats: SystemStats | null;
  logs: LogEntry[];
  
  // UI state
  ui: {
    nodes: Map<string, UINode>;
    edges: Map<string, UIEdge>;
    selectedNode: string | null;
    selectedTab: TabState['activeTab'];
    tabData: TabState['tabData'];
  };
  
  // Connection state
  connection: {
    connected: boolean;
    lastPing: number;
    reconnectAttempts: number;
  };
  
  // Actions
  actions: {
    // Module management
    loadModules: () => Promise<void>;
    createModuleInstance: (moduleName: string, config: ModuleConfig, position: { x: number; y: number }) => Promise<void>;
    updateModuleInstance: (id: string, config: ModuleConfig) => Promise<void>;
    deleteModuleInstance: (id: string) => Promise<void>;
    
    // Connection management
    createConnection: (from: { nodeId: string; portId: string }, to: { nodeId: string; portId: string }) => Promise<void>;
    deleteConnection: (edgeId: string) => Promise<void>;
    
    // UI actions
    selectNode: (nodeId: string | null) => void;
    updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
    switchTab: (tab: TabState['activeTab']) => void;
    
    // Console actions
    setLogFilters: (filters: Partial<LogFilters>) => void;
    clearLogs: () => void;
    pauseLogs: (paused: boolean) => void;
  };
}
```

## 9. Backend API Integration

### 9.1 REST API Endpoints (Validated from backend/src/index.ts)

#### 9.1.1 Module Management
| Method | Path | Purpose | Request Body | Response |
| ------ | ---- | ------- | ------------ | -------- |
| GET | `/api/modules` | Fetch all available module manifests | - | `{ success: boolean, data: ModuleListResponse }` |
| GET | `/api/modules/:name` | Fetch specific module manifest | - | `{ success: boolean, data: ModuleManifest }` |
| GET | `/api/module-instances` | Get all module instances | - | `{ success: boolean, data: ModuleInstance[] }` |
| GET | `/api/module-instances/:id` | Get specific module instance | - | `{ success: boolean, data: ModuleInstance }` |
| POST | `/api/module-instances` | Create new module instance | `{ moduleName, config, position }` | `{ success: boolean, data: ModuleInstance }` |
| DELETE | `/api/module-instances/:id` | Remove module instance | - | `{ success: boolean }` |
| POST | `/api/module-instances/:id/start` | Start module instance | - | `{ success: boolean }` |
| POST | `/api/module-instances/:id/stop` | Stop module instance | - | `{ success: boolean }` |
| POST | `/api/module-instances/:id/trigger` | Manually trigger output module | - | `{ success: boolean }` |

#### 9.1.2 Message Routing
| Method | Path | Purpose | Request Body | Response |
| ------ | ---- | ------- | ------------ | -------- |
| GET | `/api/routes` | Get all message routes | - | `{ success: boolean, data: MessageRoute[] }` |
| POST | `/api/routes` | Create new route | `MessageRoute` | `{ success: boolean, data: MessageRoute }` |
| DELETE | `/api/routes/:id` | Delete route | - | `{ success: boolean }` |

#### 9.1.3 Interaction Management
| Method | Path | Purpose | Request Body | Response |
| ------ | ---- | ------- | ------------ | -------- |
| GET | `/api/interactions` | Get all interactions | - | `{ success: boolean, data: InteractionConfig[] }` |
| POST | `/api/interactions` | Create new interaction | `InteractionConfig` | `{ success: boolean, data: InteractionConfig }` |
| PUT | `/api/interactions/:id` | Update interaction | `InteractionConfig` | `{ success: boolean, data: InteractionConfig }` |
| DELETE | `/api/interactions/:id` | Remove interaction | - | `{ success: boolean }` |

#### 9.1.4 System Monitoring
| Method | Path | Purpose | Request Body | Response |
| ------ | ---- | ------- | ------------ | -------- |
| GET | `/api/stats` | Get system statistics | - | `{ success: boolean, data: SystemStats }` |
| GET | `/api/system` | Get detailed system info | - | `{ success: boolean, data: DetailedSystemInfo }` |
| GET | `/api/logs` | Get recent logs | `?count=100` | `{ success: boolean, data: LogEntry[] }` |
| GET | `/health` | Health check | - | `{ status: string, uptime: string, timestamp: number }` |

#### 9.1.5 Settings Management
| Method | Path | Purpose | Request Body | Response |
| ------ | ---- | ------- | ------------ | -------- |
| GET | `/api/settings` | Get all settings | - | `{ success: boolean, data: Record<string, any> }` |
| PUT | `/api/settings/:key` | Update setting | `{ value: any }` | `{ success: boolean }` |

### 9.2 WebSocket Events (Validated from backend/src/index.ts)

#### 9.2.1 Connection Setup
- **URL**: `ws://<host>:<port>` (same as REST server)
- **Initial Message**: Server sends `init` event with complete state
- **Heartbeat**: Client sends `ping` every 30s, server responds with `pong`

#### 9.2.2 Server → Client Events
| Event Type | Data Payload | Usage |
| ---------- | ------------ | ----- |
| `init` | `{ stats, interactions, routes, modules }` | Initial state hydration |
| `stats` | `SystemStats` | Real-time system statistics |
| `stateChanged` | `{ interactions, routes }` | Graph updates after CRUD operations |
| `moduleLoaded` | `ModuleManifest` | New module available |
| `messageRouted` | `Message` | Debug overlay for message routing |
| `log` | `LogEntry` | Real-time stream (single entry) |
| `logs` | `LogEntry[]` | Bulk log list (response to `getLogs`) |
| `manualTriggerResponse` | `{ moduleId, success, error? }` | Trigger confirmation |

#### 9.2.3 Client → Server Events
| Event Type | Data Payload | Purpose |
| ---------- | ------------ | ------- |
| `getStats` | - | Request latest statistics |
| `getLogs` | `{ count: number }` | Request recent logs |
| `manualTrigger` | `{ moduleId: string }` | Trigger output module |

### 9.3 API Response Format
All REST endpoints return the standardized format:
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

## 10. Component Architecture

### 10.1 Core Components

#### 10.1.1 App Layout
```typescript
// App.tsx
interface AppProps {
  // No props needed, uses global state
}

const App: React.FC<AppProps> = () => {
  const { activeTab, connection } = useAppStore();
  
  return (
    <div className="app">
      <TopBar />
      <main className="main-content">
        {activeTab === 'wiki' && <WikiTab />}
        {activeTab === 'editor' && <ModuleEditorTab />}
        {activeTab === 'console' && <ConsoleTab />}
        {activeTab === 'dashboard' && <PerformanceDashboardTab />}
      </main>
      <ConnectionStatus connected={connection.connected} />
    </div>
  );
};
```

#### 10.1.2 Tab Components
```typescript
// WikiTab.tsx
const WikiTab: React.FC = () => {
  const { modules, selectedModule } = useAppStore();
  
  return (
    <div className="wiki-tab">
      <ModuleLibrary modules={Array.from(modules.values())} />
      {selectedModule && <ModuleDocumentation module={modules.get(selectedModule)} />}
    </div>
  );
};

// ModuleEditorTab.tsx
const ModuleEditorTab: React.FC = () => {
  const { nodes, edges, selectedNode } = useAppStore();
  
  return (
    <div className="module-editor-tab">
      <ModulePalette />
      <Canvas nodes={Array.from(nodes.values())} edges={Array.from(edges.values())} />
      {selectedNode && <InspectorPanel nodeId={selectedNode} />}
    </div>
  );
};

// ConsoleTab.tsx
const ConsoleTab: React.FC = () => {
  const { logs, filters } = useAppStore();
  
  return (
    <div className="console-tab">
      <LogFilters filters={filters} />
      <LogViewer logs={logs} />
      <LogControls />
    </div>
  );
};

// PerformanceDashboardTab.tsx
const PerformanceDashboardTab: React.FC = () => {
  const { systemStats } = useAppStore();
  
  return (
    <div className="performance-dashboard-tab">
      <SystemOverview stats={systemStats} />
      <PerformanceCharts stats={systemStats} />
      <ModuleStatus />
    </div>
  );
};
```

### 10.2 Node Editor Components (React Flow Integration)

#### 10.2.1 Custom Node Component
```typescript
// CustomNode.tsx
interface CustomNodeProps {
  id: string;
  data: {
    moduleName: string;
    config: ModuleConfig;
    manifest: ModuleManifest;
    status: 'active' | 'inactive' | 'error';
  };
  selected: boolean;
}

const CustomNode: React.FC<CustomNodeProps> = ({ id, data, selected }) => {
  const { manifest, status } = data;
  const { updateNodePosition, selectNode } = useAppStore();
  
  return (
    <div className={`custom-node ${status} ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <span className="node-title">{manifest.name}</span>
        <StatusIndicator status={status} />
      </div>
      <div className="node-ports">
        {manifest.events
          .filter(event => event.type === 'input')
          .map(event => (
            <Handle
              key={event.name}
              type="target"
              position={Position.Left}
              id={event.name}
              className="port-input"
            />
          ))}
        {manifest.events
          .filter(event => event.type === 'output')
          .map(event => (
            <Handle
              key={event.name}
              type="source"
              position={Position.Right}
              id={event.name}
              className="port-output"
            />
          ))}
      </div>
    </div>
  );
};
```

#### 10.2.2 Canvas Component
```typescript
// Canvas.tsx
const Canvas: React.FC = () => {
  const { nodes, edges, createConnection, deleteConnection } = useAppStore();
  
  const onConnect = useCallback((params: Connection) => {
    createConnection(
      { nodeId: params.source!, portId: params.sourceHandle! },
      { nodeId: params.target!, portId: params.targetHandle! }
    );
  }, [createConnection]);
  
  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    edgesToDelete.forEach(edge => deleteConnection(edge.id));
  }, [deleteConnection]);
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onConnect={onConnect}
      onEdgesDelete={onEdgesDelete}
      nodeTypes={{ custom: CustomNode }}
      fitView
    />
  );
};
```

## 11. Real-Time Synchronization Flow

### 11.1 WebSocket Connection Management
```typescript
// useWebSocket.ts
export const useWebSocket = () => {
  const { setConnectionStatus, updateStats, updateLogs } = useAppStore();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}`);
    
    ws.onopen = () => {
      setConnectionStatus(true);
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'init':
          // Hydrate store with initial state
          break;
        case 'stats':
          updateStats(message.data);
          break;
        case 'log':
          updateLogs([message.data]);
          break;
        case 'logs':
          updateLogs(message.data);
          break;
        case 'stateChanged':
          // Update graph state
          break;
      }
    };
    
    ws.onclose = () => {
      setConnectionStatus(false);
      // Implement reconnection logic
    };
    
    setSocket(ws);
    
    return () => {
      ws.close();
    };
  }, []);
  
  return socket;
};
```

### 11.2 Optimistic Updates
1. Client dispatches optimistic action to add/move/connect node
2. UI updates immediately for responsive feel
3. API call made to backend
4. WebSocket confirmation received
5. If conflict, reconcile with server state

## 12. Performance & Scalability

### 12.1 Optimization Strategies
• **Virtualization**: React Window for log viewer (handles 10k+ log entries)
• **Memoization**: React.memo for expensive components, useMemo for derived data
• **Batch Updates**: requestAnimationFrame batching for drag operations
• **Debouncing**: WebSocket messages debounced 30ms
• **Lazy Loading**: Tab content loaded on demand

### 12.2 Performance Targets
• **Large Graphs**: Up to 2k nodes, 10k edges < 16ms frame time
• **Log Streaming**: 1000+ log entries/second without lag
• **Real-time Updates**: < 100ms latency for WebSocket events
• **Initial Load**: < 2s for complete application hydration

## 13. Error Handling & User Feedback

### 13.1 Error Boundaries
```typescript
// ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 13.2 Toast Notifications
Using **Sonner** for toast notifications:
- Success: Module created, connection established
- Error: API failures, validation errors
- Warning: Connection issues, performance warnings
- Info: System status updates

### 13.3 Loading States
- Skeleton screens for initial load
- Spinner overlays for async operations
- Progressive loading for large datasets

## 14. Accessibility (A11y)

### 14.1 Keyboard Navigation
- `Tab`: Cycle through interactive elements
- `Enter/Space`: Activate buttons, select nodes
- `Arrow Keys`: Nudge node positions, navigate tabs
- `Escape`: Close modals, deselect nodes
- `Ctrl+Z/Ctrl+Y`: Undo/Redo operations

### 14.2 Screen Reader Support
- ARIA labels on all interactive elements
- Live regions for real-time updates
- Semantic HTML structure
- Focus management for modals and dialogs

### 14.3 Visual Accessibility
- High contrast mode support
- Reduced motion preferences respected
- Color-blind friendly palette
- Scalable UI (up to 200% zoom)

## 15. Testing Strategy

### 15.1 Unit Tests
```typescript
// store.test.ts
describe('App Store', () => {
  test('should create module instance', async () => {
    const store = createAppStore();
    await store.actions.createModuleInstance('http_input', {}, { x: 0, y: 0 });
    expect(store.getState().moduleInstances.size).toBe(1);
  });
});
```

### 15.2 Component Tests
```typescript
// CustomNode.test.tsx
describe('CustomNode', () => {
  test('should render module ports correctly', () => {
    render(<CustomNode id="test" data={mockNodeData} selected={false} />);
    expect(screen.getByText('HTTP Input')).toBeInTheDocument();
    expect(screen.getAllByTestId('port')).toHaveLength(3); // 1 input, 2 outputs
  });
});
```

### 15.3 Integration Tests
```typescript
// api.test.ts
describe('API Integration', () => {
  test('should fetch modules from backend', async () => {
    const modules = await api.getModules();
    expect(modules).toContainEqual(
      expect.objectContaining({ name: 'HTTP Input' })
    );
  });
});
```

### 15.4 E2E Tests (Playwright)
```typescript
// module-editor.spec.ts
test('should create and connect modules', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="editor-tab"]');
  await page.dragAndDrop('[data-testid="http-input-module"]', '.canvas');
  await page.dragAndDrop('[data-testid="http-output-module"]', '.canvas');
  // Test connection creation
});
```

## 16. Development Setup

### 16.1 Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── TopBar.tsx
│   │   │   ├── ConnectionStatus.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── tabs/
│   │   │   ├── WikiTab.tsx
│   │   │   ├── ModuleEditorTab.tsx
│   │   │   ├── ConsoleTab.tsx
│   │   │   └── PerformanceDashboardTab.tsx
│   │   ├── nodes/
│   │   │   ├── CustomNode.tsx
│   │   │   ├── NodeInspector.tsx
│   │   │   └── ModulePalette.tsx
│   │   └── dashboard/
│   │       ├── SystemOverview.tsx
│   │       ├── PerformanceCharts.tsx
│   │       └── ModuleStatus.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useApi.ts
│   │   └── useAppStore.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── slices/
│   │   │   ├── modulesSlice.ts
│   │   │   ├── uiSlice.ts
│   │   │   └── connectionSlice.ts
│   │   └── middleware/
│   ├── services/
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   └── validation.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── ui.ts
│   │   └── store.ts
│   └── App.tsx
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### 16.2 Package.json Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-flow-renderer": "^11.10.1",
    "zustand": "^4.4.7",
    "immer": "^10.0.3",
    "framer-motion": "^10.16.16",
    "axios": "^1.6.2",
    "react-markdown": "^9.0.1",
    "recharts": "^2.8.0",
    "react-window": "^1.8.8",
    "sonner": "^1.2.4",
    "@interactor/shared": "^1.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.10",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "vitest": "^1.0.4",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@playwright/test": "^1.40.1"
  }
}
```

### 16.3 Environment Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
});
```

## 17. Deployment

### 17.1 Build Process
```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### 17.2 Static Asset Serving
- Backend serves frontend static assets from `/dist` directory
- All routes fallback to `index.html` for SPA routing
- Assets cached with appropriate headers

### 17.3 Environment Variables
```env
# .env.development
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_ENABLE_LOGGING=true

# .env.production
VITE_API_BASE_URL=https://api.interactor.com
VITE_WS_URL=wss://api.interactor.com
VITE_ENABLE_LOGGING=false
```