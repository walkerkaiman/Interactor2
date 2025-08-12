import { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Controls,
  Background,
  Connection,
  NodeTypes,
  EdgeTypes,
  OnConnectStart,
  OnConnectEnd,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ModuleManifest, InteractionConfig } from '@interactor/shared';
import CustomNode from './CustomNode';
import TimeInputNode from './TimeInputNode';
import AudioOutputNode from './AudioOutputNode';
import CustomEdge from './CustomEdge';
import { useFlowBuilder } from '../graph/useFlowBuilder';
import { useUnregisteredChanges } from '../state/useUnregisteredChanges';

import styles from './NodeEditor.module.css';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
  timeInput: TimeInputNode,
  audioOutput: AudioOutputNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

interface NodeEditorProps {
  modules: ModuleManifest[];
  interactions: InteractionConfig[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onInteractionsUpdate?: (interactions: InteractionConfig[]) => void;
}

const NodeEditor: React.FC<NodeEditorProps> = ({
  modules,
  interactions,
  selectedNodeId,
  onNodeSelect,
  onInteractionsUpdate,
}) => {
  // Get unregistered changes
  const { applyChangesToInteractions } = useUnregisteredChanges();
  
  // Apply unregistered changes to interactions for display
  const interactionsWithChanges = applyChangesToInteractions(interactions);
  
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect: flowBuilderConnect, onEdgesDelete: flowBuilderEdgesDelete } = useFlowBuilder(
    modules,
    interactionsWithChanges,
    (updatedInteractions: InteractionConfig[]) => {
      // Store the updated interactions in unregistered changes
      // This will be applied when the user registers the interactions
      console.log('NodeEditor: Interactions updated from flow builder:', updatedInteractions);
      // TODO: Implement proper interaction update handling
    }
  );
  
  // Debug logging for edges
  console.log('NodeEditor edges:', edges);
  console.log('NodeEditor nodes:', nodes);
  
  const [draggedHandle, setDraggedHandle] = useState<{ nodeId: string; handleId: string } | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  




  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    // TODO: implement deletion through useFlowBuilder
    console.log('Delete node:', nodeId);
  }, []);

  // Handle config changes from nodes
  const handleNodeConfigChange = useCallback((nodeId: string, config: any) => {
    // TODO: implement config updates through useFlowBuilder
    console.log('Config change:', nodeId, config);
  }, []);

  // Handle module drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        const dragData = JSON.parse(event.dataTransfer.getData('application/json'));
        console.log('Drop event:', dragData);

        if (reactFlowInstance && dragData.moduleName) {
          const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          // Create a new module instance
          const moduleId = `${dragData.moduleName}-${Date.now()}`;
          const newModuleInstance = {
            id: moduleId,
            moduleName: dragData.moduleName,
            position,
            config: dragData.manifest.configSchema?.properties ? {} : {},
            enabled: true,
            lastUpdate: Date.now()
          };

          // Add to interactions
          const updatedInteractions = [...interactions];
          if (updatedInteractions.length === 0) {
            // Create a new interaction if none exist
            updatedInteractions.push({
              id: `interaction-${Date.now()}`,
              name: 'New Interaction',
              modules: [newModuleInstance],
              routes: []
            });
          } else {
            // Add to the first interaction
            updatedInteractions[0].modules = [
              ...(updatedInteractions[0].modules || []),
              newModuleInstance
            ];
          }

          console.log('Adding new module instance:', newModuleInstance);
          console.log('Updated interactions:', updatedInteractions);
          
          // Call the interaction update handler if provided
          if (onInteractionsUpdate) {
            onInteractionsUpdate(updatedInteractions);
          }
        }
      } catch (error) {
        console.error('Error handling drop:', error);
      }
    },
    [reactFlowInstance, modules, interactions, onNodeSelect, handleDeleteNode]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  }, []);







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
    // TODO: implement position updates through useFlowBuilder
    console.log('Node drag stop:', node.id, node.position);
  }, []);

    // Handle pane click to disconnect
  const onPaneClick = useCallback((_event: React.MouseEvent) => {
    if (draggedHandle) {
      // TODO: implement disconnect through useFlowBuilder
      console.log('Pane click with dragged handle:', draggedHandle);
      setDraggedHandle(null);
    }
    onNodeSelect(null);
  }, [draggedHandle, onNodeSelect]);

  const onConnect = useCallback(
    (params: Connection) => {
      // TODO: implement connect through useFlowBuilder
      console.log('Connect:', params);
      flowBuilderConnect(params);
    },
    [flowBuilderConnect]
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (edgesToDelete: any[]) => {
      console.log('Deleting edges:', edgesToDelete);
      flowBuilderEdgesDelete(edgesToDelete);
    },
    [flowBuilderEdgesDelete]
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
          onEdgesDelete={onEdgesDelete}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          edgesUpdatable={true}
          edgesFocusable={true}
          selectNodesOnDrag={false}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnScroll={false}
          preventScrolling={true}
        >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default NodeEditor; 