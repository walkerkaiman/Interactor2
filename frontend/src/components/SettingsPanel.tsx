import React, { useState } from 'react';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  settings: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onClose }) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEdit = (key: string, value: any) => {
    setEditingKey(key);
    setEditValue(String(value));
  };

  const handleSave = (key: string) => {
    onUpdate(key, editValue);
    setEditingKey(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleKeyPress = (event: React.KeyboardEvent, key: string) => {
    if (event.key === 'Enter') {
      handleSave(key);
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} data-testid="settings-panel">
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {Object.keys(settings).length === 0 ? (
            <div className={styles.emptyState}>
              <p>No settings available</p>
            </div>
          ) : (
            <div className={styles.settingsList}>
              {Object.entries(settings).map(([key, value]) => (
                <div key={key} className={styles.settingItem}>
                  <div className={styles.settingKey}>{key}</div>
                  <div className={styles.settingValue}>
                    {editingKey === key ? (
                      <div className={styles.editContainer}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, key)}
                          className={styles.editInput}
                          autoFocus
                        />
                        <div className={styles.editButtons}>
                          <button
                            className={styles.saveButton}
                            onClick={() => handleSave(key)}
                          >
                            Save
                          </button>
                          <button
                            className={styles.cancelButton}
                            onClick={handleCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.valueContainer}>
                        <span className={styles.value}>{String(value)}</span>
                        <button
                          className={styles.editButton}
                          onClick={() => handleEdit(key, value)}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel; 