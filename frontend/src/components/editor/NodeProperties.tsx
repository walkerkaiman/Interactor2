import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSelectedNode, useSelectedEdge, useAppStore, useAppActions } from '@/store';


export const NodeProperties: React.FC = () => {
  const selectedNode = useSelectedNode();
  const selectedEdge = useSelectedEdge();

  const actions = useAppActions();
  
  const [editingConfig, setEditingConfig] = useState<Record<string, any>>({});

  if (!selectedNode && !selectedEdge) {
    return null;
  }

  const handleConfigChange = (key: string, value: any) => {
    setEditingConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveConfig = () => {
    if (selectedNode && Object.keys(editingConfig).length > 0) {
      actions.updateModuleInstance(selectedNode, editingConfig);
      setEditingConfig({});
    }
  };

  const handleDeleteNode = () => {
    if (selectedNode) {
      actions.deleteModuleInstance(selectedNode);
    }
  };

  const handleStartNode = () => {
    if (selectedNode) {
      actions.startModuleInstance(selectedNode);
    }
  };

  const handleStopNode = () => {
    if (selectedNode) {
      actions.stopModuleInstance(selectedNode);
    }
  };

  const renderNodeProperties = () => {
    if (!selectedNode) return null;

    // Get the actual node data from the store
    const nodeData = useAppStore(state => state.ui.nodes.get(selectedNode));
    if (!nodeData) return null;

    // Extract data safely with defaults
    const nodeInstance = useAppStore(state => state.moduleInstances.get(selectedNode));
    const id = selectedNode;
    const label = nodeInstance?.config?.label || nodeInstance?.moduleName || 'Unknown';
    const moduleType = nodeInstance?.moduleName || 'Unknown';
    const status = nodeInstance?.status || 'unknown';
    const config = nodeInstance?.config || {};
    const inputs = nodeInstance?.config?.inputs || [];
    const outputs = nodeInstance?.config?.outputs || [];

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Node Properties</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleStartNode}
              disabled={status === 'active'}
              className="px-3 py-1 text-xs bg-status-active text-white rounded hover:bg-status-active/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start
            </button>
            <button
              onClick={handleStopNode}
              disabled={status === 'inactive'}
              className="px-3 py-1 text-xs bg-status-inactive text-white rounded hover:bg-status-inactive/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stop
            </button>
            <button
              onClick={handleDeleteNode}
              className="px-3 py-1 text-xs bg-status-error text-white rounded hover:bg-status-error/80"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              ID
            </label>
            <input
              type="text"
              value={id}
              readOnly
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => handleConfigChange('label', e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Type
            </label>
            <div className="px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm capitalize">
              {moduleType}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Status
            </label>
            <div className={`px-3 py-2 rounded-md text-white text-sm capitalize flex items-center space-x-2`}>
              <div className={`w-2 h-2 rounded-full bg-${status === 'active' ? 'status-active' : status === 'error' ? 'status-error' : 'status-inactive'}`} />
              <span>{status}</span>
            </div>
          </div>
        </div>

        {/* Configuration */}
        {config && Object.keys(config).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-2">Configuration</h4>
            <div className="space-y-2">
              {Object.entries(config).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={editingConfig[key] !== undefined ? editingConfig[key] : value}
                    onChange={(e) => handleConfigChange(key, e.target.value)}
                    className="w-full px-2 py-1 bg-bg-primary border border-border rounded text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              ))}
            </div>
            {Object.keys(editingConfig).length > 0 && (
              <button
                onClick={handleSaveConfig}
                className="mt-3 px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent-hover"
              >
                Save Changes
              </button>
            )}
          </div>
        )}

        {/* Ports */}
        <div className="grid grid-cols-2 gap-4">
          {inputs && inputs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">Inputs</h4>
              <div className="space-y-1">
                {inputs.map((port: any) => (
                  <div key={port.id} className="text-xs text-text-secondary">
                    {port.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {outputs && outputs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">Outputs</h4>
              <div className="space-y-1">
                {outputs.map((port: any) => (
                  <div key={port.id} className="text-xs text-text-secondary">
                    {port.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEdgeProperties = () => {
    if (!selectedEdge) return null;

    // Get the actual edge data from the store
    const edgeData = useAppStore(state => state.ui.edges.get(selectedEdge));
    if (!edgeData) return null;

    const { id, source, target, type, label } = edgeData;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Connection Properties</h3>
          <button
            onClick={() => {/* TODO: Implement delete connection */}}
            className="px-3 py-1 text-xs bg-status-error text-white rounded hover:bg-status-error/80"
          >
            Delete
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Connection ID
            </label>
            <input
              type="text"
              value={id}
              readOnly
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              From
            </label>
            <input
              type="text"
              value={source}
              readOnly
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              To
            </label>
            <input
              type="text"
              value={target}
              readOnly
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Type
            </label>
            <div className="px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm capitalize">
              {type}
            </div>
          </div>

          {label && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(_e) => {/* TODO: Implement label update */}}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ x: 300 }}
      animate={{ x: 0 }}
      className="w-80 bg-bg-secondary border-l border-border p-4 overflow-y-auto"
    >
      {selectedNode && renderNodeProperties()}
      {selectedEdge && renderEdgeProperties()}
    </motion.div>
  );
}; 