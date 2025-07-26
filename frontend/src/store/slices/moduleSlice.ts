import { toast } from 'sonner';
import { ModuleManifest, ModuleInstance } from '../../types/api';
import { api } from '../../services/api';

interface ModuleSliceParams {
  set: any;
  get: any;
}

export const createModuleSlice = ({ set, get }: ModuleSliceParams) => ({
  loadModules: async () => {
    set(state => {
      state.ui.loading = { isLoading: true, message: 'Loading modules...', progress: 0 };
    });

    try {
      const response = await api.getModules();
      if (response.success) {
        const modules = response.data.modules;
        
        set(state => {
          state.modules.clear();
          modules.forEach((module: ModuleManifest) => {
            state.modules.set(module.name, module);
          });
          state.ui.loading = { isLoading: false, message: '', progress: 0 };
        });

        toast.success(`Loaded ${modules.length} modules`);
      } else {
        throw new Error('Failed to load modules');
      }
    } catch (error) {
      console.error('Failed to load modules:', error);
      set(state => {
        state.ui.loading = { isLoading: false, message: '', progress: 0 };
        state.ui.error = { hasError: true, error: error as Error };
      });
      toast.error('Failed to load modules');
    }
  },

  createModuleInstance: async (moduleId: string, position: { x: number; y: number }) => {
    try {
      const module = get().modules.get(moduleId);
      if (!module) {
        throw new Error(`Module ${moduleId} not found`);
      }

      const response = await api.createModuleInstance({
        moduleName: moduleId,
        config: {},
        position
      });
      
      if (response.success && response.data) {
        const instance = response.data;

        // Create UI node
        const uiNode = {
          id: instance.id,
          label: module.name,
          moduleType: module.type,
          position,
          status: 'inactive' as const,
          config: instance.config || {},
          type: 'module',
          inputs: module.events.filter((e: any) => e.type === 'input').map((event: any) => ({
            id: `${instance.id}-${event.name}`,
            label: event.name,
            direction: 'in' as const,
            dataType: event.dataType || 'any',
            connected: false,
            eventName: event.name
          })),
          outputs: module.events.filter((e: any) => e.type === 'output').map((event: any) => ({
            id: `${instance.id}-${event.name}`,
            label: event.name,
            direction: 'out' as const,
            dataType: event.dataType || 'any',
            connected: false,
            eventName: event.name
          })),
          data: {
            moduleName: module.name,
            config: instance.config || {},
            manifest: module,
            label: module.name
          }
        };

        set(state => {
          state.moduleInstances.set(instance.id, instance);
          state.ui.nodes.set(instance.id, uiNode);
        });

        toast.success(`Created ${module.name} instance`);
        return instance;
      } else {
        throw new Error('Failed to create module instance');
      }
    } catch (error) {
      console.error('Failed to create module instance:', error);
      toast.error('Failed to create module instance');
      throw error;
    }
  },

  updateModuleInstance: async (id: string, config: any) => {
    try {
      const response = await api.updateModuleInstance(id, config);
      if (response.success) {
        set(state => {
          const instance = state.moduleInstances.get(id);
          if (instance) {
            instance.config = { ...instance.config, ...config };
          }
          
          const node = state.ui.nodes.get(id);
          if (node) {
            node.config = { ...node.config, ...config };
          }
        });

        toast.success('Module configuration updated');
      } else {
        throw new Error('Failed to update module instance');
      }
    } catch (error) {
      console.error('Failed to update module instance:', error);
      toast.error('Failed to update module configuration');
    }
  },

  deleteModuleInstance: async (id: string) => {
    try {
      const response = await api.deleteModuleInstance(id);
      if (response.success) {
        set(state => {
          // Remove module instance
          state.moduleInstances.delete(id);
          
          // Remove UI node
          state.ui.nodes.delete(id);
          
          // Remove associated edges
          state.ui.edges.forEach((edge, edgeId) => {
            if (edge.source === id || edge.target === id) {
              state.ui.edges.delete(edgeId);
            }
          });
          
          // Clear selection if this node was selected
          if (state.ui.selectedNode === id) {
            state.ui.selectedNode = null;
          }
        });

        toast.success('Module instance deleted');
      } else {
        throw new Error('Failed to delete module instance');
      }
    } catch (error) {
      console.error('Failed to delete module instance:', error);
      toast.error('Failed to delete module instance');
    }
  },

  startModuleInstance: async (id: string) => {
    try {
      const response = await api.startModuleInstance(id);
      if (response.success) {
        set(state => {
          const instance = state.moduleInstances.get(id);
          if (instance) {
            instance.status = 'active';
          }
          
          const node = state.ui.nodes.get(id);
          if (node) {
            node.status = 'active';
          }
        });

        toast.success('Module started');
      } else {
        throw new Error('Failed to start module instance');
      }
    } catch (error) {
      console.error('Failed to start module instance:', error);
      toast.error('Failed to start module');
    }
  },

  stopModuleInstance: async (id: string) => {
    try {
      const response = await api.stopModuleInstance(id);
      if (response.success) {
        set(state => {
          const instance = state.moduleInstances.get(id);
          if (instance) {
            instance.status = 'inactive';
          }
          
          const node = state.ui.nodes.get(id);
          if (node) {
            node.status = 'inactive';
          }
        });

        toast.success('Module stopped');
      } else {
        throw new Error('Failed to stop module instance');
      }
    } catch (error) {
      console.error('Failed to stop module instance:', error);
      toast.error('Failed to stop module');
    }
  },

  triggerModuleInstance: async (id: string) => {
    try {
      const response = await api.triggerModuleInstance(id);
      if (response.success) {
        toast.success('Module triggered');
      } else {
        throw new Error('Failed to trigger module instance');
      }
    } catch (error) {
      console.error('Failed to trigger module instance:', error);
      toast.error('Failed to trigger module');
    }
  }
}); 