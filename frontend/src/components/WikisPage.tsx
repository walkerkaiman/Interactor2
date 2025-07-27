import React, { useEffect, useCallback } from 'react';
import { ModuleManifest } from '@interactor/shared';
import { WikisPageState } from '../types';
import styles from './WikisPage.module.css';

interface WikisPageProps {
  modules: ModuleManifest[];
  state: WikisPageState;
  onStateUpdate: (updates: Partial<WikisPageState>) => void;
}

const WikisPage: React.FC<WikisPageProps> = ({ state }) => {
  return (
    <div className={styles.wikisPage}>
      <h2>Wikis</h2>
      <p>Module documentation and wikis will be displayed here.</p>
    </div>
  );
};

export default WikisPage; 