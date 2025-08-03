import path from 'path';
import fs from 'fs-extra';
import { FileUploader } from './FileUploader';

// Load system configuration
const configPath = path.join(__dirname, '../../../config/system.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// One global instance of FileUploader that all modules share.
export const fileUploader = new FileUploader({
  port: config.fileUploader?.port || 4000,
  host: config.fileUploader?.host || '0.0.0.0',
  uploadDir: path.join(__dirname, '../../data/uploads'),
  maxFileSize: 100 * 1024 * 1024,
  moduleConfigs: new Map()
});

// FileUploader will be started by the InteractorServer
