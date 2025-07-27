import React from 'react';
import { motion } from 'framer-motion';
import { useActiveTab, useAppActions } from '@/store';

export const TopBar: React.FC = () => {
  const activeTab = useActiveTab();
  const actions = useAppActions();

  const tabs = [
    { id: 'wiki', label: 'Wiki', icon: '📚', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'editor', label: 'Module Editor', icon: '⚡', gradient: 'from-violet-500 to-purple-500' },
    { id: 'console', label: 'Console', icon: '💻', gradient: 'from-emerald-500 to-green-500' },
    { id: 'dashboard', label: 'Performance', icon: '📊', gradient: 'from-orange-500 to-red-500' },
  ] as const;

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="relative z-50"
    >
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-bg-secondary/80 backdrop-blur-xl border-b border-border" />
      
      {/* Content */}
      <div className="relative px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            {/* Logo with gradient effect */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center space-x-3"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent-light rounded-lg blur-lg opacity-50 animate-pulse-subtle" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center shadow-glow">
                  <span className="text-white font-bold text-xl">I</span>
                </div>
              </div>
              <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                Interactor
              </h1>
            </motion.div>
            
            {/* Navigation tabs */}
            <nav className="flex items-center space-x-2">
              {tabs.map((tab, index) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="relative"
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent-light/20 rounded-lg"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  <motion.button
                    onClick={() => actions.switchTab(tab.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative px-4 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-200 flex items-center space-x-2
                      ${activeTab === tab.id
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                      }
                    `}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.label}</span>
                    
                    {activeTab === tab.id && (
                      <motion.div
                        className={`absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r ${tab.gradient} rounded-full`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </nav>
          </div>
          
          {/* Status indicators */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center space-x-6"
          >
            {/* Connection status */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-2 h-2 bg-status-active rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-status-active rounded-full animate-ping" />
              </div>
              <span className="text-sm text-text-secondary">Connected</span>
            </div>
            
            {/* Theme toggle (placeholder for future) */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}; 