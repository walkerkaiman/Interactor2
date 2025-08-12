import React, { useState, useCallback } from 'react';
import { useNodeConfig } from '../hooks/useNodeConfig';
import styles from './ModeBasedConfigPanel.module.css';

interface ModeBasedConfigPanelProps {
  instance: any;
  onConfigChange?: (instanceId: string, config: any) => void;
}

interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description?: string;
  options?: string[];
  min?: number;
  max?: number;
  pattern?: string;
  isPrimary?: boolean;
}

const ModeBasedConfigPanel: React.FC<ModeBasedConfigPanelProps> = ({
  instance,
  onConfigChange,
}) => {
  const [showSecondarySettings, setShowSecondarySettings] = useState(false);
  const [currentMode, setCurrentMode] = useState(instance?.config?.mode || 'default');

  // Get mode-specific configuration fields
  const getConfigFields = useCallback((mode: string): ConfigField[] => {
    const baseFields: ConfigField[] = [
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        description: 'Operating mode',
        options: ['clock', 'metronome'],
        isPrimary: true,
      },
      {
        key: 'enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Enable/disable the module',
        isPrimary: true,
      },
    ];

    switch (mode) {
      case 'clock':
        return [
          ...baseFields,
          {
            key: 'targetTime',
            label: 'Target Time',
            type: 'string',
            description: 'Target time in 12-hour format (e.g., 2:30 PM)',
            pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$',
            isPrimary: true,
          },
          {
            key: 'millisecondDelay',
            label: 'Millisecond Delay',
            type: 'number',
            description: 'Delay between pulses (secondary in clock mode)',
            min: 100,
            max: 60000,
            isPrimary: false,
          },
          {
            key: 'apiEnabled',
            label: 'API Enabled',
            type: 'boolean',
            description: 'Enable WebSocket API',
            isPrimary: false,
          },
          {
            key: 'apiEndpoint',
            label: 'API Endpoint',
            type: 'string',
            description: 'WebSocket endpoint URL',
            pattern: '^wss?://.+',
            isPrimary: false,
          },
        ];

      case 'metronome':
        return [
          ...baseFields,
          {
            key: 'millisecondDelay',
            label: 'Millisecond Delay',
            type: 'number',
            description: 'Delay between pulses in milliseconds',
            min: 100,
            max: 60000,
            isPrimary: true,
          },
          {
            key: 'targetTime',
            label: 'Target Time',
            type: 'string',
            description: 'Target time (secondary in metronome mode)',
            pattern: '^(1[0-2]|0?[1-9]):[0-5][0-9]\\s*(AM|PM)$',
            isPrimary: false,
          },
          {
            key: 'apiEnabled',
            label: 'API Enabled',
            type: 'boolean',
            description: 'Enable WebSocket API',
            isPrimary: false,
          },
          {
            key: 'apiEndpoint',
            label: 'API Endpoint',
            type: 'string',
            description: 'WebSocket endpoint URL',
            pattern: '^wss?://.+',
            isPrimary: false,
          },
        ];

      default:
        return baseFields;
    }
  }, []);

  const configFields = getConfigFields(currentMode);
  const primaryFields = configFields.filter(field => field.isPrimary);
  const secondaryFields = configFields.filter(field => !field.isPrimary);

  const renderField = (field: ConfigField) => {
    const [value, setValue] = useNodeConfig(
      instance,
      field.key,
      instance?.config?.[field.key] ?? getDefaultValue(field),
      getValidator(field),
      onConfigChange
    );

    const handleChange = (newValue: any) => {
      setValue(newValue);
      if (field.key === 'mode') {
        setCurrentMode(newValue);
      }
    };

    return (
      <div key={field.key} className={styles.configField}>
        <label className={styles.fieldLabel}>
          {field.label}
          {field.description && (
            <span className={styles.fieldDescription}>{field.description}</span>
          )}
        </label>
        
        {field.type === 'boolean' && (
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => handleChange(e.target.checked)}
            className={styles.checkbox}
          />
        )}
        
        {field.type === 'string' && (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            className={styles.textInput}
            pattern={field.pattern}
            title={field.description}
          />
        )}
        
        {field.type === 'number' && (
          <input
            type="number"
            value={value as number}
            onChange={(e) => handleChange(Number(e.target.value))}
            className={styles.numberInput}
            min={field.min}
            max={field.max}
            title={field.description}
          />
        )}
        
        {field.type === 'select' && (
          <select
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            className={styles.select}
          >
            {field.options?.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  const getDefaultValue = (field: ConfigField): any => {
    switch (field.type) {
      case 'boolean':
        return false;
      case 'number':
        return field.min || 0;
      case 'string':
        return '';
      case 'select':
        return field.options?.[0] || '';
      default:
        return '';
    }
  };

  const getValidator = (field: ConfigField) => {
    return (value: any) => {
      if (field.type === 'number' && typeof value === 'number') {
        if (field.min !== undefined && value < field.min) return field.min;
        if (field.max !== undefined && value > field.max) return field.max;
      }
      if (field.type === 'string' && field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) return value; // Keep invalid value for user to fix
      }
      return value;
    };
  };

  return (
    <div className={styles.configPanel}>
      <div className={styles.primarySettings}>
        <h4 className={styles.sectionTitle}>Primary Settings</h4>
        {primaryFields.map(renderField)}
      </div>
      
      {secondaryFields.length > 0 && (
        <div className={styles.secondarySettings}>
          <button
            className={styles.toggleButton}
            onClick={() => setShowSecondarySettings(!showSecondarySettings)}
          >
            {showSecondarySettings ? 'Hide' : 'Show'} Secondary Settings
          </button>
          
          {showSecondarySettings && (
            <div className={styles.secondaryFields}>
              <h4 className={styles.sectionTitle}>Secondary Settings</h4>
              {secondaryFields.map(renderField)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModeBasedConfigPanel; 