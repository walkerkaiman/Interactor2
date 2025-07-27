import React, { useEffect, useCallback } from 'react';
import { ModuleManifest } from '@interactor/shared';
import { WikisPageState } from '../types';
import styles from './WikisPage.module.css';

interface WikisPageProps {
  modules: ModuleManifest[];
  state: WikisPageState;
  onStateUpdate: (updates: Partial<WikisPageState>) => void;
}

const WikisPage: React.FC<WikisPageProps> = ({ modules, state, onStateUpdate }) => {
  const { selectedModule, wikiContent, loading } = state;
  
  console.log('WikisPage rendered with state:', state);

  const loadWikiContent = useCallback(async (moduleName: string) => {
    onStateUpdate({ loading: true });
    try {
      // This would be implemented in the backend to serve wiki content
      // For now, we'll show a placeholder
      const content = `# ${moduleName} Documentation

This is the documentation for the ${moduleName} module.

## Overview
${modules.find(m => m.name === moduleName)?.description || 'No description available.'}

## Configuration
Configuration options and parameters for this module.

## Events
Available events and their descriptions.

## Examples
Usage examples and common patterns.

---
*This documentation is automatically generated from the module's wiki.md file.*`;
      onStateUpdate({ wikiContent: content, loading: false });
    } catch (error) {
      onStateUpdate({ wikiContent: 'Failed to load documentation.', loading: false });
    }
  }, [modules, onStateUpdate]);

  useEffect(() => {
    if (selectedModule) {
      const module = modules.find(m => m.name === selectedModule);
      if (module) {
        loadWikiContent(selectedModule);
      }
    }
  }, [selectedModule, modules, loadWikiContent]);

  return (
    <div className={styles.wikisPage}>
      <div className={styles.header}>
        <h1>Module Documentation</h1>
        <p>Browse and read documentation for available modules</p>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <h3>Available Modules</h3>
          <div className={styles.moduleList}>
            {modules.map((module) => (
              <div
                key={module.name}
                className={`${styles.moduleItem} ${selectedModule === module.name ? styles.selected : ''}`}
                onClick={() => onStateUpdate({ selectedModule: module.name })}
              >
                <div className={styles.moduleInfo}>
                  <span className={styles.moduleName}>{module.name}</span>
                  <span className={styles.moduleType}>{module.type}</span>
                </div>
                <p className={styles.moduleDescription}>{module.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.mainContent}>
          {selectedModule ? (
            <div className={styles.documentation}>
              <div className={styles.docHeader}>
                <h2>{selectedModule}</h2>
                <div className={styles.moduleMeta}>
                  {(() => {
                    const module = modules.find(m => m.name === selectedModule);
                    return module ? (
                      <>
                        <span className={styles.version}>v{module.version}</span>
                        <span className={styles.author}>by {module.author}</span>
                      </>
                    ) : null;
                  })()}
                </div>
              </div>
              
              {loading ? (
                <div className={styles.loading}>Loading documentation...</div>
              ) : (
                <div className={styles.wikiContent}>
                  <pre>{wikiContent}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h3>Select a Module</h3>
              <p>Choose a module from the sidebar to view its documentation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WikisPage; 