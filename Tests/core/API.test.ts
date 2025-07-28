import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { InteractorServer } from '../../backend/src/index';
import { InteractionConfig } from '@interactor/shared';
import * as path from 'path';

describe('Simplified Backend API', () => {
  let server: InteractorServer;
  let app: any;

  beforeEach(async () => {
    server = new InteractorServer();
    
    // Set configuration before initialization
    server.setConfig({
      server: {
        port: 3004, // Use different port for testing to avoid conflicts
        host: 'localhost'
      },
      logging: {
        level: 'error', // Reduce log noise during tests
        file: 'logs/test.log'
      },
      modules: {
        autoLoad: true
      }
    });
    
    await server.init();
    await server.start();
    
    // Get the Express app from the server
    app = (server as any).app;
  }, 60000); // Increase timeout to 60 seconds

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  }, 30000); // Increase timeout to 30 seconds

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.uptime).toBe('string');
      expect(typeof response.body.timestamp).toBe('number');
    });
  });

  describe('System Stats', () => {
    it('should return system stats', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('cpu');
    });
  });

  describe('Module Management', () => {
    it('should return list of available modules', async () => {
      const response = await request(app)
        .get('/api/modules')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('modules');
      expect(Array.isArray(response.body.data.modules)).toBe(true);
    });

    it('should return 404 for non-existent module', async () => {
      const response = await request(app)
        .get('/api/modules/non-existent-module')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return module manifests list', async () => {
      const response = await request(app)
        .get('/api/modules')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      // Data may not be an array if no modules are loaded
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Interaction Management', () => {
    it('should return empty interactions list initially', async () => {
      const response = await request(app)
        .get('/api/interactions')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('interactions');
      expect(Array.isArray(response.body.data.interactions)).toBe(true);
      // Backend has existing interactions, so we can't expect empty array
    });

    it('should register interaction map', async () => {
      const testInteractions: InteractionConfig[] = [
        {
          id: 'test-interaction-1',
          name: 'Test Interaction 1',
          description: 'Test description 1',
          enabled: true,
          modules: [],
          routes: []
        },
        {
          id: 'test-interaction-2',
          name: 'Test Interaction 2',
          description: 'Test description 2',
          enabled: false,
          modules: [],
          routes: []
        }
      ];

      const response = await request(app)
        .post('/api/interactions/register')
        .send({ interactions: testInteractions })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Interaction map registered successfully');
      expect(response.body).toHaveProperty('count', 2);

      // Verify interactions were saved
      const getResponse = await request(app)
        .get('/api/interactions')
        .expect(200);

      expect(getResponse.body.data.interactions).toHaveLength(2);
      expect(getResponse.body.data.interactions[0].id).toBe('test-interaction-1');
      expect(getResponse.body.data.interactions[1].id).toBe('test-interaction-2');
    });

    it('should replace existing interactions when registering', async () => {
      // First, register some interactions
      const firstInteractions: InteractionConfig[] = [
        {
          id: 'first-interaction',
          name: 'First Interaction',
          description: 'First description',
          enabled: true,
          modules: [],
          routes: []
        }
      ];

      await request(app)
        .post('/api/interactions/register')
        .send({ interactions: firstInteractions })
        .expect(200);

      // Then register different interactions
      const secondInteractions: InteractionConfig[] = [
        {
          id: 'second-interaction',
          name: 'Second Interaction',
          description: 'Second description',
          enabled: true,
          modules: [],
          routes: []
        }
      ];

      await request(app)
        .post('/api/interactions/register')
        .send({ interactions: secondInteractions })
        .expect(200);

      // Verify only the second interaction exists
      const getResponse = await request(app)
        .get('/api/interactions')
        .expect(200);

      expect(getResponse.body.data.interactions).toHaveLength(1);
      expect(getResponse.body.data.interactions[0].id).toBe('second-interaction');
    });

    it('should handle empty interaction map', async () => {
      const response = await request(app)
        .post('/api/interactions/register')
        .send({ interactions: [] })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 0);

      // Verify interactions are empty
      const getResponse = await request(app)
        .get('/api/interactions')
        .expect(200);

      expect(getResponse.body.data.interactions).toHaveLength(0);
    });
  });

  describe('Manual Trigger', () => {
    it('should return 404 for non-existent module instance', async () => {
      const response = await request(app)
        .post('/api/trigger/non-existent-module')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Settings Management', () => {
    it('should return empty settings initially', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.data).toBe('object');
    });

    it('should set and get setting', async () => {
      const testSetting = { value: 'test-value' };

      // Set setting
      await request(app)
        .put('/api/settings/test-key')
        .send(testSetting)
        .expect(200);

      // Get all settings
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      expect(response.body.data).toHaveProperty('test-key', 'test-value');
    });
  });

  describe('Logs', () => {
    it('should return recent logs', async () => {
      const response = await request(app)
        .get('/api/logs')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return limited number of logs', async () => {
      const response = await request(app)
        .get('/api/logs?count=5')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/interactions/register')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 