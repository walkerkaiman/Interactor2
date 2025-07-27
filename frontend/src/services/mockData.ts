import { ModuleManifest, SystemStats, LogEntry } from '@/types/api';

// Mock modules data
export const mockModules: ModuleManifest[] = [
  {
    id: 'http-input',
    name: 'HTTP Input',
    type: 'input',
    version: '1.0.0',
    description: 'Receives HTTP requests and converts them to events',
    author: 'Interactor Team',
    category: 'Network',
    configSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'Port to listen on',
          default: 8080,
          minimum: 1024,
          maximum: 65535
        },
        path: {
          type: 'string',
          description: 'HTTP path to listen on',
          default: '/webhook'
        }
      },
      required: ['port']
    },
    events: [
      {
        name: 'request',
        type: 'output',
        description: 'HTTP request received',
        dataType: 'HTTPRequest'
      }
    ]
  },
  {
    id: 'osc-input',
    name: 'OSC Input',
    type: 'input',
    version: '1.0.0',
    description: 'Receives OSC messages from external applications',
    author: 'Interactor Team',
    category: 'Audio',
    configSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'OSC port to listen on',
          default: 8000,
          minimum: 1024,
          maximum: 65535
        },
        address: {
          type: 'string',
          description: 'OSC address pattern to listen for',
          default: '/interactor/*'
        }
      },
      required: ['port']
    },
    events: [
      {
        name: 'message',
        type: 'output',
        description: 'OSC message received',
        dataType: 'OSCMessage'
      }
    ]
  },
  {
    id: 'dmx-output',
    name: 'DMX Output',
    type: 'output',
    version: '1.0.0',
    description: 'Controls DMX lighting fixtures',
    author: 'Interactor Team',
    category: 'Lighting',
    configSchema: {
      type: 'object',
      properties: {
        universe: {
          type: 'number',
          description: 'DMX universe number',
          default: 1,
          minimum: 1,
          maximum: 512
        },
        device: {
          type: 'string',
          description: 'DMX device type',
          enum: ['enttec', 'artnet', 'sACN'],
          default: 'enttec'
        }
      },
      required: ['universe']
    },
    events: [
      {
        name: 'command',
        type: 'input',
        description: 'DMX command to execute',
        dataType: 'DMXCommand'
      }
    ]
  },
  {
    id: 'audio-output',
    name: 'Audio Output',
    type: 'output',
    version: '1.0.0',
    description: 'Plays audio files and generates sound',
    author: 'Interactor Team',
    category: 'Audio',
    configSchema: {
      type: 'object',
      properties: {
        device: {
          type: 'string',
          description: 'Audio output device',
          default: 'default'
        },
        sampleRate: {
          type: 'number',
          description: 'Audio sample rate',
          enum: [44100, 48000, 96000],
          default: 48000
        }
      }
    },
    events: [
      {
        name: 'play',
        type: 'input',
        description: 'Play audio file',
        dataType: 'AudioCommand'
      }
    ]
  }
];

// Mock system stats
export const mockSystemStats: SystemStats = {
  uptime: 3600, // 1 hour
  memory: {
    used: 1073741824, // 1GB
    total: 8589934592, // 8GB
    percentage: 12.5
  },
  cpu: {
    usage: 25.5,
    cores: 8
  },
  modules: {
    total: 4,
    active: 2,
    errors: 0
  },
  messages: {
    sent: 1250,
    received: 980,
    errors: 3
  }
};

// Mock logs
export const mockLogs: LogEntry[] = [
  {
    timestamp: Date.now() - 5000,
    level: 'info',
    module: 'http-input',
    message: 'HTTP server started on port 8080'
  },
  {
    timestamp: Date.now() - 4000,
    level: 'info',
    module: 'osc-input',
    message: 'OSC listener started on port 8000'
  },
  {
    timestamp: Date.now() - 3000,
    level: 'warn',
    module: 'dmx-output',
    message: 'DMX device not found, using fallback mode'
  },
  {
    timestamp: Date.now() - 2000,
    level: 'error',
    module: 'audio-output',
    message: 'Failed to load audio file: file not found'
  },
  {
    timestamp: Date.now() - 1000,
    level: 'info',
    module: 'system',
    message: 'System health check completed'
  }
];

// Generate random system stats for testing
export const generateRandomSystemStats = (): SystemStats => ({
  uptime: Math.floor(Math.random() * 86400) + 3600, // 1-24 hours
  memory: {
    used: Math.floor(Math.random() * 4294967296) + 1073741824, // 1-5GB
    total: 8589934592, // 8GB
    percentage: Math.random() * 80 + 10 // 10-90%
  },
  cpu: {
    usage: Math.random() * 100, // 0-100%
    cores: 8
  },
  modules: {
    total: 4,
    active: Math.floor(Math.random() * 4) + 1, // 1-4
    errors: Math.floor(Math.random() * 2) // 0-1
  },
  messages: {
    sent: Math.floor(Math.random() * 1000) + 500,
    received: Math.floor(Math.random() * 800) + 400,
    errors: Math.floor(Math.random() * 5) // 0-4
  }
});

// Generate random logs for testing
export const generateRandomLog = (): LogEntry => {
  const levels: ('debug' | 'info' | 'warn' | 'error')[] = ['debug', 'info', 'warn', 'error'];
  const modules = ['http-input', 'osc-input', 'dmx-output', 'audio-output', 'system'];
  const messages = [
    'Module initialized successfully',
    'Connection established',
    'Data received',
    'Processing complete',
    'Configuration updated',
    'Error occurred during operation',
    'Resource allocation successful',
    'Timeout reached',
    'Invalid input detected',
    'Operation completed'
  ];

  return {
    timestamp: Date.now() - Math.floor(Math.random() * 60000), // Within last minute
    level: levels[Math.floor(Math.random() * levels.length)],
    module: modules[Math.floor(Math.random() * modules.length)],
    message: messages[Math.floor(Math.random() * messages.length)]
  };
}; 