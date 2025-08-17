import React, { useRef, useCallback, useEffect } from 'react';
import { ConsolePageState } from '../types';
import styles from './ConsolePage.module.css';

interface ConsolePageProps {
  state: ConsolePageState;
}

const ConsolePage: React.FC<ConsolePageProps> = ({ state }) => {
  const consoleRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(async () => {
    try {
      // Fetch real logs from the backend API
      const response = await fetch('/api/logs');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const realLogs = (data.logs || []).map((log: any) => ({
        id: log.id || Date.now(),
        timestamp: log.timestamp || new Date().toISOString(),
        level: log.level || 'info',
        message: log.message || 'Unknown log entry',
        source: log.source || 'system'
      }));
    } catch (err) {
      console.error('Error loading logs:', err);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (state.autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [state.logs, state.autoScroll]);

  const getLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'debug': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const filteredLogs = state.logs.filter(log => 
    state.filterLevel === 'all' || log.level === state.filterLevel
  );

  const clearLogs = () => {
    // Clear logs functionality
  };

  if (state.loading && state.logs.length === 0) {
    return (
      <div className={styles.consolePage} data-testid="console-page">
        <div className={styles.loading}>Loading logs...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={styles.consolePage} data-testid="console-page">
        <div className={styles.error}>
          <h3>Error Loading Logs</h3>
          <p>{state.error}</p>
          <button onClick={loadLogs} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.consolePage} data-testid="console-page">
      <div className={styles.consoleHeader}>
        <h2>Console</h2>
        <div className={styles.consoleControls}>
          <button onClick={loadLogs} className={styles.refreshButton}>
            Refresh
          </button>
          <button onClick={clearLogs} className={styles.clearButton}>
            Clear
          </button>
          
          <label className={styles.autoScrollLabel}>
            <input
              type="checkbox"
              checked={state.autoScroll}
              onChange={(e) => {
                // Auto-scroll functionality
              }}
            />
            Auto-scroll
          </label>
          
          <select
            value={state.filterLevel}
            onChange={(e) => {
              // Filter functionality
            }}
            className={styles.levelFilter}
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>
      </div>
      
      <div className={styles.consoleOutput} ref={consoleRef}>
        {filteredLogs.length === 0 ? (
          <div className={styles.noLogs}>No logs available</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className={styles.logEntry}>
              <span className={styles.timestamp}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span 
                className={styles.level}
                style={{ color: getLevelColor(log.level) }}
              >
                [{log.level.toUpperCase()}]
              </span>
              <span className={styles.message}>{log.message}</span>
              {log.source && (
                <span className={styles.source}>[{log.source}]</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConsolePage; 