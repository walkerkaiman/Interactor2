import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogs, useAppActions } from '@/store';
import { LogEntry } from '@/types/api';
import { LogFilters } from '@/types/ui';

export const ConsoleTab: React.FC = () => {
  const logs = useLogs();
  const { setLogFilters, clearLogs, pauseLogs } = useAppActions();
  const [filters, setFilters] = useState<LogFilters>({
    levels: ['info', 'warn', 'error'],
    modules: [],
    searchQuery: '',
    timeRange: '1h'
  });
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (autoScroll && !isPaused) {
      scrollToBottom();
    }
  }, [logs, autoScroll, isPaused]);

  const handleFilterChange = (newFilters: Partial<LogFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setLogFilters(updatedFilters);
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
    pauseLogs(!isPaused);
  };

  const handleClearLogs = () => {
    clearLogs();
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-status-error';
      case 'warn':
        return 'text-status-warning';
      case 'info':
        return 'text-text-primary';
      case 'debug':
        return 'text-text-secondary';
      default:
        return 'text-text-secondary';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'debug':
        return '🔍';
      default:
        return '📝';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const filteredLogs = logs.filter(log => {
    // Level filter
    if (!filters.levels.includes(log.level as any)) return false;
    
    // Module filter
    if (filters.modules.length > 0 && log.module && !filters.modules.includes(log.module)) return false;
    
    // Search filter
    if (filters.searchQuery && !log.message.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
    
    return true;
  });

  const availableModules = Array.from(new Set(logs.map(log => log.module).filter(Boolean)));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-bg-primary"
    >
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-text-primary">
            📋 Console
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePauseToggle}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                isPaused 
                  ? 'bg-status-warning text-white' 
                  : 'bg-status-active text-white'
              }`}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            <button
              onClick={handleClearLogs}
              className="px-3 py-1 text-xs bg-status-error text-white rounded hover:bg-status-error/80"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Level Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Log Levels
            </label>
            <div className="flex flex-wrap gap-1">
              {['debug', 'info', 'warn', 'error'].map(level => (
                <button
                  key={level}
                  onClick={() => {
                    const newLevels = filters.levels.includes(level as any)
                      ? filters.levels.filter(l => l !== level)
                      : [...filters.levels, level as any];
                    handleFilterChange({ levels: newLevels });
                  }}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filters.levels.includes(level as any)
                      ? 'bg-accent text-white'
                      : 'bg-bg-primary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Modules
            </label>
            <select
              value={filters.modules[0] || ''}
              onChange={(e) => handleFilterChange({ modules: e.target.value ? [e.target.value] : [] })}
              className="w-full px-2 py-1 text-xs bg-bg-primary border border-border rounded text-text-primary"
            >
              <option value="">All Modules</option>
              {availableModules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search logs..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-bg-primary border border-border rounded text-text-primary placeholder-text-muted"
            />
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Time Range
            </label>
            <select
              value={filters.timeRange}
              onChange={(e) => handleFilterChange({ timeRange: e.target.value as any })}
              className="w-full px-2 py-1 text-xs bg-bg-primary border border-border rounded text-text-primary"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Display */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Log Count */}
          <div className="px-4 py-2 bg-bg-secondary border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {filteredLogs.length} of {logs.length} logs
              </span>
              <label className="flex items-center space-x-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded"
                />
                <span>Auto-scroll</span>
              </label>
            </div>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto bg-bg-primary">
            <AnimatePresence>
              {filteredLogs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center h-full text-text-muted"
                >
                  <p>No logs to display</p>
                </motion.div>
              ) : (
                <div className="p-4 space-y-1">
                  {filteredLogs.map((log, index) => (
                    <motion.div
                      key={`${log.timestamp}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start space-x-3 p-2 rounded hover:bg-bg-secondary transition-colors"
                    >
                      <span className="text-sm text-text-muted min-w-[60px]">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="text-sm min-w-[20px]">
                        {getLogLevelIcon(log.level)}
                      </span>
                      <span className={`text-sm font-medium min-w-[50px] ${getLogLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      {log.module && (
                        <span className="text-sm text-accent min-w-[100px]">
                          [{log.module}]
                        </span>
                      )}
                      <span className="text-sm text-text-primary flex-1">
                        {log.message}
                      </span>
                    </motion.div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 