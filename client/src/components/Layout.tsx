import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500 as const,
    color: isActive ? 'var(--text)' : 'var(--text-secondary)',
    background: isActive ? '#fff' : 'transparent',
    border: isActive ? '1px solid var(--border)' : '1px solid transparent',
    textDecoration: 'none',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{
        background: 'var(--bg-page)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--accent)', fontSize: '20px' }}>&#10042;</span>
          <strong style={{ fontSize: '16px' }}>CC Dashboard</strong>
          <span style={{
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            padding: '2px 10px',
            borderRadius: '20px',
            fontSize: '10px',
            fontWeight: 600,
          }}>MVP</span>
        </div>
        <nav style={{ display: 'flex', gap: '4px' }}>
          <NavLink to="/" end style={linkStyle}>看板</NavLink>
          <NavLink to="/workers" style={linkStyle}>员工</NavLink>
          <NavLink to="/pm" style={linkStyle}>PM 对话</NavLink>
          <NavLink to="/settings" style={linkStyle}>设置</NavLink>
        </nav>
        <div />
      </header>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
