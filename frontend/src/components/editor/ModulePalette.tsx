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
        return '📥';
      case 'output':
        return '📤';
      case 'transform':
        return '⚙️';
      default:
        return '🔧';
    }
  };

  const getModuleColor = (moduleType: string) => {
    switch (moduleType) {
      case 'input':
        return 'border-input-module bg-input-module/5 hover:bg-input-module/10';
      case 'output':
        return 'border-output-module bg-output-module/5 hover:bg-output-module/10';
      case 'transform':
        return 'border-transform-module bg-transform-module/5 hover:bg-transform-module/10';
      default:
        return 'border-border bg-bg-secondary hover:bg-bg-tertiary';
    }
  };

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-80 bg-bg-secondary border-r border-border flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Module Palette
        </h2>
        
        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-2 py-1 text-xs rounded-md transition-colors
                ${selectedCategory === category
                  ? 'bg-accent text-white'
                  : 'bg-bg-primary text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Module List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {filteredModules.map(module => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all duration-200
                ${getModuleColor(module.type)}
                hover:shadow-md hover:scale-105
              `}
              draggable
              onDragStart={(e: any) => handleModuleDrag(e, module)}
              onClick={() => handleModuleClick(module)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getModuleIcon(module.type)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-text-primary truncate">
                    {module.name}
                  </h3>
                  <p className="text-xs text-text-secondary truncate">
                    {module.description}
                  </p>
                </div>
              </div>
              
              {/* Module Type Badge */}
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs px-2 py-1 rounded bg-bg-primary text-text-secondary capitalize">
                  {module.type}
                </span>
                {module.version && (
                  <span className="text-xs text-text-muted">
                    v{module.version}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredModules.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-text-muted"
          >
            <p className="text-sm">No modules found</p>
            <p className="text-xs mt-1">Try adjusting your search or category filter</p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-text-muted text-center">
          {filteredModules.length} of {modules.length} modules
        </p>
      </div>
    </motion.div>
  );
}; 