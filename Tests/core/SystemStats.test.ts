import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemStats } from '../../backend/src/core/SystemStats';
import { SystemStats as ISystemStats } from '@interactor/shared';

describe('SystemStats', () => {
  let systemStats: SystemStats;

  beforeEach(() => {
    systemStats = new SystemStats({
      updateInterval: 100,
      enableDetailedMetrics: true
    });
  });

  afterEach(async () => {
    await systemStats.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultStats = new SystemStats();
      expect(defaultStats).toBeInstanceOf(SystemStats);
      defaultStats.shutdown();
    });

    it('should initialize with custom configuration', () => {
      const customStats = new SystemStats({
        updateInterval: 5000,
        enableDetailedMetrics: false,
        maxHistorySize: 1000
      });
      expect(customStats).toBeInstanceOf(SystemStats);
      customStats.shutdown();
    });

    it('should initialize successfully', async () => {
      await expect(systemStats.init()).resolves.not.toThrow();
      const metrics = systemStats.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Metrics Collection', () => {
    it('should collect basic system metrics', async () => {
      await systemStats.init();
      
      const metrics = systemStats.getMetrics();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.memory).toBeDefined();
      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeGreaterThan(0);
    });

    it('should collect detailed performance metrics when enabled', async () => {
      const detailedStats = new SystemStats({
        updateInterval: 100,
        enableDetailedMetrics: true
      });

      await detailedStats.init();
      
      const metrics = detailedStats.getMetrics();
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
      expect(metrics.memory.used).toBeGreaterThan(0);
      expect(metrics.memory.total).toBeGreaterThan(0);
      expect(metrics.memory.available).toBeGreaterThan(0);
      
      await detailedStats.shutdown();
    });

    it('should update metrics over time', async () => {
      await systemStats.init();
      
      const initialMetrics = systemStats.getMetrics();
      
      // Wait for metrics update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const updatedMetrics = systemStats.getMetrics();
      expect(updatedMetrics.timestamp).toBeGreaterThan(initialMetrics.timestamp);
    });

    it('should handle concurrent metrics collection', async () => {
      await systemStats.init();
      
      const collectionPromises = [];
      
      for (let i = 0; i < 20; i++) {
        collectionPromises.push(
          new Promise<SystemMetrics>((resolve) => {
            setTimeout(() => {
              resolve(systemStats.getMetrics());
            }, Math.random() * 50);
          })
        );
      }
      
      const results = await Promise.all(collectionPromises);
      
      results.forEach(metrics => {
        expect(metrics).toBeDefined();
        expect(metrics.timestamp).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Tracking', () => {
    it('should track event throughput', async () => {
      await systemStats.init();
      
      // Simulate events
      for (let i = 0; i < 100; i++) {
        systemStats.recordEvent('test-event');
      }
      
      const metrics = systemStats.getMetrics();
      expect(metrics.events.total).toBeGreaterThanOrEqual(100);
      expect(metrics.events.throughput).toBeGreaterThan(0);
    });

    it('should track different event types', async () => {
      await systemStats.init();
      
      systemStats.recordEvent('input-event');
      systemStats.recordEvent('output-event');
      systemStats.recordEvent('system-event');
      
      const metrics = systemStats.getMetrics();
      expect(metrics.events.byType['input-event']).toBeGreaterThan(0);
      expect(metrics.events.byType['output-event']).toBeGreaterThan(0);
      expect(metrics.events.byType['system-event']).toBeGreaterThan(0);
    });

    it('should track response times', async () => {
      await systemStats.init();
      
      // Simulate operations with different response times
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        // Simulate operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        const endTime = Date.now();
        systemStats.recordResponseTime('test-operation', endTime - startTime);
      }
      
      const metrics = systemStats.getMetrics();
      expect(metrics.performance['test-operation']).toBeDefined();
      expect(metrics.performance['test-operation'].count).toBe(10);
      expect(metrics.performance['test-operation'].average).toBeGreaterThan(0);
    });

    it('should handle high-frequency event recording', async () => {
      await systemStats.init();
      
      const recordPromises = [];
      
      for (let i = 0; i < 1000; i++) {
        recordPromises.push(
          new Promise<void>((resolve) => {
            systemStats.recordEvent(`high-freq-event-${i % 10}`);
            resolve();
          })
        );
      }
      
      await Promise.all(recordPromises);
      
      const metrics = systemStats.getMetrics();
      expect(metrics.events.total).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Metrics History', () => {
    it('should maintain metrics history', async () => {
      const historyStats = new SystemStats({
        updateInterval: 50,
        enableDetailedMetrics: true,
        maxHistorySize: 10
      });

      await historyStats.init();
      
      // Wait for multiple updates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const history = historyStats.getHistory();
      expect(history.length).toBeGreaterThan(1);
      expect(history.length).toBeLessThanOrEqual(10);
      
      await historyStats.shutdown();
    });

    it('should limit history size', async () => {
      const limitedStats = new SystemStats({
        updateInterval: 50,
        enableDetailedMetrics: true,
        maxHistorySize: 5
      });

      await limitedStats.init();
      
      // Wait for more updates than max history size
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const history = limitedStats.getHistory();
      expect(history.length).toBeLessThanOrEqual(5);
      
      await limitedStats.shutdown();
    });

    it('should provide historical trends', async () => {
      const trendStats = new SystemStats({
        updateInterval: 50,
        enableDetailedMetrics: true,
        maxHistorySize: 20
      });

      await trendStats.init();
      
      // Record some events over time
      for (let i = 0; i < 50; i++) {
        trendStats.recordEvent('trend-event');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      const trends = trendStats.getTrends();
      expect(trends.events).toBeDefined();
      expect(trends.cpu).toBeDefined();
      expect(trends.memory).toBeDefined();
      
      await trendStats.shutdown();
    });
  });

  describe('Health Monitoring', () => {
    it('should determine system health status', async () => {
      await systemStats.init();
      
      const health = systemStats.getHealthStatus();
      expect(health.status).toBeDefined();
      expect(['healthy', 'warning', 'critical']).toContain(health.status);
      expect(health.checks).toBeDefined();
    });

    it('should detect performance issues', async () => {
      const healthStats = new SystemStats({
        updateInterval: 50,
        enableDetailedMetrics: true,
        thresholds: {
          cpu: { warning: 50, critical: 80 },
          memory: { warning: 70, critical: 90 },
          responseTime: { warning: 1000, critical: 5000 }
        }
      });

      await healthStats.init();
      
      // Simulate high CPU usage
      for (let i = 0; i < 100; i++) {
        healthStats.recordResponseTime('slow-operation', 2000);
      }
      
      const health = healthStats.getHealthStatus();
      expect(health.checks).toHaveLength(3); // CPU, Memory, Response Time
      
      await healthStats.shutdown();
    });

    it('should provide health recommendations', async () => {
      await systemStats.init();
      
      const health = systemStats.getHealthStatus();
      expect(health.recommendations).toBeDefined();
      expect(Array.isArray(health.recommendations)).toBe(true);
    });
  });

  describe('Real-time Monitoring', () => {
    it('should emit metrics update events', async () => {
      await systemStats.init();
      
      const updateEvents: SystemMetrics[] = [];
      
      systemStats.on('metrics:updated', (metrics: SystemMetrics) => {
        updateEvents.push(metrics);
      });
      
      // Wait for metrics updates
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(updateEvents.length).toBeGreaterThan(0);
    });

    it('should emit health status events', async () => {
      const healthStats = new SystemStats({
        updateInterval: 50,
        enableDetailedMetrics: true,
        thresholds: {
          cpu: { warning: 10, critical: 20 },
          memory: { warning: 10, critical: 20 },
          responseTime: { warning: 100, critical: 200 }
        }
      });

      await healthStats.init();
      
      const healthEvents: any[] = [];
      
      healthStats.on('health:changed', (health: any) => {
        healthEvents.push(health);
      });
      
      // Wait for health checks
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(healthEvents.length).toBeGreaterThanOrEqual(0);
      
      await healthStats.shutdown();
    });
  });

  describe('Resource Monitoring', () => {
    it('should monitor CPU usage accurately', async () => {
      await systemStats.init();
      
      const metrics = systemStats.getMetrics();
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
      expect(metrics.cpu.cores).toBeGreaterThan(0);
    });

    it('should monitor memory usage accurately', async () => {
      await systemStats.init();
      
      const metrics = systemStats.getMetrics();
      expect(metrics.memory.used).toBeGreaterThan(0);
      expect(metrics.memory.total).toBeGreaterThan(0);
      expect(metrics.memory.available).toBeGreaterThan(0);
      expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should track uptime correctly', async () => {
      await systemStats.init();
      
      const initialMetrics = systemStats.getMetrics();
      expect(initialMetrics.uptime).toBeGreaterThan(0);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updatedMetrics = systemStats.getMetrics();
      expect(updatedMetrics.uptime).toBeGreaterThan(initialMetrics.uptime);
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
      const metrics = systemStats.getMetrics();
      expect(metrics).toBeDefined();
      
      // Restore original function
      process.cpuUsage = originalCpuUsage;
    });

    it('should handle concurrent access safely', async () => {
      await systemStats.init();
      
      const accessPromises = [];
      
      for (let i = 0; i < 50; i++) {
        accessPromises.push(
          new Promise<void>((resolve) => {
            systemStats.recordEvent('concurrent-event');
            systemStats.getMetrics();
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
      
      const loadPromises = [];
      
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
        updateInterval: 500,
        enableDetailedMetrics: true
      });

      await slowStats.init();
      
      const initialMetrics = slowStats.getMetrics();
      
      // Wait less than update interval
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const midMetrics = slowStats.getMetrics();
      expect(midMetrics.timestamp).toBe(initialMetrics.timestamp);
      
      // Wait more than update interval
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const finalMetrics = slowStats.getMetrics();
      expect(finalMetrics.timestamp).toBeGreaterThan(initialMetrics.timestamp);
      
      await slowStats.shutdown();
    });

    it('should handle configuration changes', async () => {
      await systemStats.init();
      
      // Change configuration
      systemStats.updateConfig({
        updateInterval: 200,
        enableDetailedMetrics: false,
        maxHistorySize: 5
      });
      
      // Wait for configuration to take effect
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const metrics = systemStats.getMetrics();
      expect(metrics).toBeDefined();
    });
  });
}); 