import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Task } from '../types';

interface Props {
  task: Task;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

export default function TaskDetail({ task, onClose, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(task);

  useEffect(() => {
    setForm(task);
  }, [task]);

  const statusLabels: Record<string, string> = {
    'todo': '待分析', 'analyzing': 'PM分析中', 'in-progress': '执行中', 'review': '待验收', 'merged': '已合并',
  };

  const handleSave = async () => {
    const updated = await api.updateTask(task.id, form);
    onUpdate(updated);
    setEditing(false);
  };

  const handleStart = async () => {
    const updated = await api.startTask(task.id);
    onUpdate(updated);
  };

  const handleMerge = async () => {
    try {
      const updated = await api.mergeTask(task.id);
      onUpdate(updated);
    } catch (err: any) {
      alert('合并失败: ' + err.message);
    }
  };

  return (
    <div style={{
      width: '380px',
      background: 'var(--bg-card)',
      borderLeft: '1px solid var(--border)',
      padding: '20px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{task.title}</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-secondary)',
        }}>×</button>
      </div>

      <div>
        <span style={{
          background: 'var(--bg-page)',
          padding: '3px 10px',
          borderRadius: 'var(--radius-pill)',
          fontSize: '11px',
          color: 'var(--accent)',
          fontWeight: 600,
        }}>{statusLabels[task.status]}</span>
      </div>

      <Section label="描述">
        {editing ? (
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={textareaStyle} rows={4} />
        ) : (
          <Text>{task.description || '暂无'}</Text>
        )}
      </Section>

      <Section label="验收标准">
        {editing ? (
          <textarea value={form.acceptanceCriteria} onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })}
            style={textareaStyle} rows={3} />
        ) : (
          <Text>{task.acceptanceCriteria || '暂无'}</Text>
        )}
      </Section>

      {task.analysisNotes && (
        <Section label="PM分析笔记">
          <Text>{task.analysisNotes}</Text>
        </Section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
        <Meta label="优先级" value={task.priority === 'high' ? '高' : task.priority === 'normal' ? '中' : '低'} />
        <Meta label="估时" value={`${task.estimatedHours}h`} />
        <Meta label="负责人" value={task.assignedTo?.slice(0, 8) || '未分配'} />
        <Meta label="分支" value={task.branchName?.slice(0, 16) || '-'} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {editing ? (
          <>
            <Button primary onClick={handleSave}>保存</Button>
            <Button onClick={() => setEditing(false)}>取消</Button>
          </>
        ) : (
          <>
            <Button onClick={() => { setForm(task); setEditing(true); }}>编辑</Button>
            {task.status === 'in-progress' && !task.worktreePath && (
              <Button primary onClick={handleStart}>启动执行</Button>
            )}
            {task.status === 'review' && (
              <Button primary onClick={handleMerge}>合并到主分支</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      {children}
    </div>
  );
}

function Text({ children }: { children: string }) {
  return (
    <div style={{
      background: 'var(--bg-page)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
      fontSize: '12px',
      color: 'var(--text)',
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap',
    }}>{children}</div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{label}</div>
      <div style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function Button({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      flex: 1,
      padding: '8px 14px',
      borderRadius: 'var(--radius-pill)',
      border: primary ? 'none' : '1px solid var(--border)',
      background: primary ? 'var(--accent)' : 'var(--bg-page)',
      color: primary ? '#fff' : 'var(--text)',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
    }}>{children}</button>
  );
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-page)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  fontSize: '12px',
  color: 'var(--text)',
  lineHeight: 1.6,
  resize: 'vertical',
  outline: 'none',
};
