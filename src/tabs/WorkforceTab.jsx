// WorkforceTab — wired to NB-A (workforce_analytics) — summary, scores, by-cost-center
import { useMemo, useCallback } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

import { KPIRail } from '../components/KPIChip.jsx'
import PanelGrid from '../components/PanelGrid.jsx'
import { useTool } from '../hooks/useTool.js'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, usd, pctFmt } from '../utils/chartConstants.js'

const COLORS = [C.chart1, C.chart2, C.chart3, C.chart4, C.chart5, C.chart6, C.lime, C.gray]

export default function WorkforceTab({ fiscalYear = 25 }) {
  const params = useMemo(() => ({ action: 'summary', fiscal_year: fiscalYear }), [fiscalYear])
  const { data, loading, refetch } = useTool('workforce_analytics', params)

  const handleRefresh = useCallback(() => { refetch() }, [refetch])

  const wfa     = data?.result ?? data ?? {}
  const summary = wfa.summary ?? {}
  const byCenter = wfa.by_cost_center ?? wfa.cost_centers ?? []
  const quality = wfa.model_quality ?? {}

  const headcount    = summary.headcount    ?? byCenter.reduce((s, r) => s + (r.headcount ?? 0), 0)
  const totalCost    = summary.total_cost   ?? byCenter.reduce((s, r) => s + (r.total_cost ?? 0), 0)
  const avgCost      = summary.avg_cost     ?? (headcount ? totalCost / headcount : 0)
  const avgAttrition = summary.avg_attrition_prob ?? null
  const highRisk     = summary.high_risk_count    ?? null
  const avgRamp      = summary.avg_ramp_months    ?? null
  const ccCount      = summary.cost_center_count  ?? byCenter.length

  const headcountModel = quality.FPA_HEADCOUNT_COST_MODEL ?? {}
  const attrModel      = quality.FPA_ATTRITION_MODEL ?? {}
  const rampModel      = quality.FPA_HIRING_RAMP_MODEL ?? {}

  const chips = [
    { label: 'Headcount',     value: fd(headcount),       sub: `${ccCount} cost centers`,            ok: headcount > 0 },
    { label: 'Total Cost',    value: usd(totalCost),      sub: `Annualized fully-loaded`,            ok: totalCost > 0 },
    { label: 'Avg Cost / FTE',value: usd(avgCost),        sub: 'Burden + base'                       },
    avgAttrition != null && { label: 'Avg Attrition Risk', value: pctFmt(avgAttrition * 100), sub: '12-mo predicted',
                              warn: avgAttrition > 0.15, danger: avgAttrition > 0.25 },
    highRisk != null && { label: 'High-Risk FTEs',  value: fd(highRisk),  sub: 'Predicted to leave',
                          danger: highRisk > 0 },
    avgRamp != null && { label: 'Avg Ramp',         value: `${avgRamp?.toFixed(1)} mo`, sub: 'Time-to-productivity' },
    headcountModel.R2 != null && { label: 'Cost Model R²', value: headcountModel.R2.toFixed(3),
                                   ok: headcountModel.R2 > 0.7, warn: headcountModel.R2 < 0.5 },
  ].filter(Boolean)

  const ccData = byCenter
    .slice()
    .sort((a, b) => (b.total_cost ?? 0) - (a.total_cost ?? 0))
    .slice(0, 12)
    .map(r => ({
      name:       r.home_cost_center ?? r.cost_center ?? 'N/A',
      headcount:  r.headcount ?? 0,
      total_cost: r.total_cost ?? 0,
      attrition:  (r.avg_attrition ?? 0) * 100,
    }))

  const donutData = ccData.map(r => ({ name: r.name, value: r.total_cost }))

  if (loading && !data) return <div className="tab-loading">Loading workforce…</div>

  const panels = [
    {
      id: 'wf-cost-bar', title: 'Annual Cost by Cost Center',
      badge: 'fn-workforce-analytics', src: 'F0902 + F060116', span: 2,
      render: () => (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ccData} margin={{ left: 10, right: 10 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...XAXIS} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis {...YAXIS} tickFormatter={v => fd(v)} />
            <Tooltip {...TT} formatter={(v, n) => n === 'total_cost' ? usd(v) : fd(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="total_cost" fill={C.chart1} fillOpacity={0.7} radius={[2, 2, 0, 0]} name="Total Cost" />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      id: 'wf-headcount-bar', title: 'Headcount by Cost Center',
      badge: 'fn-workforce-analytics', span: 1,
      render: () => (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ccData}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...XAXIS} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis {...YAXIS} />
            <Tooltip {...TT} />
            <Bar dataKey="headcount" fill={C.chart2} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      id: 'wf-cost-donut', title: 'Cost Distribution',
      badge: 'fn-workforce-analytics', span: 1,
      render: () => donutData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                 innerRadius={40} outerRadius={70} paddingAngle={2}
                 label={({ name, value }) => `${name}: ${usd(value)}`} style={{ fontSize: 8 }}>
              {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip {...TT} formatter={v => usd(v)} />
          </PieChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>No cost-center data</div>,
    },
    {
      id: 'wf-models', title: 'Model Quality (NB-A)',
      badge: 'fn-workforce-analytics', span: 2,
      render: () => (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr>{['Model', 'R²', 'RMSE', 'MAE', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {[
              ['FPA_HEADCOUNT_COST_MODEL',  headcountModel],
              ['FPA_ATTRITION_MODEL',       attrModel],
              ['FPA_HIRING_RAMP_MODEL',     rampModel],
            ].map(([name, m]) => (
              <tr key={name}>
                <td style={TDL}>{name}</td>
                <td style={TD}>{m.R2 != null ? m.R2.toFixed(3) : '—'}</td>
                <td style={TD}>{m.RMSE != null ? fd(m.RMSE) : '—'}</td>
                <td style={TD}>{m.MAE  != null ? fd(m.MAE)  : '—'}</td>
                <td style={TD}>{m.STATUS === -1 ? 'Unavailable' : 'OK'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
  ]

  return (
    <div>
      <div className="tab-header">
        <span className="tab-header__title">Workforce</span>
        <button className="tab-header__btn" onClick={handleRefresh} disabled={loading}>↻ Refresh</button>
      </div>
      <KPIRail chips={chips} />
      <PanelGrid panels={panels} />
    </div>
  )
}
