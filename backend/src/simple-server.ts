import express from 'express';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';

const app = express();
const port = 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: '0s',
    timestamp: Date.now()
  });
});

// System stats (mock)
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      cpu: { usage: 25, cores: 8 },
      memory: { used: 1024, total: 8192, percentage: 12.5 },
      uptime: 3600,
      timestamp: Date.now()
    }
  });
});

// Modules (mock)
app.get('/api/modules', (req, res) => {
  res.json({
    success: true,
    data: {
      modules: [
        {
          id: 'frames_input',
          name: 'Frames Input',
          type: 'input',
          description: 'Monitors sACN frame numbers',
          version: '1.0.0',
          author: 'Interactor Team'
        },
        {
          id: 'dmx_output',
          name: 'DMX Output',
          type: 'output',
          description: 'Controls DMX lighting fixtures',
          version: '1.0.0',
          author: 'Interactor Team'
        }
      ]
    }
  });
});

// Documentation endpoint
app.get('/api/documentation/*', (req, res) => {
  try {
    const docPath = req.params[0];
    let filePath: string;
    
    if (docPath.startsWith('documentation/')) {
      filePath = path.join(__dirname, '..', '..', 'documentation', docPath.replace('documentation/', ''));
    } else if (docPath.startsWith('modules/')) {
      filePath = path.join(__dirname, '..', 'modules', docPath.replace('modules/', ''));
    } else {
      return res.status(400).json({ success: false, error: 'Invalid documentation path' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Documentation file not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    res.set('Content-Type', 'text/plain');
    res.send(content);
    
  } catch (error) {
    console.error('Error serving documentation:', error);
    res.status(500).json({ success: false, error: 'Failed to load documentation' });
  }
});

// SPA routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/ws') && !req.path.startsWith('/health')) {
    res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Simple Interactor server running at http://localhost:${port}`);
  console.log(`📚 Documentation API available at http://localhost:${port}/api/documentation/*`);
  console.log(`🌐 Frontend served from frontend/dist`);
});

// WebSocket server (basic)
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}); 