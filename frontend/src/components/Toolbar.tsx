import React from 'react';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onRegister: () => void;
  isRegistering: boolean;
  onToggleSidebar: () => void;
  onToggleSettings: () => void;
  onToggleTrigger: () => void;
  sidebarOpen: boolean;
  hasUnregisteredChanges: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onRegister,
  isRegistering,
  onToggleSidebar,
  onToggleSettings,
  onToggleTrigger,
  sidebarOpen,
  hasUnregisteredChanges
}) => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <button
          className={styles.toolbarButton}
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {sidebarOpen ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>

      <div className={styles.center}>
        <h1 className={styles.title}>Interactor</h1>
      </div>

      <div className={styles.right}>
        <button
          className={styles.toolbarButton}
          onClick={onToggleTrigger}
          title="Trigger Panel"
        >
          ⚡
        </button>
        
        <button
          className={styles.toolbarButton}
          onClick={onToggleSettings}
          title="Settings"
          data-testid="settings-button"
        >
          ⚙️
        </button>

        {hasUnregisteredChanges && (
          <div className={styles.unregisteredIndicator}>
            <span className={styles.indicatorText}>Unregistered Interactions</span>
          </div>
        )}

        <button
          className={`${styles.registerButton} ${isRegistering ? styles.registering : ''}`}
          onClick={onRegister}
          disabled={isRegistering}
        >
          {isRegistering ? 'Registering...' : 'Register'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar; 