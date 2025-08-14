import { ModuleBase, ModuleConfig } from '@interactor/shared';

export type ModuleFactory = (config: ModuleConfig, id?: string) => Promise<ModuleBase> | ModuleBase;

class ModuleRegistry {
  private factories: Map<string, ModuleFactory> = new Map();

  public register(manifestName: string, factory: ModuleFactory): void {
    this.factories.set(manifestName, factory);
  }

  public has(manifestName: string): boolean {
    return this.factories.has(manifestName);
  }

  public async create(manifestName: string, config: ModuleConfig, id?: string): Promise<ModuleBase> {
    const factory = this.factories.get(manifestName);
    if (!factory) {
      throw new Error(`Module not registered: ${manifestName}`);
    }
    const instance = await factory(config, id);
    return instance;
  }

  public list(): string[] {
    return Array.from(this.factories.keys());
  }
}

export const moduleRegistry = new ModuleRegistry();


