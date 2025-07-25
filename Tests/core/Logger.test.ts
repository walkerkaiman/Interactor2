import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '@/core/Logger';
import { LogEntry } from '@interactor/shared';
import fs from 'fs-extra';
import path from 'path';

describe('Logger', () => {
  let logger: Logger;
  const testLogDir = path.join(__dirname, '../../test-logs');

  beforeEach(async () => {
    // Clean up test directory
    await fs.remove(testLogDir);
    await fs.ensureDir(testLogDir);
    
    logger = new Logger({
      level: 'debug',
      console: true,
      file: {
        enabled: true,
        dir: testLogDir,
        maxSize: '10m',
        maxFiles: 5
      }
    });
  });

  afterEach(async () => {
    await logger.shutdown();
    await fs.remove(testLogDir);
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger).toBeInstanceOf(Logger);
      expect(defaultLogger.getRecentLogs()).toEqual([]);
    });

    it('should initialize with custom configuration', () => {
      const customLogger = new Logger({
        level: 'warn',
        console: false,
        file: { enabled: false }
      });
      expect(customLogger).toBeInstanceOf(Logger);
    });
  });

  describe('Logging Methods', () => {
    it('should log messages with different levels', async () => {
      const messages = [
        { level: 'debug', message: 'Debug message' },
        { level: 'info', message: 'Info message' },
        { level: 'warn', message: 'Warning message' },
        { level: 'error', message: 'Error message' }
      ];

      for (const msg of messages) {
        logger.log(msg.level as any, msg.message);
      }

      const recentLogs = logger.getRecentLogs();
      expect(recentLogs).toHaveLength(4);
      
      messages.forEach((msg, index) => {
        expect(recentLogs[index].level).toBe(msg.level);
        expect(recentLogs[index].message).toBe(msg.message);
      });
    });

    it('should log messages with module context', async () => {
      logger.log('info', 'Test message', 'TestModule');
      
      const recentLogs = logger.getRecentLogs();
      expect(recentLogs[0].module).toBe('TestModule');
    });

    it('should log messages with metadata', async () => {
      const metadata = { userId: '123', action: 'test' };
      logger.log('info', 'Test message', undefined, metadata);
      
      const recentLogs = logger.getRecentLogs();
      expect(recentLogs[0].metadata).toEqual(metadata);
    });
  });

  describe('Promise-based Operations', () => {
    it('should handle async logging operations', async () => {
      const asyncLogPromises = [];
      
      for (let i = 0; i < 10; i++) {
        asyncLogPromises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              logger.log('info', `Async message ${i}`);
              resolve();
            }, Math.random() * 10);
          })
        );
      }

      await Promise.all(asyncLogPromises);
      
      const recentLogs = logger.getRecentLogs();
      expect(recentLogs).toHaveLength(10);
    });

    it('should handle concurrent file writes', async () => {
      const writePromises = [];
      
      for (let i = 0; i < 50; i++) {
        writePromises.push(
          new Promise<void>((resolve) => {
            logger.log('info', `Concurrent write ${i}`);
            resolve();
          })
        );
      }

      await Promise.all(writePromises);
      
      // Verify logs were written
      const recentLogs = logger.getRecentLogs();
      expect(recentLogs.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Log Buffer Management', () => {
    it('should maintain log buffer within size limits', async () => {
      const maxBufferSize = 100;
      const testLogger = new Logger({ maxBufferSize });
      
      // Add more logs than buffer size
      for (let i = 0; i < maxBufferSize + 50; i++) {
        testLogger.log('info', `Message ${i}`);
      }
      
      const recentLogs = testLogger.getRecentLogs();
      expect(recentLogs.length).toBeLessThanOrEqual(maxBufferSize);
      expect(recentLogs[recentLogs.length - 1].message).toBe(`Message ${maxBufferSize + 49}`);
    });

    it('should handle buffer overflow gracefully', async () => {
      const smallBufferLogger = new Logger({ maxBufferSize: 5 });
      
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            smallBufferLogger.log('info', `Buffer test ${i}`);
            resolve();
          })
        );
      }
      
      await Promise.all(promises);
      
      const logs = smallBufferLogger.getRecentLogs();
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('File Logging', () => {
    it('should write logs to file when enabled', async () => {
      const fileLogger = new Logger({
        file: {
          enabled: true,
          dir: testLogDir,
          maxSize: '1m',
          maxFiles: 3
        }
      });

      await fileLogger.log('info', 'File test message');
      
      // Wait for file write
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const files = await fs.readdir(testLogDir);
      expect(files.length).toBeGreaterThan(0);
      
      await fileLogger.shutdown();
    });

    it('should handle file rotation', async () => {
      const rotationLogger = new Logger({
        file: {
          enabled: true,
          dir: testLogDir,
          maxSize: '1kb',
          maxFiles: 3
        }
      });

      // Write enough logs to trigger rotation
      for (let i = 0; i < 100; i++) {
        await rotationLogger.log('info', `Large message ${i} `.repeat(10));
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const files = await fs.readdir(testLogDir);
      expect(files.length).toBeGreaterThan(0);
      
      await rotationLogger.shutdown();
    });
  });

  describe('WebSocket Streaming', () => {
    it('should emit log events for WebSocket streaming', async () => {
      const logEvents: LogEntry[] = [];
      
      logger.on('log', (logEntry: LogEntry) => {
        logEvents.push(logEntry);
      });

      await logger.log('info', 'WebSocket test message');
      
      expect(logEvents).toHaveLength(1);
      expect(logEvents[0].message).toBe('WebSocket test message');
    });

    it('should handle multiple WebSocket listeners', async () => {
      const listener1Logs: LogEntry[] = [];
      const listener2Logs: LogEntry[] = [];
      
      logger.on('log', (logEntry: LogEntry) => {
        listener1Logs.push(logEntry);
      });
      
      logger.on('log', (logEntry: LogEntry) => {
        listener2Logs.push(logEntry);
      });

      await logger.log('warn', 'Multi-listener test');
      
      expect(listener1Logs).toHaveLength(1);
      expect(listener2Logs).toHaveLength(1);
      expect(listener1Logs[0].message).toBe('Multi-listener test');
      expect(listener2Logs[0].message).toBe('Multi-listener test');
    });
  });

  describe('Error Handling', () => {
    it('should handle logging errors gracefully', async () => {
      const invalidLogger = new Logger({
        file: {
          enabled: true,
          dir: '/invalid/path/that/does/not/exist',
          maxSize: '1m',
          maxFiles: 3
        }
      });

      // Should not throw error
      await expect(invalidLogger.log('error', 'Test error')).resolves.not.toThrow();
      
      await invalidLogger.shutdown();
    });

    it('should handle concurrent shutdown operations', async () => {
      const shutdownPromises = [];
      
      for (let i = 0; i < 5; i++) {
        shutdownPromises.push(logger.shutdown());
      }
      
      await Promise.all(shutdownPromises);
      // Should not throw errors
    });
  });

  describe('Performance', () => {
    it('should handle high-volume logging efficiently', async () => {
      const startTime = Date.now();
      const logPromises = [];
      
      for (let i = 0; i < 1000; i++) {
        logPromises.push(logger.log('info', `Performance test ${i}`));
      }
      
      await Promise.all(logPromises);
      const endTime = Date.now();
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000);
      
      const logs = logger.getRecentLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
  });
}); 