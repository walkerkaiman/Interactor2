import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CustomNode from '../../frontend/src/components/CustomNode';
import { triggerEventTracker } from '../../frontend/src/utils/triggerEventTracker';
import { ModuleManifest } from '@interactor/shared';

describe('CustomNode Pulse Animation', () => {
  const mockModule: ModuleManifest = {
    name: 'test-output-module',
    type: 'output',
    version: '1.0.0',
    description: 'Test output module',
    author: 'Test Author',
    events: [],
  };

  const mockData = {
    module: mockModule,
    instance: {
      id: 'test-instance',
      config: {},
    },
    onSelect: vi.fn(),
    onDelete: vi.fn(),
    edges: [
      {
        id: 'edge-1',
        source: 'input-module-1',
        target: 'test-instance',
        sourceHandle: 'trigger',
        targetHandle: 'input',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    triggerEventTracker.clearAllPulses();
  });

  afterEach(() => {
    triggerEventTracker.clearAllPulses();
  });

  describe('Pulse Animation Trigger', () => {
    it('should apply pulse animation when trigger event is received', async () => {
      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      // Initially should not be pulsing
      const inputHandle = screen.getByText('Input').previousElementSibling;
      expect(inputHandle).not.toHaveClass('triggerConnectedPulse');

      // Trigger the pulse animation
      triggerEventTracker.recordTriggerEvent('test-instance', 'manual');

      // Should be pulsing now
      await waitFor(() => {
        expect(inputHandle).toHaveClass('triggerConnectedPulse');
      });

      // Should stop pulsing after animation duration
      await waitFor(() => {
        expect(inputHandle).not.toHaveClass('triggerConnectedPulse');
      }, { timeout: 700 });
    });

    it('should not apply pulse animation for different module', async () => {
      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      const inputHandle = screen.getByText('Input').previousElementSibling;
      
      // Trigger event for different module
      triggerEventTracker.recordTriggerEvent('different-module', 'manual');

      // Should not be pulsing
      await waitFor(() => {
        expect(inputHandle).not.toHaveClass('triggerConnectedPulse');
      });
    });

    it('should handle multiple trigger events correctly', async () => {
      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      const inputHandle = screen.getByText('Input').previousElementSibling;

      // Trigger multiple events
      triggerEventTracker.recordTriggerEvent('test-instance', 'manual');
      triggerEventTracker.recordTriggerEvent('test-instance', 'auto');

      // Should be pulsing
      await waitFor(() => {
        expect(inputHandle).toHaveClass('triggerConnectedPulse');
      });

      // Should stop pulsing after animation duration
      await waitFor(() => {
        expect(inputHandle).not.toHaveClass('triggerConnectedPulse');
      }, { timeout: 700 });
    });
  });

  describe('Handle Class Logic', () => {
    it('should apply triggerConnected class for trigger connections', () => {
      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      const inputHandle = screen.getByText('Input').previousElementSibling;
      expect(inputHandle).toHaveClass('triggerConnected');
    });

    it('should apply streamConnected class for stream connections', () => {
      const dataWithStreamConnection = {
        ...mockData,
        edges: [
          {
            id: 'edge-1',
            source: 'input-module-1',
            target: 'test-instance',
            sourceHandle: 'stream',
            targetHandle: 'input',
          },
        ],
      };

      render(React.createElement(CustomNode, { data: dataWithStreamConnection, id: 'test-instance' }));

      const inputHandle = screen.getByText('Input').previousElementSibling;
      expect(inputHandle).toHaveClass('streamConnected');
    });

    it('should not apply special classes when no connections exist', () => {
      const dataWithoutEdges = {
        ...mockData,
        edges: [],
      };

      render(React.createElement(CustomNode, { data: dataWithoutEdges, id: 'test-instance' }));

      const inputHandle = screen.getByText('Input').previousElementSibling;
      expect(inputHandle).not.toHaveClass('triggerConnected');
      expect(inputHandle).not.toHaveClass('streamConnected');
      expect(inputHandle).not.toHaveClass('triggerConnectedPulse');
    });

    it('should not apply pulse animation for input modules', () => {
      const inputModule = {
        ...mockModule,
        type: 'input',
      };

      const inputData = {
        ...mockData,
        module: inputModule,
      };

      render(React.createElement(CustomNode, { data: inputData, id: 'test-instance' }));

      // Input modules don't have input handles that can pulse
      expect(screen.queryByText('Input')).not.toBeInTheDocument();
    });
  });

  describe('Event Listener Management', () => {
    it('should add event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(triggerEventTracker, 'on');
      
      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      expect(addEventListenerSpy).toHaveBeenCalledWith('triggerEvent', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('pulseEnded', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(triggerEventTracker, 'off');
      
      const { unmount } = render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('triggerEvent', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('pulseEnded', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('should handle pulseEnded events correctly', async () => {
      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      const inputHandle = screen.getByText('Input').previousElementSibling;

      // Start pulse
      triggerEventTracker.recordTriggerEvent('test-instance', 'manual');

      // Should be pulsing
      await waitFor(() => {
        expect(inputHandle).toHaveClass('triggerConnectedPulse');
      });

      // Manually emit pulseEnded event
      triggerEventTracker.emit('pulseEnded', 'test-instance');

      // Should stop pulsing immediately
      await waitFor(() => {
        expect(inputHandle).not.toHaveClass('triggerConnectedPulse');
      });
    });
  });

  describe('Animation Timing', () => {
    it('should maintain pulse state for correct duration', async () => {
      vi.useFakeTimers();

      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      const inputHandle = screen.getByText('Input').previousElementSibling;

      // Trigger pulse
      triggerEventTracker.recordTriggerEvent('test-instance', 'manual');

      // Should be pulsing immediately
      expect(inputHandle).toHaveClass('triggerConnectedPulse');

      // Advance time by 300ms (half of 600ms duration)
      vi.advanceTimersByTime(300);
      expect(inputHandle).toHaveClass('triggerConnectedPulse');

      // Advance time by 300ms more (total 600ms)
      vi.advanceTimersByTime(300);
      expect(inputHandle).not.toHaveClass('triggerConnectedPulse');

      vi.useRealTimers();
    });

    it('should handle rapid trigger events correctly', async () => {
      vi.useFakeTimers();

      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      const inputHandle = screen.getByText('Input').previousElementSibling;

      // Trigger multiple events rapidly
      triggerEventTracker.recordTriggerEvent('test-instance', 'manual');
      triggerEventTracker.recordTriggerEvent('test-instance', 'auto');
      triggerEventTracker.recordTriggerEvent('test-instance', 'manual');

      // Should be pulsing
      expect(inputHandle).toHaveClass('triggerConnectedPulse');

      // Advance time to end of animation
      vi.advanceTimersByTime(600);
      expect(inputHandle).not.toHaveClass('triggerConnectedPulse');

      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined edges gracefully', () => {
      const dataWithUndefinedEdges = {
        ...mockData,
        edges: undefined,
      };

      expect(() => {
        render(React.createElement(CustomNode, { data: dataWithUndefinedEdges, id: 'test-instance' }));
      }).not.toThrow();
    });

    it('should handle missing edge properties gracefully', () => {
      const dataWithIncompleteEdges = {
        ...mockData,
        edges: [
          {
            id: 'edge-1',
            source: 'input-module-1',
            target: 'test-instance',
            // Missing sourceHandle and targetHandle
          },
        ],
      };

      expect(() => {
        render(React.createElement(CustomNode, { data: dataWithIncompleteEdges, id: 'test-instance' }));
      }).not.toThrow();
    });

    it('should handle trigger events with missing moduleId', () => {
      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      // Should not throw when moduleId is undefined
      expect(() => {
        triggerEventTracker.recordTriggerEvent(undefined as any, 'manual');
      }).not.toThrow();
    });

    it('should handle trigger events with missing source', () => {
      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));

      // Should not throw when source is undefined
      expect(() => {
        triggerEventTracker.recordTriggerEvent('test-instance', undefined as any);
      }).not.toThrow();
    });
  });

  describe('Multiple Nodes', () => {
    it('should handle pulse animations for multiple nodes independently', async () => {
      const mockData2 = {
        ...mockData,
        instance: { ...mockData.instance, id: 'test-instance-2' },
      };

      render(React.createElement(CustomNode, { data: mockData, id: 'test-instance' }));
      render(React.createElement(CustomNode, { data: mockData2, id: 'test-instance-2' }));

      const inputHandle1 = screen.getAllByText('Input')[0].previousElementSibling;
      const inputHandle2 = screen.getAllByText('Input')[1].previousElementSibling;

      // Trigger event for first node only
      triggerEventTracker.recordTriggerEvent('test-instance', 'manual');

      // Only first node should be pulsing
      await waitFor(() => {
        expect(inputHandle1).toHaveClass('triggerConnectedPulse');
        expect(inputHandle2).not.toHaveClass('triggerConnectedPulse');
      });

      // Trigger event for second node
      triggerEventTracker.recordTriggerEvent('test-instance-2', 'auto');

      // Both nodes should be pulsing
      await waitFor(() => {
        expect(inputHandle1).toHaveClass('triggerConnectedPulse');
        expect(inputHandle2).toHaveClass('triggerConnectedPulse');
      });
    });
  });
}); 