// client/src/components/WorkerTerminal.tsx
import { useEffect, useRef, useState } from 'react';

interface Props {
  logs: string[];
}

export default function WorkerTerminal({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{
      background: '#1e1e2e',
      borderRadius: 'var(--radius)',
      border: '1px solid #333',
      overflow: 'hidden',
      fontFamily: "'Cascadia Code', 'Fira Code', monospace",
      fontSize: '12px',
      lineHeight: 1.7,
    }}>
      <div style={{
        background: '#2a2a3a',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
      }}>
        <span style={{ color: '#aaa', fontSize: '11px' }}>Terminal</span>
        <span style={{ color: 'var(--green)', fontSize: '11px' }}>● Connected</span>
      </div>
      <div style={{
        padding: '12px 16px',
        maxHeight: '400px',
        overflowY: 'auto',
        color: '#ccc',
      }}>
        {logs.length === 0 && <div style={{ color: '#666' }}>等待输出...</div>}
        {logs.map((line, i) => (
          <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
