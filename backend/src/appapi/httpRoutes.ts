import express from 'express';
import { InteractorError, ErrorHandler } from '../core/ErrorHandler';
import { Logger } from '../core/Logger';
import { SystemStats } from '../core/SystemStats';
import { ModuleLoader } from '../core/ModuleLoader';
import { StateManager } from '../core/StateManager';
import { MessageRouter } from '../core/MessageRouter';
import { ModuleListResponse, InteractionListResponse, InteractionConfig } from '@interactor/shared';
import { interactorApp } from '../app/InteractorApp';

export function buildHttpRoutes(): express.Router {
  const router = express.Router();
  const logger = Logger.getInstance();
  const systemStats = SystemStats.getInstance();
  const moduleLoader = ModuleLoader.getInstance();
  const stateManager = StateManager.getInstance();
  const messageRouter = MessageRouter.getInstance();

  router.get('/health', ErrorHandler.asyncHandler(async (req, res) => {
    const health = systemStats.getHealthStatus();
    const uptime = systemStats.getUptimeFormatted();
    res.json({ status: health.status, uptime, timestamp: Date.now(), message: health.message });
  }));

  router.get('/api/stats', (req, res) => {
    res.json({ success: true, data: systemStats.getStats() });
  });

  router.get('/api/modules', (req, res) => {
    const modules = moduleLoader.getAllManifests();
    const response: ModuleListResponse = { modules };
    res.json({ success: true, data: response });
  });

  router.get('/api/interactions', (req, res) => {
    const interactions = stateManager.getInteractions();
    const moduleInstances = stateManager.getModuleInstances();
    const enriched = interactions.map(interaction => ({
      ...interaction,
      modules: interaction.modules?.map(m => {
        const inst = moduleInstances.find(i => i.id === m.id);
        return inst ? { ...m, ...inst } : m;
      }) || [],
    }));
    const response: InteractionListResponse = { interactions: enriched };
    res.json({ success: true, data: response });
  });

  // Remaining endpoints extracted from server
  router.get('/api/modules/instances', ErrorHandler.asyncHandler(async (req, res) => {
    const moduleInstances = stateManager.getModuleInstances();
    res.json({ success: true, data: { instances: moduleInstances, count: moduleInstances.length } });
  }));

  router.get('/api/modules/instances/:id', ErrorHandler.asyncHandler(async (req, res) => {
    const moduleInstance = stateManager.getModuleInstance(req.params.id!);
    if (!moduleInstance) throw InteractorError.notFound('Module instance', req.params.id);
    res.json({ success: true, data: moduleInstance });
  }));

  router.put('/api/modules/instances/:id', ErrorHandler.asyncHandler(async (req, res) => {
    if (!req.body.config) {
      throw InteractorError.validation('Configuration data is required', { field: 'config', provided: req.body }, ['Include config object in request body']);
    }
    const moduleInstances = stateManager.getModuleInstances();
    const moduleInstance = moduleInstances.find(m => m.id === req.params.id);
    if (!moduleInstance) throw InteractorError.notFound('Module instance', req.params.id);
    const newConfig = { ...moduleInstance.config, ...req.body.config };
    moduleInstance.config = newConfig;
    moduleInstance.lastUpdate = Date.now();
    const live = (interactorApp.getLiveInstanceMap()).get(req.params.id!);
    if (live) await live.updateConfig(newConfig);
    await stateManager.replaceState({ modules: moduleInstances });
    await interactorApp.syncInteractionsWithModules();
    interactorApp.emitStateUpdate();
    res.json({ success: true, message: 'Module configuration updated successfully', data: moduleInstance });
  }));

  router.post('/api/modules/instances', ErrorHandler.asyncHandler(async (req, res) => {
    const { moduleName, config } = req.body || {};
    if (!moduleName) throw InteractorError.validation('Module name is required', { provided: req.body });
    const manifest = moduleLoader.getManifest(moduleName);
    if (!manifest) throw InteractorError.notFound('Module', moduleName);
    const instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const live = await interactorApp.createModuleInstance({ id: instanceId, moduleName, config: config || {} });
    const instance = { id: instanceId, moduleName, config: live.getConfig ? live.getConfig() : (config || {}), status: 'stopped' as const, messageCount: 0, currentFrame: undefined, frameCount: 0, lastUpdate: Date.now() };
    await stateManager.addModuleInstance(instance);
    interactorApp.emitStateUpdate();
    res.json({ success: true, data: instance, message: 'Module instance created successfully' });
  }));

  router.post('/api/trigger/:moduleId', ErrorHandler.asyncHandler(async (req, res) => {
    const moduleId = req.params.moduleId as string;
    let moduleInstance = (interactorApp.getLiveInstanceMap()).get(moduleId);
    if (!moduleInstance) {
      const stored = stateManager.getModuleInstance(moduleId);
      if (stored) moduleInstance = await interactorApp.createModuleInstance(stored);
    }
    if (!moduleInstance) throw InteractorError.notFound('Module instance', moduleId);
    const payload = req.body?.payload || {};
    if (moduleInstance.name === 'Time Input') {
      if (payload.type === 'manualTrigger' && typeof moduleInstance.manualTrigger === 'function') {
        await moduleInstance.manualTrigger();
        interactorApp.emit('trigger_event', { moduleId, type: 'manual' });
        return res.json({ success: true, message: 'Time trigger activated' });
      }
      if (payload.type === 'stopStream' && typeof moduleInstance.stopStream === 'function') {
        await moduleInstance.stopStream();
        return res.json({ success: true, message: 'Time stream stopped' });
      }
    }
    if (typeof moduleInstance.onManualTrigger === 'function') {
      await moduleInstance.onManualTrigger();
      interactorApp.emit('trigger_event', { moduleId, type: 'manual' });
      return res.json({ success: true });
    }
    throw InteractorError.validation('Module does not support manual triggering');
  }));

  router.post('/api/modules/instances/:id/start', ErrorHandler.asyncHandler(async (req, res) => {
    const moduleInstances = stateManager.getModuleInstances();
    const moduleInstance = moduleInstances.find(m => m.id === req.params.id);
    if (!moduleInstance) throw InteractorError.notFound('Module instance', req.params.id);
    let live = interactorApp.getLiveInstanceMap().get(req.params.id!);
    if (!live) live = await interactorApp.createModuleInstance(moduleInstance);
    await live.start();
    moduleInstance.status = 'running';
    moduleInstance.lastUpdate = Date.now();
    await stateManager.replaceState({ modules: moduleInstances });
    interactorApp.emitStateUpdate();
    res.json({ success: true, message: 'Module started successfully', data: moduleInstance });
  }));

  router.post('/api/modules/instances/:id/stop', ErrorHandler.asyncHandler(async (req, res) => {
    const moduleInstances = stateManager.getModuleInstances();
    const moduleInstance = moduleInstances.find(m => m.id === req.params.id);
    if (!moduleInstance) throw InteractorError.notFound('Module instance', req.params.id);
    const live = interactorApp.getLiveInstanceMap().get(req.params.id!);
    if (live) await live.stop();
    moduleInstance.status = 'stopped';
    moduleInstance.lastUpdate = Date.now();
    await stateManager.replaceState({ modules: moduleInstances });
    interactorApp.emitStateUpdate();
    res.json({ success: true, message: 'Module stopped successfully', data: moduleInstance });
  }));

  router.get('/api/settings', (req, res) => {
    const settings = stateManager.getSettings();
    res.json({ success: true, data: settings });
  });

  router.put('/api/settings/:key', ErrorHandler.asyncHandler(async (req, res) => {
    await stateManager.setSetting(req.params.key as string, req.body.value);
    res.json({ success: true });
  }));

  router.post('/api/interactions/register', ErrorHandler.asyncHandler(async (req, res) => {
    const interactions: InteractionConfig[] = req.body.interactions || [];
    const originClientId: string | undefined = (req.get('X-Client-Id') as string) || req.body.clientId;
    const { moduleInstances } = await interactorApp.registerInteractions(interactions, originClientId);
    res.json({ success: true, message: 'Interaction map registered successfully', count: interactions.length, moduleInstances: moduleInstances.length });
  }));

  return router;
}


