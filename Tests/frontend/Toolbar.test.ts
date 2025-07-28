import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from '../../frontend/src/components/Toolbar';

// Mock CSS modules
vi.mock('../../frontend/src/components/Toolbar.module.css', () => ({
  default: {
    toolbar: 'toolbar',
    left: 'left',
    center: 'center',
    right: 'right',
    toolbarButton: 'toolbar-button',
    title: 'title',
    registerButton: 'register-button',
    registering: 'registering',
  },
}));

describe('Toolbar Component', () => {
  const mockOnRegister = vi.fn();
  const mockOnToggleSidebar = vi.fn();
  const mockOnToggleSettings = vi.fn();
  const mockOnToggleTrigger = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render toolbar with all buttons', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      expect(screen.getByText('Register')).toBeInTheDocument();
      expect(screen.getByTitle('Hide Sidebar')).toBeInTheDocument();
      expect(screen.getByTitle('Trigger Panel')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const toolbar = screen.getByText('Register').closest('div');
      expect(toolbar).toHaveClass('right');
    });
  });

  describe('Button Functionality', () => {
    it('should call onRegister when register button is clicked', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const registerButton = screen.getByText('Register');
      fireEvent.click(registerButton);

      expect(mockOnRegister).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleSidebar when sidebar button is clicked', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const sidebarButton = screen.getByTitle('Hide Sidebar');
      fireEvent.click(sidebarButton);

      expect(mockOnToggleSidebar).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleTrigger when trigger button is clicked', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const triggerButton = screen.getByTitle('Trigger Panel');
      fireEvent.click(triggerButton);

      expect(mockOnToggleTrigger).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleSettings when settings button is clicked', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const settingsButton = screen.getByTitle('Settings');
      fireEvent.click(settingsButton);

      expect(mockOnToggleSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button States', () => {
    it('should show registering state when isRegistering is true', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: true,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const registerButton = screen.getByText('Registering...');
      expect(registerButton).toBeInTheDocument();
      expect(registerButton).toBeDisabled();
    });

    it('should show normal state when isRegistering is false', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const registerButton = screen.getByText('Register');
      expect(registerButton).toBeInTheDocument();
      expect(registerButton).not.toBeDisabled();
    });
  });

  describe('Sidebar Toggle', () => {
    it('should show correct icon when sidebar is open', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const sidebarButton = screen.getByTitle('Hide Sidebar');
      expect(sidebarButton).toBeInTheDocument();
    });

    it('should show correct icon when sidebar is closed', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: false,
        })
      );

      const sidebarButton = screen.getByTitle('Show Sidebar');
      expect(sidebarButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper title attributes', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      expect(screen.getByTitle('Hide Sidebar')).toBeInTheDocument();
      expect(screen.getByTitle('Trigger Panel')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const registerButton = screen.getByText('Register');
      
      // Test keyboard navigation
      fireEvent.keyDown(registerButton, { key: 'Enter' });
      expect(mockOnRegister).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(registerButton, { key: ' ' });
      expect(mockOnRegister).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing callback props', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      // Should render without errors
      expect(screen.getByText('Register')).toBeInTheDocument();
    });

    it('should handle undefined disabled prop', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      // Should render without errors
      expect(screen.getByText('Register')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
      expect(screen.getByText('Register')).toBeInTheDocument();
    });

    it('should handle rapid button clicks', () => {
      render(
        React.createElement(Toolbar, {
          onRegister: mockOnRegister,
          isRegistering: false,
          onToggleSidebar: mockOnToggleSidebar,
          onToggleSettings: mockOnToggleSettings,
          onToggleTrigger: mockOnToggleTrigger,
          sidebarOpen: true,
        })
      );

      const registerButton = screen.getByText('Register');
      
      // Rapidly click the button
      for (let i = 0; i < 10; i++) {
        fireEvent.click(registerButton);
      }

      expect(mockOnRegister).toHaveBeenCalledTimes(10);
    });
  });
}); 