export default function Header() {
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'
  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '11px 20px',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      background: 'var(--color-bg-primary)',
    }}>
      <div>
        <h1 style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.2px' }}>
          FP&amp;A Intelligence Platform
        </h1>
        <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          Oracle ADW · ADWPRD3 · JDE EnterpriseOne · LAB schema · us-chicago-1
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {useMock && (
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 7px',
            borderRadius: 6, background: 'var(--color-bg-warning)',
            color: 'var(--color-text-warning)', border: '0.5px solid var(--color-border-warning)',
          }}>
            MOCK DATA
          </span>
        )}
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 6,
          background: 'var(--color-bg-success)', color: 'var(--color-text-success)',
          border: '0.5px solid var(--color-border-success)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
          fpa-broker · 7 tools active
        </span>
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          FY2025 · P6
        </span>
      </div>
    </header>
  )
}
