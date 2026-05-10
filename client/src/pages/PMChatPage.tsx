// client/src/pages/PMChatPage.tsx
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import ChatBubble from '../components/ChatMessage';
import type { ChatMessage } from '../types';

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  projectId: '',
  role: 'pm',
  pmType: 'analyzer',
  content: '你好！我是需求分析 PM。请告诉我你想要开发的项目，或者提供 PRD 文档路径和代码库路径，我会帮你分析需求并拆解任务。',
  tasksJson: null,
  createdAt: new Date().toISOString(),
};

export default function PMChatPage() {
  const { currentProjectId } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages from API on mount / project change
  useEffect(() => {
    if (!currentProjectId) return;

    setLoading(true);
    setError(null);
    api.getMessages(currentProjectId)
      .then((msgs) => {
        if (msgs.length > 0) {
          setMessages(msgs);
        } else {
          setMessages([WELCOME_MSG]);
        }
      })
      .catch((err) => {
        console.error('Failed to load messages:', err);
        setError(err.message || '加载消息失败');
      })
      .finally(() => setLoading(false));
  }, [currentProjectId]);

  const handleSend = () => {
    if (!input.trim() || !currentProjectId) return;

    const payload = {
      projectId: currentProjectId,
      role: 'user',
      pmType: 'analyzer',
      content: input,
      tasksJson: null,
    };

    const tempUserMsg: ChatMessage = {
      id: Date.now().toString(),
      projectId: currentProjectId,
      role: 'user',
      pmType: 'analyzer',
      content: input,
      tasksJson: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInput('');

    api.sendMessage(payload)
      .then((msg) => {
        setMessages((prev) => [...prev, msg]);
      })
      .catch((err) => {
        console.error('Failed to send message:', err);
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          projectId: currentProjectId,
          role: 'pm',
          pmType: 'analyzer',
          content: `发送失败：${err.message || '未知错误'}`,
          tasksJson: null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ color: 'var(--accent)', fontSize: '16px' }}>&#10042;</span>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>需求分析 PM</span>
        <span style={{
          background: 'var(--accent-light)', color: 'var(--accent)',
          padding: '2px 10px', borderRadius: 'var(--radius-pill)',
          fontSize: '10px', fontWeight: 600,
        }}>活跃</span>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        background: 'var(--bg-page)',
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
            加载中...
          </div>
        )}
        {error && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--danger)', fontSize: '13px' }}>
            {error}
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        padding: '12px 20px',
        display: 'flex',
        gap: '10px',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入你的需求描述..."
          disabled={!currentProjectId}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border)',
            background: 'var(--bg-page)',
            fontSize: '13px',
            color: 'var(--text)',
            outline: 'none',
          }}
        />
        <button onClick={handleSend} disabled={!currentProjectId} style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          padding: '10px 20px',
          fontWeight: 600,
          fontSize: '13px',
        }}>发送</button>
      </div>
    </div>
  );
}
