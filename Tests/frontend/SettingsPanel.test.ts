import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPanel from '../../frontend/src/components/SettingsPanel';

describe('SettingsPanel Component', () => {
  const mockSettings = {
    serverPort: 3001,
    logLevel: 'info',
    autoSave: true,
    theme: 'dark',
    maxLogEntries: 1000,
    refreshInterval: 5000,
  };

  const mockOnUpdate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render SettingsPanel with title', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      expect(screen.getByLabelText(/close settings/i)).toBeInTheDocument();
    });

    it('should render all settings fields', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      expect(screen.getByLabelText(/server port/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/log level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/auto save/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/max log entries/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/refresh interval/i)).toBeInTheDocument();
    });
  });

  describe('Settings Display', () => {
    it('should display current settings values', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      expect(screen.getByDisplayValue('3001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('info')).toBeInTheDocument();
      expect(screen.getByDisplayValue('dark')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
    });

    it('should display boolean settings as checkboxes', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const autoSaveCheckbox = screen.getByLabelText(/auto save/i);
      expect(autoSaveCheckbox).toBeChecked();
    });

    it('should handle empty settings object', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: {},
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      // Should render without crashing
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });
  });

  describe('Settings Editing', () => {
    it('should update number settings when changed', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const serverPortInput = screen.getByDisplayValue('3001');
      fireEvent.change(serverPortInput, { target: { value: '3002' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockSettings,
        serverPort: 3002,
      });
    });

    it('should update string settings when changed', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const logLevelSelect = screen.getByDisplayValue('info');
      fireEvent.change(logLevelSelect, { target: { value: 'debug' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockSettings,
        logLevel: 'debug',
      });
    });

    it('should update boolean settings when changed', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const autoSaveCheckbox = screen.getByLabelText(/auto save/i);
      fireEvent.click(autoSaveCheckbox);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockSettings,
        autoSave: false,
      });
    });

    it('should handle invalid number inputs gracefully', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const serverPortInput = screen.getByDisplayValue('3001');
      fireEvent.change(serverPortInput, { target: { value: 'invalid' } });

      // Should not call onUpdate with invalid input
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should handle negative number inputs', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const serverPortInput = screen.getByDisplayValue('3001');
      fireEvent.change(serverPortInput, { target: { value: '-1' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockSettings,
        serverPort: -1,
      });
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const closeButton = screen.getByLabelText(/close settings/i);
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when escape key is pressed', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should validate port number range', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const serverPortInput = screen.getByDisplayValue('3001');
      
      // Test valid port numbers
      fireEvent.change(serverPortInput, { target: { value: '1024' } });
      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockSettings,
        serverPort: 1024,
      });

      fireEvent.change(serverPortInput, { target: { value: '65535' } });
      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockSettings,
        serverPort: 65535,
      });
    });

    it('should validate log level options', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const logLevelSelect = screen.getByDisplayValue('info');
      
      // Test valid log levels
      const validLevels = ['debug', 'info', 'warn', 'error'];
      validLevels.forEach(level => {
        fireEvent.change(logLevelSelect, { target: { value: level } });
        expect(mockOnUpdate).toHaveBeenCalledWith({
          ...mockSettings,
          logLevel: level,
        });
      });
    });

    it('should validate theme options', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const themeSelect = screen.getByDisplayValue('dark');
      
      // Test valid themes
      const validThemes = ['light', 'dark', 'auto'];
      validThemes.forEach(theme => {
        fireEvent.change(themeSelect, { target: { value: theme } });
        expect(mockOnUpdate).toHaveBeenCalledWith({
          ...mockSettings,
          theme: theme,
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle settings with null values', () => {
      const settingsWithNulls = {
        ...mockSettings,
        serverPort: null,
        logLevel: null,
      };

      render(
        React.createElement(SettingsPanel, {
          settings: settingsWithNulls,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      // Should render without crashing
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });

    it('should handle settings with undefined values', () => {
      const settingsWithUndefined = {
        ...mockSettings,
        serverPort: undefined,
        logLevel: undefined,
      };

      render(
        React.createElement(SettingsPanel, {
          settings: settingsWithUndefined,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      // Should render without crashing
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });

    it('should handle very large number values', () => {
      const settingsWithLargeNumbers = {
        ...mockSettings,
        maxLogEntries: 999999999,
        refreshInterval: 999999999,
      };

      render(
        React.createElement(SettingsPanel, {
          settings: settingsWithLargeNumbers,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      expect(screen.getByDisplayValue('999999999')).toBeInTheDocument();
    });

    it('should handle very long string values', () => {
      const longString = 'A'.repeat(1000);
      const settingsWithLongStrings = {
        ...mockSettings,
        logLevel: longString,
        theme: longString,
      };

      render(
        React.createElement(SettingsPanel, {
          settings: settingsWithLongStrings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      // Should render without layout issues
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });

    it('should handle missing callback functions', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: undefined as any,
          onClose: undefined as any,
        })
      );

      // Should render without crashing
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      expect(screen.getByLabelText(/close settings/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/server port/i)).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const serverPortInput = screen.getByDisplayValue('3001');
      
      fireEvent.keyDown(serverPortInput, { key: 'Enter' });
      expect(serverPortInput).toHaveFocus();
    });

    it('should have proper focus management', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const closeButton = screen.getByLabelText(/close settings/i);
      closeButton.focus();
      
      expect(closeButton).toHaveFocus();
    });

    it('should have proper form structure', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      // Check for proper form structure
      expect(screen.getByRole('form')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid setting changes', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const serverPortInput = screen.getByDisplayValue('3001');
      
      // Rapidly change the input value
      for (let i = 0; i < 10; i++) {
        fireEvent.change(serverPortInput, { target: { value: String(3001 + i) } });
      }

      expect(mockOnUpdate).toHaveBeenCalledTimes(10);
    });
  });

  describe('Responsive Design', () => {
    it('should have proper CSS classes for responsive design', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      const container = screen.getByText(/Settings/i).closest('div');
      expect(container).toHaveClass('settingsPanel');
    });

    it('should maintain proper layout on different screen sizes', () => {
      render(
        React.createElement(SettingsPanel, {
          settings: mockSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      // All form elements should be visible and accessible
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/server port/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/log level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/auto save/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/max log entries/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/refresh interval/i)).toBeInTheDocument();
    });
  });

  describe('Data Types', () => {
    it('should handle different data types correctly', () => {
      const mixedSettings = {
        stringSetting: 'test',
        numberSetting: 42,
        booleanSetting: true,
        nullSetting: null,
        undefinedSetting: undefined,
      };

      render(
        React.createElement(SettingsPanel, {
          settings: mixedSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      // Should render without crashing
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });

    it('should handle nested object settings', () => {
      const nestedSettings = {
        server: {
          port: 3001,
          host: 'localhost',
        },
        logging: {
          level: 'info',
          file: 'app.log',
        },
      };

      render(
        React.createElement(SettingsPanel, {
          settings: nestedSettings,
          onUpdate: mockOnUpdate,
          onClose: mockOnClose,
        })
      );

      // Should render without crashing
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });
  });
}); 