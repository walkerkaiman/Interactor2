import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { HttpOutputModule } from '../index';

moduleRegistry.register('HTTP Output', (config: any) => new HttpOutputModule(config));

export { HttpOutputModule } from '../index';


