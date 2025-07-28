import {
  ModuleManifest,
  InteractionConfig,
  ApiResponse,
  ModuleListResponse,
  InteractionListResponse,
} from '@interactor/shared';

const API_BASE = '/api';

class ApiService {
  private static instance: ApiService;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Module management
  async getModules(): Promise<ModuleManifest[]> {
    const response = await this.request<ApiResponse<ModuleListResponse>>('/modules');
    return response.data?.modules || [];
  }

  async getModule(name: string): Promise<ModuleManifest | null> {
    try {
      const response = await this.request<ApiResponse<ModuleManifest>>(`/modules/${name}`);
      return response.data || null;
    } catch (error) {
      return null;
    }
  }

  // Get module instances and their real-time state
  async getModuleInstances(): Promise<any[]> {
    try {
      const response = await this.request<ApiResponse<{ instances: any[]; count: number }>>('/modules/instances');
      return response.data?.instances || [];
    } catch (error) {
      console.error('Failed to get module instances:', error);
      return [];
    }
  }

  async getModuleInstance(id: string): Promise<any | null> {
    try {
      const response = await this.request<ApiResponse<any>>(`/modules/instances/${id}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get module instance ${id}:`, error);
      return null;
    }
  }

  // Interaction management
  async getInteractions(): Promise<InteractionConfig[]> {
    const response = await this.request<ApiResponse<InteractionListResponse>>('/interactions');
    return response.data?.interactions || [];
  }

  async registerInteractions(interactions: InteractionConfig[]): Promise<void> {
    await this.request('/interactions/register', {
      method: 'POST',
      body: JSON.stringify({ interactions }),
    });
  }

  // Manual trigger
  async triggerModule(moduleId: string, payload?: any): Promise<void> {
    await this.request(`/trigger/${moduleId}`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    });
  }

  // Update module configuration
  async updateModuleConfig(moduleId: string, config: any): Promise<void> {
    await this.request(`/modules/instances/${moduleId}/config`, {
      method: 'PUT',
      body: JSON.stringify({ config }),
    });
  }

  // Settings
  async getSettings(): Promise<Record<string, any>> {
    const response = await this.request<ApiResponse<Record<string, any>>>('/settings');
    return response.data || {};
  }

  async updateSetting(key: string, value: any): Promise<void> {
    await this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  // System stats
  async getStats(): Promise<any> {
    const response = await this.request<ApiResponse<any>>('/stats');
    return response.data || {};
  }

  // Health check
  async getHealth(): Promise<any> {
    return this.request('/health');
  }
}

export const apiService = ApiService.getInstance(); 