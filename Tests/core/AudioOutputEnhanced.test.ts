import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioOutputModule } from '../../backend/src/modules/output/audio_output';
import { AudioOutputConfig } from '@interactor/shared';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Enhanced Audio Output Module', () => {
  let module: AudioOutputModule;
  let testConfig: AudioOutputConfig;

  beforeEach(() => {
    testConfig = {
      deviceId: 'test-device',
      sampleRate: 44100,
      channels: 2,
      format: 'wav',
      volume: 0.8,
      enabled: true,
      bufferSize: 4096,
      loop: false,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      enableFileUpload: true,
      uploadPort: 3002, // Use different port for testing
      uploadHost: 'localhost',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['.wav', '.mp3', '.ogg']
    };

    module = new AudioOutputModule(testConfig);
  });

  afterEach(async () => {
    if (module) {
      await module.stop();
      await module.destroy();
    }
  });

  describe('File Upload Server', () => {
    it('should start file upload server when enabled', async () => {
      await module.start();
      
      const uploadInfo = module.getFileUploadInfo();
      expect(uploadInfo.enabled).toBe(true);
      expect(uploadInfo.port).toBe(3002);
    });

    it('should not start file upload server when disabled', async () => {
      testConfig.enableFileUpload = false;
      module = new AudioOutputModule(testConfig);
      
      await module.start();
      
      const uploadInfo = module.getFileUploadInfo();
      expect(uploadInfo.enabled).toBe(false);
    });
  });

  describe('File Management', () => {
    beforeEach(async () => {
      await module.start();
    });

    it('should create assets directory', async () => {
      const assetsDir = path.join(__dirname, '../../backend/src/modules/output/audio_output/assets');
      const exists = await fs.pathExists(assetsDir);
      expect(exists).toBe(true);
    });

    it('should list available audio files', async () => {
      // Create a test file
      const assetsDir = path.join(__dirname, '../../backend/src/modules/output/audio_output/assets');
      await fs.ensureDir(assetsDir);
      const testFile = path.join(assetsDir, 'test.wav');
      await fs.writeFile(testFile, 'test audio data');

      const files = await module['getAvailableAudioFiles']();
      expect(files).toContain('test.wav');

      // Cleanup
      await fs.remove(testFile);
    });

    it('should get file list payload', async () => {
      // Create a test file
      const assetsDir = path.join(__dirname, '../../backend/src/modules/output/audio_output/assets');
      await fs.ensureDir(assetsDir);
      const testFile = path.join(assetsDir, 'test.wav');
      await fs.writeFile(testFile, 'test audio data');

      const fileList = await module['getAudioFileList']();
      expect(fileList.files).toContain('test.wav');
      expect(fileList.totalFiles).toBe(1);
      expect(fileList.totalSize).toBeGreaterThan(0);

      // Cleanup
      await fs.remove(testFile);
    });
  });

  describe('File Deletion', () => {
    beforeEach(async () => {
      await module.start();
    });

    it('should delete audio file', async () => {
      // Create a test file
      const assetsDir = path.join(__dirname, '../../backend/src/modules/output/audio_output/assets');
      await fs.ensureDir(assetsDir);
      const testFile = path.join(assetsDir, 'test.wav');
      await fs.writeFile(testFile, 'test audio data');

      // Verify file exists
      expect(await fs.pathExists(testFile)).toBe(true);

      // Delete the file
      const result = await module['deleteAudioFile']('test.wav');
      expect(result.deleted).toBe(true);
      expect(result.filename).toBe('test.wav');
      expect(result.remainingFiles).not.toContain('test.wav');

      // Verify file is deleted
      expect(await fs.pathExists(testFile)).toBe(false);
    });

    it('should throw error when deleting non-existent file', async () => {
      await expect(module['deleteAudioFile']('nonexistent.wav')).rejects.toThrow();
    });

    it('should throw error when deleting file with invalid extension', async () => {
      // Create a test file with invalid extension
      const assetsDir = path.join(__dirname, '../../backend/src/modules/output/audio_output/assets');
      await fs.ensureDir(assetsDir);
      const testFile = path.join(assetsDir, 'test.txt');
      await fs.writeFile(testFile, 'test data');

      await expect(module['deleteAudioFile']('test.txt')).rejects.toThrow();

      // Cleanup
      await fs.remove(testFile);
    });
  });

  describe('File Metadata', () => {
    beforeEach(async () => {
      await module.start();
    });

    it('should get file metadata', async () => {
      // Create a test file
      const assetsDir = path.join(__dirname, '../../backend/src/modules/output/audio_output/assets');
      await fs.ensureDir(assetsDir);
      const testFile = path.join(assetsDir, 'test.wav');
      await fs.writeFile(testFile, 'test audio data');

      const metadata = await module['getAudioFileMetadata']('test.wav');
      expect(metadata.filename).toBe('test.wav');
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.format).toBe('WAV');
      expect(metadata.timestamp).toBeGreaterThan(0);

      // Cleanup
      await fs.remove(testFile);
    });

    it('should throw error when getting metadata for non-existent file', async () => {
      await expect(module['getAudioFileMetadata']('nonexistent.wav')).rejects.toThrow();
    });
  });

  describe('Configuration Updates', () => {
    it('should handle configuration updates', async () => {
      await module.start();

      const newConfig: AudioOutputConfig = {
        ...testConfig,
        volume: 0.5,
        enableFileUpload: false
      };

      await module.onConfigUpdate(testConfig, newConfig);

      const currentConfig = module.getConfig();
      expect(currentConfig.volume).toBe(0.5);
      expect(currentConfig.enableFileUpload).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file upload settings', async () => {
      testConfig.uploadPort = 80; // Invalid port
      
      await expect(async () => {
        module = new AudioOutputModule(testConfig);
        await module.onInit();
      }).rejects.toThrow();
    });

    it('should handle invalid file size limits', async () => {
      testConfig.maxFileSize = 0; // Invalid size
      
      await expect(async () => {
        module = new AudioOutputModule(testConfig);
        await module.onInit();
      }).rejects.toThrow();
    });
  });
}); 