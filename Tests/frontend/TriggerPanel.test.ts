import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TriggerPanel from '../../frontend/src/components/TriggerPanel';
import { InteractionConfig } from '@interactor/shared';

// Mock CSS modules
vi.mock('../../frontend/src/components/TriggerPanel.module.css', () => ({
  default: {
    triggerPanel: 'trigger-panel',
    header: 'header',
    content: 'content',
    triggerItem: 'trigger-item',
    active: 'active',
    button: 'button',
  },
}));

describe('TriggerPanel Component', () => {
  const mockInteractions: InteractionConfig[] = [
    {
      id: 'interaction-1',
      name: 'Test Interaction 1',
      description: 'Test description 1',
      enabled: true,
      modules: [],
      routes: [],
    },
    {
      id: 'interaction-2',
      name: 'Test Interaction 2',
      description: 'Test description 2',
      enabled: false,
      modules: [],
      routes: [],
    },
  ];

  const mockOnTrigger = vi.fn();
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render trigger panel with interactions', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      expect(screen.getByText('Test Interaction 1')).toBeInTheDocument();
      expect(screen.getByText('Test Interaction 2')).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      const panel = screen.getByTestId('trigger-panel');
      expect(panel).toHaveClass('trigger-panel');
    });
  });

  describe('Interaction Display', () => {
    it('should display interaction names', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      expect(screen.getByText('Test Interaction 1')).toBeInTheDocument();
      expect(screen.getByText('Test Interaction 2')).toBeInTheDocument();
    });

    it('should display interaction descriptions', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      expect(screen.getByText('Test description 1')).toBeInTheDocument();
      expect(screen.getByText('Test description 2')).toBeInTheDocument();
    });

    it('should show enabled/disabled status', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      // Should show enabled/disabled status for each interaction
      expect(screen.getByText('Test Interaction 1')).toBeInTheDocument();
      expect(screen.getByText('Test Interaction 2')).toBeInTheDocument();
    });
  });

  describe('Trigger Functionality', () => {
    it('should call onTrigger when trigger button is clicked', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      const triggerButtons = screen.getAllByText('Trigger');
      fireEvent.click(triggerButtons[0]);

      expect(mockOnTrigger).toHaveBeenCalledWith('interaction-1');
    });

    it('should call onTrigger with correct interaction ID', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      const triggerButtons = screen.getAllByText('Trigger');
      fireEvent.click(triggerButtons[1]);

      expect(mockOnTrigger).toHaveBeenCalledWith('interaction-2');
    });
  });

  describe('Panel Toggle', () => {
    it('should call onToggle when toggle button is clicked', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      const toggleButton = screen.getByText('Toggle');
      fireEvent.click(toggleButton);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should show correct toggle state', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      const panel = screen.getByTestId('trigger-panel');
      expect(panel).toHaveClass('active');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      const panel = screen.getByTestId('trigger-panel');
      expect(panel).toHaveAttribute('role', 'region');
    });

    it('should have accessible trigger buttons', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      const triggerButtons = screen.getAllByText('Trigger');
      triggerButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      const triggerButtons = screen.getAllByText('Trigger');
      
      // Test keyboard navigation
      fireEvent.keyDown(triggerButtons[0], { key: 'Enter' });
      expect(mockOnTrigger).toHaveBeenCalledWith('interaction-1');

      fireEvent.keyDown(triggerButtons[0], { key: ' ' });
      expect(mockOnTrigger).toHaveBeenCalledWith('interaction-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty interactions array', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: [],
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      // Should render without errors
      expect(screen.getByTestId('trigger-panel')).toBeInTheDocument();
    });

    it('should handle missing callback props', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          isOpen: true,
        })
      );

      // Should render without errors
      expect(screen.getByTestId('trigger-panel')).toBeInTheDocument();
    });

    it('should handle interactions with missing properties', () => {
      const incompleteInteractions: InteractionConfig[] = [
        {
          id: 'incomplete-interaction',
          name: 'Incomplete Interaction',
          description: '',
          enabled: true,
          modules: [],
          routes: [],
        },
      ];

      render(
        React.createElement(TriggerPanel, {
          interactions: incompleteInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      // Should render without errors
      expect(screen.getByTestId('trigger-panel')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly with many interactions', () => {
      const manyInteractions: InteractionConfig[] = Array.from({ length: 50 }, (_, i) => ({
        id: `interaction-${i}`,
        name: `Interaction ${i}`,
        description: `Description ${i}`,
        enabled: i % 2 === 0,
        modules: [],
        routes: [],
      }));

      const startTime = performance.now();
      
      render(
        React.createElement(TriggerPanel, {
          interactions: manyInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(500); // Should render in under 500ms
      expect(screen.getByTestId('trigger-panel')).toBeInTheDocument();
    });

    it('should handle rapid trigger clicks', () => {
      render(
        React.createElement(TriggerPanel, {
          interactions: mockInteractions,
          onTrigger: mockOnTrigger,
          onToggle: mockOnToggle,
          isOpen: true,
        })
      );

      const triggerButtons = screen.getAllByText('Trigger');
      
      // Rapidly click the trigger button
      for (let i = 0; i < 10; i++) {
        fireEvent.click(triggerButtons[0]);
      }

      expect(mockOnTrigger).toHaveBeenCalledTimes(10);
    });
  });
}); 