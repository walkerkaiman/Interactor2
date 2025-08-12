import React, { useEffect, useCallback } from 'react';
import { PerformancePageState } from '../types';
import styles from './PerformancePage.module.css';

interface PerformancePageProps {
  state: PerformancePageState;
  onStateUpdate: (updates: Partial<PerformancePageState>) => void;
}

const PerformancePage: React.FC<PerformancePageProps> = ({ state }) => {
  return (
    <div className={styles.performancePage} data-testid="performance-page">
      <h2>Performance</h2>
      <p>Performance monitoring and statistics will be displayed here.</p>
    </div>
  );
};

export default PerformancePage; 