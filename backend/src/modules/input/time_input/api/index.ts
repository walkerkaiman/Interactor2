import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { TimeInputModule } from '../index';

// Register factory under manifest display name
moduleRegistry.register('Time Input', (config: any, id?: string) => new TimeInputModule(config, id));

export { TimeInputModule } from '../index';


