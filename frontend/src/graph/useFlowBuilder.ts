import { useMemo, useCallback } from 'react';
import { Node, Edge, Connection, useNodesState, useEdgesState } from 'reactflow';
import { InteractionConfig, ModuleManifest } from '@interactor/shared';

interface FlowBuilderReturn {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (c: Connection) => void;
  onEdgesDelete: (edges: Edge[]) => void;
}

export function useFlowBuilder(
  modules: any[],
  interactions: InteractionConfig[],
  onInteractionsChange: (intx: InteractionConfig[]) => void
): FlowBuilderReturn {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // rebuild graph when inputs change
  useMemo(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create maps for efficient lookup
    const moduleMap = new Map<string, ModuleManifest | any>();
    const runtimeModuleMap = new Map<string, any>();
    
    // Map modules by name for manifest lookup
    modules.forEach(m => moduleMap.set(m.name ?? m.moduleName ?? m.id, m));
    
    // Map runtime modules by ID for instance data
    modules.forEach(m => {
      if (m.id) {
        runtimeModuleMap.set(m.id, m);
      }
    });

    interactions.forEach(interaction => {
      interaction.modules?.forEach(modInst => {
        const manifest = moduleMap.get(modInst.moduleName);
        if (!manifest) return;
        
        // Use runtime module data if available, otherwise fall back to interaction data
        const runtimeInstance = runtimeModuleMap.get(modInst.id);
        const instanceData = runtimeInstance || modInst;
        
        console.log(`Creating node for ${modInst.moduleName} (${modInst.id}):`, {
          manifest,
          modInst,
          runtimeInstance,
          instanceData
        });
        
        newNodes.push({
          id: modInst.id,
          type: manifest.name === 'Time Input' ? 'timeInput' : manifest.type === 'output' ? 'audioOutput' : 'custom',
          position: modInst.position || { x: 0, y: 0 },
          data: { module: manifest, instance: instanceData, edges: [] }
        });
      });
      interaction.routes?.forEach(route => {
        const edge = {
          id: route.id || `${route.source}-${route.target}`,
          source: route.source,
          target: route.target,
          sourceHandle: route.event,
          type: 'custom',
          data: {
            route: {
              ...route,
              event: route.event // Ensure event is in the route data
            },
            isRegistered: true, // Assume registered for now
            interaction: interaction
          }
        };
        
        console.log(`Creating edge:`, edge);
        newEdges.push(edge);
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [modules, interactions, setNodes, setEdges]);

  // Just re-emit connect to external handler for now
  const onConnect = useCallback((_conn: Connection) => {
    // TODO: implement update logic -> interactions
  }, []);

  // Handle edge deletion
  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    console.log('useFlowBuilder: Deleting edges:', edgesToDelete);
    
    // Remove edges from the current state
    setEdges(currentEdges => {
      const edgeIdsToDelete = new Set(edgesToDelete.map(edge => edge.id));
      const filteredEdges = currentEdges.filter(edge => !edgeIdsToDelete.has(edge.id));
      console.log('useFlowBuilder: Edges after deletion:', filteredEdges);
      return filteredEdges;
    });
    
    // Update interactions to remove corresponding routes
    const edgeIdsToDelete = new Set(edgesToDelete.map(edge => edge.id));
    const updatedInteractions = interactions.map(interaction => ({
      ...interaction,
      routes: interaction.routes?.filter(route => {
        const routeId = route.id || `${route.source}-${route.target}`;
        return !edgeIdsToDelete.has(routeId);
      }) || []
    }));
    
    console.log('useFlowBuilder: Updated interactions after edge deletion:', updatedInteractions);
    onInteractionsChange(updatedInteractions);
  }, [setEdges, interactions, onInteractionsChange]);

  return { nodes, edges, onNodesChange, onEdgesChange, onConnect, onEdgesDelete };
}
