export default function TabBar({ tabs, active, onChange }) {
  return (
    <nav style={{
      display: 'flex', padding: '0 20px',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      background: 'var(--color-bg-secondary)',
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          fontSize: 12, padding: '9px 15px', border: 'none', background: 'none',
          color: active === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          borderBottom: active === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
          fontWeight: active === tab.id ? 500 : 400,
          fontFamily: 'var(--font-sans)', cursor: 'pointer',
        }}>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
