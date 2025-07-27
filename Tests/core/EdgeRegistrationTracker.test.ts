import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeRegistrationTrackerImpl } from '../../frontend/src/utils/edgeRegistrationTracker';
import { InteractionConfig } from '@interactor/shared';

describe('EdgeRegistrationTracker', () => {
  let tracker: EdgeRegistrationTrackerImpl;

  beforeEach(() => {
    tracker = new EdgeRegistrationTrackerImpl();
  });

  it('should track registered and unregistered edges', () => {
    const edgeId1 = 'edge-1';
    const edgeId2 = 'edge-2';

    // Initially no edges should be registered
    expect(tracker.isEdgeRegistered(edgeId1)).toBe(false);
    expect(tracker.isEdgeRegistered(edgeId2)).toBe(false);

    // Register an edge
    tracker.registerEdge(edgeId1);
    expect(tracker.isEdgeRegistered(edgeId1)).toBe(true);
    expect(tracker.isEdgeRegistered(edgeId2)).toBe(false);

    // Unregister an edge
    tracker.unregisterEdge(edgeId2);
    expect(tracker.isEdgeRegistered(edgeId1)).toBe(true);
    expect(tracker.isEdgeRegistered(edgeId2)).toBe(false);

    // Register the unregistered edge
    tracker.registerEdge(edgeId2);
    expect(tracker.isEdgeRegistered(edgeId1)).toBe(true);
    expect(tracker.isEdgeRegistered(edgeId2)).toBe(true);
  });

  it('should update from interactions correctly', () => {
    const registeredInteractions: InteractionConfig[] = [
      {
        id: 'interaction-1',
        name: 'Registered Interaction',
        description: 'Test registered interaction',
        enabled: true,
        modules: [],
        routes: [
          {
            id: 'route-1',
            source: 'node-1',
            target: 'node-2',
            event: 'trigger'
          }
        ]
      }
    ];

    const localInteractions: InteractionConfig[] = [
      {
        id: 'interaction-2',
        name: 'Local Interaction',
        description: 'Test local interaction',
        enabled: true,
        modules: [],
        routes: [
          {
            id: 'route-2',
            source: 'node-3',
            target: 'node-4',
            event: 'stream'
          }
        ]
      }
    ];

    tracker.updateFromInteractions(registeredInteractions, localInteractions);

    // Check that registered interaction edges are registered
    expect(tracker.isEdgeRegistered('route-1')).toBe(true);
    
    // Check that local interaction edges are unregistered
    expect(tracker.isEdgeRegistered('route-2')).toBe(false);
  });

  it('should clear all edge states', () => {
    const edgeId = 'edge-1';
    tracker.registerEdge(edgeId);
    expect(tracker.isEdgeRegistered(edgeId)).toBe(true);

    tracker.clear();
    expect(tracker.isEdgeRegistered(edgeId)).toBe(false);
  });

  it('should generate edge IDs correctly', () => {
    const edgeId1 = tracker.getEdgeIdFromConnection('node-1', 'node-2', 'trigger');
    expect(edgeId1).toBe('edge-node-1-node-2-trigger');

    const edgeId2 = tracker.getEdgeIdFromConnection('node-3', 'node-4');
    expect(edgeId2).toBe('edge-node-3-node-4-default');

    const route = { id: 'route-1', source: 'node-1', target: 'node-2' };
    const edgeId3 = tracker.getEdgeIdFromRoute(route, 'interaction-1');
    expect(edgeId3).toBe('route-1');
  });
}); 