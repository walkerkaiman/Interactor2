import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  NodeTypes,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

import { ModuleManifest, InteractionConfig, ModuleInstance, MessageRoute } from '@interactor/shared';
import { FrontendNodeData, FrontendEdgeData } from '../types';
import CustomNode from './CustomNode';
import styles from './NodeEditor.module.css';

interface NodeEditorProps {
  interactions: InteractionConfig[];
  modules: ModuleManifest[];
  onNodeSelect: (nodeId: string | null) => void;
  onInteractionsUpdate: (interactions: InteractionConfig[]) => void;
}

const NodeEditor: React.FC<NodeEditorProps> = ({
  interactions,
  modules,
  onNodeSelect,
  onInteractionsUpdate,
}) => {
  // Convert interactions to ReactFlow nodes and edges
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node<FrontendNodeData>[] = [];
    const flowEdges: Edge<FrontendEdgeData>[] = [];

    interactions.forEach((interaction) => {
      interaction.modules.forEach((moduleInstance) => {
        const manifest = modules.find(m => m.name === moduleInstance.moduleName);
        if (manifest) {
          flowNodes.push({
            id: moduleInstance.id,
            type: 'custom',
            position: moduleInstance.position || { x: 0, y: 0 },
            data: {
              moduleName: moduleInstance.moduleName,
              config: moduleInstance.config,
              manifest,
              instance: moduleInstance,
            },
          });
        }
      });

      interaction.routes.forEach((route) => {
        flowEdges.push({
          id: route.id,
          source: route.source,
          target: route.target,
          data: { route },
        });
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [interactions, modules]);

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    setReactFlowNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setReactFlowEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    // Note: updateInteractions will be called automatically when nodes/edges change
  }, [setReactFlowNodes, setReactFlowEdges]);

  // Create node types with delete handler
  const nodeTypes: NodeTypes = useMemo(() => ({
    custom: (props: any) => <CustomNode {...props} onDelete={handleDeleteNode} />,
  }), [handleDeleteNode]);

  // Handle drag and drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const data = event.dataTransfer.getData('application/json');
      if (!data) return;

      try {
        const { moduleName, manifest } = JSON.parse(data);
        const position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };

        const newNodeId = uuidv4();
        const newNode: Node<FrontendNodeData> = {
          id: newNodeId,
          type: 'custom',
          position,
          data: {
            moduleName,
            config: getDefaultConfig(manifest),
            manifest,
          },
        };

        setReactFlowNodes((nds) => [...nds, newNode]);
        updateInteractions();
      } catch (error) {
        console.error('Failed to parse dropped data:', error);
      }
    },
    [setReactFlowNodes]
  );

  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge<FrontendEdgeData> = {
        id: uuidv4(),
        source: params.source!,
        target: params.target!,
        data: {
          route: {
            id: uuidv4(),
            source: params.source!,
            target: params.target!,
            event: 'default',
          },
        },
      };

      setReactFlowEdges((eds) => addEdge(newEdge, eds));
      updateInteractions();
    },
    [setReactFlowEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    onNodeSelect(node.id);
  }, [onNodeSelect]);

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Update interactions when nodes/edges change
  const updateInteractions = useCallback(() => {
    const updatedInteractions: InteractionConfig[] = [];

    // Group nodes by interaction (for now, create one interaction with all nodes)
    const moduleInstances: ModuleInstance[] = reactFlowNodes.map((node) => ({
      id: node.id,
      moduleName: node.data.moduleName,
      config: node.data.config,
      position: node.position,
    }));

    const routes: MessageRoute[] = reactFlowEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      event: 'default',
    }));

    const interaction: InteractionConfig = {
      id: 'main-interaction',
      name: 'Main Interaction',
      description: 'Primary interaction configuration',
      enabled: true,
      modules: moduleInstances,
      routes,
    };

    updatedInteractions.push(interaction);
    onInteractionsUpdate(updatedInteractions);
  }, [reactFlowNodes, reactFlowEdges, onInteractionsUpdate]);

  // Call updateInteractions when nodes or edges change
  useEffect(() => {
    updateInteractions();
  }, [reactFlowNodes, reactFlowEdges, updateInteractions]);

  // Get default configuration for a module
  const getDefaultConfig = (manifest: ModuleManifest): Record<string, any> => {
    const config: Record<string, any> = {};
    
    if (manifest.configSchema?.properties) {
      Object.entries(manifest.configSchema.properties).forEach(([key, prop]) => {
        if (prop.default !== undefined) {
          config[key] = prop.default;
        }
      });
    }
    
    return config;
  };

  return (
    <div className={styles.nodeEditor}>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default NodeEditor; 