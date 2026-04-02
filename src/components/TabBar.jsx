export default function TabBar({ tabs, active, onChange, isAnyActive, activeSimulations }) {
  return (
    <nav style={{
      display: 'flex', padding: '0 20px', gap: 2,
      borderBottom: 'none',
      background: 'var(--color-nav-bg, #231456)',
      overflowX: 'auto',
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          fontSize: 12, padding: '9px 15px', border: 'none', background: 'none',
          color: active === tab.id ? '#ffffff' : 'rgba(255,255,255,0.6)',
          borderBottom: active === tab.id ? '2px solid var(--color-accent, #7C3AED)' : '2px solid transparent',
          fontWeight: active === tab.id ? 500 : 400,
          fontFamily: 'var(--font-sans)', cursor: 'pointer',
          whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {tab.label}
          {tab.isSim && isAnyActive && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'rgba(245,158,11,.20)', color: '#F59E0B', border: '0.5px solid rgba(245,158,11,.4)', animation: 'pulse 2s infinite' }}>⚡ {activeSimulations?.length}</span>}
          {tab.isNew && !tab.isSim && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'rgba(124,58,237,.20)', color: '#a78bfa', border: '0.5px solid rgba(124,58,237,.4)' }}>NEW</span>}
        </button>
      ))}
    </nav>
  )
}
