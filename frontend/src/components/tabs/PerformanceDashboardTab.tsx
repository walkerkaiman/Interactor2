import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,

  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useSystemStats, useAppActions } from '@/store';


export const PerformanceDashboardTab: React.FC = () => {
  const systemStats = useSystemStats();

  const actions = useAppActions();
  const [timeRange, setTimeRange] = useState('1h');
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    actions.loadSystemStats();
    
    const interval = setInterval(() => {
      actions.loadSystemStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, actions]); // Now actions is stable, so this is safe

  useEffect(() => {
    if (systemStats) {
      setHistoricalData(prev => {
        const newData = [...prev, {
          timestamp: Date.now(),
          cpu: systemStats.cpu.usage,
          memory: systemStats.memory.percentage,
          messages: systemStats.messages.sent + systemStats.messages.received,
          errors: systemStats.messages.errors,
        }].slice(-50); // Keep last 50 data points
        return newData;
      });
    }
  }, [systemStats]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getMemoryColor = (percentage: number) => {
    if (percentage > 80) return '#ef4444';
    if (percentage > 60) return '#f59e0b';
    return '#10b981';
  };

  const getCpuColor = (usage: number) => {
    if (usage > 80) return '#ef4444';
    if (usage > 60) return '#f59e0b';
    return '#3b82f6';
  };

  const moduleStatusData = systemStats ? [
    { name: 'Active', value: systemStats.modules.active, color: '#10b981' },
    { name: 'Inactive', value: systemStats.modules.total - systemStats.modules.active - systemStats.modules.errors, color: '#6b7280' },
    { name: 'Errors', value: systemStats.modules.errors, color: '#ef4444' },
  ] : [];

  const messageData = systemStats ? [
    { name: 'Sent', value: systemStats.messages.sent, color: '#3b82f6' },
    { name: 'Received', value: systemStats.messages.received, color: '#10b981' },
    { name: 'Errors', value: systemStats.messages.errors, color: '#ef4444' },
  ] : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-gray-800 text-white"
    >
      {/* Header */}
      <div className="bg-gray-700 border-b border-gray-600 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">📊</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Performance Dashboard
              </h1>
              <p className="text-sm text-gray-300">
                Real-time system monitoring and analytics
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 text-sm bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-4 py-2 text-sm bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value={1000}>1s Refresh</option>
              <option value={5000}>5s Refresh</option>
              <option value={10000}>10s Refresh</option>
              <option value={30000}>30s Refresh</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {systemStats ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* System Overview Cards */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-700 rounded-xl p-6 border border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="text-2xl mr-3">⚙️</span>
                System Overview
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-600 rounded-lg">
                  <span className="text-gray-300 font-medium">Uptime</span>
                  <span className="text-white font-mono font-bold">{formatUptime(systemStats.uptime)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-600 rounded-lg">
                  <span className="text-gray-300 font-medium">CPU Cores</span>
                  <span className="text-white font-bold">{systemStats.cpu.cores}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-600 rounded-lg">
                  <span className="text-gray-300 font-medium">Total Memory</span>
                  <span className="text-white font-bold">{formatBytes(systemStats.memory.total)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-600 rounded-lg">
                  <span className="text-gray-300 font-medium">Used Memory</span>
                  <span className="text-white font-bold">{formatBytes(systemStats.memory.used)}</span>
                </div>
              </div>
            </motion.div>

            {/* CPU Usage */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-700 rounded-xl p-6 border border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="text-2xl mr-3">🖥️</span>
                CPU Usage
              </h3>
              <div className="text-center">
                <div className="relative inline-block">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="48"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      className="text-gray-300"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="48"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 48}`}
                      strokeDashoffset={`${2 * Math.PI * 48 * (1 - systemStats.cpu.usage / 100)}`}
                      className="transition-all duration-500"
                      style={{ color: getCpuColor(systemStats.cpu.usage) }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: getCpuColor(systemStats.cpu.usage) }}>
                      {Math.round(systemStats.cpu.usage)}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Memory Usage */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-700 rounded-xl p-6 border border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="text-2xl mr-3">💾</span>
                Memory Usage
              </h3>
              <div className="text-center">
                <div className="relative inline-block">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="48"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      className="text-gray-300"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="48"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 48}`}
                      strokeDashoffset={`${2 * Math.PI * 48 * (1 - systemStats.memory.percentage / 100)}`}
                      className="transition-all duration-500"
                      style={{ color: getMemoryColor(systemStats.memory.percentage) }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: getMemoryColor(systemStats.memory.percentage) }}>
                      {Math.round(systemStats.memory.percentage)}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Module Status */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-700 rounded-xl p-6 border border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="text-2xl mr-3">🔧</span>
                Module Status
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={moduleStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {moduleStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 space-y-3">
                {moduleStatusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-gray-300">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Message Statistics */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-700 rounded-xl p-6 border border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="text-2xl mr-3">📨</span>
                Message Statistics
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={messageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Performance Trends */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-700 rounded-xl p-6 border border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300 lg:col-span-2 xl:col-span-1"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="text-2xl mr-3">📈</span>
                Performance Trends
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#64748b"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cpu" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="memory" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-full text-gray-400"
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-lg font-medium">Loading system statistics...</p>
              <p className="text-sm text-gray-400">Please wait while we gather performance data</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}; 