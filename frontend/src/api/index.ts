import {
  ModuleManifest,
  InteractionConfig,
  ApiResponse,
  ModuleListResponse,
  InteractionListResponse,
} from '@interactor/shared';

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3001/api';

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

    return response.json() as Promise<T>;
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

  async registerInteractions(interactions: InteractionConfig[], clientId?: string): Promise<void> {
    await this.request('/interactions/register', {
      method: 'POST',
      body: JSON.stringify({ interactions, clientId }),
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
    await this.request(`/modules/instances/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify({ config }),
    });
  }

  // Sync interactions with modules (explicit sync)
  async syncInteractions(): Promise<void> {
    await this.request('/interactions/sync', {
      method: 'POST',
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
    // health is served at root, not /api
    const base = API_BASE.replace(/\/?api\/?$/, '');
    const response = await fetch(`${base}/health`);
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    return response.json();
  }

  // Audio file management (global uploader; no instance creation)
  async getAudioFiles(): Promise<{ files: string[]; totalFiles: number; totalSize: number }> {
    const response = await fetch(`http://localhost:4000/files/audio-output`);
    if (!response.ok) throw new Error(`Failed to get audio files: ${response.status}`);
    const data = await response.json();
    return data.data || { files: [], totalFiles: 0, totalSize: 0 };
  }

  async uploadAudioFile(file: File): Promise<{ filename: string; originalName: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`http://localhost:4000/upload/audio-output`, { method: 'POST', body: formData });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }
    const data = await response.json();
    return data.data;
  }

  async deleteAudioFile(filename: string): Promise<{ filename: string; deleted: boolean }> {
    const response = await fetch(`http://localhost:4000/files/audio-output/${filename}`, { method: 'DELETE' });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Delete failed');
    }
    const data = await response.json();
    return data.data;
  }

  async getAudioFileMetadata(filename: string): Promise<{
    filename: string;
    size: number;
    format: string;
    duration?: number;
    sampleRate?: number;
    channels?: number;
    bitRate?: number;
  }> {
    const response = await fetch(`http://localhost:4000/files/audio-output/${filename}/metadata`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get metadata');
    }
    const data = await response.json();
    return data.data;
  }
}

export const apiService = ApiService.getInstance(); 