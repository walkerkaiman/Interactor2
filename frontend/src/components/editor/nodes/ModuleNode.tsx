import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { UINode, UIPort } from '@/types/ui';

interface ModuleNodeData extends UINode {
  moduleType: 'input' | 'output' | 'transform';
  status: 'active' | 'inactive' | 'error' | 'warning';
  config: Record<string, any>;
}

const getModuleGradient = (moduleType: string) => {
  switch (moduleType) {
    case 'input':
      return 'from-blue-500/10 to-cyan-500/10 border-module-input shadow-blue-500/20';
    case 'output':
      return 'from-emerald-500/10 to-green-500/10 border-module-output shadow-green-500/20';
    case 'transform':
      return 'from-amber-500/10 to-orange-500/10 border-module-transform shadow-orange-500/20';
    default:
      return 'from-purple-500/10 to-pink-500/10 border-accent shadow-purple-500/20';
  }
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'active':
      return {
        color: 'bg-status-active',
        icon: '●',
        animation: 'animate-pulse',
        glow: 'shadow-green-500/50'
      };
    case 'inactive':
      return {
        color: 'bg-status-inactive',
        icon: '○',
        animation: '',
        glow: ''
      };
    case 'error':
      return {
        color: 'bg-status-error',
        icon: '⚠',
        animation: 'animate-pulse',
        glow: 'shadow-red-500/50'
      };
    case 'warning':
      return {
        color: 'bg-status-warning',
        icon: '△',
        animation: 'animate-pulse',
        glow: 'shadow-yellow-500/50'
      };
    default:
      return {
        color: 'bg-status-inactive',
        icon: '○',
        animation: '',
        glow: ''
      };
  }
};

export const ModuleNode = memo(({ data, selected }: NodeProps<ModuleNodeData>) => {
  const { label, moduleType, status, config, inputs, outputs } = data;
  const statusStyles = getStatusStyles(status);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`
        relative min-w-[220px] p-4 rounded-xl border backdrop-blur-sm
        bg-gradient-to-br ${getModuleGradient(moduleType)}
        ${selected ? 'ring-2 ring-accent ring-opacity-50 shadow-lg' : 'shadow-md'}
        ${statusStyles.glow ? `shadow-lg ${statusStyles.glow}` : ''}
        transition-all duration-300 hover:shadow-xl
        group
      `}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Status Indicator with enhanced styling */}
      <div className="absolute -top-2 -right-2">
        <div className="relative">
          <div className={`
            w-6 h-6 rounded-full ${statusStyles.color}
            flex items-center justify-center text-xs text-white font-bold
            ${statusStyles.animation}
            shadow-lg
          `}>
            {statusStyles.icon}
          </div>
          {status === 'active' && (
            <div className="absolute inset-0 w-6 h-6 rounded-full bg-status-active animate-ping opacity-30" />
          )}
        </div>
      </div>

      {/* Node Header with gradient text */}
      <div className="mb-4 relative">
        <h3 className="text-sm font-semibold text-text-primary truncate mb-1">
          {label}
        </h3>
        <p className="text-xs text-text-secondary capitalize font-medium">
          {moduleType} Module
        </p>
      </div>

      {/* Input Ports with enhanced styling */}
      {inputs && inputs.length > 0 && (
        <div className="space-y-3 mb-4">
          {inputs.map((port: UIPort) => (
            <div key={port.id} className="flex items-center relative">
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                className="!w-3 !h-3 !bg-module-input !border-2 !border-bg-primary
                  !-left-[7px] hover:!scale-125 !transition-all !duration-200
                  hover:!shadow-lg hover:!shadow-blue-500/50"
              />
              <div className="ml-4 flex-1">
                <span className="text-xs text-text-secondary font-medium">
                  {port.label || port.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Output Ports with enhanced styling */}
      {outputs && outputs.length > 0 && (
        <div className="space-y-3">
          {outputs.map((port: UIPort) => (
            <div key={port.id} className="flex items-center justify-end relative">
              <div className="mr-4 flex-1 text-right">
                <span className="text-xs text-text-secondary font-medium">
                  {port.label || port.id}
                </span>
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                className="!w-3 !h-3 !bg-module-output !border-2 !border-bg-primary
                  !-right-[7px] hover:!scale-125 !transition-all !duration-200
                  hover:!shadow-lg hover:!shadow-green-500/50"
              />
            </div>
          ))}
        </div>
      )}

      {/* Config preview (if any) */}
      {config && Object.keys(config).length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="text-2xs text-text-muted font-mono">
            {Object.keys(config).length} config{Object.keys(config).length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </motion.div>
  );
});

ModuleNode.displayName = 'ModuleNode'; 