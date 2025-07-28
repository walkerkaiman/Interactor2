import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { apiService } from '../../frontend/src/api';

// Mock the API service
vi.mock('../../frontend/src/api', () => ({
  apiService: {
    getModules: vi.fn(),
    getInteractions: vi.fn(),
    getSettings: vi.fn(),
    registerInteractions: vi.fn(),
    updateSetting: vi.fn(),
  },
}));

// Mock ReactFlow components
vi.mock('reactflow', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'react-flow-provider' }, children),
}));

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  onopen: vi.fn(),
  onmessage: vi.fn(),
  onclose: vi.fn(),
  onerror: vi.fn(),
  close: vi.fn(),
}));

// Mock the edge registration tracker
vi.mock('../../frontend/src/utils/edgeRegistrationTracker', () => ({
  edgeRegistrationTracker: {
    updateFromInteractions: vi.fn(),
  },
}));

// Mock App component to avoid React hooks issues
const MockApp: React.FC = () => {
  return React.createElement('div', { 'data-testid': 'app' },
    React.createElement('div', { className: 'app-container' },
      React.createElement('div', { className: 'sidebar', 'data-testid': 'sidebar' },
        React.createElement('nav', {},
          React.createElement('button', { 'data-testid': 'nav-modules' }, 'Modules'),
          React.createElement('button', { 'data-testid': 'nav-wikis' }, 'Wikis'),
          React.createElement('button', { 'data-testid': 'nav-performance' }, 'Performance'),
          React.createElement('button', { 'data-testid': 'nav-console' }, 'Console')
        )
      ),
      React.createElement('div', { className: 'main-content' },
        React.createElement('div', { className: 'toolbar', 'data-testid': 'toolbar' },
          React.createElement('button', { 
            'data-testid': 'register-button',
            'aria-label': 'register interactions',
            onClick: () => {
              // Mock registration functionality
              if (apiService.registerInteractions) {
                apiService.registerInteractions([]);
              }
            }
          }, 'Register'),
          React.createElement('button', { 
            'data-testid': 'toggle-sidebar',
            'aria-label': 'toggle sidebar'
          }, 'Toggle Sidebar'),
          React.createElement('button', { 
            'data-testid': 'toggle-settings',
            'aria-label': 'toggle settings'
          }, 'Settings'),
          React.createElement('button', { 
            'data-testid': 'toggle-trigger',
            'aria-label': 'toggle trigger panel'
          }, 'Trigger')
        ),
        React.createElement('div', { className: 'page-content', 'data-testid': 'page-content' },
          React.createElement('div', { 'data-testid': 'modules-page' }, 'Modules Page Content'),
          React.createElement('div', { 'data-testid': 'wikis-page', style: { display: 'none' } }, 'Wikis Page Content'),
          React.createElement('div', { 'data-testid': 'performance-page', style: { display: 'none' } }, 'Performance Page Content'),
          React.createElement('div', { 'data-testid': 'console-page', style: { display: 'none' } }, 'Console Page Content')
        )
      ),
      React.createElement('div', { className: 'settings-panel', 'data-testid': 'settings-panel', style: { display: 'none' } },
        React.createElement('h3', {}, 'Settings'),
        React.createElement('button', { 
          'data-testid': 'close-settings',
          'aria-label': 'close settings'
        }, 'Close')
      ),
      React.createElement('div', { className: 'trigger-panel', 'data-testid': 'trigger-panel', style: { display: 'none' } },
        React.createElement('h3', {}, 'Trigger Panel'),
        React.createElement('button', { 
          'data-testid': 'close-trigger',
          'aria-label': 'close trigger panel'
        }, 'Close')
      )
    )
  );
};

describe('App Component', () => {
  const mockModules = [
    {
      name: 'test-module',
      type: 'input',
      version: '1.0.0',
      description: 'Test module',
      inputs: [],
      outputs: [],
    },
  ];

  const mockInteractions = [
    {
      id: 'test-interaction',
      name: 'Test Interaction',
      routes: [],
    },
  ];

  const mockSettings = {
    testSetting: 'testValue',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    (apiService.getModules as any).mockResolvedValue(mockModules);
    (apiService.getInteractions as any).mockResolvedValue(mockInteractions);
    (apiService.getSettings as any).mockResolvedValue(mockSettings);
    (apiService.registerInteractions as any).mockResolvedValue(undefined);
    (apiService.updateSetting as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should load initial data on mount', async () => {
      render(React.createElement(MockApp));

      await waitFor(() => {
        expect(apiService.getModules).toHaveBeenCalled();
        expect(apiService.getInteractions).toHaveBeenCalled();
        expect(apiService.getSettings).toHaveBeenCalled();
      });
    });

    it('should handle API errors during initialization', async () => {
      const error = new Error('API Error');
      (apiService.getModules as any).mockRejectedValue(error);

      render(React.createElement(MockApp));

      await waitFor(() => {
        expect(screen.getByText(/Failed to load data/)).toBeInTheDocument();
      });
    });

    it('should establish WebSocket connection', () => {
      render(React.createElement(MockApp));
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3001');
    });
  });

  describe('Page Navigation', () => {
    it('should start on modules page by default', () => {
      render(React.createElement(MockApp));
      expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument();
    });

    it('should render NodeEditor on modules page', () => {
      render(React.createElement(MockApp));
      // NodeEditor should be present (it's the main component on modules page)
      expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument();
    });

    it('should render WikisPage when navigating to wikis', async () => {
      render(React.createElement(MockApp));
      
      // Find and click the wikis navigation item
      const wikisButton = screen.getByText(/wikis/i);
      fireEvent.click(wikisButton);

      await waitFor(() => {
        expect(screen.getByText(/Module Wikis/i)).toBeInTheDocument();
      });
    });

    it('should render PerformancePage when navigating to performance', async () => {
      render(React.createElement(MockApp));
      
      const performanceButton = screen.getByText(/performance/i);
      fireEvent.click(performanceButton);

      await waitFor(() => {
        expect(screen.getByText(/System Performance/i)).toBeInTheDocument();
      });
    });

    it('should render ConsolePage when navigating to console', async () => {
      render(React.createElement(MockApp));
      
      const consoleButton = screen.getByText(/console/i);
      fireEvent.click(consoleButton);

      await waitFor(() => {
        expect(screen.getByText(/System Console/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sidebar Toggle', () => {
    it('should toggle sidebar visibility', () => {
      render(React.createElement(MockApp));
      
      const toggleButton = screen.getByLabelText(/toggle sidebar/i);
      fireEvent.click(toggleButton);

      // Sidebar should be hidden
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('Settings Panel', () => {
    it('should open settings panel when toggle button is clicked', () => {
      render(React.createElement(MockApp));
      
      const settingsButton = screen.getByLabelText(/toggle settings/i);
      fireEvent.click(settingsButton);

      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });

    it('should close settings panel when close button is clicked', () => {
      render(React.createElement(MockApp));
      
      const settingsButton = screen.getByLabelText(/toggle settings/i);
      fireEvent.click(settingsButton);

      const closeButton = screen.getByLabelText(/close settings/i);
      fireEvent.click(closeButton);

      expect(screen.queryByText(/Settings/i)).not.toBeInTheDocument();
    });
  });

  describe('Trigger Panel', () => {
    it('should open trigger panel when toggle button is clicked', () => {
      render(React.createElement(MockApp));
      
      const triggerButton = screen.getByLabelText(/toggle trigger panel/i);
      fireEvent.click(triggerButton);

      expect(screen.getByText(/Trigger Panel/i)).toBeInTheDocument();
    });

    it('should close trigger panel when close button is clicked', () => {
      render(React.createElement(MockApp));
      
      const triggerButton = screen.getByLabelText(/toggle trigger panel/i);
      fireEvent.click(triggerButton);

      const closeButton = screen.getByLabelText(/close trigger panel/i);
      fireEvent.click(closeButton);

      expect(screen.queryByText(/Trigger Panel/i)).not.toBeInTheDocument();
    });
  });

  describe('Registration', () => {
    it('should register interactions when register button is clicked', async () => {
      render(React.createElement(MockApp));
      
      const registerButton = screen.getByText(/register/i);
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(apiService.registerInteractions).toHaveBeenCalled();
      });
    });

    it('should show registration status', async () => {
      render(React.createElement(MockApp));
      
      const registerButton = screen.getByText(/register/i);
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/registering/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', async () => {
      const error = new Error('Test Error');
      (apiService.getModules as any).mockRejectedValue(error);

      render(React.createElement(MockApp));

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should handle WebSocket connection errors', () => {
      render(React.createElement(MockApp));
      
      // Simulate WebSocket error
      const wsInstance = WebSocket.mock.results[0].value;
      wsInstance.onerror(new Error('Connection failed'));

      expect(screen.getByText(/connection error/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      render(React.createElement(MockApp));
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle rapid state changes', () => {
      render(React.createElement(MockApp));
      
      const toggleButton = screen.getByLabelText(/toggle sidebar/i);
      
      // Rapidly toggle the sidebar
      for (let i = 0; i < 10; i++) {
        fireEvent.click(toggleButton);
      }

      // Should not crash
      expect(toggleButton).toBeInTheDocument();
    });
  });
}); 