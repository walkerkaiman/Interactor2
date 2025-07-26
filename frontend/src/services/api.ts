import axios, { AxiosResponse } from 'axios';
import { 
  ModuleManifest, 
  ModuleInstance, 
  SystemStats, 
  LogEntry, 
  InteractionConfig,
  MessageRoute,
  ApiResponse 
} from '../types/api';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and error handling
apiClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    if (import.meta.env.DEV) {
      console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    return Promise.reject(error);
  }
);

// API service class
export const api = {
  // Module Management
  getModules: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/api/modules');
    return response.data;
  },

  getModule: async (name: string): Promise<ApiResponse<ModuleManifest>> => {
    const response = await apiClient.get<ApiResponse<ModuleManifest>>(`/api/modules/${name}`);
    return response.data;
  },

  getModuleInstances: async (): Promise<ApiResponse<ModuleInstance[]>> => {
    const response = await apiClient.get<ApiResponse<ModuleInstance[]>>('/api/module-instances');
    return response.data;
  },

  getModuleInstance: async (id: string): Promise<ApiResponse<ModuleInstance>> => {
    const response = await apiClient.get<ApiResponse<ModuleInstance>>(`/api/module-instances/${id}`);
    return response.data;
  },

  createModuleInstance: async (data: { moduleName: string; config: any; position?: { x: number; y: number } }): Promise<ApiResponse<ModuleInstance>> => {
    const response = await apiClient.post<ApiResponse<ModuleInstance>>('/api/module-instances', data);
    return response.data;
  },

  updateModuleInstance: async (id: string, config: any): Promise<ApiResponse<void>> => {
    const response = await apiClient.put<ApiResponse<void>>(`/api/module-instances/${id}`, { config });
    return response.data;
  },

  deleteModuleInstance: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/module-instances/${id}`);
    return response.data;
  },

  startModuleInstance: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/api/module-instances/${id}/start`);
    return response.data;
  },

  stopModuleInstance: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/api/module-instances/${id}/stop`);
    return response.data;
  },

  triggerModuleInstance: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/api/module-instances/${id}/trigger`);
    return response.data;
  },

  // Message Routing
  getRoutes: async (): Promise<ApiResponse<MessageRoute[]>> => {
    const response = await apiClient.get<ApiResponse<MessageRoute[]>>('/api/routes');
    return response.data;
  },

  createRoute: async (route: MessageRoute): Promise<ApiResponse<MessageRoute>> => {
    const response = await apiClient.post<ApiResponse<MessageRoute>>('/api/routes', route);
    return response.data;
  },

  deleteRoute: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/routes/${id}`);
    return response.data;
  },

  // Interaction Management
  getInteractions: async (): Promise<ApiResponse<InteractionConfig[]>> => {
    const response = await apiClient.get<ApiResponse<InteractionConfig[]>>('/api/interactions');
    return response.data;
  },

  createInteraction: async (interaction: Omit<InteractionConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<InteractionConfig>> => {
    const response = await apiClient.post<ApiResponse<InteractionConfig>>('/api/interactions', interaction);
    return response.data;
  },

  updateInteraction: async (id: string, interaction: Partial<InteractionConfig>): Promise<ApiResponse<InteractionConfig>> => {
    const response = await apiClient.put<ApiResponse<InteractionConfig>>(`/api/interactions/${id}`, interaction);
    return response.data;
  },

  deleteInteraction: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/interactions/${id}`);
    return response.data;
  },

  // System Monitoring
  getSystemStats: async (): Promise<ApiResponse<SystemStats>> => {
    const response = await apiClient.get<ApiResponse<SystemStats>>('/api/stats');
    return response.data;
  },

  getSystemInfo: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/api/system');
    return response.data;
  },

  getLogs: async (count: number = 100): Promise<ApiResponse<LogEntry[]>> => {
    const response = await apiClient.get<ApiResponse<LogEntry[]>>(`/api/logs?count=${count}`);
    return response.data;
  },

  getHealth: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/health');
    return response.data;
  },

  // Settings Management
  getSettings: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>('/api/settings');
    return response.data;
  },

  updateSetting: async (key: string, value: any): Promise<ApiResponse<void>> => {
    const response = await apiClient.put<ApiResponse<void>>(`/api/settings/${key}`, { value });
    return response.data;
  }
};

export default api; 