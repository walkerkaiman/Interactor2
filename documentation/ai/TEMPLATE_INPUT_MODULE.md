# Template: Input Module

Copy this template to create new input modules quickly.

## File Structure
```
backend/src/modules/input/my_new_input/
├── index.ts
├── manifest.json
└── wiki.md (optional)
```

## index.ts Template
```typescript
import { InputModuleBase } from '../../InputModuleBase';
import { ModuleConfig } from '@interactor/shared';

interface MyInputConfig extends ModuleConfig {
  // Define your config properties here
  interval?: number;
  enabled?: boolean;
}

export class MyInputModule extends InputModuleBase {
  private timer?: NodeJS.Timeout;

  constructor(config: MyInputConfig) {
    super('my_input', config, {
      name: 'My Input Module',
      type: 'input',
      version: '1.0.0',
      description: 'Describe what this module does',
      author: 'Kaiman Walker',
      configSchema: {
        type: 'object',
        properties: {
          interval: {
            type: 'number',
            description: 'Interval in milliseconds',
            default: 1000,
            minimum: 100
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable the module',
            default: true
          }
        }
      },
      events: [
        {
          name: 'trigger',
          type: 'output',
          description: 'Emitted when something happens'
        }
      ]
    });
  }

  protected async onStart(): Promise<void> {
    const config = this.config as MyInputConfig;
    
    if (!config.enabled) {
      this.logger.info('Module disabled, not starting');
      return;
    }

    this.timer = setInterval(() => {
      // Your logic here
      this.emitTrigger('trigger', { 
        timestamp: Date.now(),
        value: Math.random() 
      });
    }, config.interval || 1000);

    this.logger.info('Module started successfully');
  }

  protected async onStop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    
    this.logger.info('Module stopped');
  }

  protected async onConfigUpdate(newConfig: MyInputConfig): Promise<void> {
    // Handle config updates
    await this.stop();
    this.config = newConfig;
    await this.start();
  }
}
```

## manifest.json Template
```json
{
  "name": "My Input Module",
  "type": "input",
  "version": "1.0.0",
  "description": "Describe what this module does",
  "author": "Kaiman Walker",
  "configSchema": {
    "type": "object",
    "properties": {
      "interval": {
        "type": "number",
        "description": "Interval in milliseconds",
        "default": 1000,
        "minimum": 100
      },
      "enabled": {
        "type": "boolean",
        "description": "Enable/disable the module",
        "default": true
      }
    }
  },
  "events": [
    {
      "name": "trigger",
      "type": "output",
      "description": "Emitted when something happens"
    }
  ]
}
```

## Testing Checklist
- [ ] Module appears in backend logs without errors
- [ ] Module shows up in frontend sidebar
- [ ] Configuration form is generated correctly
- [ ] Manual trigger works via API: `POST /api/trigger/:moduleId`
- [ ] Events are emitted and can be connected to outputs