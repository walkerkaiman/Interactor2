import { describe, it, expect, beforeEach } from 'vitest';
import { edgeRegistrationTracker } from '../../frontend/src/utils/edgeRegistrationTracker';
import { InteractionConfig } from '@interactor/shared';

describe('EdgeRegistrationTracker', () => {
  beforeEach(() => {
    edgeRegistrationTracker.clear();
  });

  it('should track registered and unregistered edges', () => {
    const edgeId1 = 'edge-1';
    const edgeId2 = 'edge-2';

    // Initially no edges should be registered
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId1)).toBe(false);
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId2)).toBe(false);

    // Register an edge
    edgeRegistrationTracker.registerEdge(edgeId1);
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId1)).toBe(true);
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId2)).toBe(false);

    // Unregister an edge
    edgeRegistrationTracker.unregisterEdge(edgeId2);
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId1)).toBe(true);
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId2)).toBe(false);

    // Register the unregistered edge
    edgeRegistrationTracker.registerEdge(edgeId2);
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId1)).toBe(true);
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId2)).toBe(true);
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

    edgeRegistrationTracker.updateFromInteractions(registeredInteractions, localInteractions);

    // Check that registered interaction edges are registered
    expect(edgeRegistrationTracker.isEdgeRegistered('route-1')).toBe(true);
    
    // Check that local interaction edges are unregistered
    expect(edgeRegistrationTracker.isEdgeRegistered('route-2')).toBe(false);
  });

  it('should clear all edge states', () => {
    const edgeId = 'edge-1';
    edgeRegistrationTracker.registerEdge(edgeId);
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId)).toBe(true);

    edgeRegistrationTracker.clear();
    expect(edgeRegistrationTracker.isEdgeRegistered(edgeId)).toBe(false);
  });

  it('should register new backend edges correctly', () => {
    const registeredInteractions: InteractionConfig[] = [
      {
        id: 'interaction-1',
        name: 'Backend Interaction',
        description: 'Test backend interaction',
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

    edgeRegistrationTracker.registerNewBackendEdges(registeredInteractions);

    // Check that the edge is registered
    expect(edgeRegistrationTracker.isEdgeRegistered('route-1')).toBe(true);
  });
}); 