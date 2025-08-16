import { useCallback, useEffect } from 'react';
import { Node, Edge, Connection, useNodesState, useEdgesState } from 'reactflow';
import { InteractionConfig, ModuleManifest } from '@interactor/shared';
import { resolveNodeType } from './utils/nodeTypeRegistry';

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
  onInteractionsChange: (intx: InteractionConfig[]) => void,
  options?: {
    onConfigChange?: (moduleId: string, config: any) => void;
    onStructuralChange?: () => void;
  }
): FlowBuilderReturn {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const toSlug = useCallback((s: string | undefined) => (s || '').toLowerCase().replace(/\s+/g, '_'), []);

  // rebuild graph when inputs change
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create maps for efficient lookup (support display names and slugs)
    const moduleMap = new Map<string, ModuleManifest | any>();
    const runtimeModuleMap = new Map<string, any>();
    
    // Map modules by name and slug for manifest lookup
    modules.forEach(m => {
      const key = (m as any).name ?? (m as any).moduleName ?? (m as any).id;
      moduleMap.set(key, m);
      moduleMap.set(toSlug(key), m);
    });
    
    // Map runtime modules by ID for instance data
    modules.forEach(m => {
      if (m.id) {
        runtimeModuleMap.set(m.id, m);
      }
    });

    interactions.forEach(interaction => {
      interaction.modules?.forEach(modInst => {
        const manifest = moduleMap.get(modInst.moduleName) || moduleMap.get(toSlug(modInst.moduleName)) || modules.find((m:any)=> (m.name||'').toLowerCase()===toSlug(modInst.moduleName));
        if (!manifest) return;
        
        // Use runtime module data if available, otherwise fall back to interaction data
        const runtimeInstance = runtimeModuleMap.get(modInst.id);
        const instanceData = runtimeInstance || modInst;
        
        // Build node
        
        newNodes.push({
          id: modInst.id,
          type: resolveNodeType(modInst.moduleName, (manifest as any).type),
          position: modInst.position || { x: 0, y: 0 },
          data: {
            module: manifest,
            instance: instanceData,
            edges: [],
            onDelete: (nodeId: string) => {
              const updatedInteractions = interactions.map((intx) => ({
                ...intx,
                modules: (intx.modules || []).filter(m => m.id !== nodeId),
                routes: (intx.routes || []).filter(r => r.source !== nodeId && r.target !== nodeId)
              }));
              onInteractionsChange(updatedInteractions);
              if (options?.onStructuralChange) options.onStructuralChange();
            },
            onConfigChange: options?.onConfigChange
          }
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
        newEdges.push(edge);
      });
    });

    // Guard against transient empties only if interactions are non-empty
    if (newNodes.length === 0 && newEdges.length === 0 && interactions.length > 0) {
      return;
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [modules, interactions, setNodes, setEdges]);

  // Add a new route on connect, preserving sourceHandle as event
  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || !conn.sourceHandle) return;
    const newRoute = {
      id: `r_${Date.now()}`,
      source: conn.source,
      target: conn.target,
      event: String(conn.sourceHandle)
    } as any;

    const updated = interactions.length > 0
      ? interactions.map(intx => ({
          ...intx,
          routes: [...(intx.routes || []), newRoute]
        }))
      : [{ id: `interaction-${Date.now()}`, name: 'New Interaction', modules: [], routes: [newRoute], enabled: true } as any];

    console.log('useFlowBuilder: onConnect → newRoute', newRoute);
    onInteractionsChange(updated);
  }, [interactions, onInteractionsChange]);

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
