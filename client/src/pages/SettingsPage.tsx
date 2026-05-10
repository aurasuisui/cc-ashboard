import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { setCurrentProject } = useStore();
  const [form, setForm] = useState({
    name: '',
    sourceType: 'doc' as const,
    sourcePath: '',
    repoPath: '',
    mainBranch: 'main',
    workerCount: 2,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name) {
      setError('请输入项目名称');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const project = await api.createProject(form);
      setCurrentProject(project.id);
      navigate('/');
    } catch (err: any) {
      setError('创建失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
  };

  return (
    <div style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>创建新项目</h2>
      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>关闭</button>
        </div>
      )}
      <div style={{ display: 'grid', gap: '16px' }}>
        <Field label="项目名称">
          <input style={fieldStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如: 用户管理系统" />
        </Field>

        <Field label="需求来源类型">
          <select style={fieldStyle} value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value as any })}>
            <option value="doc">📄 PRD 文档</option>
            <option value="codebase">📁 扫描代码库</option>
          </select>
        </Field>

        <Field label={form.sourceType === 'doc' ? '文档路径' : '代码库路径'}>
          <input style={fieldStyle} value={form.sourcePath} onChange={(e) => setForm({ ...form, sourcePath: e.target.value })} placeholder={form.sourceType === 'doc' ? './docs/prd.md' : './'} />
        </Field>

        <Field label="Git 仓库路径">
          <input style={fieldStyle} value={form.repoPath} onChange={(e) => setForm({ ...form, repoPath: e.target.value })} placeholder="/path/to/your/repo" />
        </Field>

        <Field label="主分支">
          <input style={fieldStyle} value={form.mainBranch} onChange={(e) => setForm({ ...form, mainBranch: e.target.value })} placeholder="main" />
        </Field>

        <Field label="员工数量">
          <input style={fieldStyle} type="number" min={1} max={10} value={form.workerCount} onChange={(e) => setForm({ ...form, workerCount: parseInt(e.target.value) || 1 })} />
        </Field>

        <button onClick={handleCreate} disabled={saving} style={{
          marginTop: '8px',
          padding: '12px 24px',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? '创建中...' : '创建项目 →'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>{label}</div>
      {children}
    </div>
  );
}
