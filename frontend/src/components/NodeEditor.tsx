import { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  OnConnectStart,
  OnConnectEnd,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { apiService } from '../api';
import { ModuleManifest, InteractionConfig } from '@interactor/shared';
import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import { edgeRegistrationTracker } from '../utils/edgeRegistrationTracker';
import styles from './NodeEditor.module.css';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

interface NodeEditorProps {
  modules: ModuleManifest[];
  interactions: InteractionConfig[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onInteractionsChange: (interactions: InteractionConfig[]) => void;
}

const NodeEditor: React.FC<NodeEditorProps> = ({
  modules,
  interactions,
  selectedNodeId,
  onNodeSelect,
  onInteractionsChange,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [draggedHandle, setDraggedHandle] = useState<{ nodeId: string; handleId: string } | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);



  // Handle ReactFlow instance
  const onInit = useCallback((instance: any) => {
    setReactFlowInstance(instance);
  }, []);

  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Update local interactions state
    const updatedInteractions = interactions.map(interaction => ({
      ...interaction,
      modules: interaction.modules?.filter(module => module.id !== nodeId) || [],
      routes: interaction.routes?.filter(route => 
        route.source !== nodeId && route.target !== nodeId
      ) || [],
    })).filter(interaction => interaction.modules.length > 0);
    
    // Notify parent of local changes
    onInteractionsChange(updatedInteractions);
    
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => {
      const filtered = eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
      
      // Remove edges from tracker
      eds.forEach(edge => {
        if (edge.source === nodeId || edge.target === nodeId) {
          edgeRegistrationTracker.unregisterEdge(edge.id);
        }
      });
      
      return filtered;
    });
  }, [setNodes, setEdges, interactions, onInteractionsChange]);

    // Handle module drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance) {
        return;
      }

      // Get the drag data
      const type = event.dataTransfer.getData('application/reactflow');

      if (!type) {
        return;
      }

      let dragData;
      try {
        dragData = JSON.parse(type);
      } catch (error) {
        return;
      }

      const { moduleName } = dragData;
      if (!moduleName) {
        return;
      }

      // Get the offset from the drag data (default to 0 if not present)
      const offsetX = dragData.offsetX || 0;
      const offsetY = dragData.offsetY || 0;

      const module = modules.find(m => m.name === moduleName);
      if (!module) {
        return;
      }

      // Get the ReactFlow pane element
      const reactFlowElement = document.querySelector('.react-flow__pane');
      if (!reactFlowElement) {
        return;
      }

      // Get the bounds of the ReactFlow pane
      const bounds = reactFlowElement.getBoundingClientRect();

      // Log current viewport transform
      const viewport = reactFlowInstance.getViewport();

      // Calculate position relative to the ReactFlow pane, accounting for the drag offset
      const relativeX = event.clientX - bounds.left - offsetX;
      const relativeY = event.clientY - bounds.top - offsetY;

      // Correct formula: (relativePos - viewportOffset) / zoom
      const position = {
        x: (relativeX - viewport.x) / viewport.zoom,
        y: (relativeY - viewport.y) / viewport.zoom,
      };

      const newNodeId = `node-${Date.now()}`;
      
      const newNode = {
        id: newNodeId,
        type: 'custom',
        position,
        data: {
          module,
          instance: {
            id: newNodeId,
            moduleName: module.name,
            config: {},
            status: 'stopped',
            messageCount: 0,
            currentFrame: undefined,
            frameCount: 0,
            lastUpdate: Date.now()
          },
          isSelected: false,
          onSelect: () => onNodeSelect(newNodeId),
          onDelete: handleDeleteNode,
          edges: [], // Will be updated after edges are created
        },
      };

      // Add the new node to local interactions
      const updatedInteractions = [...interactions];
      
      if (updatedInteractions.length === 0) {
        // Create a new interaction if none exists
        const newInteraction = {
          id: `interaction-${Date.now()}`,
          name: 'New Interaction',
          description: 'Automatically created interaction',
          enabled: true,
          modules: [{ ...newNode.data.instance, position }],
          routes: [],
        };
        updatedInteractions.push(newInteraction);
      } else {
        // Add to the first interaction
        updatedInteractions[0].modules = updatedInteractions[0].modules || [];
        updatedInteractions[0].modules.push({ ...newNode.data.instance, position });
      }

      // Notify parent of local changes
      onInteractionsChange(updatedInteractions);

      // Add the node to ReactFlow
      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, modules, interactions, onInteractionsChange, onNodeSelect, handleDeleteNode, setNodes]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Convert modules and interactions to ReactFlow nodes and edges
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create nodes for each module instance in interactions
    const moduleInstancesMap = new Map();
    
    interactions.forEach((interaction) => {
      interaction.modules?.forEach((moduleInstance) => {
                  const manifest = modules.find(m => m.name === moduleInstance.moduleName);
          if (manifest) {
            const nodeId = moduleInstance.id;
            
            moduleInstancesMap.set(nodeId, {
              id: nodeId,
              type: 'custom',
              position: moduleInstance.position || { x: 100, y: 100 },
              data: {
                module: manifest,
                instance: moduleInstance,
                isSelected: selectedNodeId === nodeId,
                onSelect: () => onNodeSelect(nodeId),
                onDelete: handleDeleteNode,
                edges: [], // Will be updated after edges are created
              },
            });
          }
      });
    });
    
    newNodes.push(...Array.from(moduleInstancesMap.values()));

    // Create edges for interactions
    interactions.forEach((interaction) => {
      interaction.routes?.forEach((route, routeIndex) => {
        // Use the actual node IDs from the route
        const sourceNode = newNodes.find(node => node.id === route.source);
        const targetNode = newNodes.find(node => node.id === route.target);

        if (sourceNode && targetNode) {
          
          // No inline styles - everything handled by CSS classes
          const edgeStyle = {};

          const edgeId = route.id || `edge-${interaction.id}-${route.source}-${route.target}`;
          
          newEdges.push({
            id: edgeId,
            source: sourceNode.id,
            target: targetNode.id,
            sourceHandle: route.event, // Set the sourceHandle based on the route event
            targetHandle: undefined, // Let ReactFlow determine the target handle
            type: 'custom',
            style: edgeStyle,
            data: { 
              route, 
              interaction,
              isRegistered: true // All backend-loaded edges are registered
            },
          });
          
          // Don't automatically register edges - let the tracker maintain individual states
          // Only register if not already tracked
          if (!edgeRegistrationTracker.isEdgeRegistered(edgeId) && !edgeRegistrationTracker.unregisteredEdges.has(edgeId)) {
            edgeRegistrationTracker.registerEdge(edgeId);
          }
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [modules, interactions, selectedNodeId, onNodeSelect, handleDeleteNode]); // Use interactions directly

  // Update node data with current edges for handle coloring
  useEffect(() => {
    setNodes((currentNodes) => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          edges: edges,
        },
      }))
    );
  }, [edges, setNodes]);


  // Handle drag start from handles
  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    if (params.nodeId && params.handleId) {
      setDraggedHandle({ nodeId: params.nodeId, handleId: params.handleId });
    }
  }, []);

  // Handle drag end from handles
  const onConnectEnd: OnConnectEnd = useCallback((_event) => {
    // Clear draggedHandle after a short delay to allow for pane click
    setTimeout(() => {
      setDraggedHandle(null);
    }, 100);
  }, []);

  // Handle node position changes
  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    // Update local interactions state with new position
    const updatedInteractions = interactions.map(interaction => ({
      ...interaction,
      modules: interaction.modules?.map(module => 
        module.id === node.id 
          ? { ...module, position: node.position }
          : module
      ) || [],
    }));
    
    // Notify parent of local changes
    onInteractionsChange(updatedInteractions);
  }, [interactions, onInteractionsChange]);

  // Handle pane click to disconnect
  const onPaneClick = useCallback((_event: React.MouseEvent) => {
    if (draggedHandle) {
      // Update local interactions state to remove the route
      const updatedInteractions = interactions.map(interaction => ({
        ...interaction,
        routes: interaction.routes?.filter(route => 
          !(route.source === draggedHandle.nodeId && route.event === draggedHandle.handleId)
        ) || [],
      }));
      
      // Notify parent of local changes
      onInteractionsChange(updatedInteractions);
      
      setEdges((eds) => {
        const filtered = eds.filter(edge => 
          !(edge.source === draggedHandle.nodeId && edge.sourceHandle === draggedHandle.handleId)
        );
        
        // Remove edges from tracker
        eds.forEach(edge => {
          if (edge.source === draggedHandle.nodeId && edge.sourceHandle === draggedHandle.handleId) {
            edgeRegistrationTracker.unregisterEdge(edge.id);
          }
        });
        
        return filtered;
      });
      setDraggedHandle(null);
    }
    onNodeSelect(null);
  }, [draggedHandle, setEdges, onNodeSelect, interactions, onInteractionsChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      
      // Determine the event type based on the source handle
      let eventType = 'default';
      const edgeStyle = {}; // No inline styles - everything handled by CSS classes
      
      if (params.sourceHandle === 'trigger') {
        eventType = 'trigger';
      } else if (params.sourceHandle === 'stream') {
        eventType = 'stream';
      }
  
      const routeId = `route-${Date.now()}`;
      const edgeId = routeId; // Use the route ID as the edge ID for consistency
      
      const newEdge: Edge = {
        id: edgeId,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        style: edgeStyle,
        type: 'custom',
        data: { 
          route: {
            id: routeId,
            source: params.source!,
            target: params.target!,
            event: eventType,
          },
          isRegistered: false // Local edges are unregistered
        },
      };
      
      // Register the new edge as unregistered
      edgeRegistrationTracker.unregisterEdge(edgeId);
  
      // Update local interactions state
      const updatedInteractions = [...interactions];
      const targetInteraction = updatedInteractions.find(interaction => 
        interaction.modules?.some(module => module.id === params.source) &&
        interaction.modules?.some(module => module.id === params.target)
      );
      
      if (targetInteraction) {
        // Remove existing route between these nodes
        targetInteraction.routes = targetInteraction.routes?.filter(route => 
          !(route.source === params.source && route.target === params.target)
        ) || [];
        
        // Add new route
        targetInteraction.routes.push({
          id: newEdge.data.route.id,
          source: params.source!,
          target: params.target!,
          event: eventType,
        });
        
        // Notify parent of local changes
        onInteractionsChange(updatedInteractions);
      }
  
      setEdges((eds) => {
        // Remove any existing edges from the same source to the same target
        const filteredEdges = eds.filter(edge => {
          const shouldRemove = edge.source === params.source && edge.target === params.target;
          if (shouldRemove) {
            // Remove from tracker
            edgeRegistrationTracker.unregisterEdge(edge.id);
          }
          return !shouldRemove;
        });
        
        // Add the new edge
        return [...filteredEdges, newEdge];
      });
    },
    [setEdges, interactions, onInteractionsChange]
  );

  return (
    <div className={styles.nodeEditor}>
      <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          onInit={onInit}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default NodeEditor; 