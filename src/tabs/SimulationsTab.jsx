// SimulationsTab — V4 new tab: Monte Carlo simulation launcher & results viewer
import { useState } from 'react'
import {
  BarChart, Bar, ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

import PanelGrid from '../components/PanelGrid.jsx'
import { AlertRow } from '../components/ChartPrimitives.jsx'
import { useSimulation, SIM_TEMPLATES } from '../context/SimulationContext.jsx'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, usd, pctFmt } from '../utils/chartConstants.js'

function SimCard({ tpl, onActivate }) {
  return (
    <div style={{
      background: C.surf, borderRadius: 8, padding: '12px 14px', border: `0.5px solid ${C.brd}`,
      display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', transition: 'border-color 0.15s',
    }} onClick={() => onActivate(tpl)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{tpl.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.txt }}>{tpl.label}</span>
      </div>
      <div style={{ fontSize: 10, color: C.txtt, lineHeight: 1.4 }}>{tpl.description}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
        {tpl.affectedKPIs.slice(0, 5).map(k => (
          <span key={k} style={{ fontSize: 8, background: C.brd, color: C.txtt, borderRadius: 3, padding: '1px 5px' }}>{k}</span>
        ))}
        {tpl.affectedKPIs.length > 5 && <span style={{ fontSize: 8, color: C.txtt }}>+{tpl.affectedKPIs.length - 5} more</span>}
      </div>
      <button style={{
        marginTop: 4, fontSize: 10, padding: '4px 12px', borderRadius: 4, border: `1px solid ${C.blue}`,
        background: 'transparent', color: C.blue, cursor: 'pointer', alignSelf: 'flex-start',
      }}>
        ▶ Run Simulation
      </button>
    </div>
  )
}

function ActiveSimRow({ sim, onToggle, onRemove }) {
  const kpiKeys = Object.keys(sim.results?.kpiImpacts ?? {})
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
      background: sim.active ? `${sim.color}12` : 'transparent',
      borderLeft: `3px solid ${sim.active ? sim.color : C.brd}`,
      borderRadius: '0 4px 4px 0', marginBottom: 4,
    }}>
      <input type="checkbox" checked={sim.active} onChange={() => onToggle(sim.id)} style={{ accentColor: sim.color }} />
      <span style={{ fontSize: 10, fontWeight: 500, flex: 1 }}>{sim.label || sim.templateId}</span>
      <span style={{ fontSize: 9, color: C.txtt }}>{kpiKeys.length} KPIs</span>
      <button onClick={() => onRemove(sim.id)} style={{
        fontSize: 9, padding: '2px 6px', borderRadius: 3, border: `0.5px solid ${C.brd}`,
        background: 'transparent', color: C.red, cursor: 'pointer',
      }}>✕</button>
    </div>
  )
}

export default function SimulationsTab({ onNavigateToChat }) {
  const { simulations, activeSimulations, addSimulation, removeSimulation, toggleSimulation, clearAll, compoundMode, setCompoundMode } = useSimulation()
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  function handleActivate(tpl) {
    addSimulation({ templateId: tpl.id, label: tpl.label, affectedKPIs: tpl.affectedKPIs, parameters: { ...tpl.parameters } })
  }

  // Build impact distribution chart from latest simulation
  const latestSim = simulations[simulations.length - 1]
  const impactData = latestSim ? Object.entries(latestSim.results?.kpiImpacts ?? {}).map(([key, val]) => ({
    name: key.replace(/_/g, ' '),
    delta: val.delta_p50 ?? 0,
    p10: val.p10 ?? 0,
    p90: val.p90 ?? 0,
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 10) : []

  // Distribution of MC results for first KPI
  const firstKPI = latestSim && Object.keys(latestSim.results?.kpiImpacts ?? {})[0]
  const mcSamples = firstKPI ? (latestSim.results?.kpiImpacts?.[firstKPI]?.samples ?? []) : []
  const histBins = 20
  const histData = (() => {
    if (mcSamples.length < 10) return []
    const min = Math.min(...mcSamples), max = Math.max(...mcSamples)
    const w = (max - min) / histBins || 1
    const counts = new Array(histBins).fill(0)
    mcSamples.forEach(v => counts[Math.min(Math.floor((v - min) / w), histBins - 1)]++)
    return counts.map((c, i) => ({ bin: fd(min + i * w), count: c }))
  })()

  const alerts = []
  if (simulations.length === 0) alerts.push({ level: 'INFO', text: 'No simulations active. Click a template card to run a Monte Carlo simulation.', src: 'sim-engine' })
  if (activeSimulations.length > 3) alerts.push({ level: 'WARNING', text: `${activeSimulations.length} active simulations — consider clearing to simplify analysis.`, src: 'sim-engine' })
  if (compoundMode === 'compound' && activeSimulations.length > 1) alerts.push({ level: 'INFO', text: `Compound mode: impacts from ${activeSimulations.length} simulations are stacked.`, src: 'sim-engine' })

  const panels = [
    {
      id: 'sim-templates', title: `Simulation Templates — ${SIM_TEMPLATES.length} Available`, span: 2,
      render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {SIM_TEMPLATES.map(tpl => <SimCard key={tpl.id} tpl={tpl} onActivate={handleActivate} />)}
        </div>
      ),
    },
    {
      id: 'sim-active', title: `Active Simulations — ${simulations.length}`, span: 1,
      render: () => (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select value={compoundMode} onChange={e => setCompoundMode(e.target.value)} style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 4, border: `0.5px solid ${C.brd}`, background: C.surf,
            }}>
              <option value="independent">Independent</option>
              <option value="compound">Compound</option>
            </select>
            {simulations.length > 0 && (
              <button onClick={clearAll} style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 4, border: `0.5px solid ${C.red}`,
                background: 'transparent', color: C.red, cursor: 'pointer', marginLeft: 'auto',
              }}>Clear All</button>
            )}
          </div>
          {simulations.length === 0 ? (
            <div style={{ fontSize: 11, color: C.txtt, padding: 12, textAlign: 'center' }}>No simulations yet</div>
          ) : (
            simulations.map(sim => <ActiveSimRow key={sim.id} sim={sim} onToggle={toggleSimulation} onRemove={removeSimulation} />)
          )}
        </div>
      ),
    },
    {
      id: 'sim-impact', title: latestSim ? `KPI Impact — ${latestSim.label}` : 'KPI Impact', span: 1,
      render: () => impactData.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(100, impactData.length * 22)}>
          <BarChart data={impactData} layout="vertical" margin={{ left: 80, right: 10 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical />
            <XAxis type="number" {...XAXIS} tickFormatter={v => fd(v)} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fill: C.txtt }} axisLine={false} tickLine={false} width={80} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <ReferenceLine x={0} stroke={C.gray} strokeDasharray="3 2" />
            <Bar dataKey="delta" name="Δ P50" radius={[0, 3, 3, 0]} fillOpacity={0.65}>
              {impactData.map((d, i) => <Bar key={i} fill={d.delta >= 0 ? C.teal : C.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20, textAlign: 'center' }}>Run a simulation to see impact</div>,
    },
    ...(histData.length > 0 ? [{
      id: 'sim-dist', title: `MC Distribution — ${firstKPI?.replace(/_/g, ' ')} (${mcSamples.length} samples)`, span: 2,
      render: () => (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={histData}>
            <CartesianGrid {...GRID} /><XAxis dataKey="bin" {...XAXIS} /><YAxis {...YAXIS} />
            <Tooltip {...TT} />
            <Bar dataKey="count" fill={latestSim?.color ?? C.purple} fillOpacity={0.5} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    }] : []),
    {
      id: 'sim-alerts', title: `Simulation Alerts — ${alerts.length}`, span: 2,
      render: () => (
        <div>
          {alerts.map((a, i) => <AlertRow key={i} {...a} />)}
          {onNavigateToChat && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <button onClick={onNavigateToChat} style={{
                fontSize: 10, padding: '5px 14px', borderRadius: 4, border: `1px solid ${C.blue}`,
                background: 'transparent', color: C.blue, cursor: 'pointer',
              }}>Ask Agent about simulations →</button>
            </div>
          )}
        </div>
      ),
    },
  ]

  return <div><PanelGrid panels={panels} /></div>
}
