import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModules, useAppActions } from '@/store';
import { ModuleManifest } from '@/types/api';

export const ModulePalette: React.FC = () => {
  const modules = useModules();
  const actions = useAppActions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group modules by category
  const modulesByCategory = modules.reduce((acc, module) => {
    const category = module.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {} as Record<string, ModuleManifest[]>);

  const categories = ['all', ...Object.keys(modulesByCategory)];

  // Filter modules based on search and category
  const filteredModules = modules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleModuleDrag = (event: React.DragEvent, module: ModuleManifest) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'module',
      moduleId: module.id,
      moduleType: module.type,
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleModuleClick = (module: ModuleManifest) => {
    // Create module instance at center of viewport
    actions.createModuleInstance(module.id, {
      x: 400,
      y: 300,
    });
  };

  const getModuleIcon = (moduleType: string) => {
    switch (moduleType) {
      case 'input':
        return '⚡';
      case 'output':
        return '🎯';
      case 'transform':
        return '✨';
      default:
        return '🔮';
    }
  };

  const getModuleGradient = (moduleType: string) => {
    switch (moduleType) {
      case 'input':
        return 'from-blue-500/20 to-cyan-500/20 border-module-input hover:from-blue-500/30 hover:to-cyan-500/30';
      case 'output':
        return 'from-emerald-500/20 to-green-500/20 border-module-output hover:from-emerald-500/30 hover:to-green-500/30';
      case 'transform':
        return 'from-amber-500/20 to-orange-500/20 border-module-transform hover:from-amber-500/30 hover:to-orange-500/30';
      default:
        return 'from-purple-500/20 to-pink-500/20 border-accent hover:from-purple-500/30 hover:to-pink-500/30';
    }
  };

  return (
    <div className="w-80 bg-bg-secondary/50 backdrop-blur-xl border-r border-border flex flex-col relative">
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary/20 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative p-5 border-b border-border">
        <motion.h2 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-display font-semibold text-text-primary mb-4"
        >
          Module Library
        </motion.h2>
        
        {/* Search with enhanced styling */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4 relative"
        >
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-bg-primary/50 border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
          />
          <svg className="absolute right-3 top-2.5 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </motion.div>

        {/* Category Filter with pills */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          {categories.map((category, index) => (
            <motion.button
              key={category}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200
                ${selectedCategory === category
                  ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-glow'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }
              `}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Module List with enhanced cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
        <AnimatePresence mode="popLayout">
          {filteredModules.map((module, index) => (
            <motion.div
              key={module.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className={`
                relative p-4 rounded-xl border cursor-pointer
                bg-gradient-to-r ${getModuleGradient(module.type)}
                backdrop-blur-sm transition-all duration-300
                hover:shadow-lg hover:shadow-black/20
                group
              `}
              draggable
              onDragStart={(e: any) => handleModuleDrag(e, module)}
              onClick={() => handleModuleClick(module)}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              <div className="relative flex items-start space-x-3">
                <motion.span 
                  className="text-2xl mt-0.5"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  {getModuleIcon(module.type)}
                </motion.span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary truncate">
                    {module.name}
                  </h3>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                    {module.description}
                  </p>
                </div>
              </div>
              
              {/* Module metadata */}
              <div className="mt-3 flex justify-between items-center">
                <span className="text-2xs px-2 py-1 rounded-full bg-bg-primary/50 text-text-secondary capitalize font-medium">
                  {module.type}
                </span>
                {module.version && (
                  <span className="text-2xs text-text-muted font-mono">
                    v{module.version}
                  </span>
                )}
              </div>
              
              {/* Drag indicator */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM17 10a2 2 0 11-4 0 2 2 0 014 0zM7 18a2 2 0 11-4 0 2 2 0 014 0zM17 18a2 2 0 11-4 0 2 2 0 014 0zM17 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredModules.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-sm text-text-secondary">No modules found</p>
            <p className="text-xs text-text-muted mt-1">Try adjusting your filters</p>
          </motion.div>
        )}
      </div>

      {/* Footer with gradient border */}
      <div className="relative p-4 border-t border-border">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
        <p className="text-xs text-text-muted text-center font-medium">
          {filteredModules.length} of {modules.length} modules
        </p>
      </div>
    </div>
  );
}; 