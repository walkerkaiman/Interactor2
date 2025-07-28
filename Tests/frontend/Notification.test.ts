import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Notification from '../../frontend/src/components/Notification';

// Mock CSS modules
vi.mock('../../frontend/src/components/Notification.module.css', () => ({
  default: {
    notification: 'notification',
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
    closeButton: 'close-button',
  },
}));

describe('Notification Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render notification with message', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "Test notification message",
          onClose: mockOnClose,
        })
      );

      expect(screen.getByText(/Test notification message/i)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "Test notification message",
          onClose: mockOnClose,
        })
      );

      expect(screen.getByLabelText(/close notification/i)).toBeInTheDocument();
    });
  });

  describe('Notification Types', () => {
    it('should render success notification', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "Success message",
          onClose: mockOnClose,
        })
      );

      expect(screen.getByText(/Success message/i)).toBeInTheDocument();
      expect(screen.getByText(/Success message/i).closest('div')).toHaveClass('success');
    });

    it('should render error notification', () => {
      render(
        React.createElement(Notification, {
          type: "error",
          message: "Error message",
          onClose: mockOnClose,
        })
      );

      expect(screen.getByText(/Error message/i)).toBeInTheDocument();
      expect(screen.getByText(/Error message/i).closest('div')).toHaveClass('error');
    });

    it('should render warning notification', () => {
      render(
        React.createElement(Notification, {
          type: "warning",
          message: "Warning message",
          onClose: mockOnClose,
        })
      );

      expect(screen.getByText(/Warning message/i)).toBeInTheDocument();
      expect(screen.getByText(/Warning message/i).closest('div')).toHaveClass('warning');
    });

    it('should render info notification', () => {
      render(
        React.createElement(Notification, {
          type: "info",
          message: "Info message",
          onClose: mockOnClose,
        })
      );

      expect(screen.getByText(/Info message/i)).toBeInTheDocument();
      expect(screen.getByText(/Info message/i).closest('div')).toHaveClass('info');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "Test notification message",
          onClose: mockOnClose,
        })
      );

      const closeButton = screen.getByLabelText(/close notification/i);
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when escape key is pressed', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "Test notification message",
          onClose: mockOnClose,
        })
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "Test notification message",
          onClose: mockOnClose,
        })
      );

      const notification = screen.getByRole('alert');
      expect(notification).toBeInTheDocument();
    });

    it('should have accessible close button', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "Test notification message",
          onClose: mockOnClose,
        })
      );

      const closeButton = screen.getByLabelText(/close notification/i);
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "",
          onClose: mockOnClose,
        })
      );

      // Should render without crashing
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(1000);
      render(
        React.createElement(Notification, {
          type: "success",
          message: longMessage,
          onClose: mockOnClose,
        })
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle missing onClose prop', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "Test message",
        })
      );

      // Should render without crashing
      expect(screen.getByText(/Test message/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly with large message', () => {
      const startTime = performance.now();
      
      render(
        React.createElement(Notification, {
          type: "success",
          message: "A".repeat(1000),
          onClose: mockOnClose,
        })
      );
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle rapid close button clicks', () => {
      render(
        React.createElement(Notification, {
          type: "success",
          message: "Test message",
          onClose: mockOnClose,
        })
      );

      const closeButton = screen.getByLabelText(/close notification/i);
      
      // Click multiple times rapidly
      for (let i = 0; i < 10; i++) {
        fireEvent.click(closeButton);
      }

      expect(mockOnClose).toHaveBeenCalledTimes(10);
    });
  });
}); 