import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import TimeInputNode from '../../frontend/src/components/TimeInputNode';
import { createModuleNode } from '../../frontend/src/components/BaseModuleNode';

// Mock the API service
vi.mock('../../frontend/src/api', () => ({
  apiService: {
    triggerModule: vi.fn()
  }
}));

// Mock the useInstanceData hook
vi.mock('../../frontend/src/hooks/useNodeConfig', () => ({
  useInstanceData: vi.fn()
}));

describe('TimeInputNode Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('React Hooks Rules Compliance', () => {
    it('should not call hooks inside renderConfig function', () => {
      // This test verifies that hooks are not called inside renderConfig
      // The CountdownDisplay component should be a separate component that calls hooks
      
      const mockInstance = {
        id: 'test-node',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 3000 },
        status: 'running',
        currentTime: '4:30 PM',
        countdown: '3s interval'
      };

      // Mock the useInstanceData hook to return test values
      const { useInstanceData } = require('../../frontend/src/hooks/useNodeConfig');
      useInstanceData.mockImplementation((instance: any, key: string, defaultValue: any) => {
        if (key === 'currentTime') return '4:30 PM';
        if (key === 'countdown') return '3s interval';
        return defaultValue;
      });

      // Render the component
      render(<TimeInputNode data={{ instance: mockInstance }} />);

      // Verify that useInstanceData was called at the top level, not inside renderConfig
      expect(useInstanceData).toHaveBeenCalledWith(mockInstance, 'currentTime', '');
      expect(useInstanceData).toHaveBeenCalledWith(mockInstance, 'countdown', '');
    });

    it('should render CountdownDisplay component correctly', () => {
      const mockInstance = {
        id: 'test-node',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 2000 },
        status: 'running',
        currentTime: '5:00 PM',
        countdown: '2s interval'
      };

      const { useInstanceData } = require('../../frontend/src/hooks/useNodeConfig');
      useInstanceData.mockImplementation((instance: any, key: string, defaultValue: any) => {
        if (key === 'currentTime') return '5:00 PM';
        if (key === 'countdown') return '2s interval';
        return defaultValue;
      });

      render(<TimeInputNode data={{ instance: mockInstance }} />);

      // Verify that the countdown is displayed
      expect(screen.getByText('2s')).toBeInTheDocument();
    });
  });

  describe('Countdown Display Logic', () => {
    it('should extract seconds from countdown string', () => {
      const mockInstance = {
        id: 'test-node',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 5000 },
        status: 'running',
        currentTime: '6:00 PM',
        countdown: '5s interval'
      };

      const { useInstanceData } = require('../../frontend/src/hooks/useNodeConfig');
      useInstanceData.mockImplementation((instance: any, key: string, defaultValue: any) => {
        if (key === 'currentTime') return '6:00 PM';
        if (key === 'countdown') return '5s interval';
        return defaultValue;
      });

      render(<TimeInputNode data={{ instance: mockInstance }} />);

      // Verify that the countdown shows the correct number
      expect(screen.getByText('5s')).toBeInTheDocument();
    });

    it('should handle invalid countdown format gracefully', () => {
      const mockInstance = {
        id: 'test-node',
        moduleName: 'Time Input',
        config: { mode: 'clock', targetTime: '12:00 PM' },
        status: 'running',
        currentTime: '7:00 PM',
        countdown: 'Invalid format'
      };

      const { useInstanceData } = require('../../frontend/src/hooks/useNodeConfig');
      useInstanceData.mockImplementation((instance: any, key: string, defaultValue: any) => {
        if (key === 'currentTime') return '7:00 PM';
        if (key === 'countdown') return 'Invalid format';
        return defaultValue;
      });

      render(<TimeInputNode data={{ instance: mockInstance }} />);

      // Should display the original countdown string when format is invalid
      expect(screen.getByText('Invalid format')).toBeInTheDocument();
    });

    it('should handle empty countdown', () => {
      const mockInstance = {
        id: 'test-node',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 1000 },
        status: 'running',
        currentTime: '8:00 PM',
        countdown: ''
      };

      const { useInstanceData } = require('../../frontend/src/hooks/useNodeConfig');
      useInstanceData.mockImplementation((instance: any, key: string, defaultValue: any) => {
        if (key === 'currentTime') return '8:00 PM';
        if (key === 'countdown') return '';
        return defaultValue;
      });

      render(<TimeInputNode data={{ instance: mockInstance }} />);

      // Should display fallback when countdown is empty
      expect(screen.getByText('--')).toBeInTheDocument();
    });
  });

  describe('Configuration Display', () => {
    it('should display current time correctly', () => {
      const mockInstance = {
        id: 'test-node',
        moduleName: 'Time Input',
        config: { mode: 'clock', targetTime: '12:00 PM' },
        status: 'running',
        currentTime: '9:30 PM',
        countdown: 'Clock mode'
      };

      const { useInstanceData } = require('../../frontend/src/hooks/useNodeConfig');
      useInstanceData.mockImplementation((instance: any, key: string, defaultValue: any) => {
        if (key === 'currentTime') return '9:30 PM';
        if (key === 'countdown') return 'Clock mode';
        return defaultValue;
      });

      render(<TimeInputNode data={{ instance: mockInstance }} />);

      // Verify current time is displayed
      expect(screen.getByText('9:30 PM')).toBeInTheDocument();
    });

    it('should handle missing current time gracefully', () => {
      const mockInstance = {
        id: 'test-node',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 1000 },
        status: 'stopped',
        currentTime: '',
        countdown: ''
      };

      const { useInstanceData } = require('../../frontend/src/hooks/useNodeConfig');
      useInstanceData.mockImplementation((instance: any, key: string, defaultValue: any) => {
        if (key === 'currentTime') return '';
        if (key === 'countdown') return '';
        return defaultValue;
      });

      render(<TimeInputNode data={{ instance: mockInstance }} />);

      // Should display fallback for missing current time
      expect(screen.getByText('--:-- --')).toBeInTheDocument();
    });
  });

  describe('Mode Configuration', () => {
    it('should display clock mode settings when mode is clock', () => {
      const mockInstance = {
        id: 'test-node',
        moduleName: 'Time Input',
        config: { mode: 'clock', targetTime: '2:30 PM' },
        status: 'running',
        currentTime: '10:00 PM',
        countdown: 'Clock mode'
      };

      const { useInstanceData } = require('../../frontend/src/hooks/useNodeConfig');
      useInstanceData.mockImplementation((instance: any, key: string, defaultValue: any) => {
        if (key === 'currentTime') return '10:00 PM';
        if (key === 'countdown') return 'Clock mode';
        return defaultValue;
      });

      render(<TimeInputNode data={{ instance: mockInstance }} />);

      // Should show clock settings
      expect(screen.getByText('Clock Settings:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2:30 PM')).toBeInTheDocument();
    });

    it('should display metronome mode settings when mode is metronome', () => {
      const mockInstance = {
        id: 'test-node',
        moduleName: 'Time Input',
        config: { mode: 'metronome', millisecondDelay: 3000 },
        status: 'running',
        currentTime: '11:00 PM',
        countdown: '3s interval'
      };

      const { useInstanceData } = require('../../frontend/src/hooks/useNodeConfig');
      useInstanceData.mockImplementation((instance: any, key: string, defaultValue: any) => {
        if (key === 'currentTime') return '11:00 PM';
        if (key === 'countdown') return '3s interval';
        return defaultValue;
      });

      render(<TimeInputNode data={{ instance: mockInstance }} />);

      // Should show metronome settings
      expect(screen.getByText('Metronome Settings:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
    });
  });
}); 