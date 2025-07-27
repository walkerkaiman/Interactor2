import React from 'react';
import { apiService } from '../api';
import { InteractionConfig, ModuleInstance } from '@interactor/shared';
import styles from './TriggerPanel.module.css';

interface TriggerPanelProps {
  interactions: InteractionConfig[];
  onClose: () => void;
}

const TriggerPanel: React.FC<TriggerPanelProps> = ({ interactions, onClose }) => {
  const [triggering, setTriggering] = React.useState<string | null>(null);

  // Get all output modules from interactions
  const outputModules = React.useMemo(() => {
    const modules: ModuleInstance[] = [];
    interactions.forEach(interaction => {
      interaction.modules.forEach(module => {
        // For now, we'll assume all modules can be triggered
        // In a real implementation, you'd check the module type
        modules.push(module);
      });
    });
    return modules;
  }, [interactions]);

  const handleTrigger = async (moduleId: string) => {
    setTriggering(moduleId);
    try {
      await apiService.triggerModule(moduleId);
    } catch (error) {
      console.error('Failed to trigger module:', error);
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Manual Trigger</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {outputModules.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No modules available for triggering</p>
              <p className={styles.hint}>Add some modules to your interaction first</p>
            </div>
          ) : (
            <div className={styles.moduleList}>
              {outputModules.map((module) => (
                <div key={module.id} className={styles.moduleItem}>
                  <div className={styles.moduleInfo}>
                    <div className={styles.moduleName}>{module.moduleName}</div>
                    <div className={styles.moduleId}>ID: {module.id}</div>
                  </div>
                  <button
                    className={`${styles.triggerButton} ${triggering === module.id ? styles.triggering : ''}`}
                    onClick={() => handleTrigger(module.id)}
                    disabled={triggering === module.id}
                  >
                    {triggering === module.id ? 'Triggering...' : 'Trigger'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TriggerPanel; 