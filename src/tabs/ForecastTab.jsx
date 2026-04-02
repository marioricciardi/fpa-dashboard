// ForecastTab — V4 visual layout with recharts, PanelGrid, KPIChip
// Backend: useTool() calls to OCI functions preserved exactly
import { useMemo, useCallback } from 'react'
import {
  ComposedChart, Line, BarChart, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

import { KPIRail } from '../components/KPIChip.jsx'
import PanelGrid from '../components/PanelGrid.jsx'
import { AlertRow, WaterfallBar } from '../components/ChartPrimitives.jsx'
import { useTool } from '../hooks/useTool.js'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, usd, pctFmt } from '../utils/chartConstants.js'

/* ── data accessors ─────────────────────────────────────────── */
function fcArr(data)  { return data?.result?.forecast ?? data?.forecast ?? [] }
function fcSum(data)  { return data?.result?.summary ?? data?.summary ?? {} }
function expSum(data) { return data?.result?.summary ?? data?.summary ?? {} }
function expByCat(data) { return data?.result?.by_category ?? data?.by_category ?? [] }
function expByPer(data) { return data?.result?.by_period ?? data?.by_period ?? [] }
function rollTop(data) {
  const r = data?.result ?? data ?? {}
  return {
    full_year_estimate: r.full_year_estimate ?? 0,
    actuals_ytd: r.actuals_ytd ?? 0,
    forecast_remainder: r.forecast_remainder ?? 0,
    full_year_budget: r.full_year_budget ?? 0,
    variance_to_budget: r.variance_to_budget ?? 0,
  }
}
function rollByPer(data) { return data?.result?.by_period ?? data?.by_period ?? [] }

export default function ForecastTab({ fiscalYear = 25, period = 6 }) {
  const quarter = Math.ceil(period / 3)
  const fyLabel = `FY20${String(fiscalYear).padStart(2, '0')}`

  // ── OCI tool calls (unchanged) ──
  const qtrParams  = useMemo(() => ({ business_unit: 'M30', fiscal_year: 2000 + fiscalYear, quarter }), [fiscalYear, quarter])
  const expParams  = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: 12, confidence_level: 80 }), [fiscalYear])
  const rollParams = useMemo(() => ({ fiscal_year: fiscalYear, operation: 'current' }), [fiscalYear])
  const { data: qtrData,  loading: qL, refetch: rQtr } = useTool('forecast_get_quarter', qtrParams)
  const { data: expData,  loading: eL, refetch: rExp } = useTool('forecast_get_expense', expParams)
  const { data: rollData, loading: rL, refetch: rRoll } = useTool('forecast_get_rolling', rollParams)
  const handleRefresh = useCallback(() => { rQtr(); rExp(); rRoll() }, [rQtr, rExp, rRoll])

  const qOk = !!qtrData, eOk = !!expData, rOk = !!rollData
  const loading = qL || eL || rL

  const forecasts = qOk ? fcArr(qtrData) : []
  const apSummary = qOk ? fcSum(qtrData) : {}
  const eSummary  = eOk ? expSum(expData) : {}
  const eCats     = eOk ? expByCat(expData) : []
  const ePeriods  = eOk ? expByPer(expData) : []
  const roll      = rOk ? rollTop(rollData) : { full_year_estimate: 0, actuals_ytd: 0, forecast_remainder: 0, full_year_budget: 0, variance_to_budget: 0 }
  const rPeriods  = rOk ? rollByPer(rollData) : []

  const pStart = (quarter - 1) * 3 + 1

  // ── AP forecast chart data ──
  const apChartData = forecasts.map((f, i) => ({
    p: `P${String(pStart + i).padStart(2, '0')}`,
    forecast: f.forecasted_ap_usd ?? 0,
    upper: f.upper_95 ?? 0,
    lower: f.lower_95 ?? 0,
  }))

  // ── Rolling waterfall ──
  const rollWf = [
    { name: 'Actuals YTD', change: roll.actuals_ytd, isTotal: false },
    { name: 'Fcst Remainder', change: roll.forecast_remainder, isTotal: false },
    { name: 'FY Estimate', change: roll.full_year_estimate, isTotal: true },
    { name: 'FY Budget', change: roll.full_year_budget, isTotal: true },
  ]

  // ── Rolling by period line data ──
  const rollPerData = rPeriods.map(p => ({
    p: `P${p.period ?? p.period_num ?? '?'}`,
    actual: p.actual ?? 0,
    forecast: p.forecast ?? 0,
    budget: p.budget ?? 0,
  }))

  // ── Expense by category ──
  const catData = [...eCats].sort((a, b) => (b.forecast ?? b.amount ?? 0) - (a.forecast ?? a.amount ?? 0)).map(c => ({
    name: c.category || c.name || 'Unknown',
    value: c.forecast ?? c.amount ?? 0,
  }))

  // ── Expense by period line data ──
  const expPerData = ePeriods.map(p => ({
    p: `P${p.period ?? p.period_num ?? '?'}`,
    expense: p.forecast ?? p.amount ?? 0,
  }))

  // ── CI metrics ──
  const ciLow  = forecasts.reduce((s, f) => s + (f.lower_95 ?? 0), 0)
  const ciHigh = forecasts.reduce((s, f) => s + (f.upper_95 ?? 0), 0)
  const apTotal = apSummary.total_quarter_usd ?? 0
  const ciPct  = apTotal > 0 ? ((ciHigh - ciLow) / apTotal) * 100 : 0

  // ── Alerts ──
  const alerts = []
  if (ciPct > 30) alerts.push({ level: 'WARNING', text: `AP forecast 95% CI is ${pctFmt(ciPct)} of total — wider than 30% threshold.`, src: 'fn-ap-forecast' })
  if (forecasts.length >= 2) {
    const first = forecasts[0]?.forecasted_ap_usd ?? 0
    const last  = forecasts[forecasts.length - 1]?.forecasted_ap_usd ?? 0
    if (first > 0 && last > first * 1.15) alerts.push({ level: 'WARNING', text: `AP spend trending up: ${usd(first)} → ${usd(last)}`, src: 'fn-ap-forecast' })
  }
  const deltaBud = eSummary.delta_vs_budget ?? 0
  if (deltaBud > 0) alerts.push({ level: 'CRITICAL', text: `Expense forecast ${usd(deltaBud)} over budget — escalate to CFO.`, src: 'forecast_get_expense' })
  else if (deltaBud < 0) alerts.push({ level: 'OK', text: `Expense forecast ${usd(Math.abs(deltaBud))} under budget.`, src: 'forecast_get_expense' })
  const rollVar = roll.variance_to_budget ?? 0
  if (rollVar !== 0) alerts.push({ level: rollVar > 0 ? 'WARNING' : 'INFO', text: `Rolling estimate ${usd(roll.full_year_estimate)} vs budget ${usd(roll.full_year_budget)} — variance ${usd(rollVar)}`, src: 'forecast_get_rolling' })
  if (forecasts.length > 0 && ciPct <= 30) alerts.push({ level: 'OK', text: `AP forecast CI ${pctFmt(ciPct)} — within range. ${apSummary.periods_returned ?? 0} periods.`, src: 'fn-ap-forecast' })

  // ── KPI chips ──
  const chips = [
    { label: `Q${quarter} AP Forecast`, value: usd(apTotal), sub: `Avg ${usd(apSummary.avg_monthly_usd)}/mo` },
    { label: 'FY Expense Fcst', value: usd(eSummary.total_forecast), sub: `Budget ${usd(eSummary.total_budget)}` },
    { label: 'Rolling FY Est', value: usd(roll.full_year_estimate), sub: `YTD ${usd(roll.actuals_ytd)}` },
    { label: 'Var to Budget', value: usd(roll.variance_to_budget), sub: `Budget ${usd(roll.full_year_budget)}`, danger: rollVar > 0, ok: rollVar <= 0 },
    { label: '95% CI Range', value: `${usd(ciLow)} – ${usd(ciHigh)}`, sub: `${pctFmt(ciPct)} of total`, warn: ciPct > 30, ok: ciPct <= 30 },
    { label: 'Run Rate', value: usd(eSummary.total_run_rate), sub: 'Extrapolated' },
    { label: 'Δ vs Run Rate', value: usd(eSummary.delta_vs_run_rate), sub: (eSummary.delta_vs_run_rate ?? 0) > 0 ? 'Above' : 'Below' },
    { label: 'Δ vs Budget', value: usd(eSummary.delta_vs_budget), sub: deltaBud > 0 ? 'Over' : 'Under', danger: deltaBud > 0, ok: deltaBud <= 0 },
    { label: 'CI Spread', value: usd(ciHigh - ciLow), sub: 'Upper − Lower' },
    { label: 'Periods', value: `${apSummary.periods_returned ?? 0}`, sub: `Q${quarter}` },
  ]

  if (loading && !qOk && !eOk && !rOk) return <div className="tab-loading">Loading forecast data…</div>

  const panels = [
    {
      id: 'fc-ap', title: `AP Spend Forecast — Q${quarter} ${fyLabel} (BU: M30)`,
      badge: 'fn-ap-forecast', src: 'Oracle ADW', span: 2,
      render: () => apChartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={apChartData}>
            <CartesianGrid {...GRID} /><XAxis dataKey="p" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
            <Tooltip {...TT} formatter={v => fd(v)} /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Area dataKey="upper" fill={C.red} stroke="none" fillOpacity={0.08} legendType="none" />
            <Area dataKey="lower" fill="white" stroke="none" fillOpacity={1} legendType="none" />
            <Bar dataKey="forecast" name="Forecast AP" fill={C.blue} fillOpacity={0.65} radius={[2, 2, 0, 0]} />
            <Line dataKey="upper" name="Upper 95%" stroke={C.red} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3, fill: C.red }} />
            <Line dataKey="lower" name="Lower 95%" stroke={C.teal} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3, fill: C.teal }} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>No AP data</div>,
    },
    {
      id: 'fc-ap-table', title: `AP Forecast Detail — ${forecasts.length} periods`, span: 1,
      render: () => forecasts.length > 0 ? (
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Period','Forecast','Lower 95%','Upper 95%','CI Width'].map(h => <th key={h} style={h === 'Period' ? { ...TH, ...TDL } : TH}>{h}</th>)}</tr></thead>
            <tbody>
              {forecasts.map((f, i) => {
                const fc = f.forecasted_ap_usd ?? 0, lo = f.lower_95 ?? 0, hi = f.upper_95 ?? 0
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.surf }}>
                    <td style={TDL}>P{String(pStart + i).padStart(2, '0')}</td>
                    <td style={{ ...TD, fontWeight: 500 }}>{usd(fc)}</td>
                    <td style={{ ...TD, color: C.teal }}>{usd(lo)}</td>
                    <td style={{ ...TD, color: C.red }}>{usd(hi)}</td>
                    <td style={TD}>{usd(hi - lo)}</td>
                  </tr>
                )
              })}
              <tr style={{ borderTop: `1.5px solid ${C.brd}`, fontWeight: 600 }}>
                <td style={TDL}>TOTAL</td>
                <td style={TD}>{usd(forecasts.reduce((s, f) => s + (f.forecasted_ap_usd ?? 0), 0))}</td>
                <td style={{ ...TD, color: C.teal }}>{usd(ciLow)}</td>
                <td style={{ ...TD, color: C.red }}>{usd(ciHigh)}</td>
                <td style={TD}>{usd(ciHigh - ciLow)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>No AP data</div>,
    },
    {
      id: 'fc-rolling', title: `Rolling Forecast — ${fyLabel} Full Year`,
      badge: 'fn-forecast-rolling', src: 'F0902', span: 1,
      render: () => <WaterfallBar items={rollWf} />,
    },
    {
      id: 'fc-roll-trend', title: 'Rolling by Period — Actual vs Forecast vs Budget',
      badge: 'fn-forecast-rolling', span: 1,
      render: () => rollPerData.length > 0 ? (
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={rollPerData}>
            <CartesianGrid {...GRID} /><XAxis dataKey="p" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
            <Tooltip {...TT} formatter={v => fd(v)} /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Line dataKey="actual" name="Actual" stroke={C.teal} strokeWidth={2} dot={{ r: 2 }} />
            <Line dataKey="forecast" name="Forecast" stroke={C.purple} strokeWidth={1.5} strokeDasharray="6 3" dot={{ r: 2 }} />
            <Line dataKey="budget" name="Budget" stroke={C.gray} strokeWidth={1} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>No rolling period data</div>,
    },
    {
      id: 'fc-expense', title: `Expense Forecast — ${fyLabel} P1–P12`,
      badge: 'fn-forecast-expense', span: 1,
      render: () => {
        const data = [
          { name: 'Forecast', value: eSummary.total_forecast ?? 0, fill: C.blue },
          { name: 'Run Rate', value: eSummary.total_run_rate ?? 0, fill: C.purple },
          { name: 'Budget', value: eSummary.total_budget ?? 0, fill: C.gray },
        ]
        return (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={data} margin={{ left: 0, right: 10 }}>
              <CartesianGrid {...GRID} /><XAxis dataKey="name" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
              <Tooltip {...TT} formatter={v => usd(v)} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]} fillOpacity={0.65}>
                {data.map((d, i) => <Bar key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      },
    },
    {
      id: 'fc-cat', title: `Expense by Category — ${fyLabel}`, badge: 'fn-forecast-expense', span: 1,
      render: () => catData.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(100, catData.length * 22)}>
          <BarChart data={catData} layout="vertical" margin={{ left: 80, right: 10 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical /><XAxis type="number" {...XAXIS} tickFormatter={v => fd(v)} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: C.txtt }} axisLine={false} tickLine={false} width={80} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <Bar dataKey="value" name="Forecast" fill={C.blue} fillOpacity={0.6} radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>No category data</div>,
    },
    {
      id: 'fc-exp-trend', title: `Expense by Period — ${fyLabel}`, badge: 'fn-forecast-expense', span: 2,
      render: () => expPerData.length > 0 ? (
        <ResponsiveContainer width="100%" height={130}>
          <ComposedChart data={expPerData}>
            <CartesianGrid {...GRID} /><XAxis dataKey="p" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <Area dataKey="expense" fill={C.blue} fillOpacity={0.08} stroke={C.blue} strokeWidth={2} dot={{ r: 2, fill: C.blue }} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>No period data</div>,
    },
    {
      id: 'fc-alerts', title: `Forecast Alerts — ${alerts.length} Items`, span: 2,
      render: () => <div>{alerts.map((a, i) => <AlertRow key={i} {...a} />)}</div>,
    },
  ]

  return <div>
    <div className="tab-header"><span className="tab-header__title">Forecast</span><button className="tab-header__btn" onClick={handleRefresh} disabled={loading}>↻ Refresh</button></div>
    <KPIRail chips={chips} /><PanelGrid panels={panels} /></div>
}
