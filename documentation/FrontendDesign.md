# Frontend Design Document – Realtime Node-Based Interface

## 1. Product Vision
Create an intuitive, visually engaging, and highly-responsive web interface that enables end-users to orchestrate **modules** by visually connecting *input* nodes to *output* nodes in real time. The canvas should feel alive: smooth drag-and-drop, magnetic snapping, animated transitions, and live status indicators build confidence and delight.

## 2. User Personas & Primary Use-Cases
| Persona | Goals | Pain-points Solved |
| ------- | ----- | ------------------ |
| Integrator (Power User) | Quickly prototype data flows, test integrations, debug connections. | Avoid manual JSON edits; visualize data paths. |
| Creative Technologist | Experiment with audio/visual pipelines during live performances. | Needs low latency & immediate feedback. |
| Educator | Demonstrate signal processing concepts to students. | Requires clarity, undo, and sandbox safety. |

## 3. Core Interaction Model
1. **Module Palette** (dropdown / sidebar) lists available modules (fetched from `/api/modules`).
2. Selecting a module instantiates a **Node** on the **Canvas** at the cursor position.
3. **Ports** (input ⇢ left, output ⇢ right) appear on the node edge.
4. **Connections** are created by *click-drag* from an output port to a compatible input port; invalid targets are visually rejected.
5. Node selections open the **Inspector Panel** for module-specific configuration.
6. All actions propagate instantly to other clients via WebSocket events.

## 4. Visual & Motion Design
### 4.1 Aesthetic
• Flat, minimal UI with soft shadows and subtle gradients.  
• Color-coding by module type (e.g., blue = Input, green = Transform, orange = Output).  
• Dark theme first; light theme optional via CSS variables.

### 4.2 Animation Principles
| Interaction | Motion Spec | Purpose |
| ----------- | ---------- | ------- |
| Node spawn | Scale 0.8 → 1.0 & fade-in 150 ms | Reinforce creation |
| Drag | Node follows cursor @60 fps; ports glow | Convey liveness |
| Connection draw | Bézier line grows from source to cursor | Predict connection |
| Delete | Shrink & fade-out 120 ms | Closure |
All animations implemented with **Framer Motion** (prefers GPU transforms, accessibility respects `prefers-reduced-motion`).

## 5. Information Architecture
```
App (Provider)
├─ TopBar (controls, project ops)
├─ Main
│   ├─ ModulePalette ▸ searchable list / dropdown
│   ├─ Canvas
│   │   ├─ Node (draggable, selectable)
│   │   │   ├─ Port (Input / Output)
│   │   └─ Edge (SVG path)
│   └─ MiniMap (optional)
└─ InspectorPanel ▸ dynamic form
```

## 6. Technology Stack
| Concern | Library / Tech | Rationale |
| ------- | -------------- | --------- |
| Framework | **React 18** + **TypeScript** | Aligns with current repo, type-safe |
| Canvas & DnD | **React Flow** | Purpose-built for node editors, extensible |
| State Mgmt | **Zustand** + **Immer** | Lightweight, selector-based updates |
| Animations | **Framer Motion** | Declarative, layout transitions |
| Styling | **Tailwind CSS** w/ CSS Variables | Rapid prototyping, themeable |
| Real-time | **Socket.io client** | Mirrors backend event bus |
| Testing | **Vitest**, **React Testing Library** | Consistency with backend tests |

## 7. Data Model (Frontend)
```ts
interface UINode {
  id: string;
  moduleId: string;   // reference to backend module instance
  type: "input" | "output" | "transform";
  position: { x: number; y: number };
  ports: UIPort[];
}
interface UIPort {
  id: string;
  direction: "in" | "out";
  dataType: string;  // OSC, HTTP, etc.
}
interface UIEdge {
  id: string;
  from: { nodeId: string; portId: string };  // always an output
  to:   { nodeId: string; portId: string };  // always an input
}
```
The **store** keeps `{ nodes: Map<string,UINode>, edges: Map<string,UIEdge> }` with derived selectors for fast lookups.

## 8. Real-Time Synchronization Flow
1. Client dispatches optimistic action to add/move/connect node.
2. Emits `socket.emit("graph:update", diff)` to backend.
3. Backend validates, persists, then broadcasts `graph:state` diff to all clients.
4. Clients reconcile via `mergeGraphDiff()` ensuring eventual consistency.
Conflict resolution strategy: *last-writer-wins* timestamped events.

## 9. Performance & Scalability
• **Virtualization**: React Flow handles view-port culling; only visible nodes render.  
• **Batch Updates**: `requestAnimationFrame` batching for drag; websocket messages debounced 30 ms.  
• **Large Graphs**: Up to 2 k nodes, 10 k edges tested <16 ms frame.

## 10. Accessibility (A11y)
• Keyboard nav: `Tab` cycles nodes, `Enter` focuses ports, arrow keys nudge positions.  
• ARIA labels on nodes/ports.  
• High-contrast & reduced-motion modes.

## 11. Error Handling & Undo/Redo
Global `CommandStack` stores reversible actions (max 50).  
Visual toast alerts via **Sonner**; edges glow red on type mismatch.

## 12. Testing Strategy
1. **Unit**: Store reducers, utility fns.  
2. **Component**: Node, Edge, Inspector interactions via RTL + `@testing-library/user-event`.  
3. **E2E**: Playwright scenarios – add nodes, connect, reload, multi-client sync.

## 13. Deployment
Build via `vite build`; static assets served by backend Express.  
Feature flags via `.env`.  
CI runs `vitest`, `playwright test`, and `eslint --max-warnings 0`.

## 14. Open Questions
1. Should we support nested sub-graphs (groups)?
2. Need design tokens or existing brand palette?
3. Metrics & logging – integrate with backend stats?

---
*Document version*: 1.0 – 2025-07-26