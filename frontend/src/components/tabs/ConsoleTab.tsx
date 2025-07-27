import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Checkbox,
  FormControlLabel,
  Paper
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useLogs, useAppActions } from '@/store';
import { LogFilters } from '@/types/ui';

export const ConsoleTab: React.FC = () => {
  const logs = useLogs();
  const actions = useAppActions();
  
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
    actions.setLogFilters(updatedFilters);
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
    actions.pauseLogs(!isPaused);
  };

  const handleClearLogs = () => {
    actions.clearLogs();
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const filteredLogs = logs.filter(log => {
    if (!filters.levels.includes(log.level as any)) return false;
    if (filters.modules.length > 0 && log.module && !filters.modules.includes(log.module)) return false;
    if (filters.searchQuery && !log.message.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
    return true;
  });

  const availableModules = Array.from(new Set(logs.map(log => log.module).filter(Boolean)));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                📋
              </Box>
              <Box>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
                  Console
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Real-time system logs and monitoring
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color={isPaused ? "warning" : "success"}
                startIcon={isPaused ? <PlayIcon /> : <PauseIcon />}
                onClick={handlePauseToggle}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleClearLogs}
              >
                Clear
              </Button>
            </Box>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
            {/* Level Filter */}
            <FormControl fullWidth>
              <InputLabel>Log Levels</InputLabel>
                             <Select
                 multiple
                 value={filters.levels}
                 onChange={(e) => {
                   const selectedLevels = e.target.value as string[];
                   handleFilterChange({ 
                     levels: selectedLevels as ("debug" | "info" | "warn" | "error")[] 
                   });
                 }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value.toUpperCase()} size="small" />
                    ))}
                  </Box>
                )}
              >
                {['debug', 'info', 'warn', 'error'].map((level) => (
                  <MenuItem key={level} value={level}>
                    {level.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Module Filter */}
            <FormControl fullWidth>
              <InputLabel>Modules</InputLabel>
              <Select
                value={filters.modules[0] || ''}
                onChange={(e) => handleFilterChange({ modules: e.target.value ? [e.target.value] : [] })}
              >
                <MenuItem value="">All Modules</MenuItem>
                {availableModules.map(module => (
                  <MenuItem key={module} value={module}>{module}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Search */}
            <TextField
              fullWidth
              label="Search logs"
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />

            {/* Time Range */}
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={filters.timeRange}
                onChange={(e) => handleFilterChange({ timeRange: e.target.value as any })}
              >
                <MenuItem value="1h">Last Hour</MenuItem>
                <MenuItem value="6h">Last 6 Hours</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="all">All Time</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Log Count */}
        <Paper sx={{ p: 2, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {filteredLogs.length} of {logs.length} logs
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
              }
              label="Auto-scroll"
            />
          </Box>
        </Paper>

        {/* Logs List */}
        <Paper sx={{ flex: 1, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            {filteredLogs.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: 'text.secondary'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ mb: 2 }}>📝</Typography>
                  <Typography variant="h6">No logs to display</Typography>
                  <Typography variant="body2">Try adjusting your filters</Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredLogs.map((log, index) => (
                  <Card key={`${log.timestamp}-${index}`} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, fontFamily: 'monospace' }}>
                          {formatTimestamp(log.timestamp)}
                        </Typography>
                        <Typography variant="body2" sx={{ minWidth: 24 }}>
                          {getLogLevelIcon(log.level)}
                        </Typography>
                        <Chip
                          label={log.level.toUpperCase()}
                          color={getLogLevelColor(log.level) as any}
                          size="small"
                          sx={{ minWidth: 60 }}
                        />
                        {log.module && (
                          <Chip
                            label={log.module}
                            variant="outlined"
                            size="small"
                            sx={{ minWidth: 120 }}
                          />
                        )}
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {log.message}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
                <div ref={logsEndRef} />
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}; 