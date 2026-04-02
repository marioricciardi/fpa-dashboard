// KPIChip — Simulation-aware KPI chip with sparkline
import { useSimulation } from '../context/SimulationContext.jsx'

const C = {
  brd: 'var(--color-border-tertiary, rgba(0,0,0,0.10))',
  txt: 'var(--color-text-primary, #1a1a2e)',
  txts: 'var(--color-text-secondary, #5f5e6e)',
  txtt: 'var(--color-text-tertiary, #8887a0)',
  red: '#E24B4A', amber: '#EF9F27', teal: '#16a34a', gray: '#8887a0',
}

const SIM_PALETTE = ['#F59E0B', '#8B5CF6', '#10B981', '#EC4899']

const fd = v => v == null ? 'N/A' : Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(2)}`
const fδ = v => v == null ? 'N/A' : (v >= 0 ? '+' : '') + fd(v)

function Sparkline({ data = [], color = '#7C3AED', w = 60, h = 20 }) {
  if (!data || data.length < 2) return null
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * (h - 3) - 1.5}`).join(' ')
  return <svg width={w} height={h}><polyline fill="none" stroke={color} strokeWidth={1.3} points={pts} /></svg>
}

export default function KPIChip({ label, value, sub, danger, warn, ok, sparkData = [], kpiKey }) {
  const sim = useSimulation()
  const impact = kpiKey && sim ? sim.getKPIImpact(kpiKey) : null
  const vc = danger ? C.red : warn ? C.amber : ok ? C.teal : C.txt

  if (impact) {
    const simColor = impact.sims?.[0]?.color || SIM_PALETTE[0]
    const dPct = impact.delta_pct != null ? `${impact.delta_pct >= 0 ? '+' : ''}${impact.delta_pct.toFixed(1)}%` : ''
    const ciLo = fd(impact.p10), ciHi = fd(impact.p90)
    const spread = Math.abs(impact.p90 - impact.p10) || 1
    const p50pos = Math.max(0, Math.min(100, ((impact.p50 - impact.p10) / spread) * 100))
    return (
      <div style={{ padding: '5px 8px', borderRight: `0.5px solid ${C.brd}`, minWidth: 0, background: `${simColor}08`, borderTop: `2px solid ${simColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
          <span style={{ fontSize: 9, color: C.txtt, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</span>
          <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: `${simColor}22`, color: simColor, border: `0.5px solid ${simColor}55` }}>⚡ SIM</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 8, color: C.txtt }}>ACTUAL</div>
            <div style={{ fontSize: 11, fontWeight: 400, color: C.txts, textDecoration: 'line-through' }}>{value}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, color: simColor }}>SIM P50</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: simColor }}>{fd(impact.p50)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, margin: '2px 0' }}>
          <span style={{ color: impact.delta_p50 >= 0 ? C.teal : C.red, fontWeight: 500 }}>{fδ(impact.delta_p50)}</span>
          <span style={{ color: simColor }}>{dPct}</span>
        </div>
        <div style={{ height: 4, background: C.brd, borderRadius: 2, position: 'relative', margin: '2px 0' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: `${simColor}30`, borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: `${p50pos}%`, top: -1, width: 2, height: 6, background: simColor, borderRadius: 1 }} />
        </div>
        <div style={{ fontSize: 8, color: C.txtt }}>{ciLo} – {ciHi}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '7px 10px', borderRight: `0.5px solid ${C.brd}`, minWidth: 0 }}>
      <div style={{ fontSize: 9, color: C.txtt, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: vc, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: danger ? C.red : warn ? C.amber : ok ? C.teal : C.txtt, marginTop: 1 }}>{sub}</div>}
      <div style={{ marginTop: 3 }}><Sparkline data={sparkData} color={vc} /></div>
    </div>
  )
}

export function KPIRail({ chips }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chips.length}, 1fr)`, border: '1px solid var(--color-border-tertiary, rgba(0,0,0,0.08))', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
      {chips.map((c, i) => <KPIChip key={i} {...c} />)}
    </div>
  )
}
