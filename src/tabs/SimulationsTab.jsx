// SimulationsTab — FP&A scenario builder with Monte Carlo analysis
// Flow: Select scenario → Configure parameters → Run → Analyze results
import { useState, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

import PanelGrid from '../components/PanelGrid.jsx'
import { AlertRow } from '../components/ChartPrimitives.jsx'
import { useSimulation, SIM_TEMPLATES } from '../context/SimulationContext.jsx'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, fδ, usd, pctFmt } from '../utils/chartConstants.js'

// ── Styles ──
const pill = (active, c = C.blue) => ({
  fontSize: 9, padding: '3px 10px', borderRadius: 12,
  border: `1px solid ${active ? c : C.brd}`,
  background: active ? `${c}18` : 'transparent',
  color: active ? c : C.txts, cursor: 'pointer', fontWeight: active ? 600 : 400,
  transition: 'all .15s',
})

const btnPrimary = (disabled) => ({
  fontSize: 11, fontWeight: 600, padding: '8px 28px', borderRadius: 6,
  border: 'none', cursor: disabled ? 'default' : 'pointer',
  background: disabled ? C.brd : C.blue, color: disabled ? C.txtt : '#fff',
  opacity: disabled ? 0.6 : 1, transition: 'all .15s',
})

const btnOutline = (c = C.blue) => ({
  fontSize: 10, padding: '5px 14px', borderRadius: 5,
  border: `1px solid ${c}`, background: 'transparent',
  color: c, cursor: 'pointer',
})

// ── Parameter Slider ──
function ParamSlider({ param, value, onChange }) {
  const pct = ((value - param.min) / (param.max - param.min)) * 100
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 500, color: C.txt }}>{param.label}</label>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, minWidth: 60, textAlign: 'right' }}>
          {param.unit === '$K' || param.unit === '$K/yr' ? `$${value}K` : `${value}${param.unit}`}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <input type="range" min={param.min} max={param.max} step={param.step} value={value}
          onChange={e => onChange(param.key, Number(e.target.value))}
          style={{ width: '100%', accentColor: C.blue, height: 6, cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 8, color: C.txtt }}>{param.min}{param.unit}</span>
          <span style={{ fontSize: 8, color: C.txtt }}>{param.max}{param.unit}</span>
        </div>
      </div>
    </div>
  )
}

// ── Scenario Card ──
function ScenarioCard({ tpl, selected, onSelect }) {
  const isActive = selected?.id === tpl.id
  return (
    <div onClick={() => onSelect(tpl)} style={{
      background: isActive ? `${C.blue}08` : C.surf,
      borderRadius: 8, padding: '14px 16px',
      border: `1.5px solid ${isActive ? C.blue : C.brd}`,
      cursor: 'pointer', transition: 'all .15s',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{tpl.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.txt }}>{tpl.label}</span>
      </div>
      <div style={{ fontSize: 10, color: C.txts, lineHeight: 1.45 }}>{tpl.description}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
        {tpl.affectedKPIs.map(k => (
          <span key={k} style={{ fontSize: 8, background: C.brd, color: C.txtt, borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase' }}>{k}</span>
        ))}
      </div>
    </div>
  )
}

// ── Results: Summary Stats Table ──
function SummaryStatsTable({ kpiImpacts }) {
  const rows = Object.entries(kpiImpacts).map(([k, v]) => ({ key: k, ...v }))
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={{ ...TH, textAlign: 'left' }}>KPI</th>
          <th style={TH}>Baseline</th><th style={TH}>P10</th><th style={TH}>P25</th>
          <th style={{ ...TH, fontWeight: 700 }}>P50 (Median)</th>
          <th style={TH}>P75</th><th style={TH}>P90</th>
          <th style={TH}>Δ Median</th><th style={TH}>Δ %</th>
        </tr></thead>
        <tbody>{rows.map(r => {
          const pos = (r.delta_p50 ?? 0) >= 0
          return (
            <tr key={r.key}>
              <td style={{ ...TDL, fontWeight: 600, textTransform: 'uppercase' }}>{r.key}</td>
              <td style={TD}>{fd(r.actualBaseline)}</td>
              <td style={TD}>{fd(r.p10)}</td><td style={TD}>{fd(r.p25)}</td>
              <td style={{ ...TD, fontWeight: 700 }}>{fd(r.p50)}</td>
              <td style={TD}>{fd(r.p75)}</td><td style={TD}>{fd(r.p90)}</td>
              <td style={{ ...TD, color: pos ? C.teal : C.red, fontWeight: 600 }}>{fδ(r.delta_p50)}</td>
              <td style={{ ...TD, color: pos ? C.teal : C.red }}>{r.delta_pct != null ? `${r.delta_pct >= 0 ? '+' : ''}${r.delta_pct.toFixed(1)}%` : '—'}</td>
            </tr>
          )
        })}</tbody>
      </table>
    </div>
  )
}

// ── Results: Tornado / Sensitivity Chart ──
function TornadoChart({ sensitivityData, color }) {
  if (!sensitivityData?.length) return <div style={{ fontSize: 11, color: C.txtt, padding: 20, textAlign: 'center' }}>Insufficient data for sensitivity analysis</div>
  return (
    <ResponsiveContainer width="100%" height={Math.max(100, sensitivityData.length * 32)}>
      <BarChart data={sensitivityData} layout="vertical" margin={{ left: 90, right: 20 }}>
        <CartesianGrid {...GRID} horizontal={false} vertical />
        <XAxis type="number" {...XAXIS} tickFormatter={v => fd(v)} />
        <YAxis dataKey="param" type="category" tick={{ fontSize: 9, fill: C.txts }} axisLine={false} tickLine={false} width={90} />
        <Tooltip {...TT} formatter={v => fd(v)} />
        <ReferenceLine x={0} stroke={C.gray} strokeDasharray="3 2" />
        <Bar dataKey="low" name="−20% Input" fill={C.red} fillOpacity={0.5} radius={[3, 0, 0, 3]} stackId="t" />
        <Bar dataKey="high" name="+20% Input" fill={C.teal} fillOpacity={0.5} radius={[0, 3, 3, 0]} stackId="t" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Results: Distribution Histogram ──
function DistributionPanel({ histogramData, kpiKey, color }) {
  const bins = histogramData?.[kpiKey]
  if (!bins?.length) return <div style={{ fontSize: 11, color: C.txtt, padding: 20, textAlign: 'center' }}>No distribution data</div>
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={bins}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="bin" {...XAXIS} tickFormatter={v => fd(v)} />
        <YAxis {...YAXIS} label={{ value: 'Frequency', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: C.txtt } }} />
        <Tooltip {...TT} formatter={(v, n, p) => [v, 'Iterations']} labelFormatter={v => `Value: ${fd(v)}`} />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} fillOpacity={0.6}>
          {bins.map((_, i) => <Cell key={i} fill={color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Results: Period Fan Chart (uncertainty cone) ──
function FanChart({ periodSeries, kpiKey, color }) {
  const data = periodSeries?.[kpiKey]
  if (!data?.length) return <div style={{ fontSize: 11, color: C.txtt, padding: 20, textAlign: 'center' }}>No period data</div>
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ left: 10, right: 10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="period" {...XAXIS} />
        <YAxis {...YAXIS} tickFormatter={v => fd(v)} />
        <Tooltip {...TT} formatter={v => v != null ? fd(v) : 'N/A'} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Area dataKey="sim_p90" stroke="none" fill={color} fillOpacity={0.08} name="P90" />
        <Area dataKey="sim_p75" stroke="none" fill={color} fillOpacity={0.10} name="P75" />
        <Area dataKey="sim_p25" stroke="none" fill={color} fillOpacity={0.10} name="P25" />
        <Area dataKey="sim_p10" stroke="none" fill={color} fillOpacity={0.08} name="P10" />
        <Line dataKey="sim_p50" stroke={color} strokeWidth={2.5} dot={false} name="Median" />
        <Line dataKey="actual" stroke={C.txt} strokeWidth={1.5} strokeDasharray="4 3"
          dot={{ r: 3, fill: C.txt }} name="Actual" connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Active Simulations Sidebar Row ──
function ActiveSimRow({ sim, isSelected, onSelect, onToggle, onRemove }) {
  const kpiKeys = Object.keys(sim.results?.kpiImpacts ?? {})
  const dominant = kpiKeys[0]
  const delta = sim.results?.kpiImpacts?.[dominant]?.delta_p50
  return (
    <div onClick={() => onSelect(sim)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
      background: isSelected ? `${sim.color}12` : 'transparent',
      borderLeft: `3px solid ${sim.active ? sim.color : C.brd}`,
      borderRadius: '0 6px 6px 0', marginBottom: 4, cursor: 'pointer',
      transition: 'all .15s',
    }}>
      <input type="checkbox" checked={sim.active} onChange={e => { e.stopPropagation(); onToggle(sim.id) }}
        style={{ accentColor: sim.color, cursor: 'pointer' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sim.label}</div>
        <div style={{ fontSize: 9, color: C.txtt }}>
          {kpiKeys.length} KPIs · {dominant && delta != null
            ? <span style={{ color: delta >= 0 ? C.teal : C.red }}>{fδ(delta)} {dominant}</span>
            : 'pending'}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onRemove(sim.id) }} style={{
        fontSize: 9, padding: '2px 6px', borderRadius: 3, border: `0.5px solid ${C.brd}`,
        background: 'transparent', color: C.red, cursor: 'pointer', flexShrink: 0,
      }}>✕</button>
    </div>
  )
}

// ════════════════════════════════════════════════════
// Main Tab
// ════════════════════════════════════════════════════
export default function SimulationsTab({ onNavigateToChat }) {
  const { simulations, addSimulation, removeSimulation, toggleSimulation, clearAll, compoundMode, setCompoundMode } = useSimulation()

  // --- State ---
  const [selectedTpl, setSelectedTpl] = useState(null)                // template being configured
  const [paramValues, setParamValues] = useState({})                  // user-edited parameter values
  const [viewingSim, setViewingSim] = useState(null)                  // simulation whose results are displayed
  const [distKPI, setDistKPI] = useState(null)                        // which KPI distribution to show

  // When we pick a template, seed params from its defaults
  const handleSelectTemplate = useCallback((tpl) => {
    setSelectedTpl(tpl)
    const defaults = {}
    tpl.parameters.forEach(p => { defaults[p.key] = p.default })
    setParamValues(defaults)
  }, [])

  const handleParamChange = useCallback((key, val) => {
    setParamValues(prev => ({ ...prev, [key]: val }))
  }, [])

  const handleRun = useCallback(() => {
    if (!selectedTpl) return
    const sim = addSimulation({
      templateId: selectedTpl.id,
      label: selectedTpl.label,
      affectedKPIs: selectedTpl.affectedKPIs,
      parameters: { ...paramValues },
    })
    setViewingSim(sim)
    const firstKPI = Object.keys(sim.results?.kpiImpacts ?? {})[0]
    if (firstKPI) setDistKPI(firstKPI)
  }, [selectedTpl, paramValues, addSimulation])

  const handleResetParams = useCallback(() => {
    if (!selectedTpl) return
    const defaults = {}
    selectedTpl.parameters.forEach(p => { defaults[p.key] = p.default })
    setParamValues(defaults)
  }, [selectedTpl])

  // Tap an existing simulation to review its results
  const handleViewSim = useCallback((sim) => {
    setViewingSim(sim)
    const firstKPI = Object.keys(sim.results?.kpiImpacts ?? {})[0]
    if (firstKPI) setDistKPI(firstKPI)
    // Also load its template + params into the config pane
    const tpl = SIM_TEMPLATES.find(t => t.id === sim.templateId)
    if (tpl) {
      setSelectedTpl(tpl)
      setParamValues(sim.parameters ?? {})
    }
  }, [])

  // Derived
  const res = viewingSim?.results
  const kpiKeys = res ? Object.keys(res.kpiImpacts) : []
  const simColor = viewingSim?.color ?? C.blue

  // Live preview: run computeImpact with current params (no full MC) for instant feedback
  const livePreview = useMemo(() => {
    if (!selectedTpl) return null
    try { return selectedTpl.computeImpact(paramValues) } catch { return null }
  }, [selectedTpl, paramValues])

  // ── Panels ──
  const panels = []

  // 1. Scenario selector
  panels.push({
    id: 'sim-scenarios', title: `Scenario Library — ${SIM_TEMPLATES.length} Templates`, span: 2,
    render: () => (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
        {SIM_TEMPLATES.map(tpl => (
          <ScenarioCard key={tpl.id} tpl={tpl} selected={selectedTpl} onSelect={handleSelectTemplate} />
        ))}
      </div>
    ),
  })

  // 2. Configuration + Live Preview (only when a template is selected)
  if (selectedTpl) {
    panels.push({
      id: 'sim-config', title: `Configure: ${selectedTpl.icon} ${selectedTpl.label}`, span: 1,
      render: () => (
        <div>
          <div style={{ fontSize: 10, color: C.txts, marginBottom: 14, lineHeight: 1.4 }}>
            {selectedTpl.description}
          </div>
          {selectedTpl.parameters.map(p => (
            <ParamSlider key={p.key} param={p} value={paramValues[p.key] ?? p.default} onChange={handleParamChange} />
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
            <button onClick={handleRun} style={btnPrimary(false)}>▶ Run Monte Carlo</button>
            <button onClick={handleResetParams} style={btnOutline(C.txts)}>Reset Defaults</button>
          </div>
          <div style={{ fontSize: 8, color: C.txtt, marginTop: 8 }}>2,000 iterations · client-side engine</div>
        </div>
      ),
    })

    // Live preview panel: shows instant directional impacts before full MC
    panels.push({
      id: 'sim-preview', title: 'Live Impact Preview', span: 1,
      render: () => {
        if (!livePreview) return <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Adjust parameters to see preview</div>
        const rows = Object.entries(livePreview)
        return (
          <div>
            <div style={{ fontSize: 9, color: C.txtt, marginBottom: 10 }}>
              Deterministic estimate (mean). Run Monte Carlo for full distribution.
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={{ ...TH, textAlign: 'left' }}>KPI</th>
                <th style={TH}>Expected Δ</th>
                <th style={TH}>Uncertainty</th>
                <th style={TH}>Direction</th>
              </tr></thead>
              <tbody>{rows.map(([k, v]) => {
                const pos = v.mean >= 0
                return (
                  <tr key={k}>
                    <td style={{ ...TDL, fontWeight: 600, textTransform: 'uppercase' }}>{k}</td>
                    <td style={{ ...TD, color: pos ? C.teal : C.red, fontWeight: 600 }}>{fδ(v.mean)}</td>
                    <td style={TD}>±{(v.uncertaintyPct * 100).toFixed(0)}%</td>
                    <td style={{ ...TD, fontSize: 14 }}>{pos ? '↑' : '↓'}</td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )
      },
    })
  }

  // 3. Active Simulations list
  panels.push({
    id: 'sim-active', title: `Run History — ${simulations.length} Simulation${simulations.length !== 1 ? 's' : ''}`, span: selectedTpl ? 2 : 1,
    render: () => (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <select value={compoundMode} onChange={e => setCompoundMode(e.target.value)} style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 4, border: `0.5px solid ${C.brd}`,
            background: C.surf, color: C.txt,
          }}>
            <option value="independent">Independent</option>
            <option value="compound">Compound</option>
          </select>
          <span style={{ fontSize: 9, color: C.txtt, flex: 1 }}>
            {compoundMode === 'compound' ? 'Impacts stack across active scenarios' : 'Each scenario analyzed independently'}
          </span>
          {simulations.length > 0 && (
            <button onClick={clearAll} style={btnOutline(C.red)}>Clear All</button>
          )}
        </div>
        {simulations.length === 0 ? (
          <div style={{ fontSize: 11, color: C.txtt, padding: 20, textAlign: 'center' }}>
            Select a scenario above and run a simulation to begin analysis.
          </div>
        ) : (
          simulations.map(sim => (
            <ActiveSimRow key={sim.id} sim={sim} isSelected={viewingSim?.id === sim.id}
              onSelect={handleViewSim} onToggle={toggleSimulation} onRemove={removeSimulation} />
          ))
        )}
      </div>
    ),
  })

  // ── Results panels (only when a sim has been run and selected for viewing) ──
  if (res) {
    // 4. Summary statistics table
    panels.push({
      id: 'sim-summary', title: `Results: ${viewingSim.label} — Percentile Summary`, span: 2,
      badge: `${res.runs.toLocaleString()} iterations`,
      render: () => <SummaryStatsTable kpiImpacts={res.kpiImpacts} />,
    })

    // 5. Distribution histogram with KPI selector
    panels.push({
      id: 'sim-dist', title: 'Monte Carlo Distribution', span: 1,
      render: () => (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {kpiKeys.map(k => (
              <span key={k} onClick={() => setDistKPI(k)} style={pill(distKPI === k, simColor)}>
                {k.toUpperCase()}
              </span>
            ))}
          </div>
          <DistributionPanel histogramData={res.histogramData} kpiKey={distKPI || kpiKeys[0]} color={simColor} />
          {distKPI && res.kpiImpacts[distKPI] && (
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, padding: '8px 0', borderTop: `0.5px solid ${C.brd}` }}>
              {['p10','p25','p50','p75','p90'].map(pKey => (
                <div key={pKey} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: C.txtt, textTransform: 'uppercase' }}>{pKey}</div>
                  <div style={{ fontSize: 11, fontWeight: pKey === 'p50' ? 700 : 400, color: C.txt }}>{fd(res.kpiImpacts[distKPI][pKey])}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    })

    // 6. Tornado / sensitivity chart
    panels.push({
      id: 'sim-tornado', title: 'Sensitivity Analysis (±20% Inputs → EBITDA Δ)', span: 1,
      render: () => <TornadoChart sensitivityData={res.sensitivityData} color={simColor} />,
    })

    // 7. Period fan chart (uncertainty cone)
    panels.push({
      id: 'sim-fan', title: `Forecast Cone — ${(distKPI || kpiKeys[0] || '').toUpperCase()} (P10–P90)`, span: 2,
      render: () => (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {kpiKeys.map(k => (
              <span key={k} onClick={() => setDistKPI(k)} style={pill(distKPI === k, simColor)}>
                {k.toUpperCase()}
              </span>
            ))}
          </div>
          <FanChart periodSeries={res.periodSeries} kpiKey={distKPI || kpiKeys[0]} color={simColor} />
        </div>
      ),
    })
  }

  // Alerts
  const alerts = []
  if (simulations.length === 0 && !selectedTpl) alerts.push({ level: 'INFO', text: 'Select a scenario template to configure and run a Monte Carlo simulation.', src: 'sim-engine' })
  if (simulations.filter(s => s.active).length > 3) alerts.push({ level: 'WARNING', text: `${simulations.filter(s => s.active).length} active simulations — consider clearing older runs for clarity.`, src: 'sim-engine' })
  if (compoundMode === 'compound' && simulations.filter(s => s.active).length > 1) alerts.push({ level: 'INFO', text: `Compound mode: KPI impacts from ${simulations.filter(s => s.active).length} active scenarios are stacked on dashboard KPIs.`, src: 'sim-engine' })

  if (alerts.length > 0) {
    panels.push({
      id: 'sim-alerts', title: `Alerts — ${alerts.length}`, span: 2,
      render: () => (
        <div>
          {alerts.map((a, i) => <AlertRow key={i} {...a} />)}
          {onNavigateToChat && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <button onClick={onNavigateToChat} style={btnOutline(C.blue)}>Ask Agent about simulations →</button>
            </div>
          )}
        </div>
      ),
    })
  }

  return (
    <div>
      <div className="tab-header">
        <span className="tab-header__title">Scenario Simulation</span>
      </div>
      <PanelGrid panels={panels} />
    </div>
  )
}
