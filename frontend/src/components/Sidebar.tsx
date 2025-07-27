import React from 'react';
import { ModuleManifest } from '@interactor/shared';
import styles from './Sidebar.module.css';

interface SidebarProps {
  modules: ModuleManifest[];
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ modules, onClose }) => {
  const handleDragStart = (event: React.DragEvent, module: ModuleManifest) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      moduleName: module.name,
      manifest: module,
    }));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const inputModules = modules.filter(m => m.type === 'input');
  const outputModules = modules.filter(m => m.type === 'output');

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Modules</h2>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={styles.content}>
        {/* Input Modules */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Input Modules</h3>
          <div className={styles.moduleList}>
            {inputModules.map((module) => (
              <div
                key={module.name}
                className={styles.moduleCard}
                draggable
                onDragStart={(e) => handleDragStart(e, module)}
              >
                <div className={styles.moduleHeader}>
                  <span className={styles.moduleName}>{module.name}</span>
                  <span className={styles.moduleType}>Input</span>
                </div>
                <p className={styles.moduleDescription}>{module.description}</p>
                <div className={styles.moduleMeta}>
                  <span className={styles.moduleVersion}>v{module.version}</span>
                  <span className={styles.moduleAuthor}>by {module.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Output Modules */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Output Modules</h3>
          <div className={styles.moduleList}>
            {outputModules.map((module) => (
              <div
                key={module.name}
                className={styles.moduleCard}
                draggable
                onDragStart={(e) => handleDragStart(e, module)}
              >
                <div className={styles.moduleHeader}>
                  <span className={styles.moduleName}>{module.name}</span>
                  <span className={styles.moduleType}>Output</span>
                </div>
                <p className={styles.moduleDescription}>{module.description}</p>
                <div className={styles.moduleMeta}>
                  <span className={styles.moduleVersion}>v{module.version}</span>
                  <span className={styles.moduleAuthor}>by {module.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {modules.length === 0 && (
          <div className={styles.emptyState}>
            <p>No modules available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 