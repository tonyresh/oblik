import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { store, ServerState } from './store';

interface ConnectedClient {
  ws: WebSocket;
  id: string;
  userEmail?: string;
  ip?: string;
  connectedAt: Date;
}

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, ConnectedClient>();

export function setupWebSocket(httpServer: HttpServer) {
  wss = new WebSocketServer({
    server: httpServer,
    path: '/ws'
  });

  console.log('[WebSocket] Server initialized on path /ws');

  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const clientIp = req.socket.remoteAddress || 'unknown';

    const clientInfo: ConnectedClient = {
      ws,
      id: clientId,
      ip: clientIp,
      connectedAt: new Date()
    };
    clients.set(ws, clientInfo);

    console.log(`[WebSocket] Client connected: ${clientId} (${clientIp}). Total: ${clients.size}`);

    // Send initial authoritative state immediately
    const initState = store.getState();
    safeSend(ws, {
      type: 'sync:init',
      data: initState,
      serverTime: new Date().toISOString(),
      clientId
    });

    // Broadcast updated presence
    broadcastPresence();

    ws.on('message', (messageRaw: string | Buffer) => {
      try {
        const text = typeof messageRaw === 'string' ? messageRaw : messageRaw.toString('utf8');
        const message = JSON.parse(text);

        switch (message.type) {
          case 'hello':
            if (message.userEmail) {
              clientInfo.userEmail = message.userEmail;
            }
            if (message.clientId) {
              clientInfo.id = message.clientId;
            }
            break;

          case 'update': {
            const { key, data, clientId: senderId } = message;
            if (key) {
              store.updateKey(key as keyof ServerState, data);
              // Broadcast update to all other connected clients
              broadcast({
                type: 'sync:update',
                key,
                data,
                updatedBy: senderId || clientInfo.id,
                timestamp: new Date().toISOString()
              }, ws);
            }
            break;
          }

          case 'patch': {
            const { patch, clientId: senderId } = message;
            if (patch && typeof patch === 'object') {
              store.patch(patch);
              broadcast({
                type: 'sync:patch',
                patch,
                updatedBy: senderId || clientInfo.id,
                timestamp: new Date().toISOString()
              }, ws);
            }
            break;
          }

          case 'seed_if_empty': {
            const { data } = message;
            if (data && typeof data === 'object') {
              const didSeed = store.seedIfEmpty(data);
              if (didSeed) {
                // Broadcast updated full state to all clients
                broadcast({
                  type: 'sync:init',
                  data: store.getState(),
                  serverTime: new Date().toISOString()
                });
              }
            }
            break;
          }

          case 'ping':
            safeSend(ws, { type: 'pong', timestamp: Date.now() });
            break;

          default:
            console.warn('[WebSocket] Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to handle message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected: ${clientId}. Remaining: ${clients.size}`);
      broadcastPresence();
    });

    ws.on('error', (err) => {
      console.warn(`[WebSocket] Client error (${clientId}):`, err.message);
    });
  });

  return wss;
}

export function broadcast(payload: any, excludeWs?: WebSocket) {
  if (!wss) return;
  const json = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      try {
        client.send(json);
      } catch (e) {
        console.error('[WebSocket] Broadcast error:', e);
      }
    }
  }
}

export function broadcastPresence() {
  if (!wss) return;
  broadcast({
    type: 'presence',
    count: clients.size,
    timestamp: new Date().toISOString()
  });
}

function safeSend(ws: WebSocket, payload: any) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch (e) {
      console.error('[WebSocket] Send error:', e);
    }
  }
}

export function getConnectedClientsCount(): number {
  return clients.size;
}
