import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { SerialInputModule } from '../index';

moduleRegistry.register('Serial Input', (config: any) => new SerialInputModule(config));

export { SerialInputModule } from '../index';


