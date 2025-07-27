import React from 'react';
import { ModuleManifest } from '@interactor/shared';
import { AppPage } from '../types';
import styles from './Sidebar.module.css';

interface SidebarProps {
  modules: ModuleManifest[];
  currentPage: AppPage;
  onPageChange: (page: AppPage) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ modules, currentPage, onPageChange }) => {
  const handleDragStart = (event: React.DragEvent, module: ModuleManifest) => {
    console.log('🔄 Sidebar: Drag started for module:', module.name);
    
    const dragData = {
      moduleName: module.name,
      manifest: module,
    };
    
    console.log('🔄 Sidebar: Setting drag data:', dragData);
    event.dataTransfer.setData('application/json', JSON.stringify(dragData));
    event.dataTransfer.effectAllowed = 'copy';
    
    console.log('🔄 Sidebar: Drag data set successfully');
  };

  const inputModules = modules.filter(m => m.type === 'input');
  const outputModules = modules.filter(m => m.type === 'output');

  const getPageTitle = (page: AppPage): string => {
    switch (page) {
      case 'modules': return 'Modules';
      case 'wikis': return 'Wikis';
      case 'performance': return 'Performance';
      case 'console': return 'Console';
      default: return 'Modules';
    }
  };

  const cycleToNextPage = () => {
    const pages: AppPage[] = ['modules', 'wikis', 'performance', 'console'];
    const currentIndex = pages.indexOf(currentPage);
    const nextIndex = (currentIndex + 1) % pages.length;
    onPageChange(pages[nextIndex]);
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <button className={styles.titleButton} onClick={cycleToNextPage}>
          <h2 className={styles.title}>{getPageTitle(currentPage)}</h2>
          <span className={styles.cycleIndicator}>↻</span>
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