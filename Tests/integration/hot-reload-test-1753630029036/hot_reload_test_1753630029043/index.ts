
import { ModuleBase } from '../../../backend/src/core/ModuleBase';
import { ModuleConfig } from '@interactor/shared';

export default class HotReloadTestModule extends ModuleBase {
  constructor(config: ModuleConfig) {
    super('hot_reload_test_1753630029043', config, {
      name: 'hot_reload_test_1753630029043',
      type: 'input',
      version: '1.0.0',
      description: 'Hot reload test module',
      author: 'Test Author',
      configSchema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true }
        }
      },
      events: [
        { name: 'data', type: 'output', description: 'Test data event' }
      ]
    });
  }

  protected async onInit(): Promise<void> {
    // Mock init implementation
  }

  protected async onStart(): Promise<void> {
    // Mock start implementation
  }

  protected async onStop(): Promise<void> {
    // Mock stop implementation
  }

  protected async onDestroy(): Promise<void> {
    // Mock destroy implementation
  }

  protected async onConfigUpdate(oldConfig: ModuleConfig, newConfig: ModuleConfig): Promise<void> {
    // Mock config update implementation
  }
}
