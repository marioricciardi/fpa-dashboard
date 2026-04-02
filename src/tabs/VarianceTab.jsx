// VarianceTab — V4 visual layout with recharts, PanelGrid, KPIChip
import { useMemo, useCallback } from 'react'
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ZAxis,
} from 'recharts'

import { KPIRail } from '../components/KPIChip.jsx'
import PanelGrid from '../components/PanelGrid.jsx'
import { AlertRow } from '../components/ChartPrimitives.jsx'
import { useTool } from '../hooks/useTool.js'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, usd, pctFmt } from '../utils/chartConstants.js'

/* ── deduplicate drivers by unique key ────────────────────── */

function dedupeDrivers(drivers) {
  const seen = new Set(), out = []
  for (const d of (drivers || [])) {
    const key = `${d.account}|${d.subsidiary}|${d.business_unit}|${d.budget}|${d.actual}`
    if (!seen.has(key)) { seen.add(key); out.push(d) }
  }
  return out
}

export default function VarianceTab({ fiscalYear = 25, period = 6 }) {
  const bvaParams = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: period, top_n_drivers: 8 }), [fiscalYear, period])
  const pcParams  = useMemo(() => ({ comparison_type: 'YoY', fiscal_year: fiscalYear, period }), [fiscalYear, period])
  const { data: bvaData, loading: bvaLoading, refetch: rBva } = useTool('variance_get_budget_vs_actual', bvaParams)
  const { data: pcData,  loading: pcLoading, refetch: rPc }  = useTool('variance_get_period_comparison', pcParams)
  const handleRefresh = useCallback(() => { rBva(); rPc() }, [rBva, rPc])

  const bvaOk = !!bvaData
  const pcOk  = !!pcData
  const summary = bvaOk ? (bvaData.result?.summary ?? bvaData.summary ?? {}) : {}
  const drivers = bvaOk ? (bvaData.result?.drivers ?? bvaData.drivers ?? []) : []
  const metaObj = bvaOk ? (bvaData.result?.metadata ?? bvaData.metadata ?? {}) : {}
  const p = pcOk ? pcData.result : null
  const loading = bvaLoading || pcLoading

  const fyLabel = `FY20${String(fiscalYear).padStart(2, '0')}`

  const unique = dedupeDrivers(drivers)
  const sorted = [...unique].sort((a, b) => (b.abs_variance ?? 0) - (a.abs_variance ?? 0))
  const unfav = unique.filter(d => d.direction === 'unfavorable').length
  const fav = unique.filter(d => d.direction === 'favorable' || d.direction === 'on-target').length

  // Scatter data — budget on X, actual on Y
  const scatterData = unique.map(d => ({
    x: d.budget ?? 0, y: d.actual ?? 0, z: d.abs_variance ?? 0,
    name: d.account_desc, dir: d.direction,
  }))

  // Alerts
  const alerts = []
  if ((summary?.total_budget ?? 0) === 0 && (summary?.total_actual ?? 0) !== 0)
    alerts.push({ level: 'WARNING', text: `No budget amounts loaded. All actual spend of ${usd(summary.total_actual)} shows as variance.`, src: 'fn-variance-budget-vs-actual · F0902 · ledger type BA' })
  for (const d of unique.filter(d => d.direction === 'unfavorable').slice(0, 3)) {
    const pctStr = d.variance_pct != null && isFinite(d.variance_pct) ? ` (${d.variance_pct >= 0 ? '+' : ''}${d.variance_pct.toFixed(1)}%)` : ''
    alerts.push({ level: d.abs_variance > 500 ? 'CRITICAL' : 'WARNING', text: `${d.account_desc} — Acct ${d.account}.${d.subsidiary}, BU "${d.bu_name}": actual ${usd(d.actual)} vs budget ${usd(d.budget)}${pctStr}`, src: `fn-variance-budget-vs-actual · obj ${d.account}` })
  }

  // KPI chips
  const varSign = (summary.total_variance ?? 0) >= 0 ? '+' : ''
  const chips = [
    { label: 'Total Budget', value: usd(summary.total_budget), sub: `YTD ${fyLabel} P1–P${period}` },
    { label: 'Total Actual', value: usd(summary.total_actual), sub: summary.variance_pct != null ? `${pctFmt(summary.variance_pct)} vs budget` : 'No budget baseline', danger: (summary.total_actual ?? 0) > (summary.total_budget ?? 0), ok: (summary.total_actual ?? 0) <= (summary.total_budget ?? 0) },
    { label: 'Net Variance', value: `${varSign}${usd(summary.total_variance)}`, sub: `${unfav} unfavorable · ${fav} favorable`, danger: (summary.total_variance ?? 0) > 0 },
    { label: 'Largest Driver', value: unique.length > 0 ? usd(unique[0].abs_variance) : '$0', sub: unique.length > 0 ? `${unique[0].account_desc} (${unique[0].bu_name})` : 'None', danger: unique.length > 0 && unique[0].direction === 'unfavorable' },
    { label: 'Driver Count', value: String(unique.length), sub: `of ${drivers?.length ?? 0} rows returned` },
    { label: 'Revenue YoY', value: pctFmt(p?.deltas?.revenue?.pct ?? p?.delta_pct), sub: usd(p?.deltas?.revenue?.amount ?? p?.delta ?? 0), ok: (p?.deltas?.revenue?.pct ?? 0) > 0 },
    { label: 'OpEx YoY', value: pctFmt(p?.deltas?.opex?.pct), sub: usd(p?.deltas?.opex?.amount ?? 0), danger: (p?.deltas?.opex?.pct ?? 0) > 0 },
    { label: 'Net Inc YoY', value: pctFmt(p?.deltas?.net_income?.pct), sub: usd(p?.deltas?.net_income?.amount ?? 0), ok: (p?.deltas?.net_income?.pct ?? 0) > 0 },
    { label: 'GM Δ', value: `${p?.deltas?.gross_margin_pct?.amount != null ? (p.deltas.gross_margin_pct.amount >= 0 ? '+' : '') + p.deltas.gross_margin_pct.amount : 0}pp`, sub: 'YoY percentage points' },
    { label: 'Unfavorable', value: String(unfav), sub: `accounts over budget`, danger: unfav > 0 },
  ]

  if (loading && !bvaOk && !pcOk) return <div className="tab-loading">Loading variance data…</div>

  const panels = [
    {
      id: 'var-tornado', title: `Variance Tornado — by Account · YTD ${fyLabel}`,
      badge: 'fn-variance-budget-vs-actual', src: 'F0902 BA vs AA', span: 2,
      render: () => sorted.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(120, sorted.length * 22)}>
          <BarChart data={sorted} layout="vertical" margin={{ left: 100, right: 10 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical /><XAxis type="number" {...XAXIS} tickFormatter={v => fd(v)} />
            <YAxis dataKey="account_desc" type="category" tick={{ fontSize: 9, fill: C.txtt }} axisLine={false} tickLine={false} width={100} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <Bar dataKey="variance" name="Variance" radius={[0, 2, 2, 0]}>
              {sorted.map((d, i) => <Cell key={i} fill={d.direction === 'unfavorable' ? C.red : d.direction === 'favorable' ? C.teal : C.gray} fillOpacity={0.75} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading…</div>,
    },
    {
      id: 'var-scatter', title: 'Budget vs Actual Scatter', badge: 'fn-variance-budget-vs-actual', span: 1,
      render: () => scatterData.length > 0 ? (
        <ResponsiveContainer width="100%" height={140}>
          <ScatterChart margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid {...GRID} /><XAxis type="number" dataKey="x" name="Budget" {...XAXIS} tickFormatter={v => fd(v)} />
            <YAxis type="number" dataKey="y" name="Actual" {...YAXIS} tickFormatter={v => fd(v)} /><ZAxis type="number" dataKey="z" range={[20, 200]} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <Scatter data={scatterData}>
              {scatterData.map((d, i) => <Cell key={i} fill={d.dir === 'unfavorable' ? C.red : d.dir === 'favorable' ? C.teal : C.gray} fillOpacity={0.6} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading…</div>,
    },
    {
      id: 'var-table', title: `Variance Drivers Detail — ${unique.length} accounts`, span: 2,
      render: () => sorted.length > 0 ? (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Acct','Sub','Description','BU','Budget','Actual','Variance','Var %','Dir'].map(h => (
                  <th key={h} style={['Description','BU'].includes(h) ? { ...TH, ...TDL } : TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.surf }}>
                  <td style={TD}>{d.account}</td><td style={TD}>{d.subsidiary}</td>
                  <td style={TDL}>{d.account_desc}</td><td style={TDL}>{d.bu_name}</td>
                  <td style={TD}>{usd(d.budget)}</td><td style={TD}>{usd(d.actual)}</td>
                  <td style={{ ...TD, fontWeight: 500, color: d.direction === 'unfavorable' ? C.red : d.direction === 'favorable' ? C.teal : undefined }}>{usd(d.variance)}</td>
                  <td style={TD}>{pctFmt(d.variance_pct)}</td>
                  <td style={{ ...TD, textTransform: 'uppercase', fontSize: 8, fontWeight: 600, color: d.direction === 'unfavorable' ? C.red : d.direction === 'favorable' ? C.teal : C.gray }}>{d.direction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading…</div>,
    },
    {
      id: 'var-alerts', title: `Variance Alerts — ${alerts.length} Items`, span: 1,
      render: () => <div>{alerts.map((a, i) => <AlertRow key={i} {...a} />)}</div>,
    },
  ]

  return <div>
    <div className="tab-header"><span className="tab-header__title">Variance Analysis</span><button className="tab-header__btn" onClick={handleRefresh} disabled={loading}>↻ Refresh</button></div>
    <KPIRail chips={chips} /><PanelGrid panels={panels} /></div>
}
