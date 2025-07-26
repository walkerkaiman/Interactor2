import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioOutputModule } from '../../backend/src/modules/output/audio_output/index';
import { AudioOutputConfig } from '@interactor/shared';
import * as fs from 'fs-extra';
import * as path from 'path';
import request from 'supertest';
import express from 'express';

describe('AudioOutputModule File Upload', () => {
  let module: AudioOutputModule;
  let testConfig: AudioOutputConfig;
  let assetsDir: string;

  beforeEach(async () => {
    // Create test configuration with file upload enabled
    testConfig = {
      id: 'test_audio_output',
      name: 'Test Audio Output',
      type: 'output',
      version: '1.0.0',
      description: 'Test audio output module',
      author: 'Test User',
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
      uploadPort: 3005, // Use different port for testing to avoid conflicts
      uploadHost: 'localhost',
      maxFileSize: 10 * 1024 * 1024, // 10MB for testing
      allowedExtensions: ['.wav', '.mp3', '.ogg']
    };

    // Create module
    module = new AudioOutputModule(testConfig);

    // Get assets directory path
    assetsDir = path.join(__dirname, '../../backend/src/modules/output/audio_output/assets');

    // Clean up assets directory
    if (await fs.pathExists(assetsDir)) {
      await fs.emptyDir(assetsDir);
    }

    // Initialize and start module
    await module.init();
    await module.start();
  });

  afterEach(async () => {
    // Stop and destroy module
    if (module) {
      await module.stop();
      await module.destroy();
    }

    // Clean up assets directory
    if (await fs.pathExists(assetsDir)) {
      await fs.emptyDir(assetsDir);
    }
  });

  describe('File Upload Server', () => {
    it('should start file upload server when enabled', async () => {
      const uploadInfo = module.getFileUploadInfo();
      
      expect(uploadInfo.enabled).toBe(true);
      expect(uploadInfo.port).toBe(3005);
      expect(uploadInfo.host).toBe('localhost');
      expect(uploadInfo.maxFileSize).toBe(10 * 1024 * 1024);
      expect(uploadInfo.allowedExtensions).toEqual(['.wav', '.mp3', '.ogg']);
      expect(uploadInfo.uploadCount).toBe(0);
    });

    it('should not start file upload server when disabled', async () => {
      const disabledConfig: AudioOutputConfig = {
        ...testConfig,
        enableFileUpload: false
      };

      const disabledModule = new AudioOutputModule(disabledConfig);
      await disabledModule.init();
      await disabledModule.start();

      const uploadInfo = disabledModule.getFileUploadInfo();
      expect(uploadInfo.enabled).toBe(false);

      await disabledModule.stop();
      await disabledModule.destroy();
    });

    it('should handle health check endpoint', async () => {
      const response = await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.uploadCount).toBe(0);
    });

    it('should list files endpoint', async () => {
      const response = await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .get('/files')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toEqual([]);
      expect(response.body.data.totalFiles).toBe(0);
      expect(response.body.data.totalSize).toBe(0);
    });
  });

  describe('File Upload', () => {
    it('should upload valid audio file', async () => {
      // Create a mock audio file
      const mockAudioData = Buffer.from('mock audio data');
      const testFileName = 'test_audio.wav';

      const uploadSpy = vi.fn();
      module.on('output', (data) => {
        if (data.event === 'fileUploaded') {
          uploadSpy(data.payload);
        }
      });

      const response = await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', mockAudioData, testFileName)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('File uploaded successfully');
      expect(response.body.data.filename).toMatch(/^\d+_test_audio\.wav$/);
      expect(response.body.data.originalName).toBe(testFileName);
      expect(response.body.data.size).toBe(mockAudioData.length);

      // Check that event was emitted
      expect(uploadSpy).toHaveBeenCalledWith({
        filename: expect.any(String),
        originalName: testFileName,
        size: mockAudioData.length,
        mimetype: expect.any(String),
        filePath: expect.stringContaining('assets/'),
        timestamp: expect.any(Number),
        availableFiles: expect.arrayContaining([expect.any(String)])
      });

      // Check that file was saved
      const savedFiles = await fs.readdir(assetsDir);
      expect(savedFiles).toHaveLength(1);
      expect(savedFiles[0]).toMatch(/^\d+_test_audio\.wav$/);
    });

    it('should reject invalid file types', async () => {
      const mockData = Buffer.from('invalid file data');
      const testFileName = 'test_file.txt';

      const response = await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', mockData, testFileName)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File type not allowed');
    });

    it('should reject files larger than max size', async () => {
      // Create a file larger than max size
      const largeData = Buffer.alloc(testConfig.maxFileSize! + 1024);
      const testFileName = 'large_audio.wav';

      const response = await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', largeData, testFileName)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File too large');
    });

    it('should reject requests without files', async () => {
      const response = await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .expect(400);

      expect(response.body.error).toBe('No file uploaded');
    });

    it('should emit fileListUpdated event after upload', async () => {
      const mockAudioData = Buffer.from('mock audio data');
      const testFileName = 'test_audio.wav';

      const listUpdateSpy = vi.fn();
      module.on('output', (data) => {
        if (data.event === 'fileListUpdated') {
          listUpdateSpy(data.payload);
        }
      });

      await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', mockAudioData, testFileName)
        .expect(200);

      expect(listUpdateSpy).toHaveBeenCalledWith({
        files: expect.arrayContaining([expect.any(String)]),
        totalFiles: 1,
        totalSize: mockAudioData.length,
        timestamp: expect.any(Number)
      });
    });

    it('should emit uploadError event on failure', async () => {
      const mockData = Buffer.from('invalid file data');
      const testFileName = 'test_file.txt';

      const errorSpy = vi.fn();
      module.on('output', (data) => {
        if (data.event === 'uploadError') {
          errorSpy(data.payload);
        }
      });

      await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', mockData, testFileName)
        .expect(500);

      expect(errorSpy).toHaveBeenCalledWith({
        error: expect.stringContaining('File type not allowed. Allowed types: .wav, .mp3, .ogg'),
        originalName: expect.any(String),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('File Management', () => {
    it('should list uploaded files correctly', async () => {
      // Upload multiple files
      const files = [
        { name: 'audio1.wav', data: Buffer.from('audio1 data') },
        { name: 'audio2.mp3', data: Buffer.from('audio2 data') },
        { name: 'audio3.ogg', data: Buffer.from('audio3 data') }
      ];

      for (const file of files) {
        await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
          .post('/upload')
          .attach('audio', file.data, file.name)
          .expect(200);
      }

      const response = await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .get('/files')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toHaveLength(3);
      expect(response.body.data.totalFiles).toBe(3);
      expect(response.body.data.totalSize).toBeGreaterThan(0);
    });

    it('should generate safe filenames', async () => {
      const mockAudioData = Buffer.from('mock audio data');
      const unsafeFileName = 'test file with spaces & special chars!.wav';

      const response = await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', mockAudioData, unsafeFileName)
        .expect(200);

      const savedFilename = response.body.data.filename;
      expect(savedFilename).toMatch(/^\d+_test_file_with_spaces___special_chars_\.wav$/);
      expect(savedFilename).not.toContain(' ');
      expect(savedFilename).not.toContain('!');
    });

    it('should update upload count correctly', async () => {
      const mockAudioData = Buffer.from('mock audio data');

      // Initial count should be 0
      expect(module.getFileUploadInfo().uploadCount).toBe(0);

      // Upload first file
      await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', mockAudioData, 'audio1.wav')
        .expect(200);

      expect(module.getFileUploadInfo().uploadCount).toBe(1);

      // Upload second file
      await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', mockAudioData, 'audio2.wav')
        .expect(200);

      expect(module.getFileUploadInfo().uploadCount).toBe(2);
    });
  });

  describe('Configuration Updates', () => {
    it('should restart upload server when configuration changes', async () => {
      // Change upload port
      const newConfig: AudioOutputConfig = {
        ...testConfig,
        uploadPort: 3003
      };

      await module.updateConfig(newConfig);

      // Check that server is running on new port
      const uploadInfo = module.getFileUploadInfo();
      expect(uploadInfo.port).toBe(3003);

      // Test that new port is working
      const response = await request(`http://localhost:3003`)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update allowed extensions', async () => {
      const newConfig: AudioOutputConfig = {
        ...testConfig,
        allowedExtensions: ['.wav', '.mp3']
      };

      await module.updateConfig(newConfig);

      const uploadInfo = module.getFileUploadInfo();
      expect(uploadInfo.allowedExtensions).toEqual(['.wav', '.mp3']);

      // Test that .ogg files are now rejected
      const mockData = Buffer.from('mock audio data');
      const response = await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', mockData, 'test.ogg')
        .expect(500);

      expect(response.body.error).toContain('File type not allowed');
    });
  });

  describe('State Management', () => {
    it('should include file upload info in state', async () => {
      const state = module.getState();
      
      expect(state.fileUploadEnabled).toBe(true);
      expect(state.uploadPort).toBe(3005);
      expect(state.uploadCount).toBe(0);
      expect(state.lastUpload).toBeUndefined();
    });

    it('should update state after file upload', async () => {
      const mockAudioData = Buffer.from('mock audio data');

      await request(`http://${testConfig.uploadHost}:${testConfig.uploadPort}`)
        .post('/upload')
        .attach('audio', mockAudioData, 'test.wav')
        .expect(200);

      const state = module.getState();
      expect(state.uploadCount).toBe(1);
      expect(state.lastUpload).toBeDefined();
      expect(state.lastUpload?.originalName).toBe('test.wav');
    });
  });
}); 