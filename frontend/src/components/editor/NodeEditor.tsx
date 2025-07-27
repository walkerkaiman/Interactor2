import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Connection,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ModulePalette } from './ModulePalette.tsx';
import { NodeProperties } from './NodeProperties.tsx';
import { CanvasToolbar } from './CanvasToolbar.tsx';
import { ContextMenu } from './ContextMenu.tsx';
import { ModuleNode } from './nodes/ModuleNode';
import { CustomEdge } from './edges/CustomEdge';
import { useNodes, useEdges, useSelectedNode, useSelectedEdge, useAppActions } from '@/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const nodeTypes: NodeTypes = {
  module: ModuleNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Separate component for ReactFlow content to ensure proper context
const ReactFlowContent: React.FC = () => {
  const nodes = useNodes();
  const edges = useEdges();
  const selectedNode = useSelectedNode();
  const selectedEdge = useSelectedEdge();

  const actions = useAppActions();

  // Enable keyboard shortcuts inside ReactFlow context
  useKeyboardShortcuts();

  // Convert store data to React Flow format
  const reactFlowNodes = useMemo(() => {
    return nodes.map(node => ({
      id: node.id,
      type: 'module',
      position: node.position,
      data: node,
      selected: selectedNode === node.id,
    }));
  }, [nodes, selectedNode]);

  const reactFlowEdges = useMemo(() => {
    return edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'custom',
      data: edge,
      selected: selectedEdge === edge.id,
    }));
  }, [edges, selectedEdge]);

  const onNodesChange = useCallback((changes: any[]) => {
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        actions.updateNodePosition(change.id, change.position);
      }
    });
  }, [actions]);

  const onEdgesChange = useCallback(() => {
    // Handle edge changes if needed
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      actions.createConnection({
        id: `${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || null,
        targetHandle: connection.targetHandle || null,
        type: 'stream',
      });
    }
  }, [actions]);

  const onNodeClick = useCallback((_event: any, node: Node) => {
    actions.selectNode(node.id);
  }, [actions]);

  const onEdgeClick = useCallback((_event: any, edge: Edge) => {
    actions.selectEdge(edge.id);
  }, [actions]);

  const onPaneClick = useCallback(() => {
    actions.selectNode(null);
    actions.selectEdge(null);
  }, [actions]);



  return (
    <>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-bg-primary"
      >
        <Background
          gap={20}
          size={1}
          color="#374151"
          className="opacity-30"
        />
        <Controls className="bg-bg-secondary border border-border rounded-lg" />
        <MiniMap
          className="bg-bg-secondary border border-border rounded-lg"
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
      
      {/* Canvas Toolbar - now inside ReactFlow context */}
      <CanvasToolbar />
    </>
  );
};

export const NodeEditor: React.FC = () => {
  const selectedNode = useSelectedNode();
  const selectedEdge = useSelectedEdge();
  
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    type: 'canvas' | 'node' | 'edge' | 'module-palette';
    data?: any;
  }>({
    show: false,
    x: 0,
    y: 0,
    type: 'canvas',
  });



  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full bg-bg-primary"
    >
      {/* Module Palette */}
      <ModulePalette />
      
      {/* Main Canvas */}
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <ReactFlowContent />
        </ReactFlowProvider>
      </div>
      
      {/* Node Properties Panel */}
      {(selectedNode || selectedEdge) && (
        <NodeProperties />
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          contextType={contextMenu.type}
          contextData={contextMenu.data}
        />
      )}
    </motion.div>
  );
}; 