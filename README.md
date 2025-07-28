# Interactor - Simplified Headless Service

Interactor is a simplified, headless singleton service for building interactive art installations. It provides a streamlined architecture focused on module-based interactions with minimal complexity.

## Architecture Overview

### Backend (Headless Singleton)
- **Single Process**: Runs as a single Node.js process
- **Singleton Services**: Core services (Logger, MessageRouter, ModuleLoader, StateManager, SystemStats) are true singletons
- **Stateless API**: REST API for configuration and state management
- **Atomic Updates**: Full interaction map replacement via `/api/interactions/register`
- **Real-time Updates**: WebSocket communication for live data synchronization

### Frontend (Node Editor)
- **React-Based**: Modern React 18 with TypeScript
- **Node Editor**: Visual drag-and-drop interface using ReactFlow
- **Dark Theme**: Clean, modern dark interface
- **Real-time Sync**: WebSocket updates for live data
- **REST API**: HTTP communication for configuration

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

## Time Input Module

The Time Input module is a versatile timing component that provides two distinct operating modes for triggering events based on time.

### Features

#### Clock Mode
- **Target Time Triggering**: Triggers at a specific time of day
- **12-Hour Format**: Accepts times like "2:30 PM", "12:00 AM"
- **Daily Reset**: Automatically resets for the next day after triggering
- **Real-time Countdown**: Shows countdown to target time
- **Current Time Display**: Live clock showing current time

#### Metronome Mode
- **Interval-based Triggering**: Triggers at regular intervals
- **Configurable Delay**: 100ms to 60,000ms (1 minute) intervals
- **Visual Countdown**: Dynamic countdown timer showing seconds remaining
- **Continuous Operation**: Runs continuously until stopped

#### Real-time Features
- **Live Updates**: Current time and countdown update in real-time
- **WebSocket Integration**: Real-time data synchronization
- **State Persistence**: Maintains state across browser refreshes
- **Manual Trigger**: Manual trigger capability for testing

### Configuration Options

#### Basic Configuration
```json
{
  "mode": "clock",                    // "clock" or "metronome"
  "targetTime": "2:30 PM",           // Clock mode: target time (12-hour format)
  "millisecondDelay": 1000,          // Metronome mode: interval in milliseconds
  "enabled": true                     // Enable/disable the module
}
```

#### Advanced Configuration
```json
{
  "mode": "metronome",
  "millisecondDelay": 3000,          // 3-second intervals
  "enabled": true,
  "apiEnabled": false,               // WebSocket API integration
  "apiEndpoint": "wss://api.example.com/time"  // External time API
}
```

### Usage Examples

#### Clock Mode - Daily Alarm
```json
{
  "mode": "clock",
  "targetTime": "9:00 AM",
  "enabled": true
}
```
- Triggers every day at 9:00 AM
- Shows countdown to next occurrence
- Perfect for daily events or reminders

#### Metronome Mode - Regular Pulses
```json
{
  "mode": "metronome",
  "millisecondDelay": 5000,
  "enabled": true
}
```
- Triggers every 5 seconds
- Shows dynamic countdown timer
- Ideal for rhythmic events or regular updates

#### Manual Trigger
```bash
# Trigger the module manually
curl -X POST http://localhost:3001/api/trigger/node-123 \
  -H "Content-Type: application/json" \
  -d '{"type": "manualTrigger"}'
```

### UI Features

#### Real-time Display
- **Current Time**: Live clock showing current time in 12-hour format
- **Countdown Timer**: Dynamic countdown for both modes
- **Status Indicator**: Shows if module is running or stopped
- **Mode Display**: Clear indication of current mode

#### Configuration Interface
- **Mode Selection**: Dropdown to switch between clock and metronome modes
- **Time Input**: Text input for target time with format validation
- **Delay Input**: Number input for metronome intervals
- **Real-time Updates**: Configuration changes apply immediately

#### Visual Feedback
- **Dynamic Countdown**: Metronome mode shows live countdown timer
- **Time Format Validation**: Ensures proper 12-hour time format
- **Status Updates**: Real-time status changes via WebSocket

### Technical Details

#### Backend Implementation
- **Time Calculation**: Precise time calculations for countdown display
- **State Management**: Real-time state updates via StateManager
- **WebSocket Broadcasting**: Live data updates to frontend
- **Error Handling**: Robust error handling for invalid configurations

#### Frontend Implementation
- **React Hooks**: Proper use of React hooks for state management
- **Real-time Updates**: WebSocket integration for live data
- **Component Architecture**: Modular design with separate CountdownDisplay component
- **TypeScript**: Full type safety for configuration and state

#### Data Flow
1. **Backend Calculation**: Time calculations happen on backend
2. **WebSocket Broadcast**: Real-time data sent to frontend
3. **State Management**: Frontend receives and displays live updates
4. **UI Updates**: React components re-render with new data

### Troubleshooting

#### Common Issues
1. **Time Not Updating**: Check if module is enabled and running
2. **Countdown Not Working**: Verify metronome mode configuration
3. **Invalid Time Format**: Ensure 12-hour format (e.g., "2:30 PM")
4. **WebSocket Issues**: Check browser console for connection errors

#### Debug Information
- **Backend Logs**: Check `backend/logs/interactor.log` for module activity
- **Browser Console**: Frontend debug information in browser dev tools
- **Network Tab**: Monitor WebSocket connections and API calls

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
- Real-time data preserved across restarts

## Development

### Project Structure
```
Interactor/
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

### Key Features
- **WebSocket Communication**: Real-time data synchronization
- **Module Hot-reloading**: Dynamic module updates
- **State Persistence**: Robust state management
- **Real-time Sync**: Live updates across all clients
- **Auto-save**: Automatic state persistence
- **Backup System**: Comprehensive backup and recovery

## Testing

### Automated Tests
- **Integration Tests**: Test module persistence and data flow
- **Frontend Tests**: Test React component behavior
- **WebSocket Tests**: Test real-time communication
- **State Management Tests**: Test data persistence

### Test Scenarios
1. **Browser Refresh**: Verify data persistence across refreshes
2. **WebSocket Updates**: Test real-time data synchronization
3. **React Hooks**: Ensure proper React hooks usage
4. **Error Handling**: Test graceful error handling
5. **State Persistence**: Verify data persistence across restarts

## Troubleshooting

### Common Issues
1. **Port 3001 in use**: Change port in `backend/config/system.json`
2. **Module not found**: Check module manifests in `backend/src/modules/`
3. **Registration fails**: Check backend logs in `backend/logs/`
4. **WebSocket errors**: Check browser console for connection issues
5. **Time not updating**: Verify module is enabled and running

### Logs
- Backend logs: `backend/logs/interactor.log`
- Console output for real-time debugging
- Browser console for frontend debugging

## License

MIT License - see LICENSE file for details. 