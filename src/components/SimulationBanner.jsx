// SimulationBanner — Persistent amber strip below tab bar when simulations are active
import { useSimulation } from '../context/SimulationContext.jsx'

export default function SimulationBanner() {
  const { isAnyActive, simulations, toggleSimulation, removeSimulation, clearAll, compoundMode, setCompoundMode } = useSimulation()
  if (!isAnyActive) return null
  return (
    <div style={{
      background: 'linear-gradient(90deg, #7c3a00 0%, #92400e 100%)',
      borderBottom: '1px solid rgba(245,158,11,.4)',
      padding: '6px 14px',
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#FDE68A', textTransform: 'uppercase', letterSpacing: '.6px' }}>Simulation Mode</span>
        <span style={{ fontSize: 9, color: 'rgba(253,230,138,.6)' }}>· Charts show real + simulated values</span>
      </div>
      <div style={{ display: 'flex', gap: 5, flex: 1, flexWrap: 'wrap' }}>
        {simulations.map(sim => (
          <div key={sim.id} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '2px 8px 2px 6px', borderRadius: 12,
            background: sim.active ? `${sim.color}30` : 'rgba(0,0,0,.2)',
            border: `1px solid ${sim.active ? sim.color + '80' : 'rgba(255,255,255,.1)'}`,
            opacity: sim.active ? 1 : 0.5,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sim.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: sim.active ? '#FEF3C7' : 'rgba(253,230,138,.5)', whiteSpace: 'nowrap' }}>{sim.label}</span>
            <span style={{ fontSize: 9, color: 'rgba(253,230,138,.5)' }}>n={sim.results?.runs?.toLocaleString()}</span>
            <button onClick={() => toggleSimulation(sim.id)}
              style={{ fontSize: 9, padding: '0 4px', borderRadius: 3, cursor: 'pointer', background: 'rgba(255,255,255,.1)', border: 'none', color: '#FDE68A' }}>
              {sim.active ? '⏸' : '▶'}
            </button>
            <button onClick={() => removeSimulation(sim.id)}
              style={{ fontSize: 11, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none', color: 'rgba(253,230,138,.5)', padding: 0 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <label style={{ fontSize: 9, color: '#FDE68A', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={compoundMode === 'compound'}
            onChange={e => setCompoundMode(e.target.checked ? 'compound' : 'independent')}
            style={{ margin: 0 }} />
          Compound mode
        </label>
        <button onClick={clearAll}
          style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, cursor: 'pointer', background: 'rgba(226,75,74,.3)', border: '1px solid rgba(226,75,74,.5)', color: '#FCA5A5' }}>
          Clear All
        </button>
      </div>
    </div>
  )
}
