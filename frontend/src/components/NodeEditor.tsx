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
import seedConfigFromManifest from '../graph/utils/seedConfigFromManifest';
import { apiService } from '../api';
import { useRuntimeData } from '../hooks/useRuntimeData';

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
  onNodeSelect,
  onInteractionsUpdate,
}) => {
  // Unregistered-changes signals only; display uses the draft passed via props
  const { markStructuralChange, getMergedConfig } = useUnregisteredChanges();
  const interactionsWithChanges = interactions;
  
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect: flowBuilderConnect, onEdgesDelete: flowBuilderEdgesDelete } = useFlowBuilder(
    modules,
    interactionsWithChanges,
    (updatedInteractions: InteractionConfig[]) => {
      if (onInteractionsUpdate) {
        onInteractionsUpdate(updatedInteractions);
      }
    },
    {
      onConfigChange: async (moduleId: string, configDeltaOrFull: any) => {
        // DO NOT send config changes to backend immediately
        // Changes are stored in local state and only sent when register button is pressed
        console.log('[NodeEditor] Config change stored locally:', { moduleId, configDeltaOrFull });
        
        // Update local interactions with the new configuration
        const updatedInteractions = interactions.map(interaction => ({
          ...interaction,
          modules: interaction.modules?.map(module => {
            if (module.id === moduleId) {
              // Merge the config delta with existing config
              const updatedConfig = { ...module.config, ...configDeltaOrFull };
              return {
                ...module,
                config: updatedConfig
              };
            }
            return module;
          }) || []
        }));
        
        // Call the interaction update handler to update local state
        if (onInteractionsUpdate) {
          onInteractionsUpdate(updatedInteractions);
        }
      },
      onStructuralChange: () => markStructuralChange()
    }
  );
  
  // Minimized logs to reduce noise and improve perf
  
  const [draggedHandle, setDraggedHandle] = useState<{ nodeId: string; handleId: string } | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  




  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    // TODO: implement deletion through useFlowBuilder
    console.log('Delete node:', nodeId);
  }, []);



  // Handle module drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        const raw = event.dataTransfer.getData('application/reactflow') || event.dataTransfer.getData('application/json');
        if (!raw) {
          console.warn('Drop event: no data received (application/reactflow or application/json)');
          return;
        }
        const dragData = JSON.parse(raw);

        if (dragData.moduleName) {
          const position = (reactFlowInstance && typeof (reactFlowInstance as any).screenToFlowPosition === 'function')
            ? (reactFlowInstance as any).screenToFlowPosition({ x: event.clientX, y: event.clientY })
            : { x: 0, y: 0 };
          const safePosition = position || { x: 0, y: 0 };

          // Create a new module instance
          const moduleId = `${dragData.moduleName}-${Date.now()}`;
          const seededConfig = seedConfigFromManifest(dragData.manifest);
          const newModuleInstance = {
            id: moduleId,
            moduleName: dragData.moduleName,
            position: safePosition,
            config: seededConfig,
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
              routes: [],
              enabled: true
            });
          } else {
            // Add to the first interaction
            updatedInteractions[0].modules = [
              ...(updatedInteractions[0].modules || []),
              newModuleInstance
            ];
          }

          // Call the interaction update handler if provided
          if (onInteractionsUpdate) {
            onInteractionsUpdate(updatedInteractions);
          }
          markStructuralChange();
        }
      } catch (error) {
        console.error('Error handling drop:', error);
      }
    },
    [reactFlowInstance, modules, interactions, onNodeSelect, handleDeleteNode, markStructuralChange]
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
    console.log('Node drag stop (update position):', node.id, node.position);
    const updated = interactions.map((interaction) => ({
      ...interaction,
      modules: (interaction.modules || []).map((m: any) => m.id === node.id ? { ...m, position: node.position } : m)
    }));
    if (onInteractionsUpdate) {
      onInteractionsUpdate(updated);
    }
    markStructuralChange();
  }, [interactions, onInteractionsUpdate, markStructuralChange]);

    // Handle pane click to disconnect
  const onPaneClick = useCallback((_event: React.MouseEvent) => {
    if (draggedHandle) {
      // Remove any route from the draft whose source and event match the dragged handle
      const updated = interactions.map((interaction) => ({
        ...interaction,
        routes: (interaction.routes || []).filter((route: any) => {
          return !(route.source === draggedHandle.nodeId && String(route.event) === String(draggedHandle.handleId));
        })
      }));
      if (onInteractionsUpdate) {
        onInteractionsUpdate(updated);
      }
      console.log('Pane drop disconnect (removed routes for handle):', draggedHandle);
      markStructuralChange();
      setDraggedHandle(null);
    }
    onNodeSelect(null);
  }, [draggedHandle, interactions, onNodeSelect, onInteractionsUpdate, markStructuralChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      // TODO: implement connect through useFlowBuilder
      console.log('Connect (adding route):', params);
      flowBuilderConnect(params);
      markStructuralChange();
    },
    [flowBuilderConnect, markStructuralChange]
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (edgesToDelete: any[]) => {
      console.log('Deleting edges:', edgesToDelete);
      flowBuilderEdgesDelete(edgesToDelete);
      markStructuralChange();
    },
    [flowBuilderEdgesDelete, markStructuralChange]
  );

  // Current Time from system runtime updates, fallback to local clock
  const { getCurrentTime } = useRuntimeData();
  const systemCurrentTime = getCurrentTime('system');
  const headerCurrentTime = systemCurrentTime ? new Date(systemCurrentTime).toLocaleTimeString() : new Date().toLocaleTimeString();
  

  return (
    <div className={styles.nodeEditor}>
      <div className={styles.headerBar}>
        <div className={styles.headerTitle}>Node Editor</div>
        <div className={styles.headerTime} title="Current Time">{headerCurrentTime}</div>
      </div>
      <div className={styles.flowContainer}>
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
          // Ensure React Flow allows drops on canvas
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
    </div>
  );
};

export default NodeEditor; 