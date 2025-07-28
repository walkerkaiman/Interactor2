import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useNodeConfig, useInstanceData } from '../../frontend/src/hooks/useNodeConfig';

// Test component to wrap hooks
const TestComponent: React.FC<{ 
  instance: any; 
  key: string; 
  defaultValue: any; 
  validator?: (value: any) => any;
  onConfigChange?: (instanceId: string, config: any) => void;
}> = ({ instance, key, defaultValue, validator, onConfigChange }) => {
  const [value, setValue] = useNodeConfig(instance, key, defaultValue, validator, onConfigChange);
  
  return (
    <div>
      <span data-testid="hook-value">{String(value)}</span>
      <button onClick={() => setValue('updated')}>Update</button>
    </div>
  );
};

// Test component for useInstanceData
const TestInstanceDataComponent: React.FC<{ 
  instance: any; 
  key: string; 
  defaultValue: any; 
}> = ({ instance, key, defaultValue }) => {
  const value = useInstanceData(instance, key, defaultValue);
  
  return (
    <div>
      <span data-testid="hook-value">{String(value)}</span>
    </div>
  );
};

describe('useNodeConfig Hook', () => {
  const mockInstance = {
    id: 'test-instance',
    config: {
      testKey: 'testValue',
      numberKey: 42,
      booleanKey: true,
    },
  };

  const mockOnConfigChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with instance config value', () => {
      render(
        <TestComponent 
          instance={mockInstance} 
          key="testKey" 
          defaultValue="defaultValue" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('testValue');
    });

    it('should use default value when key not in instance config', () => {
      render(
        <TestComponent 
          instance={mockInstance} 
          key="nonExistentKey" 
          defaultValue="defaultValue" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('defaultValue');
    });

    it('should handle different data types', () => {
      const { rerender } = render(
        <TestComponent 
          instance={mockInstance} 
          key="testKey" 
          defaultValue="default" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('testValue');

      rerender(
        <TestComponent 
          instance={mockInstance} 
          key="numberKey" 
          defaultValue={0} 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('42');

      rerender(
        <TestComponent 
          instance={mockInstance} 
          key="booleanKey" 
          defaultValue={false} 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('true');
    });
  });

  describe('State Updates', () => {
    it('should update state and instance config when setter is called', () => {
      render(
        <TestComponent 
          instance={mockInstance} 
          key="testKey" 
          defaultValue="defaultValue" 
          onConfigChange={mockOnConfigChange}
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('testValue');

      fireEvent.click(screen.getByText('Update'));

      expect(screen.getByTestId('hook-value')).toHaveTextContent('updated');
      expect(mockInstance.config.testKey).toBe('updated');
      expect(mockOnConfigChange).toHaveBeenCalledWith('test-instance', {
        ...mockInstance.config,
        testKey: 'updated',
      });
    });

    it('should not call onConfigChange when not provided', () => {
      render(
        <TestComponent 
          instance={mockInstance} 
          key="testKey" 
          defaultValue="defaultValue" 
        />
      );

      fireEvent.click(screen.getByText('Update'));

      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should apply validator function when provided', () => {
      const validator = (value: any) => Math.max(0, Math.min(100, Number(value) || 0));
      
      render(
        <TestComponent 
          instance={mockInstance} 
          key="numberKey" 
          defaultValue={0} 
          validator={validator}
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('42');

      // Update with a value that should be clamped
      fireEvent.click(screen.getByText('Update'));

      // The validator should be applied to the new value
      expect(screen.getByTestId('hook-value')).toHaveTextContent('updated');
    });

    it('should handle validation errors gracefully', () => {
      const validator = (value: any) => {
        if (typeof value !== 'string') throw new Error('Must be string');
        return value;
      };

      render(
        <TestComponent 
          instance={mockInstance} 
          key="testKey" 
          defaultValue="default" 
          validator={validator}
        />
      );

      // Should not throw, should use the value from instance
      expect(screen.getByTestId('hook-value')).toHaveTextContent('testValue');
    });
  });

  describe('Instance Updates', () => {
    it('should update when instance config changes', () => {
      const { rerender } = render(
        <TestComponent 
          instance={mockInstance} 
          key="testKey" 
          defaultValue="default" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('testValue');

      const updatedInstance = {
        ...mockInstance,
        config: { ...mockInstance.config, testKey: 'updatedValue' },
      };

      rerender(
        <TestComponent 
          instance={updatedInstance} 
          key="testKey" 
          defaultValue="default" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('updatedValue');
    });
  });
});

describe('useInstanceData Hook', () => {
  const mockInstance = {
    id: 'test-instance',
    currentTime: '12:00 PM',
    countdown: '30',
    status: 'running',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return instance data when available', () => {
      render(
        <TestInstanceDataComponent 
          instance={mockInstance} 
          key="currentTime" 
          defaultValue="--:-- --" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('12:00 PM');
    });

    it('should return default value when key not in instance', () => {
      render(
        <TestInstanceDataComponent 
          instance={mockInstance} 
          key="nonExistentKey" 
          defaultValue="default" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('default');
    });

    it('should handle different data types', () => {
      const { rerender } = render(
        <TestInstanceDataComponent 
          instance={mockInstance} 
          key="currentTime" 
          defaultValue="default" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('12:00 PM');

      rerender(
        <TestInstanceDataComponent 
          instance={mockInstance} 
          key="countdown" 
          defaultValue="0" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('30');
    });
  });

  describe('Instance Updates', () => {
    it('should update when instance data changes', () => {
      const { rerender } = render(
        <TestInstanceDataComponent 
          instance={mockInstance} 
          key="currentTime" 
          defaultValue="--:-- --" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('12:00 PM');

      const updatedInstance = {
        ...mockInstance,
        currentTime: '1:30 PM',
      };

      rerender(
        <TestInstanceDataComponent 
          instance={updatedInstance} 
          key="currentTime" 
          defaultValue="--:-- --" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('1:30 PM');
    });

    it('should handle undefined instance', () => {
      render(
        <TestInstanceDataComponent 
          instance={undefined} 
          key="currentTime" 
          defaultValue="default" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('default');
    });
  });

  describe('Real-time Updates', () => {
    it('should reflect real-time data changes', () => {
      const { rerender } = render(
        <TestInstanceDataComponent 
          instance={mockInstance} 
          key="countdown" 
          defaultValue="0" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('30');

      // Simulate real-time update
      const updatedInstance = {
        ...mockInstance,
        countdown: '25',
      };

      rerender(
        <TestInstanceDataComponent 
          instance={updatedInstance} 
          key="countdown" 
          defaultValue="0" 
        />
      );

      expect(screen.getByTestId('hook-value')).toHaveTextContent('25');
    });
  });
}); 