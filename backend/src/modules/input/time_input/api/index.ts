import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { TimeInputModule } from '../index';

// Register under both display name and lowercase version to handle all lookup cases
moduleRegistry.register('Time Input', (config: any, id?: string) => new TimeInputModule(config, id));
moduleRegistry.register('time_input', (config: any, id?: string) => new TimeInputModule(config, id));

export { TimeInputModule } from '../index';


