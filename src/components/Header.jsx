import { useGlobalLoading } from '../hooks/useTool.js'

const YEAR_OPTIONS = []
for (let y = 15; y <= 26; y++) YEAR_OPTIONS.push(y)
const PERIOD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const selectStyle = {
  fontSize: 10, fontFamily: 'var(--font-mono)',
  padding: '2px 4px', borderRadius: 4,
  border: '0.5px solid rgba(255,255,255,0.25)',
  background: 'rgba(255,255,255,0.10)',
  color: '#fff',
  cursor: 'pointer',
}

const optionStyle = { color: '#1a1a2e', background: '#fff' }

const stepBtnStyle = {
  fontSize: 10, lineHeight: 1, padding: '1px 4px',
  border: '0.5px solid rgba(255,255,255,0.25)',
  borderRadius: 3, background: 'rgba(255,255,255,0.10)',
  color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
}

const spinnerStyle = {
  display: 'inline-block', width: 14, height: 14,
  border: '2px solid rgba(255,255,255,0.25)',
  borderTopColor: '#22c55e',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}

export default function Header({ fiscalYear, period, onFiscalYearChange, onPeriodChange, isAnyActive, activeSimulations }) {
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'
  const globalLoading = useGlobalLoading()
  const fyDown = () => { if (fiscalYear > YEAR_OPTIONS[0]) onFiscalYearChange(fiscalYear - 1) }
  const fyUp   = () => { if (fiscalYear < YEAR_OPTIONS[YEAR_OPTIONS.length - 1]) onFiscalYearChange(fiscalYear + 1) }
  const pDown  = () => { if (period > 1) onPeriodChange(period - 1) }
  const pUp    = () => { if (period < 12) onPeriodChange(period + 1) }
  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'left',
      padding: '11px 20px',
      borderBottom: 'none',
      background: 'var(--color-header-bg, #2D1B69)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        <img src="/ERP_Logo_CMYK.svg" alt="ERP Suites" style={{ height: 50, margin: '-8px -12px -8px -10px' }} />
        <div>
        <h1 style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.2px', color: '#fff', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          FP&amp;A Intelligence Platform
          {isAnyActive && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,.15)', color: '#F59E0B', border: '0.5px solid rgba(245,158,11,.3)', animation: 'pulse 2s infinite' }}>⚡ {activeSimulations?.length} sim{activeSimulations?.length > 1 ? 's' : ''} active</span>}
        </h1>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          Oracle ADW · ADWPRD3 · JDE EnterpriseOne · LAB schema · us-chicago-1
        </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {useMock && (
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)', padding: '2px 7px',
            borderRadius: 6, background: 'rgba(245,158,11,.15)',
            color: '#F59E0B', border: '0.5px solid rgba(245,158,11,.3)',
          }}>
            MOCK DATA
          </span>
        )}
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 6,
          background: 'rgba(34,197,94,.12)', color: '#22c55e',
          border: '0.5px solid rgba(34,197,94,.3)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          Connected
        </span>
        {globalLoading && <span style={spinnerStyle} title="Fetching data…" />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.55)' }}>
          <label>FY</label>
          <select style={selectStyle} value={fiscalYear} onChange={e => onFiscalYearChange(Number(e.target.value))}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y} style={optionStyle}>20{String(y).padStart(2, '0')}</option>)}
          </select>
          <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
            <button style={stepBtnStyle} onClick={fyUp}>▲</button>
            <button style={stepBtnStyle} onClick={fyDown}>▼</button>
          </span>
          <label style={{ marginLeft: 4 }}>P</label>
          <select style={selectStyle} value={period} onChange={e => onPeriodChange(Number(e.target.value))}>
            {PERIOD_OPTIONS.map(p => <option key={p} value={p} style={optionStyle}>{p}</option>)}
          </select>
          <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
            <button style={stepBtnStyle} onClick={pUp}>▲</button>
            <button style={stepBtnStyle} onClick={pDown}>▼</button>
          </span>
        </div>
      </div>
    </header>
  )
}
