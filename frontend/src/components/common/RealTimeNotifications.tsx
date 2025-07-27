import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { 
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
}

export const RealTimeNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { connection, systemStats } = useAppStore();
  const lastConnectionState = useRef({ connected: false, connecting: false });
  const lastSystemState = useRef({ memory: 0, cpu: 0 });

  // Memoized addNotification function to prevent infinite loops
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications
  }, []);

  // Auto-remove notifications after duration
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => 
        prev.filter(notification => 
          !notification.duration || (now - notification.timestamp) < notification.duration
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Connection status notifications - only trigger on state changes
  useEffect(() => {
    const currentState = { connected: connection.connected, connecting: connection.connecting };
    
    // Only add notification if state actually changed
    if (currentState.connected !== lastConnectionState.current.connected || 
        currentState.connecting !== lastConnectionState.current.connecting) {
      
      if (currentState.connected && !currentState.connecting) {
        addNotification({
          type: 'success',
          title: 'Connected',
          message: 'WebSocket connection established successfully',
          duration: 3000
        });
      } else if (!currentState.connected && !currentState.connecting) {
        addNotification({
          type: 'error',
          title: 'Disconnected',
          message: 'WebSocket connection lost. Attempting to reconnect...',
          duration: 5000
        });
      }
      
      lastConnectionState.current = currentState;
    }
  }, [connection.connected, connection.connecting, addNotification]);

  // System health notifications - only trigger on significant changes
  useEffect(() => {
    if (systemStats) {
      const { memory, cpu } = systemStats;
      const currentState = { memory: memory.percentage, cpu: cpu.usage };
      
      // Only add notification if there's a significant change (more than 5% difference)
      const memoryDiff = Math.abs(currentState.memory - lastSystemState.current.memory);
      const cpuDiff = Math.abs(currentState.cpu - lastSystemState.current.cpu);
      
      if (memoryDiff > 5 || cpuDiff > 5) {
        if (memory.percentage > 90 || cpu.usage > 90) {
          addNotification({
            type: 'error',
            title: 'System Critical',
            message: `High resource usage: CPU ${cpu.usage.toFixed(1)}%, RAM ${memory.percentage.toFixed(1)}%`,
            duration: 10000
          });
        } else if (memory.percentage > 70 || cpu.usage > 70) {
          addNotification({
            type: 'warning',
            title: 'System Warning',
            message: `Elevated resource usage: CPU ${cpu.usage.toFixed(1)}%, RAM ${memory.percentage.toFixed(1)}%`,
            duration: 8000
          });
        }
        
        lastSystemState.current = currentState;
      }
    }
  }, [systemStats?.memory.percentage, systemStats?.cpu.usage, addNotification]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return CheckCircleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'error':
        return ExclamationTriangleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getNotificationStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Get the most recent notification for display in title bar
  const latestNotification = notifications[0];

  if (!latestNotification) return null;

  const Icon = getNotificationIcon(latestNotification.type);
  const getCompactStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${getCompactStyles(latestNotification.type)}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="truncate max-w-32">{latestNotification.title}</span>
      <button
        onClick={() => removeNotification(latestNotification.id)}
        className="flex-shrink-0 p-0.5 rounded-full hover:bg-black/10 transition-colors"
      >
        <XMarkIcon className="w-3 h-3" />
      </button>
    </motion.div>
  );
}; 