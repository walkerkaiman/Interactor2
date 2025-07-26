import { toast } from 'sonner';

interface UISliceParams {
  set: any;
  get: any;
}

export const createUISlice = ({ set }: UISliceParams) => ({
  selectNode: (nodeId: string | null) => {
    set(state => {
      state.ui.selectedNode = nodeId;
      state.ui.selectedEdge = null;
    });
  },

  selectEdge: (edgeId: string | null) => {
    set(state => {
      state.ui.selectedEdge = edgeId;
      state.ui.selectedNode = null;
    });
  },

  clearSelection: () => {
    set(state => {
      state.ui.selectedNode = null;
      state.ui.selectedEdge = null;
    });
  },

  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
    set(state => {
      const node = state.ui.nodes.get(nodeId);
      if (node) {
        node.position = position;
      }
    });
  },

  switchTab: (tab: 'wiki' | 'editor' | 'console' | 'dashboard') => {
    set(state => {
      state.ui.tabState.activeTab = tab;
      state.activeTab = tab;
    });
  },

  updateTabData: (tab: 'wiki' | 'editor' | 'console' | 'dashboard', data: any) => {
    set(state => {
      if (state.ui.tabState.tabData[tab]) {
        state.ui.tabState.tabData[tab] = { ...state.ui.tabState.tabData[tab], ...data };
      }
    });
  },

  setLoading: (loading: any) => {
    set(state => {
      state.ui.loading = { ...state.ui.loading, ...loading };
    });
  },

  setError: (error: any) => {
    set(state => {
      state.ui.error = { ...state.ui.error, ...error };
    });
  },

  clearError: () => {
    set(state => {
      state.ui.error = { hasError: false, error: undefined, errorInfo: undefined };
    });
  },

  createConnection: (connection: any) => {
    set(state => {
      state.ui.edges.set(connection.id, connection);
    });
  },

  deleteConnection: (edgeId: string) => {
    set(state => {
      state.ui.edges.delete(edgeId);
      
      // Clear selection if this edge was selected
      if (state.ui.selectedEdge === edgeId) {
        state.ui.selectedEdge = null;
      }
    });
  },

  clearCanvas: () => {
    set(state => {
      state.ui.nodes.clear();
      state.ui.edges.clear();
      state.ui.selectedNode = null;
      state.ui.selectedEdge = null;
    });
    toast.success('Canvas cleared');
  },

  loadProject: (projectData: any) => {
    set(state => {
      // Clear current canvas
      state.ui.nodes.clear();
      state.ui.edges.clear();
      state.ui.selectedNode = null;
      state.ui.selectedEdge = null;
      
      // Load new project data
      if (projectData.nodes) {
        projectData.nodes.forEach((node: any) => {
          state.ui.nodes.set(node.id, node);
        });
      }
      
      if (projectData.edges) {
        projectData.edges.forEach((edge: any) => {
          state.ui.edges.set(edge.id, edge);
        });
      }
    });
    toast.success('Project loaded successfully');
  }
}); 