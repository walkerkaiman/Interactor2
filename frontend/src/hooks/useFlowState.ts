import { useCallback, useRef, useState, useEffect } from 'react';
import { Node, Edge, Connection, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import { InteractionConfig } from '@interactor/shared';
import { apiService } from '../api';

interface UseFlowStateProps {
  interactions: InteractionConfig[];
  modules: any[];
  onInteractionsChange: (interactions: InteractionConfig[]) => void;
}

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  pendingChanges: Set<string>;
}

export function useFlowState({ interactions, modules, onInteractionsChange }: UseFlowStateProps) {
  const [flowState, setFlowState] = useState<FlowState>({
    nodes: [],
    edges: [],
    pendingChanges: new Set(),
  });

  // Track WebSocket update version to prevent conflicts
  const wsVersion = useRef(0);
  const localVersion = useRef(0);

  // Convert interactions to nodes and edges
  useEffect(() => {
    // Only update from interactions if no local changes are pending
    if (flowState.pendingChanges.size > 0) return;

    const { nodes: newNodes, edges: newEdges } = interactionsToFlow(interactions, modules);
    
    setFlowState(prev => ({
      ...prev,
      nodes: newNodes,
      edges: newEdges,
    }));
    
    wsVersion.current++;
  }, [interactions, modules]);

  // Handle node changes with proper version tracking
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    localVersion.current++;
    
    setFlowState(prev => {
      const updatedNodes = applyNodeChanges(changes, prev.nodes);
      const pendingChanges = new Set(prev.pendingChanges);
      
      // Track which nodes have local changes
      changes.forEach(change => {
        if (change.type === 'position' && 'id' in change) {
          pendingChanges.add(change.id);
        }
      });
      
      // Sync to parent after state is settled
      requestAnimationFrame(() => {
        const updatedInteractions = flowToInteractions(updatedNodes, prev.edges, interactions);
        onInteractionsChange(updatedInteractions);
      });
      
      return {
        ...prev,
        nodes: updatedNodes,
        pendingChanges,
      };
    });
  }, [interactions, onInteractionsChange]);

  // Handle edge changes
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    localVersion.current++;
    
    setFlowState(prev => {
      const updatedEdges = applyEdgeChanges(changes, prev.edges);
      
      requestAnimationFrame(() => {
        const updatedInteractions = flowToInteractions(prev.nodes, updatedEdges, interactions);
        onInteractionsChange(updatedInteractions);
      });
      
      return {
        ...prev,
        edges: updatedEdges,
      };
    });
  }, [interactions, onInteractionsChange]);

  // Handle connections
  const onConnect = useCallback((connection: Connection) => {
    localVersion.current++;
    
    setFlowState(prev => {
      const newEdge = {
        ...connection,
        id: `${connection.source}-${connection.target}`,
        type: 'custom',
        data: { isRegistered: false },
      } as Edge;
      
      const updatedEdges = addEdge(newEdge, prev.edges);
      
      requestAnimationFrame(() => {
        const updatedInteractions = flowToInteractions(prev.nodes, updatedEdges, interactions);
        onInteractionsChange(updatedInteractions);
      });
      
      return {
        ...prev,
        edges: updatedEdges,
      };
    });
  }, [interactions, onInteractionsChange]);

  // Clear pending changes after successful registration
  const clearPendingChanges = useCallback(() => {
    setFlowState(prev => ({
      ...prev,
      pendingChanges: new Set(),
    }));
  }, []);

  return {
    nodes: flowState.nodes,
    edges: flowState.edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    clearPendingChanges,
    hasPendingChanges: flowState.pendingChanges.size > 0,
  };
}

// Helper functions
function interactionsToFlow(interactions: InteractionConfig[], modules: any[]): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  interactions.forEach(interaction => {
    interaction.modules?.forEach(moduleInstance => {
      const manifest = modules.find(m => m.name === moduleInstance.moduleName);
      if (manifest) {
        nodes.push({
          id: moduleInstance.id,
          type: manifest.name === 'Time Input' ? 'timeInput' : 'custom',
          position: moduleInstance.position || { x: 100, y: 100 },
          data: {
            module: manifest,
            instance: moduleInstance,
          },
        });
      }
    });
    
    interaction.routes?.forEach(route => {
      edges.push({
        id: route.id || `${route.source}-${route.target}`,
        source: route.source,
        target: route.target,
        sourceHandle: route.event,
        type: 'custom',
        data: { 
          route,
          isRegistered: true,
        },
      });
    });
  });
  
  return { nodes, edges };
}

function flowToInteractions(nodes: Node[], edges: Edge[], currentInteractions: InteractionConfig[]): InteractionConfig[] {
  // Implementation to convert flow state back to interactions
  // This maintains the structure while updating positions and connections
  return currentInteractions.map(interaction => ({
    ...interaction,
    modules: nodes
      .filter(node => interaction.modules?.some(m => m.id === node.id))
      .map(node => ({
        ...interaction.modules!.find(m => m.id === node.id)!,
        position: node.position,
      })),
    routes: edges
      .filter(edge => {
        const sourceInInteraction = interaction.modules?.some(m => m.id === edge.source);
        const targetInInteraction = interaction.modules?.some(m => m.id === edge.target);
        return sourceInInteraction && targetInInteraction;
      })
      .map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        event: edge.sourceHandle || 'default',
      })),
  }));
}