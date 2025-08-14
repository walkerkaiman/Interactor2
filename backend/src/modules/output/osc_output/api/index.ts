import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { OscOutputModule } from '../index';

moduleRegistry.register('OSC Output', (config: any) => new OscOutputModule(config));

export { OscOutputModule } from '../index';


