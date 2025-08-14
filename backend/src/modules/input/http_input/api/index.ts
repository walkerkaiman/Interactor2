import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { HttpInputModule } from '../index';

moduleRegistry.register('HTTP Input', (config: any) => new HttpInputModule(config));

export { HttpInputModule } from '../index';


