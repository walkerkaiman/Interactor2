import React, { useEffect, useCallback } from 'react';
import { PerformancePageState } from '../types';
import styles from './PerformancePage.module.css';

interface PerformancePageProps {
  state: PerformancePageState;
  onStateUpdate: (updates: Partial<PerformancePageState>) => void;
}

const PerformancePage: React.FC<PerformancePageProps> = ({ state, onStateUpdate }) => {
  const { stats, loading, error } = state;
  
  console.log('PerformancePage rendered with state:', state);

  const loadStats = useCallback(async () => {
    try {
      onStateUpdate({ loading: true });
      
      // Fetch real stats from the backend API
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load stats');
      }
      
      const realStats = result.data;
      
      onStateUpdate({ 
        stats: realStats, 
        error: null, 
        loading: false, 
        lastRefresh: Date.now() 
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      onStateUpdate({ 
        error: `Failed to load system statistics: ${err instanceof Error ? err.message : 'Unknown error'}`, 
        loading: false 
      });
    }
  }, [onStateUpdate]);

  useEffect(() => {
    loadStats();
    
    // Refresh stats every 10 seconds (less frequent to reduce potential issues)
    const interval = setInterval(loadStats, 10000);
    
    return () => clearInterval(interval);
  }, []); // Remove loadStats from dependencies to prevent infinite loop

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMemoryColor = (percentage: number): string => {
    if (percentage < 50) return '#28a745';
    if (percentage < 80) return '#ffc107';
    return '#dc3545';
  };

  const getCpuColor = (usage: number): string => {
    if (usage < 50) return '#28a745';
    if (usage < 80) return '#ffc107';
    return '#dc3545';
  };

  if (loading && !stats) {
    return (
      <div className={styles.performancePage}>
        <div className={styles.loading}>Loading system statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.performancePage}>
        <div className={styles.error}>
          <h3>Error Loading Statistics</h3>
          <p>{error}</p>
          <button onClick={loadStats} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.performancePage}>
      <div className={styles.header}>
        <h1>System Performance</h1>
        <p>Real-time system metrics and performance monitoring</p>
        <button onClick={loadStats} className={styles.refreshButton}>
          Refresh
        </button>
      </div>

      {stats && (
        <div className={styles.content}>
          {/* System Overview */}
          <div className={styles.section}>
            <h2>System Overview</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Uptime</h3>
                  <span className={styles.metricValue}>{stats.uptime}</span>
                </div>
              </div>
              
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>CPU Usage</h3>
                  <span 
                    className={styles.metricValue}
                    style={{ color: getCpuColor(stats.cpu?.usage || 0) }}
                  >
                    {(stats.cpu?.usage || 0).toFixed(1)}%
                  </span>
                </div>
                <div className={styles.metricSubtext}>
                  {stats.cpu?.cores || 0} cores
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Memory Usage</h3>
                  <span 
                    className={styles.metricValue}
                    style={{ color: getMemoryColor(stats.memory?.percentage || 0) }}
                  >
                    {(stats.memory?.percentage || 0).toFixed(1)}%
                  </span>
                </div>
                <div className={styles.metricSubtext}>
                  {formatBytes(stats.memory?.used || 0)} / {formatBytes(stats.memory?.total || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Module Statistics */}
          <div className={styles.section}>
            <h2>Module Statistics</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Total Modules</h3>
                  <span className={styles.metricValue}>{stats.modules?.total || 0}</span>
                </div>
              </div>
              
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Active Modules</h3>
                  <span className={styles.metricValue} style={{ color: '#28a745' }}>
                    {stats.modules?.active || 0}
                  </span>
                </div>
              </div>
              
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Inactive Modules</h3>
                  <span className={styles.metricValue} style={{ color: '#6c757d' }}>
                    {stats.modules?.inactive || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interaction Statistics */}
          <div className={styles.section}>
            <h2>Interaction Statistics</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Total Interactions</h3>
                  <span className={styles.metricValue}>{stats.interactions?.total || 0}</span>
                </div>
              </div>
              
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Active Interactions</h3>
                  <span className={styles.metricValue} style={{ color: '#28a745' }}>
                    {stats.interactions?.active || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Network Statistics */}
          <div className={styles.section}>
            <h2>Network Statistics</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Total Requests</h3>
                  <span className={styles.metricValue}>{stats.network?.requests || 0}</span>
                </div>
              </div>
              
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <h3>Errors</h3>
                  <span className={styles.metricValue} style={{ color: '#dc3545' }}>
                    {stats.network?.errors || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformancePage; 