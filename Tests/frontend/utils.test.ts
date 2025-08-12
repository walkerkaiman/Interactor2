import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Frontend Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection State Tracker', () => {
    it('tracks connection state changes', async () => {
      const { connectionStateTracker } = await import('../../frontend/src/utils/connectionStateTracker');
      
      // Add a test connection
      connectionStateTracker.addConnection('source-1', 'handle-1', 'target-1', 'handle-2', 'default');
      
      const connections = connectionStateTracker.getAllConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0]?.sourceNodeId).toBe('source-1');
      expect(connections[0]?.targetNodeId).toBe('target-1');
    });

    it('notifies listeners of state changes', async () => {
      const { connectionStateTracker } = await import('../../frontend/src/utils/connectionStateTracker');
      const mockListener = vi.fn();
      
      connectionStateTracker.on('connectionChanged', mockListener);
      connectionStateTracker.addConnection('source-1', 'handle-1', 'target-1', 'handle-2', 'default');
      
      expect(mockListener).toHaveBeenCalled();
    });

    it('removes connections correctly', async () => {
      const { connectionStateTracker } = await import('../../frontend/src/utils/connectionStateTracker');
      
      connectionStateTracker.addConnection('source-1', 'handle-1', 'target-1', 'handle-2', 'default');
      connectionStateTracker.removeConnection('source-1', 'handle-1', 'target-1', 'handle-2');
      
      const connections = connectionStateTracker.getAllConnections();
      expect(connections).toHaveLength(0);
    });

    it('updates connection types', async () => {
      const { connectionStateTracker } = await import('../../frontend/src/utils/connectionStateTracker');
      
      connectionStateTracker.addConnection('source-1', 'handle-1', 'target-1', 'handle-2', 'default');
      connectionStateTracker.updateConnection('source-1', 'handle-1', 'target-1', 'handle-2', 'success');
      
      const connectionType = connectionStateTracker.getConnectionType('source-1', 'handle-1');
      expect(connectionType).toBe('success');
    });

    it('gets connections for specific nodes', async () => {
      const { connectionStateTracker } = await import('../../frontend/src/utils/connectionStateTracker');
      
      connectionStateTracker.addConnection('source-1', 'handle-1', 'target-1', 'handle-2', 'default');
      connectionStateTracker.addConnection('source-1', 'handle-2', 'target-2', 'handle-3', 'default');
      
      const connections = connectionStateTracker.getConnectionsForNode('source-1');
      expect(connections).toHaveLength(2);
    });

    it('clears all connections', async () => {
      const { connectionStateTracker } = await import('../../frontend/src/utils/connectionStateTracker');
      
      connectionStateTracker.addConnection('source-1', 'handle-1', 'target-1', 'handle-2', 'default');
      connectionStateTracker.clear();
      
      const connections = connectionStateTracker.getAllConnections();
      expect(connections).toHaveLength(0);
    });
  });

  describe('Trigger Event Tracker', () => {
    it('tracks trigger events', async () => {
      const { triggerEventTracker } = await import('../../frontend/src/utils/triggerEventTracker');
      
      triggerEventTracker.recordTriggerEvent('test-module', 'test-source');
      
      const activePulses = triggerEventTracker.getActivePulses();
      expect(activePulses).toContain('test-module');
    });

    it('checks if module is pulsing', async () => {
      const { triggerEventTracker } = await import('../../frontend/src/utils/triggerEventTracker');
      
      triggerEventTracker.recordTriggerEvent('test-module', 'test-source');
      
      expect(triggerEventTracker.isPulsing('test-module')).toBe(true);
      expect(triggerEventTracker.isPulsing('other-module')).toBe(false);
    });

    it('clears all pulses', async () => {
      const { triggerEventTracker } = await import('../../frontend/src/utils/triggerEventTracker');
      
      triggerEventTracker.recordTriggerEvent('test-module-1', 'test-source');
      triggerEventTracker.recordTriggerEvent('test-module-2', 'test-source');
      triggerEventTracker.clearAllPulses();
      
      const activePulses = triggerEventTracker.getActivePulses();
      expect(activePulses).toHaveLength(0);
    });

    it('notifies listeners of trigger events', async () => {
      const { triggerEventTracker } = await import('../../frontend/src/utils/triggerEventTracker');
      const mockListener = vi.fn();
      
      triggerEventTracker.on('triggerEvent', mockListener);
      triggerEventTracker.recordTriggerEvent('test-module', 'test-source');
      
      expect(mockListener).toHaveBeenCalledWith({
        moduleId: 'test-module',
        timestamp: expect.any(Number),
        source: 'test-source'
      });
    });
  });

  describe('Edge Registration Tracker', () => {
    it('tracks edge registrations', async () => {
      const { edgeRegistrationTracker } = await import('../../frontend/src/utils/edgeRegistrationTracker');
      
      edgeRegistrationTracker.registerEdge('edge-1');
      edgeRegistrationTracker.registerEdge('edge-2');
      
      expect(edgeRegistrationTracker.isEdgeRegistered('edge-1')).toBe(true);
      expect(edgeRegistrationTracker.isEdgeRegistered('edge-2')).toBe(true);
    });

    it('validates edge registrations', async () => {
      const { edgeRegistrationTracker } = await import('../../frontend/src/utils/edgeRegistrationTracker');
      
      edgeRegistrationTracker.registerEdge('test-edge');
      const isRegistered = edgeRegistrationTracker.isEdgeRegistered('test-edge');
      expect(isRegistered).toBe(true);
    });

    it('unregisters edges', async () => {
      const { edgeRegistrationTracker } = await import('../../frontend/src/utils/edgeRegistrationTracker');
      
      edgeRegistrationTracker.registerEdge('test-edge');
      edgeRegistrationTracker.unregisterEdge('test-edge');
      
      expect(edgeRegistrationTracker.isEdgeRegistered('test-edge')).toBe(false);
    });

    it('notifies listeners of registration changes', async () => {
      const { edgeRegistrationTracker } = await import('../../frontend/src/utils/edgeRegistrationTracker');
      const mockListener = vi.fn();
      
      edgeRegistrationTracker.on('registrationChanged', mockListener);
      edgeRegistrationTracker.registerEdge('test-edge');
      
      expect(mockListener).toHaveBeenCalledWith('test-edge');
    });

    it('clears all registrations', async () => {
      const { edgeRegistrationTracker } = await import('../../frontend/src/utils/edgeRegistrationTracker');
      
      edgeRegistrationTracker.registerEdge('edge-1');
      edgeRegistrationTracker.registerEdge('edge-2');
      edgeRegistrationTracker.clear();
      
      expect(edgeRegistrationTracker.isEdgeRegistered('edge-1')).toBe(false);
      expect(edgeRegistrationTracker.isEdgeRegistered('edge-2')).toBe(false);
    });
  });
}); 