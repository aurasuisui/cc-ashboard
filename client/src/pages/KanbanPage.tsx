// client/src/pages/KanbanPage.tsx
import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import KanbanColumn from '../components/KanbanColumn';
import TaskDetail from '../components/TaskDetail';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Task, TaskStatus } from '../types';

const STATUSES: TaskStatus[] = ['todo', 'analyzing', 'in-progress', 'review', 'merged'];

export default function KanbanPage() {
  const { tasks, currentProjectId, projects, setTasks, setCurrentProject, updateTask } = useStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useWebSocket(currentProjectId);

  useEffect(() => {
    (async () => {
      try {
        const ps = await api.getProjects();
        useStore.getState().setProjects(ps);
        if (ps.length > 0 && !currentProjectId) {
          setCurrentProject(ps[0].id);
        } else if (ps.length > 0 && currentProjectId) {
          // Verify persisted project still exists
          const exists = ps.find(p => p.id === currentProjectId);
          if (!exists) setCurrentProject(ps[0].id);
        }
        setError(null);
      } catch (err) {
        setError('无法加载项目列表: ' + (err as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    if (!currentProjectId) return;
    setLoading(true);
    (async () => {
      try {
        const ts = await api.getTasks(currentProjectId);
        setTasks(ts);
        setError(null);
      } catch (err) {
        setError('无法加载任务: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentProjectId]);

  const handleDrop = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    try {
      const updated = await api.updateTask(taskId, { status: newStatus });
      updateTask(updated);
    } catch (err) {
      setError('移动任务失败: ' + (err as Error).message);
    }
  };

  const handleTaskUpdate = (updated: Task) => {
    updateTask(updated);
    setSelectedTask(updated);
  };

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>加载中...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{error}</span>
        <button onClick={() => { setError(null); window.location.reload(); }} style={{ background: 'none', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>重试</button>
      </div>
    );
  }

  if (!currentProjectId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        暂无项目，请先在 <a href="/settings" style={{ color: 'var(--accent)' }}>设置</a> 中创建项目
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      <div style={{
        flex: 1,
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '14px',
        overflow: 'auto',
      }}>
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            onTaskClick={setSelectedTask}
            onTaskDrop={handleDrop}
          />
        ))}
      </div>
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
}
