import { memo, useState, useEffect } from 'react';
import { apiService } from '../api';
import { createModuleNode } from './BaseModuleNode';
import { useInstanceData } from '../hooks/useNodeConfig';
import styles from './CustomNode.module.css';

// Countdown display component
function CountdownDisplay({ countdown }: { countdown: string }) {
  return (
    <span className={styles.configValue}>
      {countdown || '--'}
    </span>
  );
}

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
  renderConfig: (config: any, updateConfig: (key: string, value: any) => void, instance: any) => {
    const mode = config.mode || 'clock';
    const targetTime = config.targetTime || '12:00 PM';
    const millisecondDelay = config.millisecondDelay || 1000;
    
    // Get real-time data from instance (updated via WebSocket)
    const currentTime = useInstanceData<string>(instance, 'currentTime', '');
    const countdown = useInstanceData<string>(instance, 'countdown', '');
    
    console.log('TimeInputNode render:', {
      id: instance?.id,
      currentTime,
      countdown,
      instance
    });




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
              <CountdownDisplay countdown={countdown} />
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
  }
};

const TimeInputNode = createModuleNode(TimeInputNodeConfig);

export default memo(TimeInputNode); 