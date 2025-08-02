# Template: Output Module

Copy this template to create new output modules quickly.

## File Structure
```
backend/src/modules/output/my_new_output/
├── index.ts
├── manifest.json
└── wiki.md (optional)
```

## index.ts Template
```typescript
import { OutputModuleBase } from '../../OutputModuleBase';
import { ModuleConfig } from '@interactor/shared';

interface MyOutputConfig extends ModuleConfig {
  // Define your config properties here
  endpoint?: string;
  enabled?: boolean;
}

export class MyOutputModule extends OutputModuleBase {
  private isConnected = false;

  constructor(config: MyOutputConfig) {
    super('my_output', config, {
      name: 'My Output Module',
      type: 'output',
      version: '1.0.0',
      description: 'Describe what this module does',
      author: 'Your Name',
      configSchema: {
        type: 'object',
        properties: {
          endpoint: {
            type: 'string',
            description: 'Connection endpoint',
            default: 'localhost:8080'
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the module',
            default: true
          }
        },
        required: ['endpoint']
      },
      events: [
        {
          name: 'trigger',
          type: 'input',
          description: 'Receives trigger events'
        },
        {
          name: 'stream',
          type: 'input', 
          description: 'Receives stream data'
        }
      ]
    });
  }

  protected async onStart(): Promise<void> {
    const config = this.config as MyOutputConfig;
    
    if (!config.enabled) {
      this.logger.info('Module disabled, not starting');
      return;
    }

    // Set up event listeners
    this.on('trigger', this.handleTrigger.bind(this));
    this.on('stream', this.handleStream.bind(this));

    // Initialize your output connection here
    try {
      await this.connect(config.endpoint);
      this.isConnected = true;
      this.logger.info('Module started and connected');
    } catch (error) {
      this.logger.error('Failed to connect:', error);
      throw error;
    }
  }

  protected async onStop(): Promise<void> {
    // Clean up event listeners
    this.off('trigger', this.handleTrigger.bind(this));
    this.off('stream', this.handleStream.bind(this));

    // Close connections
    await this.disconnect();
    this.isConnected = false;
    
    this.logger.info('Module stopped');
  }

  protected async onConfigUpdate(newConfig: MyOutputConfig): Promise<void> {
    // Handle config updates
    await this.stop();
    this.config = newConfig;
    await this.start();
  }

  private async handleTrigger(payload: any): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Received trigger but not connected');
      return;
    }

    try {
      // Handle trigger event
      this.logger.debug('Processing trigger:', payload);
      await this.sendData(payload);
    } catch (error) {
      this.logger.error('Error handling trigger:', error);
    }
  }

  private async handleStream(payload: any): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Received stream but not connected');
      return;
    }

    try {
      // Handle stream event
      this.logger.debug('Processing stream:', payload);
      await this.sendData(payload);
    } catch (error) {
      this.logger.error('Error handling stream:', error);
    }
  }

  private async connect(endpoint: string): Promise<void> {
    // Implement your connection logic here
    this.logger.info(`Connecting to ${endpoint}`);
    // throw new Error('Connection failed'); // Example error
  }

  private async disconnect(): Promise<void> {
    // Implement your disconnection logic here
    this.logger.info('Disconnecting');
  }

  private async sendData(data: any): Promise<void> {
    // Implement your data sending logic here
    this.logger.debug('Sending data:', data);
  }
}
```

## manifest.json Template
```json
{
  "name": "My Output Module",
  "type": "output",
  "version": "1.0.0",  
  "description": "Describe what this module does",
  "author": "Your Name",
  "configSchema": {
    "type": "object",
    "properties": {
      "endpoint": {
        "type": "string",
        "description": "Connection endpoint",
        "default": "localhost:8080"
      },
      "enabled": {
        "type": "boolean",
        "description": "Enable/disable the module",
        "default": true
      }
    },
    "required": ["endpoint"]
  },
  "events": [
    {
      "name": "trigger",
      "type": "input",
      "description": "Receives trigger events"
    },
    {
      "name": "stream", 
      "type": "input",
      "description": "Receives stream data"
    }
  ]
}
```

## Testing Checklist
- [ ] Module appears in backend logs without errors  
- [ ] Module shows up in frontend sidebar
- [ ] Configuration form is generated correctly
- [ ] Can connect input modules to this output
- [ ] Events are received and processed correctly
- [ ] Manual trigger works via API: `POST /api/trigger/:moduleId`