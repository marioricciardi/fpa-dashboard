const YEAR_OPTIONS = []
for (let y = 15; y <= 26; y++) YEAR_OPTIONS.push(y)
const PERIOD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const selectStyle = {
  fontSize: 10, fontFamily: 'var(--font-mono)',
  padding: '2px 4px', borderRadius: 4,
  border: '0.5px solid var(--color-border-tertiary)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
}

export default function Header({ fiscalYear, period, onFiscalYearChange, onPeriodChange }) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)' }}>
          <label>FY</label>
          <select style={selectStyle} value={fiscalYear} onChange={e => onFiscalYearChange(Number(e.target.value))}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>20{String(y).padStart(2, '0')}</option>)}
          </select>
          <label style={{ marginLeft: 4 }}>P</label>
          <select style={selectStyle} value={period} onChange={e => onPeriodChange(Number(e.target.value))}>
            {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
    </header>
  )
}
