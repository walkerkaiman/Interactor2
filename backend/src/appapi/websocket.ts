import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { interactorApp } from '../app/InteractorApp';
import { Logger } from '../core/Logger';

export function setupWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server });
  const logger = Logger.getInstance();

  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(7);
    logger.info('WebSocket client connected', 'WebSocket', { clientId });

    // Send initial state
    try {
      const { interactions, moduleInstances } = interactorApp.getStateSnapshot();
      logger.debug('WS initial state snapshot', 'WebSocket', {
        clientId,
        interactionsCount: Array.isArray(interactions) ? interactions.length : 0,
        moduleInstancesCount: Array.isArray(moduleInstances) ? moduleInstances.length : 0
      });
      ws.send(JSON.stringify({ type: 'state_update', data: { interactions, moduleInstances, timestamp: Date.now() } }));
    } catch (err) {
      try { ws.send(JSON.stringify({ type: 'error', data: { message: 'Failed to load initial state', code: 'INITIAL_STATE_ERROR', retryable: true } })); } catch {}
    }

    ws.on('close', (code, reason) => {
      logger.info('WebSocket client disconnected', 'WebSocket', { clientId, code, reason: reason.toString() });
    });
    ws.on('error', (error) => {
      logger.error('WebSocket error', 'WebSocket', { clientId, error: String(error) });
    });
  });

  // Bridge app events → WebSocket broadcast
  const broadcast = (data: any) => {
    const msg = JSON.stringify(data);
    logger.debug(`Broadcasting WebSocket message: ${msg}`);
    wss.clients.forEach(client => { if (client.readyState === 1) client.send(msg); });
  };

  interactorApp.on('state_update', (data) => broadcast({ type: 'state_update', data }));
  interactorApp.on('module_runtime_update', ({ moduleId, runtimeData, newChanges }) => broadcast({ type: 'module_runtime_update', data: { moduleId, runtimeData, newChanges } }));
  interactorApp.on('trigger_event', ({ moduleId, type }) => broadcast({ type: 'trigger_event', data: { moduleId, type } }));

  return wss;
}


