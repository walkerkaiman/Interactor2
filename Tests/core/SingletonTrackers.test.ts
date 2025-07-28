import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { triggerEventTracker } from '../../frontend/src/utils/triggerEventTracker';
import { edgeRegistrationTracker } from '../../frontend/src/utils/edgeRegistrationTracker';
import { apiService } from '../../frontend/src/api';

describe('Frontend Singleton Trackers', () => {
  beforeEach(() => {
    // Clear any existing state
    triggerEventTracker.clearAllPulses();
    edgeRegistrationTracker.clear();
  });

  afterEach(() => {
    // Clean up
    triggerEventTracker.clearAllPulses();
    edgeRegistrationTracker.clear();
  });

  describe('TriggerEventTracker Singleton', () => {
    it('should maintain singleton instance', () => {
      const instance1 = triggerEventTracker;
      const instance2 = triggerEventTracker;
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(Object);
    });

    it('should track pulse states correctly', () => {
      const moduleId = 'test-module-1';
      
      // Initially not pulsing
      expect(triggerEventTracker.isPulsing(moduleId)).toBe(false);
      
      // Record trigger event
      triggerEventTracker.recordTriggerEvent(moduleId, 'manual');
      
      // Should be pulsing now
      expect(triggerEventTracker.isPulsing(moduleId)).toBe(true);
      
      // Wait for animation to complete
      return new Promise(resolve => {
        setTimeout(() => {
          expect(triggerEventTracker.isPulsing(moduleId)).toBe(false);
          resolve(true);
        }, 700);
      });
    });

    it('should emit events correctly', () => {
      const mockListener = vi.fn();
      triggerEventTracker.on('triggerEvent', mockListener);
      
      const moduleId = 'test-module-2';
      triggerEventTracker.recordTriggerEvent(moduleId, 'auto');
      
      expect(mockListener).toHaveBeenCalledWith({
        moduleId,
        timestamp: expect.any(Number),
        source: 'auto'
      });
      
      triggerEventTracker.off('triggerEvent', mockListener);
    });
  });

  describe('EdgeRegistrationTracker Singleton', () => {
    it('should maintain singleton instance', () => {
      const instance1 = edgeRegistrationTracker;
      const instance2 = edgeRegistrationTracker;
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(Object);
    });

    it('should track edge registration states correctly', () => {
      const edgeId = 'test-edge-1';
      
      // Initially not registered
      expect(edgeRegistrationTracker.isEdgeRegistered(edgeId)).toBe(false);
      
      // Register edge
      edgeRegistrationTracker.registerEdge(edgeId);
      expect(edgeRegistrationTracker.isEdgeRegistered(edgeId)).toBe(true);
      
      // Unregister edge
      edgeRegistrationTracker.unregisterEdge(edgeId);
      expect(edgeRegistrationTracker.isEdgeRegistered(edgeId)).toBe(false);
    });

    it('should update from interactions correctly', () => {
      const mockInteractions = [
        {
          id: 'interaction-1',
          modules: [],
          routes: [
            { id: 'route-1', source: 'module-1', target: 'module-2' },
            { id: 'route-2', source: 'module-2', target: 'module-3' }
          ]
        }
      ];
      
      edgeRegistrationTracker.updateFromInteractions(mockInteractions, []);
      
      expect(edgeRegistrationTracker.isEdgeRegistered('route-1')).toBe(true);
      expect(edgeRegistrationTracker.isEdgeRegistered('route-2')).toBe(true);
    });

    it('should clear all states correctly', () => {
      const edgeId = 'test-edge-2';
      edgeRegistrationTracker.registerEdge(edgeId);
      expect(edgeRegistrationTracker.isEdgeRegistered(edgeId)).toBe(true);
      
      edgeRegistrationTracker.clear();
      expect(edgeRegistrationTracker.isEdgeRegistered(edgeId)).toBe(false);
    });
  });

  describe('ApiService Singleton', () => {
    it('should maintain singleton instance', () => {
      const instance1 = apiService;
      const instance2 = apiService;
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(Object);
    });

    it('should have required API methods', () => {
      expect(typeof apiService.getModules).toBe('function');
      expect(typeof apiService.getInteractions).toBe('function');
      expect(typeof apiService.registerInteractions).toBe('function');
      expect(typeof apiService.triggerModule).toBe('function');
      expect(typeof apiService.getSettings).toBe('function');
      expect(typeof apiService.updateSetting).toBe('function');
      expect(typeof apiService.getStats).toBe('function');
      expect(typeof apiService.getHealth).toBe('function');
    });
  });

  describe('Singleton Pattern Consistency', () => {
    it('should all use the same singleton pattern', () => {
      // All trackers should be instances of their respective classes
      expect(triggerEventTracker).toBeDefined();
      expect(edgeRegistrationTracker).toBeDefined();
      expect(apiService).toBeDefined();
      
      // All should be the same instance when accessed multiple times
      expect(triggerEventTracker).toBe(triggerEventTracker);
      expect(edgeRegistrationTracker).toBe(edgeRegistrationTracker);
      expect(apiService).toBe(apiService);
    });
  });
}); 