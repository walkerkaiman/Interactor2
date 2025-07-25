import { EventEmitter } from 'events';
import { SystemStats as ISystemStats } from '@interactor/shared';

export class SystemStats extends EventEmitter {
  private stats: ISystemStats;
  private updateInterval: number;
  private updateTimer?: NodeJS.Timeout;
  private startTime: number;
  private lastCpuUsage: number = 0;
  private lastCpuTime: number = 0;

  constructor(
    private config: {
      updateInterval?: number;
      enableCpuTracking?: boolean;
    } = {},
    private logger?: any
  ) {
    super();

    this.updateInterval = config.updateInterval || 5000; // 5 seconds
    this.startTime = Date.now();

    // Initialize stats
    this.stats = {
      uptime: 0,
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      cpu: {
        usage: 0,
        cores: 0
      },
      modules: {
        total: 0,
        active: 0,
        errors: 0
      },
      messages: {
        sent: 0,
        received: 0,
        errors: 0
      }
    };
  }

  /**
   * Initialize the system stats tracker
   */
  public async init(): Promise<void> {
    this.logger?.info('Initializing SystemStats');
    
    // Get initial CPU info
    this.stats.cpu.cores = require('os').cpus().length;
    
    // Start periodic updates
    this.startUpdates();
    
    this.logger?.info('SystemStats initialized');
  }

  /**
   * Start periodic stats updates
   */
  private startUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTimer = setInterval(() => {
      this.updateStats();
    }, this.updateInterval);
    
    this.logger?.debug(`SystemStats updates started with ${this.updateInterval}ms interval`);
  }

  /**
   * Stop periodic stats updates
   */
  private stopUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined as any;
      this.logger?.debug('SystemStats updates stopped');
    }
  }

  /**
   * Update all system statistics
   */
  private updateStats(): void {
    try {
      // Update uptime
      this.stats.uptime = Date.now() - this.startTime;
      
      // Update memory stats
      this.updateMemoryStats();
      
      // Update CPU stats
      if (this.config.enableCpuTracking !== false) {
        this.updateCpuStats();
      }
      
      // Emit updated stats
      this.emit('statsUpdated', this.stats);
      
    } catch (error) {
      this.logger?.error('Error updating system stats:', error);
    }
  }

  /**
   * Update memory statistics
   */
  private updateMemoryStats(): void {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    
    this.stats.memory = {
      used: memUsage.heapUsed,
      total: totalMem,
      percentage: (memUsage.heapUsed / totalMem) * 100
    };
  }

  /**
   * Update CPU statistics
   */
  private updateCpuStats(): void {
    const cpus = require('os').cpus();
    const currentTime = Date.now();
    
    if (this.lastCpuTime > 0) {
      const timeDiff = currentTime - this.lastCpuTime;
      
      // Calculate CPU usage based on process CPU time
      const processUsage = process.cpuUsage();
      const totalCpuTime = processUsage.user + processUsage.system;
      const cpuUsageDiff = totalCpuTime - this.lastCpuUsage;
      
      // Convert to percentage (approximate)
      this.stats.cpu.usage = (cpuUsageDiff / timeDiff) * 100;
      
      this.lastCpuUsage = totalCpuTime;
    }
    
    this.lastCpuTime = currentTime;
    this.stats.cpu.cores = cpus.length;
  }

  /**
   * Get current system stats
   */
  public getStats(): ISystemStats {
    return { ...this.stats };
  }

  /**
   * Update module statistics
   */
  public updateModuleStats(total: number, active: number, errors: number): void {
    this.stats.modules = { total, active, errors };
    this.emit('moduleStatsUpdated', this.stats.modules);
  }

  /**
   * Update message statistics
   */
  public updateMessageStats(sent: number, received: number, errors: number): void {
    this.stats.messages = { sent, received, errors };
    this.emit('messageStatsUpdated', this.stats.messages);
  }

  /**
   * Increment message counters
   */
  public incrementMessageSent(): void {
    this.stats.messages.sent++;
  }

  public incrementMessageReceived(): void {
    this.stats.messages.received++;
  }

  public incrementMessageErrors(): void {
    this.stats.messages.errors++;
  }

  /**
   * Get memory usage in human-readable format
   */
  public getMemoryUsageFormatted(): {
    used: string;
    total: string;
    percentage: number;
  } {
    const formatBytes = (bytes: number): string => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    return {
      used: formatBytes(this.stats.memory.used),
      total: formatBytes(this.stats.memory.total),
      percentage: Math.round(this.stats.memory.percentage * 100) / 100
    };
  }

  /**
   * Get uptime in human-readable format
   */
  public getUptimeFormatted(): string {
    const seconds = Math.floor(this.stats.uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get system health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check memory usage
    if (this.stats.memory.percentage > 90) {
      issues.push('High memory usage');
      status = 'critical';
    } else if (this.stats.memory.percentage > 80) {
      issues.push('Elevated memory usage');
      status = status === 'healthy' ? 'warning' : status;
    }

    // Check CPU usage
    if (this.stats.cpu.usage > 90) {
      issues.push('High CPU usage');
      status = 'critical';
    } else if (this.stats.cpu.usage > 80) {
      issues.push('Elevated CPU usage');
      status = status === 'healthy' ? 'warning' : status;
    }

    // Check module errors
    if (this.stats.modules.errors > 0) {
      issues.push(`${this.stats.modules.errors} module errors`);
      status = status === 'healthy' ? 'warning' : status;
    }

    // Check message errors
    if (this.stats.messages.errors > 0) {
      const errorRate = (this.stats.messages.errors / Math.max(this.stats.messages.received, 1)) * 100;
      if (errorRate > 10) {
        issues.push('High message error rate');
        status = 'critical';
      } else if (errorRate > 5) {
        issues.push('Elevated message error rate');
        status = status === 'healthy' ? 'warning' : status;
      }
    }

    return { status, issues };
  }

  /**
   * Reset all statistics
   */
  public reset(): void {
    this.stats = {
      uptime: 0,
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      cpu: {
        usage: 0,
        cores: this.stats.cpu.cores
      },
      modules: {
        total: 0,
        active: 0,
        errors: 0
      },
      messages: {
        sent: 0,
        received: 0,
        errors: 0
      }
    };

    this.startTime = Date.now();
    this.lastCpuUsage = 0;
    this.lastCpuTime = 0;

    this.emit('statsReset');
  }

  /**
   * Get detailed system information
   */
  public getDetailedInfo(): {
    platform: string;
    arch: string;
    nodeVersion: string;
    version: string;
    processId: number;
    uptime: string;
    memory: any;
    cpu: any;
  } {
    const os = require('os');
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      version: '2.0.0', // Add version property
      processId: process.pid,
      uptime: this.getUptimeFormatted(),
      memory: this.getMemoryUsageFormatted(),
      cpu: {
        usage: this.stats.cpu.usage,
        cores: this.stats.cpu.cores
      }
    };
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    this.logger?.info('Destroying SystemStats');
    
    // Stop updates
    this.stopUpdates();
    
    this.logger?.info('SystemStats destroyed');
  }
} 