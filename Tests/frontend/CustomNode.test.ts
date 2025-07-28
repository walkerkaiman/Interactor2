import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomNode from '../../frontend/src/components/CustomNode';
import { ModuleManifest } from '@interactor/shared';

describe('CustomNode Component', () => {
  const mockModule: ModuleManifest = {
    name: 'test-module',
    type: 'input',
    version: '1.0.0',
    description: 'Test module description',
    inputs: [
      {
        name: 'input1',
        type: 'string',
        description: 'Test input 1',
      },
      {
        name: 'input2',
        type: 'number',
        description: 'Test input 2',
      },
    ],
    outputs: [
      {
        name: 'output1',
        type: 'string',
        description: 'Test output 1',
      },
      {
        name: 'output2',
        type: 'boolean',
        description: 'Test output 2',
      },
    ],
  };

  const mockData = {
    module: mockModule,
    instance: {
      id: 'test-instance',
      config: {
        input1: 'test value',
        input2: 42,
      },
    },
    isSelected: false,
    onSelect: vi.fn(),
    onDelete: vi.fn(),
    edges: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render CustomNode with module name', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      expect(screen.getByText(/test-module/i)).toBeInTheDocument();
    });

    it('should render module description', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      expect(screen.getByText(/Test module description/i)).toBeInTheDocument();
    });

    it('should render module type', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      expect(screen.getByText(/input/i)).toBeInTheDocument();
    });

    it('should render module version', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      expect(screen.getByText(/1.0.0/i)).toBeInTheDocument();
    });
  });

  describe('Node Selection', () => {
    it('should call onSelect when node is clicked', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      const node = screen.getByText(/test-module/i).closest('div');
      fireEvent.click(node!);

      expect(mockData.onSelect).toHaveBeenCalled();
    });

    it('should show selected state when isSelected is true', () => {
      const selectedData = {
        ...mockData,
        isSelected: true,
      };

      render(React.createElement(CustomNode, { data: selectedData }));

      const node = screen.getByText(/test-module/i).closest('div');
      expect(node).toHaveClass('selected');
    });

    it('should not show selected state when isSelected is false', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      const node = screen.getByText(/test-module/i).closest('div');
      expect(node).not.toHaveClass('selected');
    });
  });

  describe('Input/Output Handles', () => {
    it('should render input handles', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      expect(screen.getByText(/input1/i)).toBeInTheDocument();
      expect(screen.getByText(/input2/i)).toBeInTheDocument();
    });

    it('should render output handles', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      expect(screen.getByText(/output1/i)).toBeInTheDocument();
      expect(screen.getByText(/output2/i)).toBeInTheDocument();
    });

    it('should handle modules with no inputs', () => {
      const noInputModule: ModuleManifest = {
        ...mockModule,
        inputs: [],
      };

      const noInputData = {
        ...mockData,
        module: noInputModule,
      };

      render(React.createElement(CustomNode, { data: noInputData }));

      // Should render without crashing
      expect(screen.getByText(/test-module/i)).toBeInTheDocument();
    });

    it('should handle modules with no outputs', () => {
      const noOutputModule: ModuleManifest = {
        ...mockModule,
        outputs: [],
      };

      const noOutputData = {
        ...mockData,
        module: noOutputModule,
      };

      render(React.createElement(CustomNode, { data: noOutputData }));

      // Should render without crashing
      expect(screen.getByText(/test-module/i)).toBeInTheDocument();
    });

    it('should display handle types', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      expect(screen.getByText(/string/i)).toBeInTheDocument();
      expect(screen.getByText(/number/i)).toBeInTheDocument();
      expect(screen.getByText(/boolean/i)).toBeInTheDocument();
    });

    it('should display handle descriptions', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      expect(screen.getByText(/Test input 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Test input 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Test output 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Test output 2/i)).toBeInTheDocument();
    });
  });

  describe('Instance Configuration', () => {
    it('should display instance configuration', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      expect(screen.getByText(/test value/i)).toBeInTheDocument();
      expect(screen.getByText(/42/i)).toBeInTheDocument();
    });

    it('should handle missing instance configuration', () => {
      const noInstanceData = {
        ...mockData,
        instance: null,
      };

      render(React.createElement(CustomNode, { data: noInstanceData }));

      // Should render without crashing
      expect(screen.getByText(/test-module/i)).toBeInTheDocument();
    });
  });

  describe('Edge Connections', () => {
    it('should display connected edges', () => {
      const dataWithEdges = {
        ...mockData,
        edges: [
          { id: 'edge-1', source: 'test-instance', target: 'other-instance' },
        ],
      };

      render(React.createElement(CustomNode, { data: dataWithEdges }));

      // Should render without crashing
      expect(screen.getByText(/test-module/i)).toBeInTheDocument();
    });

    it('should handle empty edges array', () => {
      const dataWithNoEdges = {
        ...mockData,
        edges: [],
      };

      render(React.createElement(CustomNode, { data: dataWithNoEdges }));

      // Should render without crashing
      expect(screen.getByText(/test-module/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      const node = screen.getByText(/test-module/i).closest('div');
      expect(node).toHaveAttribute('role', 'button');
      expect(node).toHaveAttribute('tabIndex', '0');
    });

    it('should support keyboard navigation', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      const node = screen.getByText(/test-module/i).closest('div');
      
      fireEvent.keyDown(node!, { key: 'Enter' });
      expect(mockData.onSelect).toHaveBeenCalled();

      fireEvent.keyDown(node!, { key: ' ' });
      expect(mockData.onSelect).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing module data', () => {
      const incompleteData = {
        ...mockData,
        module: null,
      };

      render(React.createElement(CustomNode, { data: incompleteData }));

      // Should render without crashing
      expect(screen.getByText(/unknown module/i)).toBeInTheDocument();
    });

    it('should handle missing callback props', () => {
      const dataWithoutCallbacks = {
        ...mockData,
        onSelect: undefined,
        onDelete: undefined,
      };

      render(React.createElement(CustomNode, { data: dataWithoutCallbacks }));

      // Should render without crashing
      expect(screen.getByText(/test-module/i)).toBeInTheDocument();
    });

    it('should handle modules with very long names', () => {
      const longNameModule: ModuleManifest = {
        ...mockModule,
        name: 'A'.repeat(100),
      };

      const longNameData = {
        ...mockData,
        module: longNameModule,
      };

      render(React.createElement(CustomNode, { data: longNameData }));

      // Should render without layout issues
      expect(screen.getByText(/A{100}/)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      render(React.createElement(CustomNode, { data: mockData }));
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid selection clicks', () => {
      render(React.createElement(CustomNode, { data: mockData }));

      const node = screen.getByText(/test-module/i).closest('div');
      
      // Rapidly click the node
      for (let i = 0; i < 10; i++) {
        fireEvent.click(node!);
      }

      expect(mockData.onSelect).toHaveBeenCalledTimes(10);
    });
  });
}); 