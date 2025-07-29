import { useState, useCallback, useEffect } from 'react';
import { Edge } from 'reactflow';

interface EdgeStateMap {
  [edgeId: string]: {
    isRegistered: boolean;
    isAnimating: boolean;
  };
}

export function useEdgeState(edges: Edge[], registeredInteractionIds: Set<string>) {
  const [edgeStates, setEdgeStates] = useState<EdgeStateMap>({});

  // Initialize edge states based on current edges
  useEffect(() => {
    const newStates: EdgeStateMap = {};
    
    edges.forEach(edge => {
      const isRegistered = edge.data?.isRegistered || false;
      newStates[edge.id] = {
        isRegistered,
        isAnimating: isRegistered,
      };
    });
    
    setEdgeStates(newStates);
  }, [edges]);

  const getEdgeState = useCallback((edgeId: string) => {
    return edgeStates[edgeId] || { isRegistered: false, isAnimating: false };
  }, [edgeStates]);

  const updateEdgeRegistration = useCallback((edgeId: string, isRegistered: boolean) => {
    setEdgeStates(prev => ({
      ...prev,
      [edgeId]: {
        isRegistered,
        isAnimating: isRegistered,
      },
    }));
  }, []);

  return {
    edgeStates,
    getEdgeState,
    updateEdgeRegistration,
  };
}