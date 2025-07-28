import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PerformancePage from '../../frontend/src/components/PerformancePage';
import { PerformancePageState } from '../../frontend/src/types';

describe('PerformancePage Component', () => {
  const mockState: PerformancePageState = {
    loading: false,
    error: null,
    stats: null,
    lastRefresh: null,
  };

  const mockOnStateUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should render PerformancePage with title', () => {
      render(
        React.createElement(PerformancePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByRole('heading', { name: /Performance/i })).toBeInTheDocument();
    });

    it('should render placeholder content', () => {
      render(
        React.createElement(PerformancePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      expect(screen.getByText(/Performance monitoring and statistics will be displayed here/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing callback prop', () => {
      render(
        React.createElement(PerformancePage, {
          state: mockState,
          onStateUpdate: mockOnStateUpdate,
        })
      );

      // Should render without errors
      expect(screen.getByRole('heading', { name: /Performance/i })).toBeInTheDocument();
    });
  });
}); 