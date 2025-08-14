import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { OscInputModule } from '../index';

moduleRegistry.register('OSC Input', (config: any) => new OscInputModule(config));

export { OscInputModule } from '../index';


