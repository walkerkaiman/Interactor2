import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { UINode, UIPort } from '@/types/ui';

interface ModuleNodeData extends UINode {
  moduleType: 'input' | 'output' | 'transform';
  status: 'active' | 'inactive' | 'error' | 'warning';
  config: Record<string, any>;
}

const getModuleColor = (moduleType: string) => {
  switch (moduleType) {
    case 'input':
      return 'border-input-module bg-input-module/10';
    case 'output':
      return 'border-output-module bg-output-module/10';
    case 'transform':
      return 'border-transform-module bg-transform-module/10';
    default:
      return 'border-border bg-bg-secondary';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-status-active';
    case 'inactive':
      return 'bg-status-inactive';
    case 'error':
      return 'bg-status-error';
    case 'warning':
      return 'bg-status-warning';
    default:
      return 'bg-status-inactive';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return '●';
    case 'inactive':
      return '○';
    case 'error':
      return '⚠';
    case 'warning':
      return '△';
    default:
      return '○';
  }
};

export const ModuleNode = memo(({ data, selected }: NodeProps<ModuleNodeData>) => {
  const { id, label, moduleType, status, config, inputs, outputs } = data;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className={`
        relative min-w-[200px] p-4 rounded-lg border-2 shadow-lg
        ${getModuleColor(moduleType)}
        ${selected ? 'ring-2 ring-accent ring-opacity-50' : ''}
        transition-all duration-200 hover:shadow-xl
      `}
    >
      {/* Status Indicator */}
      <div className="absolute -top-2 -right-2 flex items-center space-x-1">
        <div className={`
          w-3 h-3 rounded-full ${getStatusColor(status)}
          flex items-center justify-center text-xs text-white
          ${status === 'active' ? 'animate-pulse' : ''}
        `}>
          {getStatusIcon(status)}
        </div>
      </div>

      {/* Node Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-primary truncate">
          {label}
        </h3>
        <p className="text-xs text-text-secondary capitalize">
          {moduleType} Module
        </p>
      </div>

      {/* Input Ports */}
      <div className="space-y-2 mb-3">
        {inputs?.map((port: UIPort) => (
          <div key={port.id} className="flex items-center space-x-2">
            <Handle
              type="target"
              position={Position.Left}
              id={port.id}
              className="w-3 h-3 bg-connection-stream border-2 border-white"
            />
            <span className="text-xs text-text-secondary">
              {port.label}
            </span>
          </div>
        ))}
      </div>

      {/* Output Ports */}
      <div className="space-y-2">
        {outputs?.map((port: UIPort) => (
          <div key={port.id} className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              {port.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={port.id}
              className="w-3 h-3 bg-connection-trigger border-2 border-white"
            />
          </div>
        ))}
      </div>

      {/* Configuration Preview */}
      {config && Object.keys(config).length > 0 && (
        <div className="mt-3 pt-2 border-t border-border-light">
          <div className="text-xs text-text-muted">
            {Object.keys(config).slice(0, 2).join(', ')}
            {Object.keys(config).length > 2 && '...'}
          </div>
        </div>
      )}
    </motion.div>
  );
});

ModuleNode.displayName = 'ModuleNode'; 