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
    const dragData = {
      moduleName: module.name,
      manifest: module,
      // Capture the offset from the mouse to the card's top-left corner
      offsetX: event.clientX - event.currentTarget.getBoundingClientRect().left,
      offsetY: event.clientY - event.currentTarget.getBoundingClientRect().top,
    };
    
    event.dataTransfer.setData('application/json', JSON.stringify(dragData));
    event.dataTransfer.setData('application/reactflow', JSON.stringify(dragData));
    event.dataTransfer.effectAllowed = 'copy';
  };

  // Remove duplicate entries (e.g., runtime instances merged with manifests)
  const uniqueByName = (list: ModuleManifest[]) => {
    const map = new Map<string, ModuleManifest>();
    list.forEach(m => {
      if (!map.has(m.name)) {
        map.set(m.name, m);
      }
    });
    return Array.from(map.values());
  };

  const inputModules = uniqueByName(modules.filter(m => m.type === 'input'));
  const outputModules = uniqueByName(modules.filter(m => m.type === 'output'));

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
    <div className={styles.sidebar} data-testid="sidebar">
      <div className={styles.header}>
        <button className={styles.titleButton} onClick={cycleToNextPage} data-testid="title-button">
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
                data-testid="module-card"
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
                data-testid="module-card"
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