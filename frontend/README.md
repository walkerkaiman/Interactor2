# Interactor Frontend

A React-based node editor interface for the Interactor V2 system. This frontend provides a visual, drag-and-drop interface for creating and managing module interactions.

## Features

- **Node-Based Editor**: Visual editor for creating and connecting modules
- **Drag & Drop**: Drag modules from the sidebar onto the canvas
- **Real-time Connections**: Connect nodes with visual edges
- **Manual State Sync**: All changes are local until "Register" is clicked
- **Dark Theme**: Modern, clean dark interface
- **Module Management**: View and configure available modules
- **Manual Triggering**: Test outputs manually
- **Settings Panel**: Edit global system settings

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000` and will proxy API requests to the backend at `http://localhost:3001`.

### Build

To build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory, which the backend will serve.

## Architecture

### Components

- **App**: Main application orchestrator
- **Sidebar**: Module library with drag-and-drop
- **NodeEditor**: ReactFlow-based node editor
- **CustomNode**: Individual node component
- **Toolbar**: Main controls and Register button
- **SettingsPanel**: Global settings editor
- **TriggerPanel**: Manual output triggering
- **Notification**: Success/error messages

### State Management

- Uses React hooks for local state
- No external state management library
- All changes are local until "Register" is clicked
- API service handles backend communication

### Styling

- CSS Modules for component-scoped styles
- Dark theme with high contrast
- Responsive design
- Custom ReactFlow styling

## API Integration

The frontend communicates with the backend through the following endpoints:

- `GET /api/modules` - Get available modules
- `GET /api/interactions` - Get current interactions
- `POST /api/interactions/register` - Register interaction changes
- `POST /api/trigger/:moduleId` - Manually trigger a module
- `GET /api/settings` - Get system settings
- `PUT /api/settings/:key` - Update a setting

## Usage

1. **Add Modules**: Drag modules from the sidebar onto the canvas
2. **Connect Nodes**: Drag from output handles to input handles
3. **Configure**: Click nodes to view and edit their configuration
4. **Test**: Use the trigger panel to manually test outputs
5. **Register**: Click "Register" to send changes to the backend

## Development Notes

- Built with React 18 and TypeScript
- Uses ReactFlow for the node editor
- CSS Modules for styling
- Vite for build tooling
- Proxy configuration for development 