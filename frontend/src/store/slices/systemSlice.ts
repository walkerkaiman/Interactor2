import { toast } from 'sonner';
import { SystemStats, LogEntry } from '../../types/api';
import { api } from '../../services/api';

interface SystemSliceParams {
  set: any;
  get: any;
}

export const createSystemSlice = ({ set, get }: SystemSliceParams) => ({
  loadSystemStats: async () => {
    try {
      const response = await api.getSystemStats();
      if (response.success) {
        set(state => {
          state.systemStats = response.data;
        });
      } else {
        throw new Error('Failed to load system stats');
      }
    } catch (error) {
      console.error('Failed to load system stats:', error);
      toast.error('Failed to load system statistics');
    }
  },

  updateSystemStats: (stats: SystemStats) => {
    set(state => {
      state.systemStats = stats;
    });
  },

  setLogFilters: (filters: any) => {
    set(state => {
      // Update log filters in tab data
      if (state.ui.tabState.tabData.console) {
        state.ui.tabState.tabData.console.filters = {
          ...state.ui.tabState.tabData.console.filters,
          ...filters
        };
      }
    });
  },

  clearLogs: () => {
    set(state => {
      state.logs = [];
    });
    toast.success('Logs cleared');
  },

  pauseLogs: (paused: boolean) => {
    set(state => {
      if (state.ui.tabState.tabData.console) {
        state.ui.tabState.tabData.console.paused = paused;
      }
    });
  },

  addLog: (log: LogEntry) => {
    set(state => {
      state.logs.unshift(log);
      
      // Keep only the last 1000 logs
      if (state.logs.length > 1000) {
        state.logs = state.logs.slice(0, 1000);
      }
    });
  },

  loadLogs: async () => {
    try {
      const response = await api.getLogs(100);
      if (response.success) {
        set(state => {
          state.logs = response.data;
        });
      } else {
        throw new Error('Failed to load logs');
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      toast.error('Failed to load logs');
    }
  }
}); 