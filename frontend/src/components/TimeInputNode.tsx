import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FrontendNodeData } from '../types';
import { apiService } from '../api';
import { useNodeConfig, useInstanceData } from '../hooks/useNodeConfig';
import styles from './CustomNode.module.css';

interface TimeInputNodeProps extends NodeProps<FrontendNodeData> {
  onDelete?: (nodeId: string) => void;
}

const TimeInputNode: React.FC<TimeInputNodeProps> = ({ data, selected, id }) => {
  const { module, instance, isSelected, onSelect, onDelete, edges = [] } = data;
  const moduleName = module.name;
  const manifest = module;

  // Use custom hooks for configuration management
  const [mode, setMode] = useNodeConfig(instance, 'mode', 'clock', undefined, data.onConfigChange);
  const [targetTime, setTargetTime] = useNodeConfig(instance, 'targetTime', '12:00 PM', undefined, data.onConfigChange);
  const [millisecondDelay, setMillisecondDelay] = useNodeConfig(instance, 'millisecondDelay', 1000, undefined, data.onConfigChange);
  
  // Get real-time data
  const currentTime = useInstanceData(instance, 'currentTime', '');
  const countdown = useInstanceData(instance, 'countdown', '');

  // Validate time format
  const isValidTimeFormat = (time: string): boolean => {
    const timeRegex = /^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM)$/i;
    return timeRegex.test(time);
  };

  // Handle mode change
  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as 'clock' | 'metronome';
    setMode(newMode);
  };

  // Handle time input change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTargetTime(newTime);
  };

  // Handle millisecond delay change
  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDelay = parseInt(e.target.value) || 1000;
    setMillisecondDelay(newDelay);
  };

  // Handle manual trigger
  const handleManualTrigger = async () => {
    try {
      await apiService.triggerModule(id, { type: 'manualTrigger' });
    } catch (error) {
      console.error('Failed to trigger module:', error);
    }
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

      {/* Manual Controls */}
      <div className={styles.config}>
        <div className={styles.configTitle}>Controls:</div>
        <div className={styles.configItems}>
          <button
            onClick={handleManualTrigger}
            className={styles.triggerButton}
            title="Manually trigger the timer"
          >
            Trigger Now
          </button>
        </div>
      </div>

      {/* Output Handles */}
      <div className={styles.handles}>
        <div className={styles.inputHandles}>
          {/* No input handles for time input module */}
        </div>

        <div className={styles.outputHandles}>
          <div className={styles.handleContainer}>
            <span className={styles.handleLabel}>Trigger</span>
            <Handle
              type="source"
              position={Position.Right}
              id="trigger"
              className={styles.handle}
            />
          </div>
        </div>
      </div>

      {/* Module Meta */}
      <div className={styles.meta}>
        <span className={styles.version}>v{manifest.version}</span>
        <span className={styles.author}>by {manifest.author}</span>
        {instance && (
          <div className={styles.status}>
            <span className={`${styles.statusDot} ${styles[instance.status || 'stopped']}`}></span>
            <span className={styles.statusText}>{instance.status || 'stopped'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(TimeInputNode); 