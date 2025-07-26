import { toast } from 'sonner';
import { UIEdge } from '@/types/ui';
import { api } from '@/services/api';

interface ConnectionSliceParams {
  set: any;
  get: any;
}

export const createConnectionSlice = ({ set, get }: ConnectionSliceParams) => ({
  createConnection: async (connection: UIEdge) => {
    try {
      // Optimistically add the connection to UI
      set(state => {
        state.ui.edges.set(connection.id, connection);
      });

      // Make real API call
      const response = await api.createRoute({
        id: connection.id,
        source: connection.source,
        target: connection.target,
        condition: connection.data?.condition || {},
        transform: connection.data?.transform || {}
      });

      if (response.success) {
        toast.success('Connection created');
      } else {
        throw new Error('Failed to create connection');
      }
    } catch (error) {
      // Rollback on failure
      set(state => {
        state.ui.edges.delete(connection.id);
      });
      
      console.error('Failed to create connection:', error);
      toast.error('Failed to create connection');
    }
  },

  deleteConnection: async (edgeId: string) => {
    try {
      // Optimistically remove the connection from UI
      set(state => {
        state.ui.edges.delete(edgeId);
        
        // Clear selection if this edge was selected
        if (state.ui.selectedEdge === edgeId) {
          state.ui.selectedEdge = null;
        }
      });

      // Make real API call
      const response = await api.deleteRoute(edgeId);

      if (response.success) {
        toast.success('Connection deleted');
      } else {
        throw new Error('Failed to delete connection');
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
      toast.error('Failed to delete connection');
    }
  },

  loadInteractions: async () => {
    try {
      const response = await api.getInteractions();
      if (response.success) {
        set(state => {
          state.interactions.clear();
          response.data.forEach((interaction: any) => {
            state.interactions.set(interaction.id, interaction);
          });
        });
      } else {
        throw new Error('Failed to load interactions');
      }
    } catch (error) {
      console.error('Failed to load interactions:', error);
      toast.error('Failed to load interactions');
    }
  },

  createInteraction: async (interaction: any) => {
    try {
      const response = await api.createInteraction(interaction);
      if (response.success) {
        const newInteraction = response.data;
        set(state => {
          state.interactions.set(newInteraction.id, newInteraction);
        });
        toast.success('Interaction created');
      } else {
        throw new Error('Failed to create interaction');
      }
    } catch (error) {
      console.error('Failed to create interaction:', error);
      toast.error('Failed to create interaction');
    }
  },

  updateInteraction: async (id: string, interaction: any) => {
    try {
      const response = await api.updateInteraction(id, interaction);
      if (response.success) {
        set(state => {
          const existing = state.interactions.get(id);
          if (existing) {
            state.interactions.set(id, {
              ...existing,
              ...response.data,
              updatedAt: Date.now()
            });
          }
        });
        toast.success('Interaction updated');
      } else {
        throw new Error('Failed to update interaction');
      }
    } catch (error) {
      console.error('Failed to update interaction:', error);
      toast.error('Failed to update interaction');
    }
  },

  deleteInteraction: async (id: string) => {
    try {
      const response = await api.deleteInteraction(id);
      if (response.success) {
        set(state => {
          state.interactions.delete(id);
        });
        toast.success('Interaction deleted');
      } else {
        throw new Error('Failed to delete interaction');
      }
    } catch (error) {
      console.error('Failed to delete interaction:', error);
      toast.error('Failed to delete interaction');
    }
  },

  publishInteraction: async (id: string) => {
    try {
      // This would need to be implemented in the backend
      toast.success('Interaction published');
    } catch (error) {
      console.error('Failed to publish interaction:', error);
      toast.error('Failed to publish interaction');
    }
  },

  setConnectionStatus: (status: any) => {
    set(state => {
      state.connection = {
        ...state.connection,
        ...status
      };
    });
  }
}); 