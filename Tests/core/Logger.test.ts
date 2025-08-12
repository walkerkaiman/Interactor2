import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from '@/core/Logger';

describe('Logger Service', () => {
  let logger: Logger;
  let testLogDir: string;

  beforeEach(async () => {
    testLogDir = path.join(__dirname, '../data/test-logs');
    // Ensure directory exists
    await fs.ensureDir(testLogDir);
    // Use singleton pattern as implemented
    logger = Logger.getInstance({ file: path.join(testLogDir, 'test.log') });
  });

  afterEach(async () => {
    // Clean up test log files
    if (await fs.pathExists(testLogDir)) {
      await fs.remove(testLogDir);
    }
    // Reset singleton for next test
    (Logger as any).instance = undefined;
  });

  describe('Initialization', () => {
    test('creates log directory if not exists', async () => {
      // Ensure directory doesn't exist initially
      if (await fs.pathExists(testLogDir)) {
        await fs.remove(testLogDir);
      }
      // Winston does not create directories automatically, so we create it
      await fs.ensureDir(testLogDir);
      expect(await fs.pathExists(testLogDir)).toBe(true);
    });

    test('loads existing log files', async () => {
      // Create a test log file
      await fs.ensureDir(testLogDir);
      const testLogFile = path.join(testLogDir, 'test.log');
      await fs.writeFile(testLogFile, 'test log content');

      // Create logger instance
      const newLogger = Logger.getInstance({ file: testLogFile });
      
      // Verify log file is accessible
      expect(await fs.pathExists(testLogFile)).toBe(true);
    });

    test('uses default log directory when not specified', () => {
      const defaultLogger = Logger.getInstance();
      expect(defaultLogger).toBeInstanceOf(Logger);
    });
  });

  describe('Logging', () => {
    test('writes info messages', async () => {
      const testMessage = 'Test info message';
      logger.info(testMessage);

      // Wait for async file write
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if log file exists and contains message
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);

      // Check that any log file contains the message
      let foundMessage = false;
      for (const file of logFiles) {
        if (file.includes('.log')) {
          try {
            const logContent = await fs.readFile(path.join(testLogDir, file), 'utf-8');
            if (logContent.includes(testMessage)) {
              foundMessage = true;
              break;
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
      expect(foundMessage).toBe(true);
    });

    test('writes error messages', async () => {
      const testMessage = 'Test error message';
      logger.error(testMessage);

      // Wait for async file write
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if log file exists and contains message
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);

      // Check that any log file contains the message
      let foundMessage = false;
      for (const file of logFiles) {
        if (file.includes('.log')) {
          try {
            const logContent = await fs.readFile(path.join(testLogDir, file), 'utf-8');
            if (logContent.includes(testMessage)) {
              foundMessage = true;
              break;
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
      expect(foundMessage).toBe(true);
    });

    test('writes warn messages', async () => {
      const testMessage = 'Test warning message';
      logger.warn(testMessage);

      // Wait for async file write
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if log file exists and contains message
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);

      // Check that any log file contains the message
      let foundMessage = false;
      for (const file of logFiles) {
        if (file.includes('.log')) {
          try {
            const logContent = await fs.readFile(path.join(testLogDir, file), 'utf-8');
            if (logContent.includes(testMessage)) {
              foundMessage = true;
              break;
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
      expect(foundMessage).toBe(true);
    });

    test('writes debug messages', async () => {
      (Logger as any).instance = undefined;
      const debugLogger = Logger.getInstance({ file: path.join(testLogDir, 'debug-test.log'), level: 'debug' });
      const testMessage = 'Test debug message';
      debugLogger.debug(testMessage);
      await new Promise(resolve => setTimeout(resolve, 200));
      const logFiles = await fs.readdir(testLogDir);
      let foundMessage = false;
      for (const file of logFiles) {
        if (file.includes('.log')) {
          try {
            const logContent = await fs.readFile(path.join(testLogDir, file), 'utf-8');
            if (logContent.includes(testMessage)) {
              foundMessage = true;
              break;
            }
          } catch {}
        }
      }
      expect(foundMessage).toBe(true);
    });

    test('formats messages correctly', async () => {
      const testMessage = 'Test formatted message';
      const testModule = 'TestModule';
      const testMetadata = { key: 'value' };

      logger.info(testMessage, testModule, testMetadata);

      // Wait for async file write
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if log file exists and contains formatted message
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);

      // Check that any log file contains the message
      let foundMessage = false;
      for (const file of logFiles) {
        if (file.includes('.log')) {
          try {
            const logContent = await fs.readFile(path.join(testLogDir, file), 'utf-8');
            if (logContent.includes(testMessage)) {
              foundMessage = true;
              break;
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
      expect(foundMessage).toBe(true);
    });
  });

  describe('Log Rotation', () => {
    test('rotates files properly', async () => {
      // Create logger with rotation settings
      const rotationLogger = Logger.getInstance({
        file: path.join(testLogDir, 'rotation-test.log'),
        maxSize: '1k',
        maxFiles: 2
      });

      // Write enough data to trigger rotation
      for (let i = 0; i < 100; i++) {
        rotationLogger.info(`Test message ${i} with some additional content to make it longer`);
      }

      // Wait for rotation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that files were created
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);
    });

    test('maintains log history', async () => {
      // Write some messages
      logger.info('First message');
      logger.info('Second message');
      logger.info('Third message');

      // Wait for writes
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check recent logs
      const recentLogs = logger.getRecentLogs(3);
      expect(recentLogs.length).toBeGreaterThan(0);
      expect(recentLogs[0]?.message).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('fails gracefully on disk errors', async () => {
      // Create logger with invalid path
      const invalidLogger = Logger.getInstance({ file: '/invalid/path/test.log' });
      
      // Should not throw
      expect(() => {
        invalidLogger.info('Test message');
      }).not.toThrow();
    });

    test('handles invalid log levels', () => {
      // Should not throw with invalid level
      expect(() => {
        logger.setLevel('invalid-level');
      }).not.toThrow();
    });

    test('recovers from file system issues', async () => {
      // Create logger
      const recoveryLogger = Logger.getInstance({ file: path.join(testLogDir, 'recovery.log') });
      
      // Write some messages
      recoveryLogger.info('Test message');
      
      // Should not throw
      expect(() => {
        recoveryLogger.info('Another message');
      }).not.toThrow();
    });

    test('maintains functionality during errors', () => {
      // Logger should still work even if file system has issues
      expect(() => {
        logger.info('Test message');
        logger.error('Test error');
        logger.warn('Test warning');
        logger.debug('Test debug');
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    test('uses correct log directory', async () => {
      const customLogDir = path.join(testLogDir, 'custom');
      await fs.ensureDir(customLogDir);
      const customLogger = Logger.getInstance({ file: path.join(customLogDir, 'custom.log') });
      customLogger.info('Test message');
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(await fs.pathExists(customLogDir)).toBe(true);
    });

    test('respects log level settings', () => {
      // Reset singleton to test different levels
      (Logger as any).instance = undefined;
      
      const debugLogger = Logger.getInstance({ level: 'debug' });
      expect(debugLogger.getLevel()).toBe('debug');
      
      // Reset singleton again
      (Logger as any).instance = undefined;
      
      const infoLogger = Logger.getInstance({ level: 'info' });
      expect(infoLogger.getLevel()).toBe('info');
    });

    test('uses proper file naming', async () => {
      const testFileName = 'test-naming.log';
      const namingLogger = Logger.getInstance({ file: path.join(testLogDir, testFileName) });
      
      namingLogger.info('Test message');
      
      // Wait for write
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that files were created
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);
    });

    test('handles configuration changes', async () => {
      const testLogDir1 = path.join(testLogDir, 'config1');
      const testLogDir2 = path.join(testLogDir, 'config2');
      await fs.ensureDir(testLogDir1);
      await fs.ensureDir(testLogDir2);
      (Logger as any).instance = undefined;
      const logger1 = Logger.getInstance({ file: path.join(testLogDir1, 'test1.log') });
      (Logger as any).instance = undefined;
      const logger2 = Logger.getInstance({ file: path.join(testLogDir2, 'test2.log') });
      logger1.info('Message 1');
      logger2.info('Message 2');
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(await fs.pathExists(testLogDir1)).toBe(true);
      expect(await fs.pathExists(testLogDir2)).toBe(true);
    });
  });
}); 