import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { InteractorServer } from '../../backend/src/index';
import { MessageRoute, InteractionConfig, ModuleInstance } from '@interactor/shared';

describe('Backend API', () => {
  let server: InteractorServer;
  let app: any;

  beforeEach(async () => {
    server = new InteractorServer();
    
    // Set configuration before initialization
    server.setConfig({
      server: {
        port: 3002, // Use different port for testing
        host: 'localhost'
      },
      logging: {
        level: 'error', // Reduce log noise during tests
        file: 'logs/test.log'
      },
      modules: {
        autoLoad: true,
        hotReload: false
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
      expect(response.body.data).toHaveProperty('modules');
      expect(response.body.data).toHaveProperty('messages');
    });

    it('should return detailed system info', async () => {
      const response = await request(app)
        .get('/api/system')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('platform');
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
      expect(response.body).toHaveProperty('error', 'Module not found');
    });

    it('should return module manifest for existing module', async () => {
      // Get available modules first
      const modulesResponse = await request(app)
        .get('/api/modules')
        .expect(200);

      if (modulesResponse.body.data.modules.length > 0) {
        const moduleName = modulesResponse.body.data.modules[0].name;
        
        const response = await request(app)
          .get(`/api/modules/${moduleName}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('name', moduleName);
        expect(response.body.data).toHaveProperty('type');
        expect(response.body.data).toHaveProperty('version');
        expect(response.body.data).toHaveProperty('description');
      } else {
        // Skip test if no modules are available
        console.log('No modules available, skipping module manifest test');
      }
    });
  });

  describe('Module Instance Management', () => {
    it('should return empty list of module instances initially', async () => {
      const response = await request(app)
        .get('/api/module-instances')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 404 for non-existent module instance', async () => {
      const response = await request(app)
        .get('/api/module-instances/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Module instance not found');
    });

    it('should create and manage module instances', async () => {
      // Get available modules first
      const modulesResponse = await request(app)
        .get('/api/modules')
        .expect(200);

      if (modulesResponse.body.data.modules.length > 0) {
        const moduleName = modulesResponse.body.data.modules[0].name;
        
        // Create a module instance
        const createResponse = await request(app)
          .post('/api/module-instances')
          .send({
            moduleName,
            config: { test: 'config' },
            position: { x: 100, y: 100 }
          })
          .expect(200);

        expect(createResponse.body).toHaveProperty('success', true);
        expect(createResponse.body).toHaveProperty('data');
        expect(createResponse.body.data).toHaveProperty('id');
        expect(createResponse.body.data).toHaveProperty('moduleName', moduleName);
        expect(createResponse.body.data).toHaveProperty('config');
        expect(createResponse.body.data).toHaveProperty('position');

        const instanceId = createResponse.body.data.id;

        // Get the created instance
        const getResponse = await request(app)
          .get(`/api/module-instances/${instanceId}`)
          .expect(200);

        expect(getResponse.body).toHaveProperty('success', true);
        expect(getResponse.body.data).toHaveProperty('id', instanceId);

        // Start the module instance
        const startResponse = await request(app)
          .post(`/api/module-instances/${instanceId}/start`)
          .expect(200);

        expect(startResponse.body).toHaveProperty('success', true);

        // Stop the module instance
        const stopResponse = await request(app)
          .post(`/api/module-instances/${instanceId}/stop`)
          .expect(200);

        expect(stopResponse.body).toHaveProperty('success', true);

        // Delete the module instance
        const deleteResponse = await request(app)
          .delete(`/api/module-instances/${instanceId}`)
          .expect(200);

        expect(deleteResponse.body).toHaveProperty('success', true);
      } else {
        // Skip test if no modules are available
        console.log('No modules available, skipping module instance management test');
      }
    });

    it('should handle invalid module creation', async () => {
      const response = await request(app)
        .post('/api/module-instances')
        .send({
          moduleName: 'non-existent-module',
          config: {}
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Interaction Management', () => {
    it('should return empty list of interactions initially', async () => {
      const response = await request(app)
        .get('/api/interactions')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('interactions');
      expect(Array.isArray(response.body.data.interactions)).toBe(true);
    });

    it('should create and manage interactions', async () => {
      const interaction: InteractionConfig = {
        id: 'test-interaction',
        name: 'Test Interaction',
        description: 'Test interaction for API testing',
        enabled: true,
        modules: [],
        routes: []
      };

      // Create interaction
      const createResponse = await request(app)
        .post('/api/interactions')
        .send(interaction)
        .expect(200);

      expect(createResponse.body).toHaveProperty('success', true);
      expect(createResponse.body).toHaveProperty('data');
      expect(createResponse.body.data).toHaveProperty('id', interaction.id);
      expect(createResponse.body.data).toHaveProperty('name', interaction.name);

      // Update interaction
      const updatedInteraction = { ...interaction, name: 'Updated Test Interaction' };
      const updateResponse = await request(app)
        .put(`/api/interactions/${interaction.id}`)
        .send(updatedInteraction)
        .expect(200);

      expect(updateResponse.body).toHaveProperty('success', true);
      expect(updateResponse.body.data).toHaveProperty('name', 'Updated Test Interaction');

      // Delete interaction
      const deleteResponse = await request(app)
        .delete(`/api/interactions/${interaction.id}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('success', true);
    });

    it('should return 404 for non-existent interaction', async () => {
      const response = await request(app)
        .get('/api/interactions/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Route Management', () => {
    it('should return empty list of routes initially', async () => {
      const response = await request(app)
        .get('/api/routes')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should create and manage routes', async () => {
      const route: MessageRoute = {
        id: 'test-route',
        source: 'test-source',
        target: 'test-target',
        event: 'test-event'
      };

      // Create route
      const createResponse = await request(app)
        .post('/api/routes')
        .send(route)
        .expect(200);

      expect(createResponse.body).toHaveProperty('success', true);
      expect(createResponse.body).toHaveProperty('data');
      expect(createResponse.body.data).toHaveProperty('id', route.id);

      // Delete route
      const deleteResponse = await request(app)
        .delete(`/api/routes/${route.id}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('success', true);
    });

    it('should return 404 for non-existent route deletion', async () => {
      const response = await request(app)
        .delete('/api/routes/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Route not found');
    });
  });

  describe('Logging', () => {
    it('should return recent logs', async () => {
      const response = await request(app)
        .get('/api/logs')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return logs with custom count', async () => {
      const response = await request(app)
        .get('/api/logs?count=50')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Settings Management', () => {
    it('should return settings', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.data).toBe('object');
    });

    it('should update settings', async () => {
      const testKey = 'test-setting';
      const testValue = 'test-value';

      const response = await request(app)
        .put(`/api/settings/${testKey}`)
        .send({ value: testValue })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/module-instances')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  describe('Content Type', () => {
    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });
  });
}); 