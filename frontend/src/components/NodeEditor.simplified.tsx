import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ModuleManifest, InteractionConfig } from '@interactor/shared';
import CustomNode from './CustomNode';
import TimeInputNode from './TimeInputNode';
import CustomEdge from './CustomEdge';
import { useFlowState } from '../hooks/useFlowState';
import { useEdgeState } from '../hooks/useEdgeState';
import styles from './NodeEditor.module.css';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
  timeInput: TimeInputNode,
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

const NodeEditorSimplified: React.FC<NodeEditorProps> = ({
  modules,
  interactions,
  selectedNodeId,
  onNodeSelect,
  onInteractionsChange,
}) => {
  // Use centralized flow state management
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    clearPendingChanges,
  } = useFlowState({
    interactions,
    modules,
    onInteractionsChange,
  });

  // Track registered interaction IDs
  const registeredInteractionIds = useMemo(() => {
    return new Set(interactions.map(i => i.id));
  }, [interactions]);

  // Use simplified edge state management
  const { edgeStates } = useEdgeState(edges, registeredInteractionIds);

  // Handle node deletion cleanly
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Let the flow state hook handle the deletion through onNodesChange
    const deleteChange = {
      type: 'remove' as const,
      id: nodeId,
    };
    onNodesChange([deleteChange]);
  }, [onNodesChange]);

  // Handle node config changes
  const handleNodeConfigChange = useCallback((nodeId: string, config: any) => {
    // Update through interactions change
    const updatedInteractions = interactions.map(interaction => ({
      ...interaction,
      modules: interaction.modules?.map(module => 
        module.id === nodeId 
          ? { ...module, config }
          : module
      ) || []
    }));
    
    onInteractionsChange(updatedInteractions);
  }, [interactions, onInteractionsChange]);

  // Handle module drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      let dragData;
      try {
        dragData = JSON.parse(type);
      } catch (error) {
        return;
      }

      const { moduleName, offsetX = 0, offsetY = 0 } = dragData;
      if (!moduleName) return;

      const module = modules.find(m => m.name === moduleName);
      if (!module) return;

      // Get drop position
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - offsetX,
        y: event.clientY - reactFlowBounds.top - offsetY,
      };

      const newNodeId = `node-${Date.now()}`;
      const newModule = {
        id: newNodeId,
        moduleName: module.name,
        config: moduleName === 'Time Input' ? {
          mode: 'clock',
          targetTime: '12:00 PM',
          millisecondDelay: 1000,
          enabled: true,
          apiEnabled: false,
          apiEndpoint: ''
        } : {},
        status: 'stopped',
        messageCount: 0,
        position,
      };

      // Add to interactions
      const updatedInteractions = [...interactions];
      if (updatedInteractions.length === 0) {
        updatedInteractions.push({
          id: `interaction-${Date.now()}`,
          name: 'New Interaction',
          description: 'Automatically created interaction',
          enabled: true,
          modules: [newModule],
          routes: [],
        });
      } else {
        updatedInteractions[0].modules = [...(updatedInteractions[0].modules || []), newModule];
      }

      onInteractionsChange(updatedInteractions);
    },
    [modules, interactions, onInteractionsChange]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Enhanced nodes with proper data
  const enhancedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isSelected: selectedNodeId === node.id,
        onSelect: () => onNodeSelect(node.id),
        onDelete: handleDeleteNode,
        onConfigChange: handleNodeConfigChange,
        edges,
        edgeStates,
      },
    }));
  }, [nodes, selectedNodeId, onNodeSelect, handleDeleteNode, handleNodeConfigChange, edges, edgeStates]);

  // Enhanced edges with state
  const enhancedEdges = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        edgeState: edgeStates[edge.id] || { isRegistered: false, isAnimating: false },
      },
    }));
  }, [edges, edgeStates]);

  return (
    <div className={styles.nodeEditor}>
      <ReactFlow
        nodes={enhancedNodes}
        edges={enhancedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

// Wrap in provider for ReactFlow
const NodeEditorWithProvider: React.FC<NodeEditorProps> = (props) => (
  <ReactFlowProvider>
    <NodeEditorSimplified {...props} />
  </ReactFlowProvider>
);

export default NodeEditorWithProvider;