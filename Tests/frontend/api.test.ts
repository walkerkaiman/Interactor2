import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('Frontend API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Service', () => {
    it('fetches modules successfully', async () => {
      const mockModules = [
        { name: 'time_input', type: 'input', description: 'Time input module' },
        { name: 'audio_output', type: 'output', description: 'Audio output module' }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { modules: mockModules } })
      });

      // Import the actual API service
      const { apiService } = await import('../../frontend/src/api');
      const result = await apiService.getModules();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/modules', {
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockModules);
    });

    it('handles module fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { apiService } = await import('../../frontend/src/api');
      
      await expect(apiService.getModules()).rejects.toThrow('Network error');
    });

    it('fetches interactions successfully', async () => {
      const mockInteractions = [
        { id: 'int-1', triggers: ['time_input'], actions: ['audio_output'] }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { interactions: mockInteractions } })
      });

      const { apiService } = await import('../../frontend/src/api');
      const result = await apiService.getInteractions();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/interactions', {
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockInteractions);
    });

    it('registers interactions successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const interactions = [
        { id: 'int-1', triggers: ['time_input'], actions: ['audio_output'] }
      ];

      const { apiService } = await import('../../frontend/src/api');
      await apiService.registerInteractions(interactions);

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/interactions/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactions })
      });
    });

    it('fetches settings successfully', async () => {
      const mockSettings = { theme: 'dark', autoSave: true };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSettings })
      });

      const { apiService } = await import('../../frontend/src/api');
      const result = await apiService.getSettings();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/settings', {
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockSettings);
    });

    it('handles HTTP error responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const { apiService } = await import('../../frontend/src/api');
      
      await expect(apiService.getModules()).rejects.toThrow('API request failed: 500 Internal Server Error');
    });

    it('handles network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { apiService } = await import('../../frontend/src/api');
      
      await expect(apiService.getModules()).rejects.toThrow('Network error');
    });
  });
}); 