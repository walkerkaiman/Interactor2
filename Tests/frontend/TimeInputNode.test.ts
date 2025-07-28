import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimeInputNode from '../../frontend/src/components/TimeInputNode';
import { ModuleManifest } from '@interactor/shared';

// Mock the API service
vi.mock('../../frontend/src/api', () => ({
  apiService: {
    triggerModule: vi.fn(),
  },
}));

// Mock the custom hooks
vi.mock('../../frontend/src/hooks/useNodeConfig', () => ({
  useNodeConfig: vi.fn(),
  useInstanceData: vi.fn(),
}));

describe('TimeInputNode Component', () => {
  const mockModule: ModuleManifest = {
    name: 'Time Input',
    type: 'input',
    version: '1.0.0',
    description: 'Time-based trigger module',
    author: 'Test Author',
    events: [
      {
        name: 'trigger',
        type: 'output',
        description: 'Trigger output',
      },
    ],
  };

  const mockInstance = {
    id: 'time-input-1',
    moduleName: 'Time Input',
    config: {
      mode: 'clock',
      targetTime: '2:30 PM',
      millisecondDelay: 1000,
    },
    currentTime: '12:00 PM',
    countdown: '30',
  };

  const mockData = {
    module: mockModule,
    instance: mockInstance,
    onSelect: vi.fn(),
    onDelete: vi.fn(),
    onConfigChange: vi.fn(),
  };

  const mockUseNodeConfig = vi.mocked(require('../../frontend/src/hooks/useNodeConfig').useNodeConfig);
  const mockUseInstanceData = vi.mocked(require('../../frontend/src/hooks/useNodeConfig').useInstanceData);
  const mockApiService = vi.mocked(require('../../frontend/src/api').apiService);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockUseNodeConfig.mockImplementation((instance, key, defaultValue, validator) => {
      const value = instance?.config?.[key] ?? defaultValue;
      return [value, vi.fn()];
    });
    
    mockUseInstanceData.mockImplementation((instance, key, defaultValue) => {
      return instance?.[key] ?? defaultValue;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render TimeInputNode with module name', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/Time Input/i)).toBeInTheDocument();
    });

    it('should render module description', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/Time-based trigger module/i)).toBeInTheDocument();
    });

    it('should render module type', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/input/i)).toBeInTheDocument();
    });

    it('should render module version and author', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/v1.0.0/i)).toBeInTheDocument();
      expect(screen.getByText(/by Test Author/i)).toBeInTheDocument();
    });
  });

  describe('Mode Selection', () => {
    it('should render mode selection dropdown', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/Mode:/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should show clock and metronome options', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('clock');
      
      const options = Array.from(select.querySelectorAll('option'));
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveValue('clock');
      expect(options[1]).toHaveValue('metronome');
    });

    it('should handle mode change', async () => {
      const mockSetMode = vi.fn();
      mockUseNodeConfig.mockImplementation((instance, key, defaultValue) => {
        if (key === 'mode') {
          return [defaultValue, mockSetMode];
        }
        return [instance?.config?.[key] ?? defaultValue, vi.fn()];
      });

      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'metronome' } });

      expect(mockSetMode).toHaveBeenCalledWith('metronome');
    });
  });

  describe('Status Display', () => {
    it('should display current time and countdown', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/Current:/i)).toBeInTheDocument();
      expect(screen.getByText(/12:00 PM/i)).toBeInTheDocument();
      expect(screen.getByText(/Countdown:/i)).toBeInTheDocument();
      expect(screen.getByText(/30/i)).toBeInTheDocument();
    });

    it('should show default values when data is missing', () => {
      mockUseInstanceData.mockImplementation(() => '');

      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/--:-- --/i)).toBeInTheDocument();
      expect(screen.getByText(/--/i)).toBeInTheDocument();
    });
  });

  describe('Clock Mode Settings', () => {
    it('should show clock settings when mode is clock', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/Clock Settings:/i)).toBeInTheDocument();
      expect(screen.getByText(/Target Time:/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('2:30 PM')).toBeInTheDocument();
    });

    it('should handle target time input change', async () => {
      const mockSetTargetTime = vi.fn();
      mockUseNodeConfig.mockImplementation((instance, key, defaultValue) => {
        if (key === 'targetTime') {
          return [defaultValue, mockSetTargetTime];
        }
        return [instance?.config?.[key] ?? defaultValue, vi.fn()];
      });

      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const timeInput = screen.getByDisplayValue('2:30 PM');
      fireEvent.change(timeInput, { target: { value: '3:45 PM' } });

      expect(mockSetTargetTime).toHaveBeenCalledWith('3:45 PM');
    });

    it('should show time format hint', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/Format: 2:30 PM/i)).toBeInTheDocument();
    });
  });

  describe('Metronome Mode Settings', () => {
    it('should show metronome settings when mode is metronome', () => {
      mockUseNodeConfig.mockImplementation((instance, key, defaultValue) => {
        if (key === 'mode') {
          return ['metronome', vi.fn()];
        }
        return [instance?.config?.[key] ?? defaultValue, vi.fn()];
      });

      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/Metronome Settings:/i)).toBeInTheDocument();
      expect(screen.getByText(/Millisecond Delay:/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    });

    it('should handle millisecond delay input change', async () => {
      const mockSetDelay = vi.fn();
      mockUseNodeConfig.mockImplementation((instance, key, defaultValue) => {
        if (key === 'mode') {
          return ['metronome', vi.fn()];
        }
        if (key === 'millisecondDelay') {
          return [defaultValue, mockSetDelay];
        }
        return [instance?.config?.[key] ?? defaultValue, vi.fn()];
      });

      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const delayInput = screen.getByDisplayValue('1000');
      fireEvent.change(delayInput, { target: { value: '2000' } });

      expect(mockSetDelay).toHaveBeenCalledWith(2000);
    });

    it('should validate millisecond delay range', async () => {
      const mockSetDelay = vi.fn();
      mockUseNodeConfig.mockImplementation((instance, key, defaultValue) => {
        if (key === 'mode') {
          return ['metronome', vi.fn()];
        }
        if (key === 'millisecondDelay') {
          return [defaultValue, mockSetDelay];
        }
        return [instance?.config?.[key] ?? defaultValue, vi.fn()];
      });

      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const delayInput = screen.getByDisplayValue('1000');
      
      // Test minimum value
      fireEvent.change(delayInput, { target: { value: '50' } });
      expect(delayInput).toHaveAttribute('min', '100');
      
      // Test maximum value
      expect(delayInput).toHaveAttribute('max', '60000');
    });
  });

  describe('Manual Controls', () => {
    it('should render trigger button', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/Trigger Now/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Trigger Now/i })).toBeInTheDocument();
    });

    it('should call API service when trigger button is clicked', async () => {
      mockApiService.triggerModule.mockResolvedValue(undefined);

      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const triggerButton = screen.getByRole('button', { name: /Trigger Now/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(mockApiService.triggerModule).toHaveBeenCalledWith('test-id', {
          type: 'manualTrigger',
        });
      });
    });

    it('should handle API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApiService.triggerModule.mockRejectedValue(new Error('API Error'));

      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const triggerButton = screen.getByRole('button', { name: /Trigger Now/i });
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to trigger module:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Output Handles', () => {
    it('should render trigger output handle', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      expect(screen.getByText(/Trigger/i)).toBeInTheDocument();
    });

    it('should not render input handles', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      // Should not have input handles for time input module
      expect(screen.queryByText(/Input/i)).not.toBeInTheDocument();
    });
  });

  describe('Node Selection and Deletion', () => {
    it('should call onSelect when node is clicked', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const node = screen.getByText(/Time Input/i).closest('div');
      fireEvent.click(node!);

      expect(mockData.onSelect).toHaveBeenCalled();
    });

    it('should render delete button when onDelete is provided', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const deleteButton = screen.getByRole('button', { name: /Remove module/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id' }));

      const deleteButton = screen.getByRole('button', { name: /Remove module/i });
      fireEvent.click(deleteButton);

      expect(mockData.onDelete).toHaveBeenCalledWith('test-id');
    });

    it('should not render delete button when onDelete is not provided', () => {
      const dataWithoutDelete = { ...mockData };
      delete dataWithoutDelete.onDelete;

      render(React.createElement(TimeInputNode, { data: dataWithoutDelete, id: 'test-id' }));

      expect(screen.queryByRole('button', { name: /Remove module/i })).not.toBeInTheDocument();
    });
  });

  describe('Selected State', () => {
    it('should apply selected styling when selected is true', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id', selected: true }));

      const node = screen.getByText(/Time Input/i).closest('div');
      expect(node).toHaveClass('selected');
    });

    it('should not apply selected styling when selected is false', () => {
      render(React.createElement(TimeInputNode, { data: mockData, id: 'test-id', selected: false }));

      const node = screen.getByText(/Time Input/i).closest('div');
      expect(node).not.toHaveClass('selected');
    });
  });
}); 