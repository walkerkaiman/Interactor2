import {
  ModuleManifest,
  InteractionConfig,
  ApiResponse,
  ModuleListResponse,
  InteractionListResponse,
} from '@interactor/shared';

const API_BASE = 'http://localhost:3001/api';

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
    return this.request('/health');
  }

  // Audio file management
  async getAudioFiles(moduleId: string): Promise<{ files: string[]; totalFiles: number; totalSize: number }> {
    try {
      // Get the module instance to find the upload port
      const instance = await this.getModuleInstance(moduleId);
      console.log('Audio module instance:', instance);
      
      if (!instance) {
        console.log('Audio module instance not found, creating one...');
        // Try to create an Audio Output module instance
        const createdInstance = await this.createAudioOutputInstance();
        if (!createdInstance) {
          throw new Error('Failed to create Audio Output module instance');
        }
        return this.getAudioFiles(createdInstance.id);
      }
      
      if (!instance.config) {
        throw new Error('Audio module configuration not found');
      }
      
      const uploadPort = instance.config.uploadPort ?? 4000;

      const response = await fetch(`http://localhost:${uploadPort}/files/audio-output`);
      if (!response.ok) {
        throw new Error(`Failed to get audio files: ${response.status}`);
      }

      const data = await response.json();
      return data.data || { files: [], totalFiles: 0, totalSize: 0 };
    } catch (error) {
      console.error('Failed to get audio files:', error);
      return { files: [], totalFiles: 0, totalSize: 0 };
    }
  }

  async createAudioOutputInstance(): Promise<any | null> {
    try {
      const response = await this.request('/modules/instances', {
        method: 'POST',
        body: JSON.stringify({
          moduleName: 'Audio Output',
          config: {
            deviceId: 'default',
            sampleRate: 44100,
            channels: 2,
            format: 'wav',
            volume: 1.0,
            enabled: true,
            bufferSize: 4096,
            loop: false,
            fadeInDuration: 0,
            fadeOutDuration: 0,
            enableFileUpload: true,
            uploadPort: 4000,
            uploadHost: '0.0.0.0',
            maxFileSize: 50 * 1024 * 1024,
            allowedExtensions: ['.wav', '.mp3', '.ogg', '.m4a', '.flac']
          }
        })
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create Audio Output instance:', error);
      return null;
    }
  }

  async uploadAudioFile(moduleId: string, file: File): Promise<{ filename: string; originalName: string; size: number }> {
    try {
      // Get the module instance to find the upload port
      const instance = await this.getModuleInstance(moduleId);
      console.log('Upload - Audio module instance:', instance);
      
      if (!instance) {
        console.log('Upload - Audio module instance not found, creating one...');
        // Try to create an Audio Output module instance
        const createdInstance = await this.createAudioOutputInstance();
        if (!createdInstance) {
          throw new Error('Failed to create Audio Output module instance');
        }
        return this.uploadAudioFile(createdInstance.id, file);
      }
      
      if (!instance.config) {
        throw new Error('Audio module configuration not found');
      }
      
      const uploadPort = instance.config.uploadPort ?? 4000;

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:${uploadPort}/upload/audio-output`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to upload audio file:', error);
      throw error;
    }
  }

  async deleteAudioFile(moduleId: string, filename: string): Promise<{ filename: string; deleted: boolean }> {
    try {
      // Get the module instance to find the upload port
      const instance = await this.getModuleInstance(moduleId);
      const uploadPort = instance?.config?.uploadPort ?? 4000;

      const response = await fetch(`http://localhost:${uploadPort}/files/audio-output/${filename}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to delete audio file:', error);
      throw error;
    }
  }

  async getAudioFileMetadata(moduleId: string, filename: string): Promise<{
    filename: string;
    size: number;
    format: string;
    duration?: number;
    sampleRate?: number;
    channels?: number;
    bitRate?: number;
  }> {
    try {
      // Get the module instance to find the upload port
      const instance = await this.getModuleInstance(moduleId);
      const uploadPort = instance?.config?.uploadPort ?? 4000;

      const response = await fetch(`http://localhost:${uploadPort}/files/audio-output/${filename}/metadata`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get metadata');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to get audio file metadata:', error);
      throw error;
    }
  }
}

export const apiService = ApiService.getInstance(); 