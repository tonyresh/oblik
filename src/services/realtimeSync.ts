export type SyncStatus = 'connected' | 'connecting' | 'disconnected';

export interface SyncMessage {
  type: string;
  [key: string]: any;
}

type InitHandler = (state: any) => void;
type UpdateHandler = (key: string, data: any, updatedBy: string) => void;
type PatchHandler = (patch: Record<string, any>, updatedBy: string) => void;
type EventHandler = (eventType: string, eventData: any, updatedBy: string) => void;
type StatusHandler = (status: SyncStatus) => void;
type PresenceHandler = (count: number) => void;

class RealtimeSyncService {
  private ws: WebSocket | null = null;
  private status: SyncStatus = 'disconnected';
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private reconnectAttempts = 0;
  private clientId: string;
  private currentUserEmail: string = '';

  private initHandlers = new Set<InitHandler>();
  private updateHandlers = new Set<UpdateHandler>();
  private patchHandlers = new Set<PatchHandler>();
  private eventHandlers = new Set<EventHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private presenceHandlers = new Set<PresenceHandler>();

  private onlineCount = 1;
  private isConnecting = false;

  constructor() {
    // Generate or retrieve persistent session client ID
    let id = sessionStorage.getItem('skud_client_id');
    if (!id) {
      id = 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('skud_client_id', id);
    }
    this.clientId = id;
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getOnlineCount(): number {
    return this.onlineCount;
  }

  public setUserEmail(email: string) {
    this.currentUserEmail = email;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'hello',
        clientId: this.clientId,
        userEmail: email
      }));
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');
    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('[RealtimeSync] Connecting to:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[RealtimeSync] Connected');
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;

        // Send handshake
        this.send({
          type: 'hello',
          clientId: this.clientId,
          userEmail: this.currentUserEmail
        });

        // Request initial authoritative server state
        this.requestAuthoritativeState();

        // Start ping heartbeat
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          this.send({ type: 'ping' });
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (e) {
          console.error('[RealtimeSync] Message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[RealtimeSync] Disconnected, scheduling reconnect');
        this.cleanupConnection();
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[RealtimeSync] Socket notice:', err);
      };
    } catch (e) {
      console.error('[RealtimeSync] Connection error:', e);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private handleIncomingMessage(msg: SyncMessage) {
    switch (msg.type) {
      case 'sync:init':
        if (msg.data) {
          this.initHandlers.forEach(h => {
            try { h(msg.data); } catch (e) { console.error('Init handler error:', e); }
          });
        }
        break;

      case 'sync:update':
        if (msg.key && msg.data !== undefined) {
          this.updateHandlers.forEach(h => {
            try { h(msg.key, msg.data, msg.updatedBy); } catch (e) { console.error('Update handler error:', e); }
          });
        }
        break;

      case 'sync:patch':
        if (msg.patch) {
          this.patchHandlers.forEach(h => {
            try { h(msg.patch, msg.updatedBy); } catch (e) { console.error('Patch handler error:', e); }
          });
        }
        break;

      case 'sync:event':
        if (msg.eventType) {
          this.eventHandlers.forEach(h => {
            try { h(msg.eventType, msg.eventData, msg.updatedBy); } catch (e) { console.error('Event handler error:', e); }
          });
        }
        break;

      case 'presence':
        if (typeof msg.count === 'number') {
          this.onlineCount = Math.max(1, msg.count);
          this.presenceHandlers.forEach(h => {
            try { h(this.onlineCount); } catch (e) {}
          });
        }
        break;

      case 'pong':
        break;

      default:
        break;
    }
  }

  public requestAuthoritativeState() {
    this.send({
      type: 'request_state',
      clientId: this.clientId
    });
  }

  public sendUpdate(key: string, data: any) {
    const payload = {
      type: 'update',
      key,
      data,
      clientId: this.clientId
    };

    const sentOverWs = this.send(payload);

    if (!sentOverWs) {
      fetch('/api/state/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, clientId: this.clientId })
      }).catch(err => console.warn('[RealtimeSync] REST update fallback failed:', err));
    }
  }

  public sendEvent(eventType: string, eventData: any) {
    const payload = {
      type: 'event',
      eventType,
      eventData,
      clientId: this.clientId
    };

    const sentOverWs = this.send(payload);

    if (!sentOverWs) {
      fetch('/api/events/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, eventData, clientId: this.clientId })
      }).catch(err => console.warn('[RealtimeSync] REST event broadcast fallback failed:', err));
    }
  }

  public sendPatch(patch: Record<string, any>) {
    const payload = {
      type: 'patch',
      patch,
      clientId: this.clientId
    };

    const sentOverWs = this.send(payload);

    if (!sentOverWs) {
      fetch('/api/state/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch, clientId: this.clientId })
      }).catch(err => console.warn('[RealtimeSync] REST patch fallback failed:', err));
    }
  }

  public seedIfEmpty(data: Record<string, any>) {
    const payload = {
      type: 'seed_if_empty',
      data,
      clientId: this.clientId
    };

    const sent = this.send(payload);
    if (!sent) {
      fetch('/api/state/seed-if-empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, clientId: this.clientId })
      }).catch(err => console.warn('[RealtimeSync] REST seed fallback failed:', err));
    }
  }

  public async fetchStateViaHttp(): Promise<any | null> {
    try {
      const res = await fetch(`/api/state?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.onlineClients) {
            this.onlineCount = Math.max(1, json.onlineClients);
            this.presenceHandlers.forEach(h => h(this.onlineCount));
          }
          return json.data;
        }
      }
    } catch (e) {
      console.warn('[RealtimeSync] fetchStateViaHttp error:', e);
    }
    return null;
  }

  private send(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('[RealtimeSync] Send error:', e);
      }
    }
    return false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 5000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private cleanupConnection() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.ws = null;
  }

  private setStatus(s: SyncStatus) {
    if (this.status !== s) {
      this.status = s;
      this.statusHandlers.forEach(h => h(s));
    }
  }

  // Event subscription methods
  public onInit(handler: InitHandler): () => void {
    this.initHandlers.add(handler);
    return () => this.initHandlers.delete(handler);
  }

  public onUpdate(handler: UpdateHandler): () => void {
    this.updateHandlers.add(handler);
    return () => this.updateHandlers.delete(handler);
  }

  public onPatch(handler: PatchHandler): () => void {
    this.patchHandlers.add(handler);
    return () => this.patchHandlers.delete(handler);
  }

  public onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  public onPresenceChange(handler: PresenceHandler): () => void {
    this.presenceHandlers.add(handler);
    return () => this.presenceHandlers.delete(handler);
  }
}

export const realtimeSync = new RealtimeSyncService();
