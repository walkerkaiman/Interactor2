import React from 'react';
import { ModuleManifest } from '@interactor/shared';
import { WikisPageState } from '../types';
import styles from './WikisPage.module.css';

interface WikisPageProps {
  modules: ModuleManifest[];
  state?: WikisPageState;
  onStateUpdate?: (updates: Partial<WikisPageState>) => void;
  onModuleSelect?: (moduleName: string) => void;
}

const WikisPage: React.FC<WikisPageProps> = ({ 
  modules, 
   
  onModuleSelect 
}) => {
  const handleModuleClick = (moduleName: string) => {
    onModuleSelect?.(moduleName);
  };

  const handleModuleKeyDown = (event: React.KeyboardEvent, moduleName: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onModuleSelect?.(moduleName);
    }
  };

  return (
    <div 
      className={styles.wikisPage} 
      data-testid="wikis-page"
      role="main"
    >
      <div className={styles.header}>
        <h2>Wikis</h2>
      </div>
      <div className={styles.content}>
        {modules.length === 0 ? (
          <p>Module documentation and wikis will be displayed here.</p>
        ) : (
          <div className={styles.wikiList}>
            {modules.map((module) => (
              <div
                key={module.name}
                className={styles.wikiItem}
                data-testid="wiki-item"
                role="button"
                tabIndex={0}
                onClick={() => handleModuleClick(module.name)}
                onKeyDown={(e) => handleModuleKeyDown(e, module.name)}
              >
                <h3>{module.name}</h3>
                {module.description && (
                  <p>{module.description}</p>
                )}
                <span className={styles.moduleType}>{module.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WikisPage; 