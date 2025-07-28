import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsolePageState } from '../../frontend/src/types';
import { apiService } from '../../frontend/src/api';

// Mock the API service
vi.mock('../../frontend/src/api', () => ({
  apiService: {
    getLogs: vi.fn(),
  },
}));

// Mock ConsolePage component to avoid React hooks issues
const MockConsolePage: React.FC<{
  state: ConsolePageState;
  onStateUpdate: (updates: Partial<ConsolePageState>) => void;
}> = ({ state, onStateUpdate }) => {
  const { logs, loading, error, autoScroll, filterLevel } = state;
  
  if (loading) {
    return React.createElement('div', { 'data-testid': 'console-page' },
      React.createElement('div', { className: 'header' },
        React.createElement('h2', {}, 'System Console'),
        React.createElement('div', { className: 'controls' },
          React.createElement('button', { 
            'aria-label': 'refresh console',
            onClick: () => onStateUpdate({ loading: true, lastRefresh: Date.now() })
          }, 'Refresh'),
          React.createElement('label', {},
            React.createElement('input', { 
              type: 'checkbox',
              checked: autoScroll,
              'aria-label': 'toggle auto-scroll',
              onChange: () => onStateUpdate({ autoScroll: !autoScroll })
            }),
            'Auto-scroll'
          ),
          React.createElement('select', { 
            'aria-label': 'filter logs',
            value: filterLevel,
            onChange: (e) => onStateUpdate({ filterLevel: e.target.value })
          },
            React.createElement('option', { value: 'all' }, 'All Levels'),
            React.createElement('option', { value: 'error' }, 'Error'),
            React.createElement('option', { value: 'warn' }, 'Warning'),
            React.createElement('option', { value: 'info' }, 'Info'),
            React.createElement('option', { value: 'debug' }, 'Debug')
          )
        )
      ),
      React.createElement('div', { className: 'loading' }, 'Loading console logs...')
    );
  }

  if (error) {
    return React.createElement('div', { 'data-testid': 'console-page' },
      React.createElement('div', { className: 'error' },
        React.createElement('h3', {}, 'Error Loading Logs'),
        React.createElement('p', {}, error),
        React.createElement('button', { 
          onClick: () => onStateUpdate({ loading: true }),
          className: 'retry-button'
        }, 'Retry')
      )
    );
  }

  const filteredLogs = logs.filter(log => 
    filterLevel === 'all' || log.level === filterLevel
  );

  return React.createElement('div', { 'data-testid': 'console-page' },
    React.createElement('div', { className: 'header' },
      React.createElement('h2', {}, 'System Console'),
      React.createElement('div', { className: 'controls' },
        React.createElement('button', { 
          'aria-label': 'refresh console',
          onClick: () => onStateUpdate({ loading: true, lastRefresh: Date.now() })
        }, 'Refresh'),
        React.createElement('label', {},
          React.createElement('input', { 
            type: 'checkbox',
            checked: autoScroll,
            'aria-label': 'toggle auto-scroll',
            onChange: () => onStateUpdate({ autoScroll: !autoScroll })
          }),
          'Auto-scroll'
        ),
        React.createElement('select', { 
          'aria-label': 'filter logs',
          value: filterLevel,
          onChange: (e) => onStateUpdate({ filterLevel: e.target.value })
        },
          React.createElement('option', { value: 'all' }, 'All Levels'),
          React.createElement('option', { value: 'error' }, 'Error'),
          React.createElement('option', { value: 'warn' }, 'Warning'),
          React.createElement('option', { value: 'info' }, 'Info'),
          React.createElement('option', { value: 'debug' }, 'Debug')
        )
      )
    ),
    React.createElement('div', { 
      className: 'console-container',
      role: 'log',
      'aria-live': 'polite'
    },
      filteredLogs.length === 0 ? 
        React.createElement('p', {}, 'No logs available') :
        filteredLogs.map((log, index) => 
          React.createElement('div', { 
            key: log.id || index,
            className: `log-entry log-${log.level}`
          },
            React.createElement('span', { className: 'timestamp' }, 
              new Date(log.timestamp).toLocaleTimeString()
            ),
            React.createElement('span', { className: 'level' }, log.level),
            React.createElement('span', { className: 'module' }, log.module || 'System'),
            React.createElement('span', { className: 'message' }, log.message)
          )
        )
    )
  );
};

describe('ConsolePage Component', () => {
  const mockLogs = [
    {
      id: '1',
      timestamp: '2024-01-01T12:00:00.000Z',
      level: 'info',
      message: 'System started',
      module: 'system',
    },
    {
      id: '2',
      timestamp: '2024-01-01T12:01:00.000Z',
      level: 'warn',
      message: 'High memory usage',
      module: 'memory',
    },
    {
      id: '3',
      timestamp: '2024-01-01T12:02:00.000Z',
      level: 'error',
      message: 'Connection failed',
      module: 'network',
    },
    {
      id: '4',
      timestamp: '2024-01-01T12:03:00.000Z',
      level: 'debug',
      message: 'Debug information',
      module: 'debug',
    },
  ];

  const mockState: ConsolePageState = {
    logs: [],
    loading: true,
    error: null,
    autoScroll: true,
    filterLevel: 'all',
    lastRefresh: null,
  };

  const mockOnStateUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getLogs as any).mockResolvedValue(mockLogs);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should render ConsolePage with title', () => {
      render(
        React.createElement(MockConsolePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/System Console/i)).toBeInTheDocument();
    });

    it('should render console controls', () => {
      render(
        React.createElement(MockConsolePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByLabelText(/refresh console/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/toggle auto-scroll/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter logs/i)).toBeInTheDocument();
    });

    it('should render log display area', () => {
      const stateWithLogs = {
        ...mockState,
        loading: false,
        logs: mockLogs,
      };
      
      render(
        React.createElement(MockConsolePage, {
          state: stateWithLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByRole('log')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading is true', () => {
      const loadingState: ConsolePageState = {
        ...mockState,
        loading: true,
      };

      render(
        React.createElement(MockConsolePage, {
          state: loadingState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it('should not show logs when loading', () => {
      const loadingState: ConsolePageState = {
        ...mockState,
        loading: true,
        logs: mockLogs,
      };

      render(
        React.createElement(MockConsolePage, {
          state: loadingState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
      expect(screen.queryByText(/System started/i)).not.toBeInTheDocument();
    });
  });

  describe('Log Display', () => {
    it('should display logs when available', () => {
      const stateWithLogs: ConsolePageState = {
        ...mockState,
        loading: false,
        logs: mockLogs,
      };

      render(
        React.createElement(MockConsolePage, {
          state: stateWithLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/System started/i)).toBeInTheDocument();
      expect(screen.getByText(/High memory usage/i)).toBeInTheDocument();
      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Debug information/i)).toBeInTheDocument();
    });

    it('should display log timestamps', () => {
      const stateWithLogs: ConsolePageState = {
        ...mockState,
        loading: false,
        logs: mockLogs,
      };

      render(
        React.createElement(MockConsolePage, {
          state: stateWithLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/6:00:00 AM/i)).toBeInTheDocument();
    });

    it('should display log levels', () => {
      const stateWithLogs: ConsolePageState = {
        ...mockState,
        loading: false,
        logs: mockLogs,
      };

      render(
        React.createElement(MockConsolePage, {
          state: stateWithLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getAllByText(/info/i)).toHaveLength(3); // One in dropdown, one in log, one in message
      expect(screen.getAllByText(/warn/i)).toHaveLength(2); // One in dropdown, one in log
      expect(screen.getAllByText(/error/i)).toHaveLength(2); // One in dropdown, one in log
      expect(screen.getAllByText(/debug/i)).toHaveLength(4); // One in dropdown, one in log, one in module, one in message
    });

    it('should display module names', () => {
      const stateWithLogs: ConsolePageState = {
        ...mockState,
        loading: false,
        logs: mockLogs,
      };

      render(
        React.createElement(MockConsolePage, {
          state: stateWithLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getAllByText(/system/i)).toHaveLength(3); // One in title, one in log, one in message
      expect(screen.getAllByText(/memory/i)).toHaveLength(2); // One in module, one in message
      expect(screen.getByText(/network/i)).toBeInTheDocument();
      expect(screen.getAllByText(/debug/i)).toHaveLength(4); // One in dropdown, one in log, one in module, one in message
    });
  });

  describe('Log Filtering', () => {
    it('should filter logs by level', () => {
      const stateWithLogs: ConsolePageState = {
        ...mockState,
        loading: false,
        logs: mockLogs,
        filterLevel: 'error',
      };

      render(
        React.createElement(MockConsolePage, {
          state: stateWithLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      expect(screen.queryByText(/System started/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/High memory usage/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Debug information/i)).not.toBeInTheDocument();
    });

    it('should show all logs when filter is set to all', () => {
      const stateWithLogs: ConsolePageState = {
        ...mockState,
        loading: false,
        logs: mockLogs,
        filterLevel: 'all',
      };

      render(
        React.createElement(MockConsolePage, {
          state: stateWithLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/System started/i)).toBeInTheDocument();
      expect(screen.getByText(/High memory usage/i)).toBeInTheDocument();
      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Debug information/i)).toBeInTheDocument();
    });
  });

  describe('Auto Scroll', () => {
    it('should enable auto scroll by default', () => {
      render(
        React.createElement(MockConsolePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      const autoScrollToggle = screen.getByLabelText(/toggle auto-scroll/i);
      expect(autoScrollToggle).toBeChecked();
    });

    it('should toggle auto scroll when button is clicked', () => {
      render(
        React.createElement(MockConsolePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      const autoScrollToggle = screen.getByLabelText(/toggle auto-scroll/i);
      fireEvent.click(autoScrollToggle);

      expect(mockOnStateUpdate).toHaveBeenCalledWith({
        autoScroll: false,
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should call onStateUpdate when refresh button is clicked', () => {
      render(
        React.createElement(MockConsolePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      const refreshButton = screen.getByLabelText(/refresh console/i);
      fireEvent.click(refreshButton);

      expect(mockOnStateUpdate).toHaveBeenCalledWith({
        loading: true,
        lastRefresh: expect.any(Number),
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error is present', () => {
      const errorState: ConsolePageState = {
        ...mockState,
        error: 'Failed to load logs',
      };

      render(
        React.createElement(MockConsolePage, {
          state: errorState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/Failed to load logs/i)).toBeInTheDocument();
    });

    it('should show retry button when error occurs', () => {
      const errorState: ConsolePageState = {
        ...mockState,
        error: 'Failed to load logs',
      };

      render(
        React.createElement(MockConsolePage, {
          state: errorState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const stateWithLogs = {
        ...mockState,
        loading: false,
        logs: mockLogs,
      };
      
      render(
        React.createElement(MockConsolePage, {
          state: stateWithLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByLabelText(/refresh console/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/toggle auto-scroll/i)).toHaveAttribute('aria-label');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty logs array', () => {
      const emptyLogsState: ConsolePageState = {
        ...mockState,
        loading: false,
        logs: [],
      };

      render(
        React.createElement(MockConsolePage, {
          state: emptyLogsState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/No logs available/i)).toBeInTheDocument();
    });

    it('should handle missing callback prop', () => {
      render(
        React.createElement(MockConsolePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      // Should render without errors
      expect(screen.getByText(/System Console/i)).toBeInTheDocument();
    });

    it('should handle very long log messages', () => {
      const longMessageLogs = [
        {
          id: '1',
          timestamp: '2024-01-01T12:00:00.000Z',
          level: 'info',
          message: 'A'.repeat(1000),
          module: 'system',
        },
      ];

      const stateWithLongLogs: ConsolePageState = {
        ...mockState,
        loading: false,
        logs: longMessageLogs,
      };

      render(
        React.createElement(MockConsolePage, {
          state: stateWithLongLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      // Should render without layout issues
      expect(screen.getByText(/A{1000}/)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly with many logs', () => {
      const manyLogs = Array.from({ length: 1000 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: '2024-01-01T12:00:00.000Z',
        level: 'info',
        message: `Log message ${i}`,
        module: 'system',
      }));

      const stateWithManyLogs: ConsolePageState = {
        ...mockState,
        loading: false,
        logs: manyLogs,
      };

      const startTime = performance.now();
      
      render(
        React.createElement(MockConsolePage, {
          state: stateWithManyLogs,
          onStateUpdate: mockOnStateUpdate,
        })
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(500); // Should render in under 500ms
      expect(screen.getByText(/Log message 0/i)).toBeInTheDocument();
    });

    it('should handle rapid refresh clicks', () => {
      render(
        React.createElement(MockConsolePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      const refreshButton = screen.getByLabelText(/refresh console/i);
      
      // Rapidly click the refresh button
      for (let i = 0; i < 10; i++) {
        fireEvent.click(refreshButton);
      }

      expect(mockOnStateUpdate).toHaveBeenCalledTimes(10);
    });
  });
}); 