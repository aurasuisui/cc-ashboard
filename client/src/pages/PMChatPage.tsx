// client/src/pages/PMChatPage.tsx
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import ChatBubble from '../components/ChatMessage';
import type { ChatMessage } from '../types';

export default function PMChatPage() {
  const { currentProjectId } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      projectId: '',
      role: 'pm',
      pmType: 'analyzer',
      content: '你好！我是需求分析 PM。请告诉我你想要开发的项目，或者提供 PRD 文档路径和代码库路径，我会帮你分析需求并拆解任务。',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      projectId: currentProjectId || '',
      role: 'user',
      pmType: 'analyzer',
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Simulate PM response (MVP: the PM is a CC process that will be connected later)
    setTimeout(() => {
      const pmReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        projectId: currentProjectId || '',
        role: 'pm',
        pmType: 'analyzer',
        content: `收到。我正在分析你的需求...后续版本会接入 Claude Code PM 进行实时对话和任务拆解。目前你可以通过看板手动管理任务卡片。`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, pmReply]);
    }, 1000);
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
        <button onClick={handleSend} style={{
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
