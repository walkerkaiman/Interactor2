import React, { useEffect, useRef, useCallback } from 'react';
import { ConsolePageState } from '../types';
import styles from './ConsolePage.module.css';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  module?: string;
  data?: any;
}

interface ConsolePageProps {
  state: ConsolePageState;
  onStateUpdate: (updates: Partial<ConsolePageState>) => void;
}

const ConsolePage: React.FC<ConsolePageProps> = ({ state, onStateUpdate }) => {
  const { logs, loading, error, autoScroll, filterLevel } = state;
  const consoleRef = useRef<HTMLDivElement>(null);
  
  console.log('ConsolePage rendered with state:', state);

  const loadLogs = useCallback(async () => {
    try {
      onStateUpdate({ loading: true });
      // This would be implemented in the backend to serve logs
      // For now, we'll show mock data
      const mockLogs: LogEntry[] = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'System started successfully',
          module: 'System'
        },
        {
          timestamp: new Date(Date.now() - 1000).toISOString(),
          level: 'info',
          message: 'Loaded 8 modules',
          module: 'ModuleLoader'
        },
        {
          timestamp: new Date(Date.now() - 2000).toISOString(),
          level: 'warn',
          message: 'Module "http_input" has no configuration',
          module: 'ModuleLoader'
        },
        {
          timestamp: new Date(Date.now() - 3000).toISOString(),
          level: 'info',
          message: 'API server listening on port 3001',
          module: 'Server'
        },
        {
          timestamp: new Date(Date.now() - 4000).toISOString(),
          level: 'error',
          message: 'Failed to connect to database',
          module: 'Database'
        },
        {
          timestamp: new Date(Date.now() - 5000).toISOString(),
          level: 'debug',
          message: 'Processing interaction: frame_change -> dmx_output',
          module: 'MessageRouter'
        }
      ];
      
      onStateUpdate({ 
        logs: mockLogs, 
        error: null, 
        loading: false, 
        lastRefresh: Date.now() 
      });
    } catch (err) {
      onStateUpdate({ 
        error: 'Failed to load logs', 
        loading: false 
      });
      console.error('Error loading logs:', err);
    }
  }, [onStateUpdate]);

  useEffect(() => {
    loadLogs();
    
    // Refresh logs every 10 seconds
    const interval = setInterval(loadLogs, 10000);
    
    return () => clearInterval(interval);
  }, [loadLogs]);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'error': return '#dc3545';
      case 'warn': return '#ffc107';
      case 'debug': return '#6c757d';
      default: return '#28a745';
    }
  };

  const getLevelIcon = (level: string): string => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'debug': return '🔍';
      default: return 'ℹ️';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const filteredLogs = logs.filter(log => 
    filterLevel === 'all' || log.level === filterLevel
  );

  const clearLogs = () => {
    onStateUpdate({ logs: [] });
  };

  if (loading && logs.length === 0) {
    return (
      <div className={styles.consolePage}>
        <div className={styles.loading}>Loading console logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.consolePage}>
        <div className={styles.error}>
          <h3>Error Loading Logs</h3>
          <p>{error}</p>
          <button onClick={loadLogs} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.consolePage}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>System Console</h1>
          <p>Real-time system logs and debugging information</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.controls}>
            <label className={styles.autoScrollLabel}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => onStateUpdate({ autoScroll: e.target.checked })}
              />
              Auto-scroll
            </label>
            
            <select
              value={filterLevel}
              onChange={(e) => onStateUpdate({ filterLevel: e.target.value as any })}
              className={styles.levelFilter}
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
              <option value="debug">Debug</option>
            </select>
            
            <button onClick={loadLogs} className={styles.refreshButton}>
              Refresh
            </button>
            
            <button onClick={clearLogs} className={styles.clearButton}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className={styles.consoleContainer}>
        <div className={styles.consoleHeader}>
          <span className={styles.logCount}>
            {filteredLogs.length} log entries
          </span>
          <span className={styles.timestamp}>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
        
        <div className={styles.console} ref={consoleRef}>
          {filteredLogs.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No logs to display</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className={styles.logEntry}>
                <div className={styles.logHeader}>
                  <span className={styles.logTimestamp}>
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span 
                    className={styles.logLevel}
                    style={{ color: getLevelColor(log.level) }}
                  >
                    {getLevelIcon(log.level)} {log.level.toUpperCase()}
                  </span>
                  {log.module && (
                    <span className={styles.logModule}>
                      [{log.module}]
                    </span>
                  )}
                </div>
                <div className={styles.logMessage}>
                  {log.message}
                </div>
                {log.data && (
                  <div className={styles.logData}>
                    <pre>{JSON.stringify(log.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsolePage; 