# Interactor Backend

The Interactor Backend is a modular, event-driven server for building interactive art installations. It provides a robust foundation for creating complex workflows with real-time communication, module management, and state persistence.

## Features

- **Modular Architecture**: Extensible module system with input and output modules
- **Event-Driven Communication**: Central message router for decoupled module communication
- **Real-Time Updates**: WebSocket support for live state synchronization
- **Hot Reloading**: Dynamic module loading and configuration updates
- **State Persistence**: Automatic saving and loading of system state
- **Comprehensive Logging**: Multi-level logging with file rotation
- **System Monitoring**: Real-time performance metrics and health checks
- **REST API**: Full HTTP API for external integration
- **Type Safety**: Full TypeScript support with shared type definitions

## Architecture

### Core Services

- **Logger**: Multi-level logging with console, file, and WebSocket output
- **MessageRouter**: Central event bus for module communication
- **ModuleLoader**: Dynamic module discovery, validation, and lifecycle management
- **StateManager**: State persistence with auto-save and backup functionality
- **SystemStats**: Real-time system monitoring and health checks

### Module System

- **ModuleBase**: Abstract base class for all modules
- **InputModuleBase**: Base class for input modules (triggers, sensors, etc.)
- **OutputModuleBase**: Base class for output modules (actuators, displays, etc.)
- **Manifest-Driven**: JSON manifests define module capabilities and configuration

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001` by default.

### Production

1. Build for production:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Configuration

The backend uses a configuration file at `config/system.json`:

```json
{
  "server": {
    "port": 3001,
    "host": "localhost",
    "cors": {
      "origin": ["http://localhost:3000"],
      "credentials": true
    }
  },
  "logging": {
    "level": "info",
    "file": "logs/interactor.log",
    "maxSize": "10m",
    "maxFiles": 5
  },
  "modules": {
    "autoLoad": true,
    "scanInterval": 5000,
    "hotReload": true
  },
  "interactions": {
    "autoSave": true,
    "saveInterval": 30000,
    "backupCount": 5
  }
}
```

## API Endpoints

### Health & System

- `GET /health` - System health check
- `GET /api/stats` - System performance statistics
- `GET /api/system` - Detailed system information

### Module Management

- `GET /api/modules` - List all available modules
- `GET /api/modules/:name` - Get module manifest

### Interaction Management

- `GET /api/interactions` - List all interactions
- `POST /api/interactions` - Create new interaction
- `PUT /api/interactions/:id` - Update interaction
- `DELETE /api/interactions/:id` - Delete interaction

### Route Management

- `GET /api/routes` - List all message routes
- `POST /api/routes` - Create new route

### Logs & Settings

- `GET /api/logs` - Get recent log entries
- `GET /api/settings` - Get system settings
- `PUT /api/settings/:key` - Update setting

## WebSocket API

The backend provides real-time updates via WebSocket:

### Connection

Connect to `ws://localhost:3001` for real-time updates.

### Message Types

- `init` - Initial system state
- `stats` - System statistics updates
- `stateChanged` - State change notifications
- `moduleLoaded` - Module loading events
- `messageRouted` - Message routing events
- `log` - Real-time log entries

### Client Messages

- `getStats` - Request current statistics
- `getLogs` - Request recent logs
- `manualTrigger` - Trigger module manually

## Module Development

### Creating a Module

1. Create a module directory in `src/modules/input/` or `src/modules/output/`
2. Extend `InputModuleBase` or `OutputModuleBase`
3. Create a `manifest.json` file
4. Add documentation in `wiki.md`

### Example Module Structure

```
src/modules/input/my_input/
├── index.ts          # Module implementation
├── manifest.json     # Module manifest
└── wiki.md          # Documentation
```

### Module Manifest

```json
{
  "name": "My Input Module",
  "type": "input",

  "version": "1.0.0",
  "description": "Description of the module",
  "author": "Your Name",
  "configSchema": {
    "type": "object",
    "properties": {
      "parameter": {
        "type": "string",
        "description": "Parameter description"
      }
    },
    "required": ["parameter"]
  },
  "events": [
    {
      "name": "myEvent",
      "type": "output",
      "description": "Event description"
    }
  ]
}
```

### Module Implementation

```typescript
import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig } from '@interactor/shared';

export class MyInputModule extends InputModuleBase {
  constructor(config: ModuleConfig) {
    super('my_input', config, manifest);
  }

  protected async onInit(): Promise<void> {
    // Initialize module
  }

  protected async onStart(): Promise<void> {
    // Start module
  }

  protected async onStop(): Promise<void> {
    // Stop module
  }

  protected async onDestroy(): Promise<void> {
    // Cleanup
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Handle config updates
  }

  protected handleInput(data: any): void {
    // Handle input data
  }

  protected async onStartListening(): Promise<void> {
    // Start listening for input
  }

  protected async onStopListening(): Promise<void> {
    // Stop listening for input
  }
}
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linter
- `npm run lint:fix` - Fix linting issues

### Project Structure

```
backend/
├── src/
│   ├── core/           # Core services
│   │   ├── Logger.ts
│   │   ├── MessageRouter.ts
│   │   ├── ModuleLoader.ts
│   │   ├── StateManager.ts
│   │   └── SystemStats.ts
│   ├── modules/        # Module implementations
│   │   ├── input/      # Input modules
│   │   └── output/     # Output modules
│   ├── utils/          # Utility functions
│   └── index.ts        # Main server file
├── config/             # Configuration files
├── logs/               # Log files
├── data/               # State persistence
└── dist/               # Compiled output
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Logging

The backend provides comprehensive logging:

- **Console**: Colored output for development
- **File**: Rotated log files for production
- **WebSocket**: Real-time log streaming to frontend

### Log Levels

- `debug` - Detailed debugging information
- `info` - General information
- `warn` - Warning messages
- `error` - Error messages

## Monitoring

### Health Check

Check system health:

```bash
curl http://localhost:3001/health
```

### System Stats

Get system statistics:

```bash
curl http://localhost:3001/api/stats
```

### Logs

Get recent logs:

```bash
curl http://localhost:3001/api/logs?count=50
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `config/system.json`
2. **Module not loading**: Check manifest validation and file permissions
3. **WebSocket connection failed**: Verify CORS settings and firewall rules
4. **State not persisting**: Check file permissions for the data directory

### Debug Mode

Enable debug logging by setting the log level to "debug" in the configuration.

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation for new features
4. Ensure all modules have proper manifests and documentation

## License

This project is part of the Interactor system. See the main project license for details. 