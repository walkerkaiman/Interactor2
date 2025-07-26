import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';
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

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type);
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              className={`flex items-start space-x-3 p-4 rounded-lg border shadow-lg max-w-sm ${getNotificationStyles(notification.type)}`}
            >
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium">{notification.title}</h4>
                <p className="text-sm mt-1">{notification.message}</p>
                <p className="text-xs opacity-75 mt-2">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
              
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}; 