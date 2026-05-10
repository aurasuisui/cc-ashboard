import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { WSEvent } from '../types';

export function useWebSocket(projectId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const updateWorker = useStore((s) => s.updateWorker);
  const addLog = useStore((s) => s.addLog);

  useEffect(() => {
    if (!projectId) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/ws?type=worker&id=all`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg: WSEvent = JSON.parse(event.data);
        switch (msg.type) {
          case 'worker-output':
            addLog(msg.taskId, msg.data);
            break;
          case 'worker-closed':
            if (msg.exitCode === 0) {
              useStore.getState().setTaskStatus(msg.taskId, 'review');
            }
            break;
        }
      } catch { /* ignore */ }
    };

    return () => { ws.close(); };
  }, [projectId]);
}
