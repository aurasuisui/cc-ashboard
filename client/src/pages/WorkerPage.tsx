// client/src/pages/WorkerPage.tsx
import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import WorkerTerminal from '../components/WorkerTerminal';

export default function WorkerPage() {
  const { workers, currentProjectId, tasks, setWorkers } = useStore();
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Activate WebSocket to receive worker output into store logLines
  useWebSocket(currentProjectId);

  useEffect(() => {
    if (!currentProjectId) return;
    setLoading(true);
    (async () => {
      try {
        const ws = await api.getWorkers(currentProjectId);
        setWorkers(ws);
        setError(null);
      } catch (err) {
        setError('无法加载员工列表: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentProjectId]);

  const workerTask = (workerId: string) => tasks.find((t) => t.assignedTo === workerId);

  // Get logs for selected worker from store (populated via WebSocket)
  const selectedLogs = (() => {
    if (!selectedWorker) return [];
    const worker = workers.find((w) => w.id === selectedWorker);
    if (!worker?.currentTaskId) return [];
    const task = tasks.find((t) => t.id === worker.currentTaskId);
    return task?.logLines || [];
  })();

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>加载中...</div>;

  if (error) {
    return (
      <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, margin: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{error}</span>
        <button onClick={() => { setError(null); window.location.reload(); }} style={{ background: 'none', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>重试</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', gap: '24px', height: '100%' }}>
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>员工列表</h3>
        {workers.map((w) => {
          const task = workerTask(w.id);
          return (
            <div
              key={w.id}
              onClick={() => setSelectedWorker(w.id)}
              style={{
                background: selectedWorker === w.id ? 'var(--accent-light)' : 'var(--bg-card)',
                border: selectedWorker === w.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>👷 {w.name}</div>
              <div style={{ fontSize: '11px', color: w.status === 'busy' ? 'var(--blue)' : 'var(--text-secondary)' }}>
                {w.status === 'busy' ? `执行中: ${task?.title || '-'}` : '空闲'}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1 }}>
        {selectedWorker ? (
          <>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              {workers.find((w) => w.id === selectedWorker)?.name} · 实时输出
            </h3>
            <WorkerTerminal logs={selectedLogs} />
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            选择左侧员工查看实时工作台
          </div>
        )}
      </div>
    </div>
  );
}
