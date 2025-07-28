import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { apiService } from '../api';
import { createModuleNode } from './BaseModuleNode';
import { connectionStateTracker } from '../utils/connectionStateTracker';
import styles from './CustomNode.module.css';

const TimeInputNodeConfig = {
  enablePulseAnimation: false, // Time input doesn't need pulse animation
  defaultConfig: {
    mode: 'clock',
    targetTime: '12:00 PM',
    millisecondDelay: 1000,
    enabled: true
  },
  validators: {
    millisecondDelay: (value: any) => Math.max(100, Math.min(60000, Number(value) || 1000))
  },
  instanceDataKeys: ['currentTime', 'countdown'],
  onManualTrigger: async (nodeId: string) => {
    await apiService.triggerModule(nodeId, { type: 'manualTrigger' });
  },
  renderConfig: (config: any, updateConfig: (key: string, value: any) => void) => {
    const mode = config.mode || 'clock';
    const targetTime = config.targetTime || '12:00 PM';
    const millisecondDelay = config.millisecondDelay || 1000;
    const currentTime = config.currentTime || '';
    const countdown = config.countdown || '';




    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMode = e.target.value as 'clock' | 'metronome';
      updateConfig('mode', newMode);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      updateConfig('targetTime', newTime);
    };

    const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDelay = parseInt(e.target.value) || 1000;
      updateConfig('millisecondDelay', newDelay);
    };



    return (
      <>
        {/* Mode Selection */}
        <div className={styles.config}>
          <div className={styles.configTitle}>Mode:</div>
          <div className={styles.configItems}>
            <div className={styles.configItem}>
              <select
                value={mode}
                onChange={handleModeChange}
                className={styles.selectInput}
              >
                <option value="clock">Clock</option>
                <option value="metronome">Metronome</option>
              </select>
            </div>
          </div>
        </div>

        {/* Current Time and Countdown Display */}
        <div className={styles.config}>
          <div className={styles.configTitle}>Status:</div>
          <div className={styles.configItems}>
            <div className={styles.configItem}>
              <span className={styles.configKey}>Current:</span>
              <span className={styles.configValue}>{currentTime || '--:-- --'}</span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configKey}>Countdown:</span>
              <span className={styles.configValue}>{countdown || '--'}</span>
            </div>
          </div>
        </div>



        {/* Clock Mode Settings */}
        {mode === 'clock' && (
          <div className={styles.config}>
            <div className={styles.configTitle}>Clock Settings:</div>
            <div className={styles.configItems}>
              <div className={styles.configItem}>
                <label className={styles.configKey}>Target Time:</label>
                <div className={styles.timeInputContainer}>
                  <input
                    type="text"
                    value={targetTime}
                    onChange={handleTimeChange}
                    className={styles.timeInput}
                    placeholder="2:30 PM"
                    pattern="^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$"
                  />
                  <div className={styles.timeFormatHint}>Format: 2:30 PM</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metronome Mode Settings */}
        {mode === 'metronome' && (
          <div className={styles.config}>
            <div className={styles.configTitle}>Metronome Settings:</div>
            <div className={styles.configItems}>
              <div className={styles.configItem}>
                <label className={styles.configKey}>Millisecond Delay:</label>
                <input
                  type="number"
                  value={millisecondDelay}
                  onChange={handleDelayChange}
                  className={styles.numberInput}
                  min="100"
                  max="60000"
                  step="100"
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  },

  renderOutputHandles: (manifest: any, edges: any[], nodeId: string) => {
    // Helper function to get handle label based on connection type
    const getHandleLabel = (handleId: string): string => {
      // Check if this handle has any connections using the connection state tracker
      const connectionType = connectionStateTracker.getConnectionType(nodeId, handleId);
      
      if (!connectionType) {
        // No connections, show default label
        return 'Trigger';
      }
      
      // Return the connection type with proper capitalization
      return connectionType.charAt(0).toUpperCase() + connectionType.slice(1);
    };

    // Helper function to get handle class based on connection type
    const getHandleClass = (handleId: string): string => {
      // Check if this handle has any connections using the connection state tracker
      const connectionType = connectionStateTracker.getConnectionType(nodeId, handleId);
      
      if (!connectionType) return '';
      
      // Return the appropriate CSS class based on connection type
      if (connectionType === 'trigger') {
        return styles.triggerConnected;
      } else if (connectionType === 'stream') {
        return styles.streamConnected;
      }
      
      return '';
    };

    return (
      <div className={styles.outputHandles}>
        <div className={styles.handleContainer}>
          <span className={styles.handleLabel}>{getHandleLabel('trigger')}</span>
          <Handle
            type="source"
            position={Position.Right}
            id="trigger"
            className={`${styles.handle} ${getHandleClass('trigger')}`}
          />
        </div>
      </div>
    );
  }
};

const TimeInputNode = createModuleNode(TimeInputNodeConfig);

export default memo(TimeInputNode); 