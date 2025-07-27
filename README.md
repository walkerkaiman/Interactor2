# Interactor2 - Simplified Headless Service

Interactor2 is a simplified, headless singleton service for building interactive art installations. It provides a streamlined architecture focused on module-based interactions with minimal complexity.

## Architecture Overview

### Backend (Headless Singleton)
- **Single Process**: Runs as a single Node.js process
- **Singleton Services**: Core services (Logger, MessageRouter, ModuleLoader, StateManager, SystemStats) are true singletons
- **Stateless API**: REST API for configuration and state management
- **Atomic Updates**: Full interaction map replacement via `/api/interactions/register`
- **No Real-time Sync**: Manual "Register" button for state persistence

### Frontend (Node Editor)
- **React-Based**: Modern React 18 with TypeScript
- **Node Editor**: Visual drag-and-drop interface using ReactFlow
- **Dark Theme**: Clean, modern dark interface
- **Manual Sync**: All changes local until "Register" is clicked
- **REST API**: No WebSocket, simple HTTP communication

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Start

1. **Simple Start (Recommended)**
   ```bash
   # Windows
   start-simple.bat
   
   # Or manually:
   cd backend && npm install
   cd ../frontend && npm install && npm run build
   cd ../backend && npm start
   ```

2. **Development Mode**
   ```bash
   # Windows (Recommended)
   start-full-dev.bat
   
   # Or manually:
   # Terminal 1: Backend
   cd backend
   npm install
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm install
   npm run dev
   ```

3. **Access the Application**
   - Backend API: http://localhost:3001
   - Frontend UI: http://localhost:3000 (development mode)
   - Production: http://localhost:3001 (serves built frontend)
   - Use the node editor to create interactions
   - Click "Register" to save to backend

## API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `GET /api/stats` - System statistics
- `GET /api/modules` - List available modules
- `GET /api/interactions` - Get current interactions
- `POST /api/interactions/register` - Register full interaction map
- `POST /api/trigger/:moduleId` - Manually trigger module
- `GET /api/settings` - Get system settings
- `PUT /api/settings/:key` - Update setting

## Module System

### Available Modules
- **Input Modules**: frames_input, http_input, osc_input, serial_input, time_input
- **Output Modules**: audio_output, dmx_output, http_output, osc_output

### Module Structure
```
modules/
├── input/
│   ├── frames_input/
│   ├── http_input/
│   ├── osc_input/
│   ├── serial_input/
│   └── time_input/
└── output/
    ├── audio_output/
    ├── dmx_output/
    ├── http_output/
    └── osc_output/
```

## Usage

### Creating Interactions
1. **Add Modules**: Drag modules from the sidebar to the canvas
2. **Connect Nodes**: Draw connections between input/output handles
3. **Configure Modules**: Click nodes to view and edit configuration
4. **Test Outputs**: Use the trigger panel to manually test outputs
5. **Register**: Click "Register" to save the interaction map to backend

### Manual Triggering
- Use `POST /api/trigger/:moduleId` to manually trigger output modules
- Useful for testing and manual control

## Configuration

### Backend Configuration
```json
{
  "server": {
    "port": 3001,
    "host": "localhost"
  },
  "logging": {
    "level": "info",
    "file": "logs/interactor.log"
  },
  "modules": {
    "autoLoad": true
  }
}
```

### State Persistence
- Interactions are stored in `backend/data/state.json`
- Single file storage for simplicity
- Atomic updates replace entire state

## Development

### Project Structure
```
Interactor2/
├── backend/           # Headless singleton service
│   ├── src/
│   │   ├── core/     # Singleton services
│   │   ├── modules/  # Module implementations
│   │   └── index.ts  # Main server
│   └── data/         # State persistence
├── frontend/         # React-based node editor UI
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── api/         # API service
│   │   └── types/       # TypeScript types
│   └── dist/         # Built frontend (served by backend)
└── shared/           # Shared types
```

### Key Simplifications
- **No WebSocket**: REST-only communication
- **No Hot Reloading**: Modules loaded once at startup
- **No Multi-tenancy**: Single instance architecture
- **No Real-time Sync**: Manual registration
- **No Auto-save**: Explicit save via Register button
- **No Backup System**: Simple file-based storage

## Troubleshooting

### Common Issues
1. **Port 3001 in use**: Change port in `backend/config/system.json`
2. **Module not found**: Check module manifests in `backend/src/modules/`
3. **Registration fails**: Check backend logs in `backend/logs/`

### Logs
- Backend logs: `backend/logs/interactor.log`
- Console output for real-time debugging

## License

MIT License - see LICENSE file for details. 