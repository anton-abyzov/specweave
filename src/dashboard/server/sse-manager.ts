import * as http from 'http';
import type { SSEEventType } from '../types.js';

export class SSEManager {
  private connections = new Set<http.ServerResponse>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private heartbeatMs = 30_000) {}

  /** Add a new SSE connection */
  addConnection(res: http.ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connected event
    this.send(res, 'heartbeat', { timestamp: new Date().toISOString(), connected: true });

    this.connections.add(res);
    res.on('close', () => this.connections.delete(res));

    // Start heartbeat if this is the first connection
    if (!this.heartbeatInterval && this.connections.size === 1) {
      this.startHeartbeat();
    }
  }

  /** Broadcast event to all connected clients */
  broadcast(type: SSEEventType, data: unknown): void {
    const message = this.formatMessage(type, data);
    for (const conn of this.connections) {
      if (!conn.destroyed) {
        conn.write(message);
      }
    }
  }

  /** Send event to a single connection */
  private send(res: http.ServerResponse, type: SSEEventType, data: unknown): void {
    if (!res.destroyed) {
      res.write(this.formatMessage(type, data));
    }
  }

  /** Format SSE message */
  private formatMessage(type: SSEEventType, data: unknown): string {
    return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  /** Start heartbeat timer */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connections.size === 0) {
        this.stopHeartbeat();
        return;
      }
      this.broadcast('heartbeat', { timestamp: new Date().toISOString() });
    }, this.heartbeatMs);
  }

  /** Stop heartbeat timer */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /** Get number of active connections */
  get connectionCount(): number {
    return this.connections.size;
  }

  /** Close all connections and stop heartbeat */
  closeAll(): void {
    this.stopHeartbeat();
    for (const conn of this.connections) {
      if (!conn.destroyed) {
        conn.end();
      }
    }
    this.connections.clear();
  }
}
