import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemStats } from '../../backend/src/core/SystemStats';
import { SystemStats as ISystemStats } from '@interactor/shared';

describe('SystemStats', () => {
  let systemStats: SystemStats;

  beforeEach(() => {
    systemStats = new SystemStats({
      updateInterval: 100
    });
  });

  afterEach(async () => {
    await systemStats.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultStats = new SystemStats();
      expect(defaultStats).toBeInstanceOf(SystemStats);
      defaultStats.destroy();
    });

    it('should initialize with custom configuration', () => {
      const customStats = new SystemStats({
        updateInterval: 5000
      });
      expect(customStats).toBeInstanceOf(SystemStats);
      customStats.destroy();
    });

    it('should initialize successfully', async () => {
      await expect(systemStats.init()).resolves.not.toThrow();
      const stats = systemStats.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Metrics Collection', () => {
    it('should collect basic system metrics', async () => {
      await systemStats.init();
      
      // Wait for initial stats update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const stats = systemStats.getStats();
      expect(stats.cpu).toBeDefined();
      expect(stats.memory).toBeDefined();
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should collect detailed performance metrics when enabled', async () => {
      const detailedStats = new SystemStats({
        updateInterval: 100
      });

      await detailedStats.init();
      
      // Wait for initial stats update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const stats = detailedStats.getStats();
      expect(stats.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(stats.cpu.usage).toBeLessThanOrEqual(100);
      expect(stats.memory.used).toBeGreaterThan(0);
      expect(stats.memory.total).toBeGreaterThan(0);
      
      await detailedStats.destroy();
    });

    it('should update metrics over time', async () => {
      await systemStats.init();
      
      const initialStats = systemStats.getStats();
      
      // Wait for metrics update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const updatedStats = systemStats.getStats();
      expect(updatedStats.uptime).toBeGreaterThan(initialStats.uptime);
    });

    it('should handle concurrent metrics collection', async () => {
      await systemStats.init();
      
      // Wait for initial stats update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const collectionPromises: Promise<ISystemStats>[] = [];
      
      for (let i = 0; i < 20; i++) {
        collectionPromises.push(
          new Promise<ISystemStats>((resolve) => {
            setTimeout(() => {
              resolve(systemStats.getStats());
            }, Math.random() * 50);
          })
        );
      }
      
      const results = await Promise.all(collectionPromises);
      
      results.forEach(stats => {
        expect(stats).toBeDefined();
        expect(stats.uptime).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Tracking', () => {
    it('should track message statistics', async () => {
      await systemStats.init();
      
      // Simulate messages
      for (let i = 0; i < 100; i++) {
        systemStats.incrementMessageSent();
      }
      
      const stats = systemStats.getStats();
      expect(stats.messages.sent).toBeGreaterThanOrEqual(100);
    });

    it('should track different message types', async () => {
      await systemStats.init();
      
      systemStats.incrementMessageSent();
      systemStats.incrementMessageReceived();
      systemStats.incrementMessageErrors();
      
      const stats = systemStats.getStats();
      expect(stats.messages.sent).toBeGreaterThan(0);
      expect(stats.messages.received).toBeGreaterThan(0);
      expect(stats.messages.errors).toBeGreaterThan(0);
    });

    it('should handle high-frequency message recording', async () => {
      await systemStats.init();
      
      const recordPromises: Promise<void>[] = [];
      
      for (let i = 0; i < 1000; i++) {
        recordPromises.push(
          new Promise<void>((resolve) => {
            systemStats.incrementMessageSent();
            resolve();
          })
        );
      }
      
      await Promise.all(recordPromises);
      
      const stats = systemStats.getStats();
      expect(stats.messages.sent).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Health Monitoring', () => {
    it('should determine system health status', async () => {
      await systemStats.init();
      
      const health = systemStats.getHealthStatus();
      expect(health.status).toBeDefined();
      expect(['healthy', 'warning', 'critical']).toContain(health.status);
      expect(health.issues).toBeDefined();
    });

    it('should detect performance issues', async () => {
      const healthStats = new SystemStats({
        updateInterval: 50
      });

      await healthStats.init();
      
      // Simulate high error rate
      for (let i = 0; i < 100; i++) {
        healthStats.incrementMessageReceived();
        if (i % 10 === 0) {
          healthStats.incrementMessageErrors();
        }
      }
      
      const health = healthStats.getHealthStatus();
      expect(health.issues).toBeDefined();
      
      await healthStats.destroy();
    });

    it('should provide health status', async () => {
      await systemStats.init();
      
      const health = systemStats.getHealthStatus();
      expect(health.issues).toBeDefined();
      expect(Array.isArray(health.issues)).toBe(true);
    });
  });

  describe('Real-time Monitoring', () => {
    it('should emit module stats update events', async () => {
      await systemStats.init();
      
      const updateEvents: any[] = [];
      
      systemStats.on('moduleStatsUpdated', (moduleStats: any) => {
        updateEvents.push(moduleStats);
      });
      
      // Update module stats
      systemStats.updateModuleStats(5, 3, 1);
      
      expect(updateEvents.length).toBeGreaterThan(0);
    });

    it('should emit message stats update events', async () => {
      const healthStats = new SystemStats({
        updateInterval: 50
      });

      await healthStats.init();
      
      const updateEvents: any[] = [];
      
      healthStats.on('messageStatsUpdated', (messageStats: any) => {
        updateEvents.push(messageStats);
      });
      
      // Update message stats
      healthStats.updateMessageStats(100, 95, 5);
      
      expect(updateEvents.length).toBeGreaterThan(0);
      
      await healthStats.destroy();
    });
  });

  describe('Resource Monitoring', () => {
    it('should monitor CPU usage accurately', async () => {
      await systemStats.init();
      
      const stats = systemStats.getStats();
      expect(stats.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(stats.cpu.usage).toBeLessThanOrEqual(100);
      expect(stats.cpu.cores).toBeGreaterThan(0);
    });

    it('should monitor memory usage accurately', async () => {
      await systemStats.init();
      
      // Wait for initial stats update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const stats = systemStats.getStats();
      expect(stats.memory.used).toBeGreaterThan(0);
      expect(stats.memory.total).toBeGreaterThan(0);
      expect(stats.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(stats.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should track uptime correctly', async () => {
      await systemStats.init();
      
      // Wait for initial stats update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const initialStats = systemStats.getStats();
      expect(initialStats.uptime).toBeGreaterThan(0);
      
      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updatedStats = systemStats.getStats();
      expect(updatedStats.uptime).toBeGreaterThan(initialStats.uptime);
    });
  });

  describe('Error Handling', () => {
    it('should handle metrics collection errors gracefully', async () => {
      // Mock process.cpuUsage to throw error
      const originalCpuUsage = process.cpuUsage;
      process.cpuUsage = vi.fn().mockImplementation(() => {
        throw new Error('CPU usage error');
      });
      
      await systemStats.init();
      
      // Should not throw error
      const stats = systemStats.getStats();
      expect(stats).toBeDefined();
      
      // Restore original function
      process.cpuUsage = originalCpuUsage;
    });

    it('should handle concurrent access safely', async () => {
      await systemStats.init();
      
      const accessPromises: Promise<void>[] = [];
      
      for (let i = 0; i < 50; i++) {
        accessPromises.push(
          new Promise<void>((resolve) => {
            systemStats.incrementMessageSent();
            systemStats.getStats();
            resolve();
          })
        );
      }
      
      await Promise.all(accessPromises);
      // Should not throw errors
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const startTime = Date.now();
      
      await systemStats.init();
      
      // Simulate high-frequency operations
      for (let i = 0; i < 10000; i++) {
        systemStats.incrementMessageSent();
        if (i % 1000 === 0) {
          systemStats.incrementMessageReceived();
        }
      }
      
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      
      const stats = systemStats.getStats();
      expect(stats.messages.sent).toBeGreaterThanOrEqual(10000);
    });

    it('should maintain performance under load', async () => {
      await systemStats.init();
      
      const loadPromises: Promise<void>[] = [];
      
      for (let i = 0; i < 100; i++) {
        loadPromises.push(
          new Promise<void>(async (resolve) => {
            for (let j = 0; j < 100; j++) {
              systemStats.incrementMessageSent();
            }
            resolve();
          })
        );
      }
      
      await Promise.all(loadPromises);
      
      const stats = systemStats.getStats();
      expect(stats.messages.sent).toBeGreaterThanOrEqual(10000);
    });
  });

  describe('Configuration', () => {
    it('should respect update interval configuration', async () => {
      const slowStats = new SystemStats({
        updateInterval: 500
      });

      await slowStats.init();
      
      const initialStats = slowStats.getStats();
      
      // Wait less than update interval
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const midStats = slowStats.getStats();
      expect(midStats.uptime).toBeGreaterThanOrEqual(initialStats.uptime);
      
      // Wait more than update interval
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const finalStats = slowStats.getStats();
      expect(finalStats.uptime).toBeGreaterThan(initialStats.uptime);
      
      await slowStats.destroy();
    });

    it('should handle reset functionality', async () => {
      await systemStats.init();
      
      // Add some data
      systemStats.incrementMessageSent();
      systemStats.incrementMessageReceived();
      
      const beforeReset = systemStats.getStats();
      expect(beforeReset.messages.sent).toBeGreaterThan(0);
      
      // Reset
      systemStats.reset();
      
      const afterReset = systemStats.getStats();
      expect(afterReset.messages.sent).toBe(0);
      expect(afterReset.messages.received).toBe(0);
    });
  });
}); 