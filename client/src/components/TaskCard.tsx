// client/src/components/TaskCard.tsx
import type { Task } from '../types';

const priorityColors: Record<string, string> = {
  high: '#d97757',
  normal: 'var(--text-secondary)',
  low: 'var(--text-secondary)',
};

interface Props {
  task: Task;
  onClick: (task: Task) => void;
}

export default function TaskCard({ task, onClick }: Props) {
  const worker = task.assignedTo ? `👷 ${task.assignedTo.slice(0, 8)}` : '';
  return (
    <div
      onClick={() => onClick(task)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 14px',
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: 'var(--text)' }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: priorityColors[task.priority], fontWeight: 600 }}>
            P: {task.priority === 'high' ? '高' : task.priority === 'normal' ? '中' : '低'}
          </span>
          {worker && (
            <span style={{ fontSize: '10px', color: 'var(--blue)' }}>{worker}</span>
          )}
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          {task.estimatedHours}h
        </span>
      </div>
    </div>
  );
}
