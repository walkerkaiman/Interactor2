import { memo } from 'react';
import { apiService } from '../api';
import { createModuleNode } from './BaseModuleNode';
// import { useInstanceData } from '../hooks/useNodeConfig';
import { useModuleRuntime } from '../hooks/useModuleRuntime';
import styles from './CustomNode.module.css';

// Countdown display component
function CountdownDisplay({ countdown }: { countdown: string }) {
  return (
    <span className={styles.configValue}>
      {countdown || '--'}
    </span>
  );
}

function TimeConfig({ instance, updateConfig }: { instance: any; updateConfig: (key: string, value: any) => void }) {
  const config = instance?.config || {};
  const mode = config.mode || 'clock';
  const targetTime = config.targetTime || '12:00 PM';
  const millisecondDelay = config.millisecondDelay || 1000;
  const runtime = useModuleRuntime(instance?.id, ['countdown']);
  const countdown = runtime.countdown || '';

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as 'clock' | 'metronome';
    updateConfig('mode', newMode);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig('targetTime', e.target.value);
  };

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDelay = parseInt(e.target.value) || 1000;
    updateConfig('millisecondDelay', newDelay);
  };

  return (
    <>
      <div className={styles.config}>
        <div className={styles.configTitle}>Mode:</div>
        <div className={styles.configItems}>
          <div className={styles.configItem}>
            <select value={mode} onChange={handleModeChange} className={styles.selectInput}>
              <option value="clock">Clock</option>
              <option value="metronome">Metronome</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.config}>
        <div className={styles.configTitle}>Status:</div>
        <div className={styles.configItems}>
          <div className={styles.configItem}>
            <span className={styles.configKey}>Countdown:</span>
            <CountdownDisplay countdown={countdown} />
          </div>
        </div>
      </div>

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

const TimeInputNodeConfig = {
  enablePulseAnimation: false,
  defaultConfig: {
    mode: 'clock',
    targetTime: '12:00 PM',
    millisecondDelay: 1000,
    enabled: true
  },
  validators: {
    millisecondDelay: (value: any) => Math.max(100, Math.min(60000, Number(value) || 1000))
  },
  instanceDataKeys: [],
  onManualTrigger: async (nodeId: string) => {
    await apiService.triggerModule(nodeId, { type: 'manualTrigger' });
  },
  ConfigComponent: TimeConfig
};

const TimeInputNode = createModuleNode(TimeInputNodeConfig);

export default memo(TimeInputNode); 