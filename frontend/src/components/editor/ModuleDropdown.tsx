import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useModules, useAppActions } from '@/store';
import { ModuleManifest } from '@/types/api';

export const ModuleDropdown: React.FC = () => {
  const modules = useModules();
  const actions = useAppActions();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleModuleClick = (module: ModuleManifest) => {
    // Create module instance at center of viewport
    actions.createModuleInstance(module.id, {
      x: 400,
      y: 300,
    });
    setIsOpen(false);
    setSearchQuery('');
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary hover:bg-bg-tertiary transition-colors"
      >
        <PlusIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Add Module</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-80 bg-bg-secondary border border-border rounded-lg shadow-lg z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Select Module
              </h3>
              
              {/* Search */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  autoFocus
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
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              <AnimatePresence>
                {filteredModules.map(module => (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all duration-200
                      ${getModuleColor(module.type)}
                      hover:shadow-md hover:scale-105
                    `}
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
            <div className="p-3 border-t border-border">
              <p className="text-xs text-text-muted text-center">
                {filteredModules.length} of {modules.length} modules
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 