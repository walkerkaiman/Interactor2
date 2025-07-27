import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FrontendNodeData } from '../types';
import styles from './CustomNode.module.css';

const CustomNode: React.FC<NodeProps<FrontendNodeData>> = ({ data, selected }) => {
  const { moduleName, config, manifest } = data;

  const inputEvents = manifest.events?.filter((e: any) => e.type === 'input') || [];
  const outputEvents = manifest.events?.filter((e: any) => e.type === 'output') || [];

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''}`}>
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
          {inputEvents.map((event: any, index: number) => (
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
          ))}
        </div>

        {/* Output Handles */}
        <div className={styles.outputHandles}>
          {outputEvents.map((event: any, index: number) => (
            <div key={event.name} className={styles.handleContainer}>
              <span className={styles.handleLabel}>{event.name}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={event.name}
                className={styles.handle}
                style={{ top: `${20 + index * 20}px` }}
              />
            </div>
          ))}
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
      </div>
    </div>
  );
};

export default memo(CustomNode); 