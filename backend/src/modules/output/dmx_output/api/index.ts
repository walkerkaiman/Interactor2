import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { DmxOutputModule } from '../index';

moduleRegistry.register('DMX Output', (config: any) => new DmxOutputModule(config));

export { DmxOutputModule } from '../index';


