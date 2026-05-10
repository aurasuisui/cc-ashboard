// client/src/components/KanbanColumn.tsx
import type { Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: '📋 待分析', color: 'var(--text-secondary)' },
  { status: 'analyzing', label: '💬 PM分析中', color: 'var(--accent)' },
  { status: 'in-progress', label: '🚧 执行中', color: 'var(--blue)' },
  { status: 'review', label: '🔍 待验收', color: '#d97706' },
  { status: 'merged', label: '✅ 已合并', color: 'var(--green)' },
];

interface Props {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskDrop: (taskId: string, newStatus: TaskStatus) => void;
}

export default function KanbanColumn({ status, tasks, onTaskClick, onTaskDrop }: Props) {
  const col = COLUMNS.find((c) => c.status === status)!;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '300px',
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) onTaskDrop(taskId, status);
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{ fontWeight: 600, fontSize: '11px', color: col.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {col.label}
        </div>
        <span style={{
          background: 'var(--bg-page)',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '10px',
          color: 'var(--text-secondary)',
        }}>{tasks.length}</span>
      </div>
      <div style={{ flex: 1 }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
}
