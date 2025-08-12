import path from 'path';
import fs from 'fs-extra';
import { FileUploader } from './FileUploader';

// Load system configuration with robust path resolution
const defaultConfig = { fileUploader: { port: 4000, host: '0.0.0.0' } } as any;
const candidatePaths = [
  // Repo root config (when running from backend/src)
  path.join(__dirname, '../../../../config/system.json'),
  // Fallback to backend/config for alternate setups
  path.join(__dirname, '../../../config/system.json')
];

let loadedConfig: any = defaultConfig;
for (const configPath of candidatePaths) {
  try {
    if (fs.existsSync(configPath)) {
      loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      break;
    }
  } catch {
    // Ignore and continue to next candidate
  }
}

// One global instance of FileUploader that all modules share.
export const fileUploader = new FileUploader({
  port: loadedConfig.fileUploader?.port || 4000,
  host: loadedConfig.fileUploader?.host || '0.0.0.0',
  uploadDir: path.join(__dirname, '../../data/uploads'),
  maxFileSize: 100 * 1024 * 1024,
  moduleConfigs: new Map()
});

// FileUploader will be started by the InteractorServer
