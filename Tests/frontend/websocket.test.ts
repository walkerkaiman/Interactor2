import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Frontend WebSocket Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WebSocketService', () => {
    it('returns null for non-existent connections', async () => {
      const { webSocketService } = await import('../../frontend/src/services/WebSocketService');
      
      const status = webSocketService.getConnectionStatus('non-existent-connection');
      expect(status).toBeNull();
    });

    it('returns empty array for all connections when none exist', async () => {
      const { webSocketService } = await import('../../frontend/src/services/WebSocketService');
      
      const connections = webSocketService.getAllConnections();
      expect(connections).toEqual([]);
    });

    it('can be shut down without errors', async () => {
      const { webSocketService } = await import('../../frontend/src/services/WebSocketService');
      
      // Should not throw an error
      expect(() => webSocketService.shutdown()).not.toThrow();
    });

    it('returns false when sending to non-existent connection', async () => {
      const { webSocketService } = await import('../../frontend/src/services/WebSocketService');
      
      const result = webSocketService.send('non-existent-connection', { test: 'data' });
      expect(result).toBe(false);
    });

    it('can disconnect non-existent connection without error', async () => {
      const { webSocketService } = await import('../../frontend/src/services/WebSocketService');
      
      // Should not throw an error
      expect(() => webSocketService.disconnect('non-existent-connection')).not.toThrow();
    });
  });
}); 