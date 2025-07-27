# Frontend Redesign Specification – Interactor Node-Based Interface

## 1. Product Vision

Create an intuitive, visually engaging, and robust web interface that enables end-users to orchestrate **modules** by visually connecting nodes to build interaction graphs. The interface is focused on simplicity, reliability, and ease of use, with a minimal feature set and a custom look.

---

## 2. User Flow (End User Instructions)

1. **Open the application** in a web browser on the installation computer.
2. **View the node-based editor** showing all current interactions and modules as nodes.
3. **Drag modules from the sidebar** onto the canvas to create new nodes.
4. **Connect nodes** by dragging from output ports to input ports, supporting one-to-one, one-to-many, and many-to-one connections.
5. **Edit node properties** or adjust settings using the inspector or sidebar.
6. **Test outputs** by manually triggering them from the trigger panel.
7. **When ready, click the "Register" button** to send all changes to the backend.
8. **See feedback** (success or error) after registering changes.
9. **Repeat as needed** to further adjust the installation.

No changes are sent to the backend until "Register" is clicked, allowing the user to experiment and adjust freely before committing.

---

## 3. Core Features

### 3.1 Node-Based Editor

- Visual editor for creating, editing, and connecting nodes representing interactions and modules.
- Drag-and-drop module instantiation from the sidebar.
- Each node displays its properties and allows editing.
- Connections (edges) represent routes between nodes.
- Supports one-to-one, one-to-many, and many-to-one connections.

### 3.2 Manual State Sync

- All changes are local until the user clicks a **"Register"** button.
- On "Register", the entire interaction map (and optionally modules/routes/settings) is POSTed to the backend.
- UI should warn the user if the backend state has changed since last fetch (optional, but recommended).

### 3.3 Minimal API Usage

- Fetch all data on load:
  - `GET /api/interactions`
  - `GET /api/modules`
  - `GET /api/routes`
  - `GET /api/settings`
- Register all changes in one call:
  - `POST /api/interactions` (send full interaction map)
  - `POST /api/modules` (if modules are editable)
  - `POST /api/routes` (if routes are editable)
  - `POST /api/settings` (for settings)
- Manual triggers:
  - `POST /api/trigger` (to manually trigger outputs)

### 3.4 State Management

- Use React context or simple hooks (`useState`, `useReducer`) for local state.
- No undo/redo stack, no persistent local storage.
- All edits are local until "Register" is clicked.

### 3.5 Styling

- Use **CSS Modules** for all components.
- Provide a small set of utility classes for layout, spacing, and buttons.
- No Tailwind, Material UI, or runtime CSS-in-JS.
- Aim for a clean, modern, dark-themed look.

---

## 4. Component Structure

- **App**
  - Handles global state and API integration.
- **Sidebar**
  - Lists available modules as draggable cards.
- **NodeEditor**
  - Main canvas for nodes and connections.
  - Handles drag/drop, selection, and editing.
- **Node**
  - Represents an interaction or module.
  - Editable properties.
- **Toolbar**
  - Contains "Register" button and status indicators.
- **SettingsPanel**
  - Edit global settings.
- **TriggerPanel**
  - Manually trigger outputs for testing.

---

## 5. Drag and Drop Node Creation

- The sidebar displays a list of available modules as draggable cards.
- The user drags a module card from the sidebar and drops it onto the node editor canvas.
- A new node is created at the drop location, pre-filled with the module’s default properties.
- The node is rendered immediately and can be further edited or connected.
- No backend update occurs until the user clicks "Register".

**Technical Note:**  
Use a React drag-and-drop library such as [react-dnd](https://react-dnd.github.io/react-dnd/about) or [dnd-kit](https://dndkit.com/) for robust drag-and-drop support.

---

## 6. Interaction Types Supported

The node editor supports the following interaction types between nodes:

- **One-to-One:** A single output connects to a single input.
- **One-to-Many:** A single output connects to multiple inputs (one node can trigger several others).
- **Many-to-One:** Multiple outputs connect to a single input (multiple nodes can trigger the same node).

**Implementation:**

- Users can create multiple connections from one node to others and from many nodes to a single node.
- The UI visually displays all connections.
- The data model stores each connection as a route with `sourceNodeId` and `targetNodeId`.
- All connections are included in the routes array sent to the backend on "Register".

---

## 7. API Contract

- **GET /api/interactions**  
  Returns: `{ interactions: InteractionConfig[] }`
- **POST /api/interactions**  
  Body: `{ interactions: InteractionConfig[] }`
- **GET /api/modules**  
  Returns: `{ modules: ModuleConfig[] }`
- **POST /api/modules**  
  Body: `{ modules: ModuleConfig[] }`
- **GET /api/routes**  
  Returns: `{ routes: MessageRoute[] }`
- **POST /api/routes**  
  Body: `{ routes: MessageRoute[] }`
- **GET /api/settings**  
  Returns: `{ settings: Record<string, any> }`
- **POST /api/settings**  
  Body: `{ settings: Record<string, any> }`
- **POST /api/trigger**  
  Body: `{ outputId: string, payload?: any }`

---

## 8. Styling Guidelines

- Use CSS Modules for all components.
- Provide utility classes for:
  - Flex layouts
  - Spacing (gap, margin, padding)
  - Buttons (primary, secondary)
  - Node backgrounds and highlights
- Default to a dark theme with high-contrast text and controls.
- Keep the UI uncluttered and focused on the node editor.

---

## 9. Non-Goals

- No real-time collaboration or sync.
- No multi-user editing or authentication.
- No undo/redo or persistent local storage.
- No advanced analytics or dashboards.

---

## 10. Example Directory Structure

```
frontend/
  src/
    components/
      App.tsx
      Sidebar.tsx
      NodeEditor.tsx
      Node.tsx
      Toolbar.tsx
      SettingsPanel.tsx
      TriggerPanel.tsx
      ...
    styles/
      NodeEditor.module.css
      Node.module.css
      Toolbar.module.css
      ...
    api/
      index.ts
    types/
      index.ts
    utils/
      ...
  public/
  package.json
  ...
```

---

## 11. Development Notes

- Use React (with TypeScript) for all components.
- Use fetch or axios for API calls.
- Keep all state in memory; do not persist to local storage.
- Use functional components and hooks.
- Keep code modular and easy to extend.

---

## 12. Deliverables

- Node-based editor UI as described above.
- CSS Modules for all styling.
- API integration as specified.
- Clear, minimal, and maintainable codebase.
