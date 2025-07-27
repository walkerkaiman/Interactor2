import React, { useEffect } from 'react';
import styles from './Notification.module.css';

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.notification} ${styles[type]}`}>
      <div className={styles.content}>
        <div className={styles.icon}>
          {type === 'success' ? '✓' : '✕'}
        </div>
        <div className={styles.message}>{message}</div>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification; 