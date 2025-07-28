import { memo } from 'react';
import { createModuleNode } from './BaseModuleNode';
import styles from './CustomNode.module.css';

const CustomNodeConfig = {
  enablePulseAnimation: true,
  pulseAnimationDuration: 600,
  defaultConfig: {},
  instanceDataKeys: [],
  renderConfig: (config: any) => {
    if (Object.keys(config).length === 0) return null;

    return (
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
    );
  },
  renderActions: () => null, // No custom actions for basic modules
};

const CustomNode = createModuleNode(CustomNodeConfig);

export default memo(CustomNode); 