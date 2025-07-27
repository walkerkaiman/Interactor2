# Simplified Architecture

## Overview

The Interactor system has been simplified to run as a single unified server that serves both the backend API and frontend interface from the same origin. This eliminates cross-origin issues and simplifies the deployment.

## Architecture Changes

### Before (Complex)
- Frontend: `http://localhost:3002` (Vite dev server)
- Backend: `http://localhost:3001` (Express server)
- WebSocket: `ws://localhost:3001` (separate connection)
- CORS: Required for cross-origin requests
- Complex connection management and retry logic

### After (Simplified)
- Single server: `http://localhost:3001` (Express + static files)
- Frontend: Served as static files from backend
- WebSocket: Same origin, no CORS issues
- Network access: `http://0.0.0.0:3001` (accessible from network)

## Benefits

1. **No CORS Issues**: Everything served from same origin
2. **Simplified Deployment**: Single server to manage
3. **Network Access**: Anyone on the network can access via browser
4. **Reduced Complexity**: No proxy configuration needed
5. **Better Performance**: No cross-origin overhead

## How It Works

1. **Frontend Build**: React app is built to `frontend/dist/`
2. **Backend Serves**: Express server serves static files from `frontend/dist/`
3. **API Routes**: All `/api/*` routes handled by backend
4. **SPA Routing**: All other routes serve `index.html` for client-side routing
5. **WebSocket**: Same origin connection for real-time updates

## Startup

### Development
```bash
# Terminal 1: Frontend dev server (for development)
cd frontend
npm run dev

# Terminal 2: Backend server
cd backend
npm start
```

### Production (Simplified)
```bash
# Single command starts everything
./start-simplified.bat
```

## Configuration

### Backend (`config/system.json`)
```json
{
  "server": {
    "port": 3001,
    "host": "0.0.0.0"  // Network accessible
  }
}
```

### Frontend (`frontend/vite.config.ts`)
```typescript
server: {
  port: 3001, // Same port as backend
  host: '0.0.0.0', // Network accessible
  proxy: {
    '/api': { target: 'http://localhost:3001' },
    '/ws': { target: 'ws://localhost:3001', ws: true }
  }
}
```

## Network Access

Once running, the system is accessible from any device on the network:
- **Local**: `http://localhost:3001`
- **Network**: `http://[COMPUTER_IP]:3001`

## Migration Notes

- WebSocket connection simplified (no retry logic needed)
- CORS middleware removed from backend
- Frontend API calls use relative paths (`/api/stats` instead of `http://localhost:3001/api/stats`)
- Static file serving added to backend
- SPA routing handled by backend

## Troubleshooting

### Port Already in Use
If port 3001 is already in use, change it in both:
- `config/system.json` (backend)
- `frontend/vite.config.ts` (frontend dev)

### Network Access Issues
- Ensure firewall allows port 3001
- Check that `host: '0.0.0.0'` is set in both configs
- Verify network connectivity

### Build Issues
- Run `npm install` in both frontend and backend directories
- Clear `frontend/dist/` and rebuild if needed 