import { EventEmitter } from 'events';
import WebSocket from 'ws';

export interface WsClientOptions {
  baseDelay?: number;
  maxAttempts?: number;
}

export class WsClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer?: NodeJS.Timeout;
  private attempts = 0;

  constructor(private url: string, private opts: WsClientOptions = {}) {
    super();
  }

  connect() {
    this.clearTimer();
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.attempts = 0;
      this.emit('open');
    };
    this.ws.onmessage = evt => {
      this.emit('message', evt.data);
    };
    this.ws.onclose = evt => {
      this.emit('close', evt);
      this.scheduleReconnect();
    };
    this.ws.onerror = err => {
      this.emit('error', err);
    };
  }

  shutdown() {
    this.clearTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    const { baseDelay = 5000, maxAttempts = 5 } = this.opts;
    if (maxAttempts !== 0 && this.attempts >= maxAttempts) {
      this.emit('reconnectFailed');
      return;
    }
    const delay = baseDelay * Math.pow(2, this.attempts);
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}


