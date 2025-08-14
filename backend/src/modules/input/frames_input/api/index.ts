import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { FramesInputModule } from '../index';

moduleRegistry.register('Frames Input', (config: any) => new FramesInputModule(config));

export { FramesInputModule } from '../index';


