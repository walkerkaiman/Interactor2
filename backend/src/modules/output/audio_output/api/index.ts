import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { AudioOutputModule } from '../index';

moduleRegistry.register('Audio Output', (config: any) => new AudioOutputModule(config));

export { AudioOutputModule } from '../index';


