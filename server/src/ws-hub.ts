import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { ProcessManager } from './process-manager.js';

interface WSClient {
  ws: WebSocket;
  type: 'worker' | 'pm';
  id: string;   // workerId or pmId
}

export class WSHub {
  private wss: WebSocketServer;
  private clients: Set<WSClient> = new Set();
  private pm: ProcessManager;

  constructor(server: Server, pm: ProcessManager) {
    this.pm = pm;
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', 'http://localhost');
      const clientType = url.searchParams.get('type') as 'worker' | 'pm';
      const clientId = url.searchParams.get('id') || '';

      const client: WSClient = { ws, type: clientType, id: clientId };
      this.clients.add(client);

      ws.on('close', () => this.clients.delete(client));
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          this.handleMessage(client, msg);
        } catch { /* ignore malformed messages */ }
      });
    });

    this.pm.on('output', ({ taskId, workerId, data, stream }) => {
      this.broadcast('worker-output', { taskId, workerId, data, stream });
    });

    this.pm.on('closed', ({ taskId, workerId, exitCode }) => {
      this.broadcast('worker-closed', { taskId, workerId, exitCode });
    });
  }

  private handleMessage(client: WSClient, msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'pm-chat':
        this.broadcast('pm-chat', { ...msg, from: client.id });
        break;
      case 'stdin':
        this.pm.sendStdin(msg.taskId as string, msg.text as string);
        break;
    }
  }

  broadcast(type: string, payload: Record<string, unknown>): void {
    const data = JSON.stringify({ type, ...payload });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  broadcastToWorker(workerId: string, type: string, payload: Record<string, unknown>): void {
    const data = JSON.stringify({ type, ...payload });
    for (const client of this.clients) {
      if (client.type === 'worker' && client.id === workerId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  close(): void {
    for (const client of this.clients) {
      client.ws.terminate();
    }
    this.wss.close();
  }
}
