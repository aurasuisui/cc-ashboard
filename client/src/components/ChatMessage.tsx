// client/src/components/ChatMessage.tsx
import type { ChatMessage } from '../types';
import type { Task } from '../types';

interface Props {
  message: ChatMessage;
}

export default function ChatBubble({ message }: Props) {
  const isPM = message.role === 'pm';
  const attachedTasks: Task[] = (() => {
    if (!message.tasksJson) return [];
    try { return JSON.parse(message.tasksJson); }
    catch { return []; }
  })();

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      justifyContent: isPM ? 'flex-start' : 'flex-end',
      marginBottom: '16px',
    }}>
      {isPM && (
        <div style={{
          width: '32px', height: '32px', background: 'var(--accent-light)',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '14px', flexShrink: 0,
          color: 'var(--accent)',
        }}>&#10042;</div>
      )}
      <div style={{ maxWidth: '70%' }}>
        <div style={{
          fontSize: '10px',
          color: isPM ? 'var(--accent)' : 'var(--text-secondary)',
          marginBottom: '4px',
          textAlign: isPM ? 'left' : 'right',
        }}>
          {isPM ? `需求分析 PM` : '你'}
        </div>
        <div style={{
          background: isPM ? 'var(--bg-card)' : '#eef0ff',
          border: isPM ? '1px solid var(--border)' : '1px solid #dde0f8',
          borderRadius: isPM ? '0 12px 12px 12px' : '12px 0 12px 12px',
          padding: '12px 16px',
          fontSize: '13px',
          color: 'var(--text)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
          {message.content}
        </div>
        {attachedTasks.length > 0 && (
          <div style={{
            background: 'var(--green-light)',
            border: '1px solid #c8e6c9',
            borderRadius: '0 12px 12px 12px',
            padding: '14px',
            marginTop: '8px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--green)', marginBottom: '8px' }}>
              ✓ 生成了 {attachedTasks.length} 个任务卡片
            </div>
            {attachedTasks.map((t, i) => (
              <div key={i} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}>
                <span><strong>{i + 1}.</strong> {t.title}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{t.estimatedHours}h</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
