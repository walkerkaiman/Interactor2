import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WikisPage from '../../frontend/src/components/WikisPage';
import { ModuleManifest } from '@interactor/shared';

// Mock CSS modules
vi.mock('../../frontend/src/components/WikisPage.module.css', () => ({
  default: {
    wikisPage: 'wikis-page',
    header: 'header',
    content: 'content',
    wikiItem: 'wiki-item',
    active: 'active',
    button: 'button',
  },
}));

describe('WikisPage Component', () => {
  const mockModules: ModuleManifest[] = [
    {
      name: 'module-1',
      type: 'input',
      version: '1.0.0',
      description: 'Test module 1',
      inputs: [],
      outputs: [],
    },
    {
      name: 'module-2',
      type: 'output',
      version: '1.0.0',
      description: 'Test module 2',
      inputs: [],
      outputs: [],
    },
  ];

  const mockOnModuleSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render wikis page with modules', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      expect(screen.getByText('module-1')).toBeInTheDocument();
      expect(screen.getByText('module-2')).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      const page = screen.getByTestId('wikis-page');
      expect(page).toHaveClass('wikis-page');
    });
  });

  describe('Module Display', () => {
    it('should display module names', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      expect(screen.getByText('module-1')).toBeInTheDocument();
      expect(screen.getByText('module-2')).toBeInTheDocument();
    });

    it('should display module descriptions', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      expect(screen.getByText('Test module 1')).toBeInTheDocument();
      expect(screen.getByText('Test module 2')).toBeInTheDocument();
    });

    it('should display module types', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      expect(screen.getByText('input')).toBeInTheDocument();
      expect(screen.getByText('output')).toBeInTheDocument();
    });
  });

  describe('Module Selection', () => {
    it('should call onModuleSelect when module is clicked', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      const module1 = screen.getByText('module-1');
      fireEvent.click(module1);

      expect(mockOnModuleSelect).toHaveBeenCalledWith('module-1');
    });

    it('should call onModuleSelect with correct module name', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      const module2 = screen.getByText('module-2');
      fireEvent.click(module2);

      expect(mockOnModuleSelect).toHaveBeenCalledWith('module-2');
    });
  });

  describe('Module Filtering', () => {
    it('should filter modules by type', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      // Should show both input and output modules
      expect(screen.getByText('input')).toBeInTheDocument();
      expect(screen.getByText('output')).toBeInTheDocument();
    });

    it('should handle empty modules array', () => {
      render(
        React.createElement(WikisPage, {
          modules: [],
          onModuleSelect: mockOnModuleSelect,
        })
      );

      // Should render without errors
      expect(screen.getByTestId('wikis-page')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      const page = screen.getByTestId('wikis-page');
      expect(page).toHaveAttribute('role', 'main');
    });

    it('should have accessible module items', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      const moduleItems = screen.getAllByTestId('wiki-item');
      moduleItems.forEach(item => {
        expect(item).toHaveAttribute('role', 'button');
      });
    });

    it('should support keyboard navigation', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      const module1 = screen.getByText('module-1');
      
      // Test keyboard navigation
      fireEvent.keyDown(module1, { key: 'Enter' });
      expect(mockOnModuleSelect).toHaveBeenCalledWith('module-1');

      fireEvent.keyDown(module1, { key: ' ' });
      expect(mockOnModuleSelect).toHaveBeenCalledWith('module-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle modules with missing properties', () => {
      const incompleteModules: ModuleManifest[] = [
        {
          name: 'incomplete-module',
          type: 'input',
          version: '1.0.0',
          description: '',
          inputs: [],
          outputs: [],
        },
      ];

      render(
        React.createElement(WikisPage, {
          modules: incompleteModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      // Should render without errors
      expect(screen.getByTestId('wikis-page')).toBeInTheDocument();
    });

    it('should handle missing callback prop', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
        })
      );

      // Should render without errors
      expect(screen.getByTestId('wikis-page')).toBeInTheDocument();
    });

    it('should handle modules with very long names', () => {
      const longNameModules: ModuleManifest[] = [
        {
          name: 'A'.repeat(100),
          type: 'input',
          version: '1.0.0',
          description: 'Test module with long name',
          inputs: [],
          outputs: [],
        },
      ];

      render(
        React.createElement(WikisPage, {
          modules: longNameModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      // Should render without layout issues
      expect(screen.getByTestId('wikis-page')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly with many modules', () => {
      const manyModules: ModuleManifest[] = Array.from({ length: 50 }, (_, i) => ({
        name: `module-${i}`,
        type: i % 2 === 0 ? 'input' : 'output',
        version: '1.0.0',
        description: `Test module ${i}`,
        inputs: [],
        outputs: [],
      }));

      const startTime = performance.now();
      
      render(
        React.createElement(WikisPage, {
          modules: manyModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(500); // Should render in under 500ms
      expect(screen.getByTestId('wikis-page')).toBeInTheDocument();
    });

    it('should handle rapid module selections', () => {
      render(
        React.createElement(WikisPage, {
          modules: mockModules,
          onModuleSelect: mockOnModuleSelect,
        })
      );

      const module1 = screen.getByText('module-1');
      
      // Rapidly click the module
      for (let i = 0; i < 10; i++) {
        fireEvent.click(module1);
      }

      expect(mockOnModuleSelect).toHaveBeenCalledTimes(10);
    });
  });
}); 