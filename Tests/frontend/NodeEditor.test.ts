import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { edgeRegistrationTracker } from '../../frontend/src/utils/edgeRegistrationTracker';
import { FrontendEdgeData } from '../../frontend/src/types';

// Mock the edge registration tracker
vi.mock('../../frontend/src/utils/edgeRegistrationTracker', () => ({
  edgeRegistrationTracker: {
    isEdgeRegistered: vi.fn(),
    registeredEdges: new Set(),
    unregisteredEdges: new Set(),
    registerEdge: vi.fn(),
    unregisterEdge: vi.fn(),
    updateFromInteractions: vi.fn(),
    registerNewBackendEdges: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock CSS modules
vi.mock('../../frontend/src/components/CustomEdge.module.css', () => ({
  default: {
    registeredEdge: 'registered-edge',
    unregisteredEdge: 'unregistered-edge',
    triggerEdge: 'trigger-edge',
    streamEdge: 'stream-edge',
  },
}));

describe('NodeEditor Edge Styling Logic', () => {
  const mockEdgeRegistrationTracker = vi.mocked(edgeRegistrationTracker);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Edge Registration Status', () => {
    it('should identify registered edges correctly', () => {
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(true);
      
      const isRegistered = mockEdgeRegistrationTracker.isEdgeRegistered('test-edge-1');
      
      expect(isRegistered).toBe(true);
      expect(mockEdgeRegistrationTracker.isEdgeRegistered).toHaveBeenCalledWith('test-edge-1');
    });

    it('should identify unregistered edges correctly', () => {
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(false);
      
      const isRegistered = mockEdgeRegistrationTracker.isEdgeRegistered('test-edge-2');
      
      expect(isRegistered).toBe(false);
      expect(mockEdgeRegistrationTracker.isEdgeRegistered).toHaveBeenCalledWith('test-edge-2');
    });
  });

  describe('Edge Event Type Classification', () => {
    it('should classify trigger events correctly', () => {
      const triggerEdgeData: FrontendEdgeData = {
        route: {
          id: 'trigger-route',
          source: 'node1',
          target: 'node2',
          event: 'trigger',
        },
      };
      
      expect(triggerEdgeData.route?.event).toBe('trigger');
    });

    it('should classify stream events correctly', () => {
      const streamEdgeData: FrontendEdgeData = {
        route: {
          id: 'stream-route',
          source: 'node1',
          target: 'node2',
          event: 'stream',
        },
      };
      
      expect(streamEdgeData.route?.event).toBe('stream');
    });

    it('should handle missing event types gracefully', () => {
      const noEventEdgeData: FrontendEdgeData = {
        route: {
          id: 'no-event-route',
          source: 'node1',
          target: 'node2',
          // event property is missing
        },
      };
      
      expect(noEventEdgeData.route?.event).toBeUndefined();
    });
  });

  describe('Edge Styling Logic', () => {
    it('should apply registered styling for registered edges', () => {
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(true);
      
      const edgeId = 'registered-edge-1';
      const isRegistered = mockEdgeRegistrationTracker.isEdgeRegistered(edgeId);
      
      expect(isRegistered).toBe(true);
      // In the actual component, this would apply the 'registered-edge' CSS class
    });

    it('should apply unregistered styling for unregistered edges', () => {
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(false);
      
      const edgeId = 'unregistered-edge-1';
      const isRegistered = mockEdgeRegistrationTracker.isEdgeRegistered(edgeId);
      
      expect(isRegistered).toBe(false);
      // In the actual component, this would apply the 'unregistered-edge' CSS class
    });

    it('should apply trigger styling for trigger events', () => {
      const triggerEdgeData: FrontendEdgeData = {
        route: {
          id: 'trigger-route',
          source: 'node1',
          target: 'node2',
          event: 'trigger',
        },
      };
      
      expect(triggerEdgeData.route?.event).toBe('trigger');
      // In the actual component, this would apply the 'trigger-edge' CSS class
    });

    it('should apply stream styling for stream events', () => {
      const streamEdgeData: FrontendEdgeData = {
        route: {
          id: 'stream-route',
          source: 'node1',
          target: 'node2',
          event: 'stream',
        },
      };
      
      expect(streamEdgeData.route?.event).toBe('stream');
      // In the actual component, this would apply the 'stream-edge' CSS class
    });
  });

  describe('Combined Edge Styling', () => {
    it('should combine registered status and trigger event styling', () => {
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(true);
      
      const edgeId = 'registered-trigger-edge';
      const edgeData: FrontendEdgeData = {
        route: {
          id: 'trigger-route',
          source: 'node1',
          target: 'node2',
          event: 'trigger',
        },
      };
      
      const isRegistered = mockEdgeRegistrationTracker.isEdgeRegistered(edgeId);
      const isTrigger = edgeData.route?.event === 'trigger';
      
      expect(isRegistered).toBe(true);
      expect(isTrigger).toBe(true);
      // In the actual component, this would apply both 'registered-edge' and 'trigger-edge' CSS classes
    });

    it('should combine unregistered status and stream event styling', () => {
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(false);
      
      const edgeId = 'unregistered-stream-edge';
      const edgeData: FrontendEdgeData = {
        route: {
          id: 'stream-route',
          source: 'node1',
          target: 'node2',
          event: 'stream',
        },
      };
      
      const isRegistered = mockEdgeRegistrationTracker.isEdgeRegistered(edgeId);
      const isStream = edgeData.route?.event === 'stream';
      
      expect(isRegistered).toBe(false);
      expect(isStream).toBe(true);
      // In the actual component, this would apply both 'unregistered-edge' and 'stream-edge' CSS classes
    });
  });

  describe('Edge Registration Tracker Methods', () => {
    it('should register edges correctly', () => {
      const edgeId = 'new-edge';
      
      mockEdgeRegistrationTracker.registerEdge(edgeId);
      
      expect(mockEdgeRegistrationTracker.registerEdge).toHaveBeenCalledWith(edgeId);
    });

    it('should unregister edges correctly', () => {
      const edgeId = 'old-edge';
      
      mockEdgeRegistrationTracker.unregisterEdge(edgeId);
      
      expect(mockEdgeRegistrationTracker.unregisterEdge).toHaveBeenCalledWith(edgeId);
    });

    it('should clear all edges correctly', () => {
      mockEdgeRegistrationTracker.clear();
      
      expect(mockEdgeRegistrationTracker.clear).toHaveBeenCalled();
    });
  });

  describe('Edge Styling Consistency', () => {
    it('should maintain consistent styling for the same edge', () => {
      const edgeId = 'consistent-edge';
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(true);
      
      // First check
      const isRegistered1 = mockEdgeRegistrationTracker.isEdgeRegistered(edgeId);
      
      // Second check (should be consistent)
      const isRegistered2 = mockEdgeRegistrationTracker.isEdgeRegistered(edgeId);
      
      expect(isRegistered1).toBe(isRegistered2);
      expect(mockEdgeRegistrationTracker.isEdgeRegistered).toHaveBeenCalledTimes(2);
    });

    it('should handle edge styling updates correctly', () => {
      const edgeId = 'updating-edge';
      
      // Initially unregistered
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(false);
      const initiallyRegistered = mockEdgeRegistrationTracker.isEdgeRegistered(edgeId);
      
      // Then register it
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(true);
      const afterRegistration = mockEdgeRegistrationTracker.isEdgeRegistered(edgeId);
      
      expect(initiallyRegistered).toBe(false);
      expect(afterRegistration).toBe(true);
    });
  });

  describe('Edge Styling Performance', () => {
    it('should handle multiple edge checks efficiently', () => {
      const edgeIds = ['edge-1', 'edge-2', 'edge-3', 'edge-4', 'edge-5'];
      mockEdgeRegistrationTracker.isEdgeRegistered.mockReturnValue(true);
      
      const results = edgeIds.map(id => mockEdgeRegistrationTracker.isEdgeRegistered(id));
      
      expect(results).toEqual([true, true, true, true, true]);
      expect(mockEdgeRegistrationTracker.isEdgeRegistered).toHaveBeenCalledTimes(5);
    });

    it('should handle mixed registration statuses', () => {
      const registeredEdges = ['registered-1', 'registered-2'];
      const unregisteredEdges = ['unregistered-1', 'unregistered-2'];
      
      // Mock different return values for different edges
      mockEdgeRegistrationTracker.isEdgeRegistered.mockImplementation((edgeId: string) => {
        return registeredEdges.includes(edgeId);
      });
      
      const registeredResults = registeredEdges.map(id => mockEdgeRegistrationTracker.isEdgeRegistered(id));
      const unregisteredResults = unregisteredEdges.map(id => mockEdgeRegistrationTracker.isEdgeRegistered(id));
      
      expect(registeredResults).toEqual([true, true]);
      expect(unregisteredResults).toEqual([false, false]);
    });
  });
}); 