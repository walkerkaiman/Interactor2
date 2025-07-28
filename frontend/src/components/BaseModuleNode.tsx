import React, { useEffect, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FrontendNodeData } from '../types';
import { triggerEventTracker } from '../utils/triggerEventTracker';
import { connectionStateTracker } from '../utils/connectionStateTracker';
import { useNodeConfig, useInstanceData } from '../hooks/useNodeConfig';
import styles from './CustomNode.module.css';

export interface BaseModuleNodeProps extends NodeProps<FrontendNodeData> {
  onDelete?: (nodeId: string) => void;
}

export interface ModuleNodeConfig {
  // Configuration management
  configKeys?: string[];
  defaultConfig?: Record<string, any>;
  validators?: Record<string, (value: any) => any>;
  
  // Instance data keys to track
  instanceDataKeys?: string[];
  
  // Custom render functions
  renderHeader?: (moduleName: string, manifest: any) => React.ReactNode;
  renderConfig?: (config: any, updateConfig: (key: string, value: any) => void, instance?: any) => React.ReactNode;
  renderInputHandles?: (manifest: any, edges: any[]) => React.ReactNode;
  renderOutputHandles?: (manifest: any, edges: any[], nodeId: string) => React.ReactNode;
  renderActions?: (instance: any) => React.ReactNode;
  
  // Custom event handlers
  onManualTrigger?: (nodeId: string) => Promise<void>;
  
  // Pulse animation settings
  enablePulseAnimation?: boolean;
  pulseAnimationDuration?: number;
}

// Custom hook for shared module node functionality
export function useBaseModuleNode(
  props: BaseModuleNodeProps,
  config: ModuleNodeConfig
) {
  const nodeId = props.id;
  const moduleName = props.data.module.name;
  const manifest = props.data.module;
  const instance = props.data.instance;
  const edges = props.data.edges || [];
  const [isPulsing, setIsPulsing] = useState(false);
  const [connectionStateVersion, setConnectionStateVersion] = useState(0);

  // Pulse animation handling
  useEffect(() => {
    if (!config.enablePulseAnimation) return;

    const handleTriggerEvent = (event: any) => {
      if (event.moduleId === nodeId) {
        setIsPulsing(true);
        const duration = config.pulseAnimationDuration || 600;
        setTimeout(() => setIsPulsing(false), duration);
      }
    };

    const handlePulseEnded = (moduleId: string) => {
      if (moduleId === nodeId) {
        setIsPulsing(false);
      }
    };

    triggerEventTracker.on('triggerEvent', handleTriggerEvent);
    triggerEventTracker.on('pulseEnded', handlePulseEnded);

    return () => {
      triggerEventTracker.off('triggerEvent', handleTriggerEvent);
      triggerEventTracker.off('pulseEnded', handlePulseEnded);
    };
  }, [nodeId, config.enablePulseAnimation, config.pulseAnimationDuration]);

  // Connection state change handling
  useEffect(() => {
    const handleConnectionChange = () => {
  
      setConnectionStateVersion(prev => prev + 1);
    };

    // Subscribe to connection state changes
    connectionStateTracker.on('connectionChanged', handleConnectionChange);

    return () => {
      connectionStateTracker.off('connectionChanged', handleConnectionChange);
    };
  }, [nodeId]);

  // Shared event handlers
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (props.data.onDelete) {
      props.data.onDelete(nodeId);
    }
  }, [nodeId, props.data.onDelete]);

  const handleSelect = useCallback(() => {
    if (props.data.onSelect) {
      props.data.onSelect();
    }
  }, [props.data.onSelect]);

  const handleManualTrigger = useCallback(async () => {
    if (config.onManualTrigger) {
      try {
        await config.onManualTrigger(nodeId);
      } catch (error) {
        console.error('Failed to trigger module:', error);
      }
    }
  }, [nodeId, config.onManualTrigger]);

  // Helper methods
  const getInputHandleClass = useCallback(() => {
    if (manifest.type !== 'output') return '';
    
    // Check if this node has any input connections using the connection state tracker
    const connections = connectionStateTracker.getConnectionsForNode(nodeId);
    const inputConnection = connections.find(conn => 
      conn.targetNodeId === nodeId && conn.targetHandleId === 'input'
    );
    
    if (!inputConnection) return '';
    
    // Return the appropriate CSS class based on connection type
    if (inputConnection.connectionType === 'trigger') {
      return isPulsing ? styles.triggerConnectedPulse : styles.triggerConnected;
    } else if (inputConnection.connectionType === 'stream') {
      return styles.streamConnected;
    }
    
    return '';
  }, [manifest.type, nodeId, isPulsing, connectionStateVersion]);

  // Helper function to get input handle label based on connection type
  const getInputHandleLabel = useCallback((): string => {
    // Only apply dynamic labels to output modules
    if (manifest.type !== 'output') return 'Input';
    
    // Check if this node has any input connections using the connection state tracker
    const connections = connectionStateTracker.getConnectionsForNode(nodeId);
    const inputConnection = connections.find(conn => 
      conn.targetNodeId === nodeId && conn.targetHandleId === 'input'
    );
    
    if (!inputConnection) {
      // No connections, show default label
      return 'Input';
    }
    
    // Return the connection type with proper capitalization
    return inputConnection.connectionType.charAt(0).toUpperCase() + inputConnection.connectionType.slice(1);
  }, [manifest.type, nodeId, connectionStateVersion]);

  // Helper function to get handle label based on connection type
  const getHandleLabel = useCallback((handleId: string): string => {
    // Check if this handle has any connections using the connection state tracker
    const connectionType = connectionStateTracker.getConnectionType(nodeId, handleId);
    
    if (!connectionType) {
      // No connections, show default label
      return handleId === 'trigger' ? 'Trigger' : 'Stream';
    }
    
    // Return the connection type with proper capitalization
    return connectionType.charAt(0).toUpperCase() + connectionType.slice(1);
  }, [nodeId, connectionStateVersion]);

  // Helper function to get output handle class based on connection type
  const getOutputHandleClass = useCallback((handleId: string): string => {
    if (manifest.type !== 'input') return '';
    
    // Check if this handle has any connections using the connection state tracker
    const connectionType = connectionStateTracker.getConnectionType(nodeId, handleId);
    
    if (!connectionType) return '';
    
    // Return the appropriate CSS class based on connection type
    if (connectionType === 'trigger') {
      return isPulsing ? styles.triggerConnectedPulse : styles.triggerConnected;
    } else if (connectionType === 'stream') {
      return styles.streamConnected;
    }
    
    return '';
  }, [manifest.type, nodeId, isPulsing, connectionStateVersion]);

  // Shared layout components
  const renderDeleteButton = useCallback((): React.ReactNode => {
    if (!props.data.onDelete) return null;

    return (
      <button
        className={styles.deleteButton}
        onClick={handleDelete}
        title="Remove module"
      >
        ×
      </button>
    );
  }, [props.data.onDelete, handleDelete]);

  const renderHeader = useCallback((): React.ReactNode => {
    if (config.renderHeader) {
      return config.renderHeader(moduleName, manifest);
    }

    return (
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.moduleName}>{moduleName}</span>
          <span className={`${styles.type} ${styles[manifest.type]}`}>
            {manifest.type}
          </span>
        </div>
        <div className={styles.description}>{manifest.description}</div>
      </div>
    );
  }, [config.renderHeader, moduleName, manifest]);

  const renderInputHandles = useCallback((): React.ReactNode => {
    if (config.renderInputHandles) {
      return config.renderInputHandles(manifest, edges);
    }

    const inputEvents = manifest.events?.filter((e: any) => e.type === 'input') || [];

    return (
      <div className={styles.inputHandles}>
        {manifest.type === 'output' ? (
          // For output modules, show only one input handle
          <div className={styles.handleContainer}>
            <Handle
              type="target"
              position={Position.Left}
              id="input"
              className={`${styles.handle} ${getInputHandleClass()}`}
            />
            <span className={styles.handleLabel}>
              {getInputHandleLabel()}
            </span>
          </div>
        ) : (
          // For input modules, show all input events
          inputEvents.map((event: any, index: number) => (
            <div key={event.name} className={styles.handleContainer}>
              <Handle
                type="target"
                position={Position.Left}
                id={event.name}
                className={styles.handle}
                style={{ top: `${20 + index * 20}px` }}
              />
              <span className={styles.handleLabel}>{event.name}</span>
            </div>
          ))
        )}
      </div>
    );
  }, [config.renderInputHandles, manifest, edges, getInputHandleClass, getInputHandleLabel, connectionStateVersion]);

  const renderOutputHandles = useCallback((): React.ReactNode => {
    if (config.renderOutputHandles) {
      return config.renderOutputHandles(manifest, edges, nodeId);
    }



    return (
      <div className={styles.outputHandles}>
        {manifest.type === 'input' ? (
          // For input modules, show Trigger and Stream handles based on manifest settings
          <>
            {!(manifest as any).hideTriggerHandle && (
              <div className={styles.handleContainer}>
                <span className={styles.handleLabel}>
                  {getHandleLabel('trigger')}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="trigger"
                  className={`${styles.handle} ${getOutputHandleClass('trigger')}`}
                />
              </div>
            )}
            {!(manifest as any).hideStreamHandle && (
              <div className={styles.handleContainer}>
                <span className={styles.handleLabel}>
                  {getHandleLabel('stream')}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="stream"
                  className={`${styles.handle} ${getOutputHandleClass('stream')}`}
                />
              </div>
            )}
          </>
        ) : (
          // For output modules, show no output handles
          null
        )}
      </div>
    );
  }, [config.renderOutputHandles, manifest, edges, getHandleLabel, getOutputHandleClass, connectionStateVersion]);

  const renderHandles = useCallback((): React.ReactNode => {
    return (
      <div className={styles.handles}>
        {renderInputHandles()}
        {renderOutputHandles()}
      </div>
    );
  }, [renderInputHandles, renderOutputHandles]);

  const renderMeta = useCallback((): React.ReactNode => {
    return (
      <div className={styles.meta}>
        <span className={styles.version}>v{manifest.version}</span>
        <span className={styles.author}>by {manifest.author}</span>
      </div>
    );
  }, [manifest.version, manifest.author]);

  return {
    nodeId,
    moduleName,
    manifest,
    instance,
    edges,
    isPulsing,
    handleDelete,
    handleSelect,
    handleManualTrigger,
    renderDeleteButton,
    renderHeader,
    renderHandles,
    renderMeta,
    getInputHandleClass,
  };
}

// HOC to create a module node component with shared functionality
export function createModuleNode(config: ModuleNodeConfig) {
  return function ModuleNodeComponent(props: BaseModuleNodeProps) {
    const {
      instance,
      handleSelect,
      renderDeleteButton,
      renderHeader,
      renderHandles,
      renderMeta,
    } = useBaseModuleNode(props, config);

    // Configuration management
    const configState: Record<string, [any, (value: any) => void]> = {};
    
    if (config.defaultConfig) {
      Object.entries(config.defaultConfig).forEach(([key, defaultValue]) => {
        const validator = config.validators?.[key];
        configState[key] = useNodeConfig(
          instance,
          key,
          defaultValue,
          validator,
          props.data.onConfigChange
        );
      });
    }

    // Instance data management
    const instanceData: Record<string, any> = {};
    
    if (config.instanceDataKeys) {
      config.instanceDataKeys.forEach(key => {
        instanceData[key] = useInstanceData(instance, key, '');
      });
    }

    // Custom render functions
    const renderConfig = useCallback((): React.ReactNode => {
      if (config.renderConfig) {
        const updateConfig = (key: string, value: any) => {
          if (instance) {
            const updatedConfig = {
              ...instance.config,
              [key]: value
            };
            instance.config = updatedConfig;
            if (props.data.onConfigChange && instance.id) {
              props.data.onConfigChange(instance.id, updatedConfig);
            }
          }
        };
        return config.renderConfig(instance?.config || {}, updateConfig, instance);
      }
      return null; // Override in specific implementations
    }, [config.renderConfig, instance, props.data.onConfigChange]);

    const renderActions = useCallback((): React.ReactNode => {
      if (config.renderActions) {
        return config.renderActions(instance);
      }
      return null; // Override in specific implementations
    }, [config.renderActions, instance]);

    // @ts-ignore - Variables are used in the hook but TypeScript doesn't recognize it
    return (
      <div 
        className={`${styles.node} ${props.selected ? styles.selected : ''}`}
        onClick={handleSelect}
      >
        {renderDeleteButton()}
        {renderHeader()}
        {renderConfig()}
        {renderActions()}
        {renderHandles()}
        {renderMeta()}
      </div>
    );
  };
} 