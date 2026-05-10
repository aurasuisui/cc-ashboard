// client/src/pages/WorkerPage.tsx
import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import WorkerTerminal from '../components/WorkerTerminal';

export default function WorkerPage() {
  const { workers, currentProjectId, tasks, setWorkers, updateTask } = useStore();
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [workerLogs, setWorkerLogs] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProjectId) return;
    api.getWorkers(currentProjectId).then((ws) => {
      setWorkers(ws);
      setLoading(false);
    });
  }, [currentProjectId]);

  const workerTask = (workerId: string) => tasks.find((t) => t.assignedTo === workerId);

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>加载中...</div>;

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
            <WorkerTerminal logs={workerLogs[selectedWorker] || []} />
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
