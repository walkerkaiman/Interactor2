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

// import { ModuleDropdown } from './ModuleDropdown.tsx';
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
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant="dots"
          gap={32}
          size={1}
          color="rgba(255, 255, 255, 0.03)"
        />
        <Controls 
          className="bg-bg-secondary/80 backdrop-blur-xl border border-border rounded-xl shadow-elevation-2"
          showInteractive={false}
        />
        <MiniMap
          className="bg-bg-secondary/80 backdrop-blur-xl border border-border rounded-xl shadow-elevation-2"
          nodeColor={(node) => {
            if (node.selected) return '#7c3aed';
            switch (node.data?.type) {
              case 'input': return '#3b82f6';
              case 'output': return '#10b981';
              case 'transform': return '#f59e0b';
              default: return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex h-full bg-bg-primary relative overflow-hidden"
    >
      {/* Ambient gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-module-input/10 rounded-full blur-3xl" />
      </div>
      
      {/* Module Palette */}
      <motion.div
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <ModulePalette />
      </motion.div>
      {/* Main Canvas */}
      <div className="flex-1 relative z-10">
        <ReactFlowProvider>
          <ReactFlowContent />
        </ReactFlowProvider>
      </div>
      
      {/* Node Properties Panel */}
      {(selectedNode || selectedEdge) && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <NodeProperties />
        </motion.div>
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