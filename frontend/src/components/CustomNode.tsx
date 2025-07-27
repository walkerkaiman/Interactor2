import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FrontendNodeData } from '../types';
import styles from './CustomNode.module.css';

interface CustomNodeProps extends NodeProps<FrontendNodeData> {
  onDelete?: (nodeId: string) => void;
}

const CustomNode: React.FC<CustomNodeProps> = ({ data, selected, id }) => {
  const { module, instance, isSelected, onSelect, onDelete, edges = [] } = data;
  const moduleName = module.name;
  const config = instance?.config || {};
  const manifest = module;

  const inputEvents = manifest.events?.filter((e: any) => e.type === 'input') || [];
  const outputEvents = manifest.events?.filter((e: any) => e.type === 'output') || [];

  // Determine the connection type for output module input handle
  const getInputHandleClass = () => {
    if (manifest.type !== 'output') return '';
    
    // Find edges that connect to this node's input handle
    const connectedEdges = edges.filter((edge: any) => 
      edge.target === id && edge.targetHandle === 'input'
    );
    
    if (connectedEdges.length === 0) return '';
    
    // Get the source handle type from the first connected edge
    const sourceHandle = connectedEdges[0].sourceHandle;
    if (sourceHandle === 'trigger') {
      return styles.triggerConnected;
    } else if (sourceHandle === 'stream') {
      return styles.streamConnected;
    }
    
    return '';
  };

  return (
    <div 
      className={`${styles.node} ${selected ? styles.selected : ''}`}
      onClick={() => onSelect?.()}
    >
      {/* Delete Button */}
      {onDelete && (
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          title="Remove module"
        >
          ×
        </button>
      )}
      
      {/* Node Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.moduleName}>{moduleName}</span>
          <span className={`${styles.type} ${styles[manifest.type]}`}>
            {manifest.type}
          </span>
        </div>
        <div className={styles.description}>{manifest.description}</div>
      </div>

      {/* Input Handles */}
      <div className={styles.handles}>
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
              <span className={styles.handleLabel}>Input</span>
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

        {/* Output Handles */}
        <div className={styles.outputHandles}>
          {manifest.type === 'input' ? (
            // For input modules, show Trigger and Stream handles
            <>
              <div className={styles.handleContainer}>
                <span className={styles.handleLabel}>Trigger</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="trigger"
                  className={styles.handle}
                />
              </div>
              <div className={styles.handleContainer}>
                <span className={styles.handleLabel}>Stream</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="stream"
                  className={styles.handle}
                />
              </div>
            </>
          ) : (
            // For output modules, show no output handles
            null
          )}
        </div>
      </div>

      {/* Configuration Preview */}
      {Object.keys(config).length > 0 && (
        <div className={styles.config}>
          <div className={styles.configTitle}>Config:</div>
          <div className={styles.configItems}>
            {Object.entries(config).slice(0, 3).map(([key, value]) => (
              <div key={key} className={styles.configItem}>
                <span className={styles.configKey}>{key}:</span>
                <span className={styles.configValue}>
                  {typeof value === 'string' && value.length > 20
                    ? `${value.substring(0, 20)}...`
                    : String(value)}
                </span>
              </div>
            ))}
            {Object.keys(config).length > 3 && (
              <div className={styles.configMore}>
                +{Object.keys(config).length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module Meta */}
      <div className={styles.meta}>
        <span className={styles.version}>v{manifest.version}</span>
        <span className={styles.author}>by {manifest.author}</span>
        {instance && (
          <div className={styles.status}>
            <span className={`${styles.statusDot} ${styles[instance.status || 'stopped']}`}></span>
            <span className={styles.statusText}>{instance.status || 'stopped'}</span>
            {instance.currentFrame !== undefined && (
              <span className={styles.frameInfo}>Frame: {instance.currentFrame}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(CustomNode); 