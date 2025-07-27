import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useModules } from '@/store';
import { ModuleManifest } from '@/types/api';

export const WikiTab: React.FC = () => {
  const modules = useModules();

  const [selectedModule, setSelectedModule] = useState<string | null>(null);
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

  const selectedModuleData = selectedModule 
    ? modules.find(m => m.id === selectedModule) 
    : null;

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
        return 'border-input-module bg-input-module/5';
      case 'output':
        return 'border-output-module bg-output-module/5';
      case 'transform':
        return 'border-transform-module bg-transform-module/5';
      default:
        return 'border-border bg-bg-secondary';
    }
  };

  const renderConfigSchema = (schema: any) => {
    if (!schema || !schema.properties) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-text-primary">Configuration</h4>
        <div className="space-y-3">
          {Object.entries(schema.properties).map(([key, prop]: [string, any]) => (
            <div key={key} className="bg-bg-primary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-text-primary">{key}</h5>
                <span className="text-xs px-2 py-1 bg-accent text-white rounded">
                  {prop.type}
                </span>
              </div>
              {prop.description && (
                <p className="text-sm text-text-secondary mb-2">{prop.description}</p>
              )}
              <div className="text-xs text-text-muted space-y-1">
                {prop.default !== undefined && (
                  <div>Default: <code className="bg-bg-secondary px-1 rounded">{JSON.stringify(prop.default)}</code></div>
                )}
                {prop.enum && (
                  <div>Options: {prop.enum.map((opt: any) => (
                    <code key={opt} className="bg-bg-secondary px-1 rounded mr-1">{opt}</code>
                  ))}</div>
                )}
                {prop.minimum !== undefined && (
                  <div>Min: {prop.minimum}</div>
                )}
                {prop.maximum !== undefined && (
                  <div>Max: {prop.maximum}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEvents = (events: any[]) => {
    if (!events || events.length === 0) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-text-primary">Events</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event, index) => (
            <div key={index} className="bg-bg-primary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-text-primary">{event.name}</h5>
                <span className={`text-xs px-2 py-1 rounded ${
                  event.type === 'input' 
                    ? 'bg-connection-stream text-white' 
                    : 'bg-connection-trigger text-white'
                }`}>
                  {event.type}
                </span>
              </div>
              {event.description && (
                <p className="text-sm text-text-secondary mb-2">{event.description}</p>
              )}
              {event.dataType && (
                <div className="text-xs text-text-muted">
                  Data Type: <code className="bg-bg-secondary px-1 rounded">{event.dataType}</code>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex bg-bg-primary"
    >
      {/* Sidebar */}
      <div className="w-80 bg-bg-secondary border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            📚 Module Documentation
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
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  selectedCategory === category
                    ? 'bg-accent text-white'
                    : 'bg-bg-primary text-text-secondary hover:text-text-primary'
                }`}
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
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  getModuleColor(module.type)
                } ${
                  selectedModule === module.id 
                    ? 'ring-2 ring-accent' 
                    : 'hover:shadow-md hover:scale-105'
                }`}
                onClick={() => setSelectedModule(module.id)}
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
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {selectedModuleData ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6"
          >
            {/* Module Header */}
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-3xl">{getModuleIcon(selectedModuleData.type)}</span>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    {selectedModuleData.name}
                  </h1>
                  <p className="text-text-secondary">
                    {selectedModuleData.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-text-secondary">
                <span>Type: <span className="text-text-primary capitalize">{selectedModuleData.type}</span></span>
                <span>Version: <span className="text-text-primary">{selectedModuleData.version}</span></span>
                <span>Author: <span className="text-text-primary">{selectedModuleData.author}</span></span>
                {selectedModuleData.category && (
                  <span>Category: <span className="text-text-primary">{selectedModuleData.category}</span></span>
                )}
              </div>
            </div>

            {/* Module Content */}
            <div className="space-y-8">
              {/* Configuration Schema */}
              {selectedModuleData.configSchema && renderConfigSchema(selectedModuleData.configSchema)}
              
              {/* Events */}
              {selectedModuleData.events && renderEvents(selectedModuleData.events)}
              
              {/* Assets */}
              {selectedModuleData.assets && selectedModuleData.assets.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-text-primary">Assets</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedModuleData.assets.map((asset, index) => (
                      <div key={index} className="bg-bg-primary border border-border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">
                            {asset.type === 'image' ? '🖼️' : 
                             asset.type === 'audio' ? '🎵' : 
                             asset.type === 'video' ? '🎬' : '📄'}
                          </span>
                          <h5 className="font-medium text-text-primary">{asset.type}</h5>
                        </div>
                        <p className="text-sm text-text-secondary mb-2">{asset.path}</p>
                        {asset.description && (
                          <p className="text-xs text-text-muted">{asset.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-full text-text-muted"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-lg">Select a module to view documentation</p>
              <p className="text-sm mt-2">Browse available modules in the sidebar</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}; 