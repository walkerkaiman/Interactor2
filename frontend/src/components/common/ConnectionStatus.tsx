import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { 
  WifiIcon, 
  WifiIcon as WifiOffIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export const ConnectionStatus: React.FC = () => {
  const { connection, systemStats } = useAppStore();

  const getConnectionStatus = () => {
    if (connection.connected) {
      return {
        status: 'connected',
        icon: WifiIcon,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        text: 'Connected'
      };
    } else if (connection.connecting) {
      return {
        status: 'connecting',
        icon: ServerIcon,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        text: 'Connecting...'
      };
    } else {
      return {
        status: 'disconnected',
        icon: WifiOffIcon,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        text: 'Disconnected'
      };
    }
  };

  const getSystemHealth = () => {
    if (!systemStats) return { status: 'unknown', color: 'text-gray-500' };
    
    const { memory, cpu } = systemStats;
    
    if (memory.percentage > 90 || cpu.usage > 90) {
      return { status: 'critical', color: 'text-red-500' };
    } else if (memory.percentage > 70 || cpu.usage > 70) {
      return { status: 'warning', color: 'text-yellow-500' };
    } else {
      return { status: 'healthy', color: 'text-green-500' };
    }
  };

  const connectionInfo = getConnectionStatus();
  const systemHealth = getSystemHealth();
  const Icon = connectionInfo.icon;

  return (
    <div className="flex items-center space-x-4 text-sm">
      {/* Connection Status */}
      <motion.div
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${connectionInfo.bgColor} ${connectionInfo.color}`}
        animate={{
          scale: connection.status === 'connected' ? [1, 1.05, 1] : 1
        }}
        transition={{
          duration: 2,
          repeat: connection.status === 'connected' ? Infinity : 0
        }}
      >
        <Icon className="w-4 h-4" />
        <span className="font-medium">{connectionInfo.text}</span>
      </motion.div>

      {/* System Health */}
      {systemStats && (
        <div className="flex items-center space-x-2">
          {systemHealth.status === 'healthy' ? (
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
          ) : systemHealth.status === 'warning' ? (
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
          ) : (
            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
          )}
          <span className={`font-medium ${systemHealth.color}`}>
            {systemHealth.status === 'healthy' ? 'Healthy' : 
             systemHealth.status === 'warning' ? 'Warning' : 'Critical'}
          </span>
        </div>
      )}

      {/* Live Stats */}
      {systemStats && connection.connected && (
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <span>CPU:</span>
            <span className="font-mono">
              {systemStats.cpu.usage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span>RAM:</span>
            <span className="font-mono">
              {systemStats.memory.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Uptime:</span>
            <span className="font-mono">
              {Math.floor(systemStats.uptime / 60)}m
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 