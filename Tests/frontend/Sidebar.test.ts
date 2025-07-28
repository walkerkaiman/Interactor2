import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../frontend/src/components/Sidebar';
import { ModuleManifest } from '@interactor/shared';

// Mock CSS modules
vi.mock('../../frontend/src/components/Sidebar.module.css', () => ({
  default: {
    sidebar: 'sidebar',
    header: 'header',
    nav: 'nav',
    navItem: 'nav-item',
    active: 'active',
    content: 'content',
  },
}));

describe('Sidebar Component', () => {
  const mockModules: ModuleManifest[] = [
    {
      name: 'test-input-module',
      type: 'input',
      version: '1.0.0',
      description: 'Test input module',
      inputs: [],
      outputs: [],
    },
    {
      name: 'test-output-module',
      type: 'output',
      version: '1.0.0',
      description: 'Test output module',
      inputs: [],
      outputs: [],
    },
  ];

  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render sidebar with navigation', () => {
      render(
        React.createElement(Sidebar, {
          currentPage: 'console',
          onPageChange: mockOnPageChange,
        })
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByText('Console')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Wikis')).toBeInTheDocument();
    });

    it('should highlight current page', () => {
      render(
        React.createElement(Sidebar, {
          currentPage: 'performance',
          onPageChange: mockOnPageChange,
        })
      );

      const performanceLink = screen.getByText('Performance');
      expect(performanceLink).toHaveClass('active');
    });
  });

  describe('Navigation', () => {
    it('should call onPageChange when nav item is clicked', () => {
      render(
        React.createElement(Sidebar, {
          currentPage: 'console',
          onPageChange: mockOnPageChange,
        })
      );

      const performanceLink = screen.getByText('Performance');
      fireEvent.click(performanceLink);

      expect(mockOnPageChange).toHaveBeenCalledWith('performance');
    });

    it('should navigate to console page', () => {
      render(
        React.createElement(Sidebar, {
          currentPage: 'performance',
          onPageChange: mockOnPageChange,
        })
      );

      const consoleLink = screen.getByText('Console');
      fireEvent.click(consoleLink);

      expect(mockOnPageChange).toHaveBeenCalledWith('console');
    });

    it('should navigate to wikis page', () => {
      render(
        React.createElement(Sidebar, {
          currentPage: 'console',
          onPageChange: mockOnPageChange,
        })
      );

      const wikisLink = screen.getByText('Wikis');
      fireEvent.click(wikisLink);

      expect(mockOnPageChange).toHaveBeenCalledWith('wikis');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        React.createElement(Sidebar, {
          currentPage: 'console',
          onPageChange: mockOnPageChange,
        })
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('role', 'navigation');
    });

    it('should have accessible navigation links', () => {
      render(
        React.createElement(Sidebar, {
          currentPage: 'console',
          onPageChange: mockOnPageChange,
        })
      );

      const consoleLink = screen.getByText('Console');
      expect(consoleLink).toHaveAttribute('role', 'button');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onPageChange prop', () => {
      render(
        React.createElement(Sidebar, {
          currentPage: 'console',
        })
      );

      // Should render without errors
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should handle unknown current page', () => {
      render(
        React.createElement(Sidebar, {
          currentPage: 'unknown-page',
          onPageChange: mockOnPageChange,
        })
      );

      // Should render without errors
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      
      render(
        React.createElement(Sidebar, {
          currentPage: 'console',
          onPageChange: mockOnPageChange,
        })
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should handle rapid page changes', () => {
      const { rerender } = render(
        React.createElement(Sidebar, {
          currentPage: 'console',
          onPageChange: mockOnPageChange,
        })
      );

      // Rapidly change pages
      for (let i = 0; i < 10; i++) {
        rerender(
          React.createElement(Sidebar, {
            currentPage: i % 2 === 0 ? 'console' : 'performance',
            onPageChange: mockOnPageChange,
          })
        );
      }

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
  });
}); 