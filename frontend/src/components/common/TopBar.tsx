import React from 'react';
import { motion } from 'framer-motion';
import { useActiveTab, useAppActions } from '@/store';

export const TopBar: React.FC = () => {
  const activeTab = useActiveTab();
  const { switchTab } = useAppActions();

  const tabs = [
    { id: 'wiki', label: '📚 Wiki', icon: '📚' },
    { id: 'editor', label: '🔧 Module Editor', icon: '🔧' },
    { id: 'console', label: '📋 Console', icon: '📋' },
    { id: 'dashboard', label: '📊 Performance', icon: '📊' },
  ] as const;

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-bg-secondary border-b border-border px-6 py-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-text-primary">
            Interactor
          </h1>
          
          <nav className="flex space-x-1">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
                  }
                `}
              >
                {tab.label}
              </motion.button>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-status-active rounded-full animate-pulse" />
            <span className="text-sm text-text-secondary">System Online</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}; 