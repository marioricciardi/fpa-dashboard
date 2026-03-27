import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

import KpiStrip   from '../components/KpiStrip.jsx'
import ChartCard  from '../components/ChartCard.jsx'
import MetricCard from '../components/MetricCard.jsx'
import AlertPanel from '../components/AlertPanel.jsx'
import { useTool } from '../hooks/useTool.js'
import { useMemo } from 'react'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
const TH = { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)', textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--color-border-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }
const TD = { fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderBottom: '0.5px solid var(--color-border-tertiary)' }

/* ── formatting ─────────────────────────────────────────────── */

function usd(v) {
  if (v == null) return '$0.00'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

function pctFmt(v) {
  if (v == null || !isFinite(v)) return 'N/A'
  return `${v.toFixed(1)}%`
}

/* ── data accessors ─────────────────────────────────────────── */

function fcArr(data)  { return data?.result?.forecast ?? data?.forecast ?? [] }
function fcSum(data)  { return data?.result?.summary ?? data?.summary ?? {} }
function expSum(data) { return data?.result?.summary ?? data?.summary ?? {} }
function expByCat(data) { return data?.result?.by_category ?? data?.by_category ?? [] }
function expByPer(data) { return data?.result?.by_period ?? data?.by_period ?? [] }
function expMeta(data) { return data?.result?.metadata ?? data?.metadata ?? {} }
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
function rollMeta(data) { return data?.result?.metadata ?? data?.metadata ?? {} }

/* ── period labels from quarter ─────────────────────────────── */

function periodLabels(quarter, forecasts) {
  const start = (quarter - 1) * 3 + 1
  return forecasts.map((_, i) => `P${String(start + i).padStart(2, '0')}`)
}

/* ── KPI strip (CFO-level — combines all 3 tools) ──────────── */

function buildKpis(apSummary, forecasts, quarter, fiscalYear, eSummary, roll) {
  const apTotal = apSummary.total_quarter_usd ?? 0
  const ciLow   = forecasts.reduce((s, f) => s + (f.lower_95 ?? 0), 0)
  const ciHigh  = forecasts.reduce((s, f) => s + (f.upper_95 ?? 0), 0)
  const ciPct   = apTotal > 0 ? ((ciHigh - ciLow) / apTotal) * 100 : 0

  return [
    { label: `Q${quarter} AP Forecast`,    value: usd(apTotal),                      delta: `Avg ${usd(apSummary.avg_monthly_usd)}/mo · ${apSummary.periods_returned ?? 0} periods`, sentiment: 'neu' },
    { label: 'Full-Year Expense Fcst',     value: usd(eSummary.total_forecast),       delta: `Run rate ${usd(eSummary.total_run_rate)} · Budget ${usd(eSummary.total_budget)}`, sentiment: 'neu' },
    { label: 'Rolling Full-Year Est',      value: usd(roll.full_year_estimate),       delta: `YTD ${usd(roll.actuals_ytd)} + Remainder ${usd(roll.forecast_remainder)}`, sentiment: 'neu' },
    { label: 'Variance to Budget',         value: usd(roll.variance_to_budget),       delta: `Budget ${usd(roll.full_year_budget)}`, sentiment: roll.variance_to_budget > 0 ? 'warn' : roll.variance_to_budget < 0 ? 'pos' : 'neu' },
    { label: '95% CI Range (AP)',          value: `${usd(ciLow)} – ${usd(ciHigh)}`,  delta: `${pctFmt(ciPct)} of Q total — forecast uncertainty`, sentiment: ciPct > 30 ? 'warn' : 'pos' },
  ]
}

/* ── AP forecast bar+line chart ─────────────────────────────── */

function apForecastChartData(forecasts, quarter) {
  const labels = periodLabels(quarter, forecasts)
  return {
    labels,
    datasets: [
      { type: 'bar', label: 'Forecast AP', data: forecasts.map(f => f.forecasted_ap_usd), backgroundColor: 'rgba(50,102,173,0.30)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3, order: 2 },
      { type: 'line', label: 'Upper 95% CI', data: forecasts.map(f => f.upper_95), borderColor: '#e24b4a', borderWidth: 1.5, borderDash: [4, 2], pointRadius: 4, pointBackgroundColor: '#e24b4a', fill: false, tension: 0, order: 1 },
      { type: 'line', label: 'Lower 95% CI', data: forecasts.map(f => f.lower_95), borderColor: '#1d9e75', borderWidth: 1.5, borderDash: [4, 2], pointRadius: 4, pointBackgroundColor: '#1d9e75', fill: '-1', backgroundColor: 'rgba(136,135,128,0.08)', tension: 0, order: 1 },
    ],
  }
}

/* ── CI range stacked bar ───────────────────────────────────── */

function ciRangeChartData(forecasts, quarter) {
  const labels = periodLabels(quarter, forecasts)
  return {
    labels,
    datasets: [
      { label: 'Lower 95% CI', data: forecasts.map(f => f.lower_95), backgroundColor: 'rgba(29,158,117,0.25)', borderColor: '#1d9e75', borderWidth: 1.5, borderRadius: 3 },
      { label: 'Forecast',     data: forecasts.map(f => (f.forecasted_ap_usd ?? 0) - (f.lower_95 ?? 0)), backgroundColor: 'rgba(50,102,173,0.30)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3 },
      { label: 'Upper 95% CI', data: forecasts.map(f => (f.upper_95 ?? 0) - (f.forecasted_ap_usd ?? 0)), backgroundColor: 'rgba(226,75,74,0.20)', borderColor: '#e24b4a', borderWidth: 1.5, borderRadius: 3 },
    ],
  }
}

/* ── rolling forecast waterfall bar ─────────────────────────── */

function rollingWaterfallData(roll) {
  return {
    labels: ['Actuals YTD', 'Forecast Remainder', 'Full-Year Estimate', 'Full-Year Budget', 'Variance'],
    datasets: [{
      data: [roll.actuals_ytd, roll.forecast_remainder, roll.full_year_estimate, roll.full_year_budget, roll.variance_to_budget],
      backgroundColor: [
        'rgba(29,158,117,0.30)',   // actuals - green
        'rgba(127,119,221,0.30)',  // forecast remainder - purple
        'rgba(50,102,173,0.35)',   // full year est - blue
        'rgba(136,135,128,0.25)',  // budget - gray
        roll.variance_to_budget > 0 ? 'rgba(226,75,74,0.30)' : 'rgba(29,158,117,0.30)', // variance
      ],
      borderColor: [
        '#1d9e75', '#7f77dd', '#3266ad', '#888780',
        roll.variance_to_budget > 0 ? '#e24b4a' : '#1d9e75',
      ],
      borderWidth: 1.5, borderRadius: 3,
    }],
  }
}

/* ── expense forecast summary bar ───────────────────────────── */

function expenseSummaryBarData(eSummary) {
  return {
    labels: ['Total Forecast', 'Run Rate', 'Budget'],
    datasets: [{
      data: [eSummary.total_forecast, eSummary.total_run_rate, eSummary.total_budget],
      backgroundColor: ['rgba(50,102,173,0.30)', 'rgba(127,119,221,0.25)', 'rgba(136,135,128,0.25)'],
      borderColor: ['#3266ad', '#7f77dd', '#888780'],
      borderWidth: 1.5, borderRadius: 3,
    }],
  }
}

/* ── expense by_category bar (if data) ──────────────────────── */

function expenseByCategoryData(cats) {
  if (!cats || cats.length === 0) return null
  const sorted = [...cats].sort((a, b) => (b.forecast ?? b.amount ?? 0) - (a.forecast ?? a.amount ?? 0))
  return {
    labels: sorted.map(c => c.category || c.name || 'Unknown'),
    datasets: [{
      label: 'Forecast',
      data: sorted.map(c => c.forecast ?? c.amount ?? 0),
      backgroundColor: 'rgba(50,102,173,0.22)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3,
    }],
  }
}

/* ── expense by_period line (if data) ───────────────────────── */

function expenseByPeriodData(periods) {
  if (!periods || periods.length === 0) return null
  const labels = periods.map(p => `P${p.period ?? p.period_num ?? '?'}`)
  return {
    labels,
    datasets: [{
      label: 'Expense',
      data: periods.map(p => p.forecast ?? p.amount ?? 0),
      borderColor: '#3266ad', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#3266ad',
      fill: true, backgroundColor: 'rgba(50,102,173,0.08)', tension: 0.3,
    }],
  }
}

/* ── rolling by_period line (if data) ───────────────────────── */

function rollingByPeriodData(periods) {
  if (!periods || periods.length === 0) return null
  const labels = periods.map(p => `P${p.period ?? p.period_num ?? '?'}`)
  return {
    labels,
    datasets: [
      { label: 'Actual',   data: periods.map(p => p.actual ?? 0),   borderColor: '#1d9e75', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#1d9e75', fill: false, tension: 0.3 },
      { label: 'Forecast', data: periods.map(p => p.forecast ?? 0), borderColor: '#7f77dd', borderWidth: 1.5, borderDash: [6, 3], pointRadius: 2, fill: false, tension: 0.3 },
      { label: 'Budget',   data: periods.map(p => p.budget ?? 0),   borderColor: '#888780', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, fill: false, tension: 0.3 },
    ],
  }
}

/* ── alerts ──────────────────────────────────────────────────── */

function buildAlerts(forecasts, apSummary, eSummary, roll, expCats) {
  const alerts = []
  // AP CI width
  const ciLow  = forecasts.reduce((s, f) => s + (f.lower_95 ?? 0), 0)
  const ciHigh = forecasts.reduce((s, f) => s + (f.upper_95 ?? 0), 0)
  const apTotal = apSummary.total_quarter_usd ?? 0
  const ciPct  = apTotal > 0 ? ((ciHigh - ciLow) / apTotal) * 100 : 0
  if (ciPct > 30) {
    alerts.push({
      severity: 'warning',
      text: `AP forecast 95% CI is ${pctFmt(ciPct)} of total — wider than 30% threshold. Exercise caution in cash planning.`,
      meta: `fn-ap-forecast · total ${usd(apTotal)} · CI ${usd(ciLow)}–${usd(ciHigh)}`,
    })
  }
  // AP trend
  if (forecasts.length >= 2) {
    const first = forecasts[0]?.forecasted_ap_usd ?? 0
    const last  = forecasts[forecasts.length - 1]?.forecasted_ap_usd ?? 0
    if (first > 0 && last > first * 1.15) {
      alerts.push({
        severity: 'warning',
        text: `AP spend trending up within quarter: ${usd(first)} → ${usd(last)} (+${pctFmt(((last - first) / first) * 100)}). Review vendor payment schedules.`,
        meta: `fn-ap-forecast · period-over-period trend`,
      })
    }
  }
  // Expense Δ vs run rate
  const deltaRR = eSummary.delta_vs_run_rate ?? 0
  if (deltaRR !== 0) {
    alerts.push({
      severity: deltaRR > 0 ? 'warning' : 'info',
      text: `Full-year expense forecast is ${usd(deltaRR)} ${deltaRR > 0 ? 'above' : 'below'} run-rate projection. ${deltaRR > 0 ? 'Investigate cost drivers.' : 'Favorable trend.'}`,
      meta: `forecast_get_expense · forecast ${usd(eSummary.total_forecast)} · run rate ${usd(eSummary.total_run_rate)}`,
    })
  }
  // Expense Δ vs budget
  const deltaBud = eSummary.delta_vs_budget ?? 0
  if (deltaBud !== 0) {
    alerts.push({
      severity: deltaBud > 0 ? 'critical' : 'info',
      text: `Full-year expense forecast is ${usd(deltaBud)} ${deltaBud > 0 ? 'over' : 'under'} budget. ${deltaBud > 0 ? 'Budget overrun risk — escalate to CFO.' : 'Under budget — favorable.'}`,
      meta: `forecast_get_expense · forecast ${usd(eSummary.total_forecast)} · budget ${usd(eSummary.total_budget)}`,
    })
  }
  // Rolling variance
  const rollVar = roll.variance_to_budget ?? 0
  if (rollVar !== 0) {
    alerts.push({
      severity: rollVar > 0 ? 'warning' : 'info',
      text: `Rolling forecast full-year estimate ${usd(roll.full_year_estimate)} vs budget ${usd(roll.full_year_budget)} — variance ${usd(rollVar)} (${rollVar > 0 ? 'over' : 'under'} budget).`,
      meta: `forecast_get_rolling · YTD ${usd(roll.actuals_ytd)} + remainder ${usd(roll.forecast_remainder)}`,
    })
  }
  // All zeros — no data alert
  if (apTotal === 0 && (eSummary.total_forecast ?? 0) === 0 && (roll.full_year_estimate ?? 0) === 0) {
    alerts.push({
      severity: 'warning',
      text: 'All three forecast tools returned zero values. Verify that forecast models have been trained and data exists for this fiscal year.',
      meta: 'fn-ap-forecast · forecast_get_expense · forecast_get_rolling',
    })
  }
  // Good state
  if (forecasts.length > 0 && ciPct <= 30) {
    alerts.push({
      severity: 'info',
      text: `AP forecast CI ${pctFmt(ciPct)} of total — within acceptable range. ${apSummary.periods_returned ?? 0} periods forecasted.`,
      meta: `fn-ap-forecast · ${usd(apTotal)} total`,
    })
  }
  return alerts
}

/* ── AP forecast detail table ───────────────────────────────── */

function ForecastTable({ forecasts, quarter }) {
  if (!forecasts || forecasts.length === 0) return null
  const labels = periodLabels(quarter, forecasts)
  return (
    <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border-tertiary)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500, borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        AP Forecast Detail by Period
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{forecasts.length} periods</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={TH}>Period</th>
            <th style={{ ...TH, textAlign: 'right' }}>Forecast AP</th>
            <th style={{ ...TH, textAlign: 'right' }}>Lower 95%</th>
            <th style={{ ...TH, textAlign: 'right' }}>Upper 95%</th>
            <th style={{ ...TH, textAlign: 'right' }}>CI Width</th>
            <th style={{ ...TH, textAlign: 'right' }}>CI Width %</th>
          </tr>
        </thead>
        <tbody>
          {forecasts.map((f, i) => {
            const fc = f.forecasted_ap_usd ?? 0
            const lo = f.lower_95 ?? 0
            const hi = f.upper_95 ?? 0
            const width = hi - lo
            const widthPct = fc > 0 ? (width / fc) * 100 : 0
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-primary)' }}>
                <td style={{ ...TD, fontWeight: 500 }}>{labels[i]}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 500 }}>{usd(fc)}</td>
                <td style={{ ...TD, textAlign: 'right', color: '#1d9e75' }}>{usd(lo)}</td>
                <td style={{ ...TD, textAlign: 'right', color: '#e24b4a' }}>{usd(hi)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{usd(width)}</td>
                <td style={{ ...TD, textAlign: 'right', color: widthPct > 30 ? '#e24b4a' : 'var(--color-text-secondary)' }}>{pctFmt(widthPct)}</td>
              </tr>
            )
          })}
          <tr style={{ borderTop: '1.5px solid var(--color-border-tertiary)', fontWeight: 600 }}>
            <td style={TD}>TOTAL</td>
            <td style={{ ...TD, textAlign: 'right' }}>{usd(forecasts.reduce((s, f) => s + (f.forecasted_ap_usd ?? 0), 0))}</td>
            <td style={{ ...TD, textAlign: 'right', color: '#1d9e75' }}>{usd(forecasts.reduce((s, f) => s + (f.lower_95 ?? 0), 0))}</td>
            <td style={{ ...TD, textAlign: 'right', color: '#e24b4a' }}>{usd(forecasts.reduce((s, f) => s + (f.upper_95 ?? 0), 0))}</td>
            <td style={{ ...TD, textAlign: 'right' }}>{usd(forecasts.reduce((s, f) => s + ((f.upper_95 ?? 0) - (f.lower_95 ?? 0)), 0))}</td>
            <td style={TD}></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/* ── main component ─────────────────────────────────────────── */

export default function ForecastTab({ fiscalYear = 25, period = 6 }) {
  const quarter = Math.ceil(period / 3)
  const fyLabel = `FY20${String(fiscalYear).padStart(2, '0')}`
  const qtrParams  = useMemo(() => ({ business_unit: 'M30', fiscal_year: 2000 + fiscalYear, quarter }), [fiscalYear, quarter])
  const expParams  = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: 12, confidence_level: 80 }), [fiscalYear])
  const rollParams = useMemo(() => ({ fiscal_year: fiscalYear, operation: 'current' }), [fiscalYear])
  const { data: qtrData,  loading: qL, refetch: rQtr }  = useTool('forecast_get_quarter', qtrParams)
  const { data: expData,  loading: eL, refetch: rExp }  = useTool('forecast_get_expense', expParams)
  const { data: rollData, loading: rL, refetch: rRoll } = useTool('forecast_get_rolling', rollParams)
  const refreshAll = () => { rQtr(); rExp(); rRoll() }

  const qOk  = !!qtrData
  const eOk  = !!expData
  const rOk  = !!rollData
  const loading = qL || eL || rL

  const forecasts  = qOk ? fcArr(qtrData) : []
  const apSummary  = qOk ? fcSum(qtrData) : {}
  const eSummary   = eOk ? expSum(expData) : {}
  const eCats      = eOk ? expByCat(expData) : []
  const ePeriods   = eOk ? expByPer(expData) : []
  const roll       = rOk ? rollTop(rollData) : { full_year_estimate: 0, actuals_ytd: 0, forecast_remainder: 0, full_year_budget: 0, variance_to_budget: 0 }
  const rPeriods   = rOk ? rollByPer(rollData) : []

  const pStart = (quarter - 1) * 3 + 1
  const pEnd   = pStart + (apSummary.periods_returned ?? 3) - 1

  const SCALES_USD = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => usd(v) }, grid: { color: GC } },
  }

  const catChart   = expenseByCategoryData(eCats)
  const expPerChart = expenseByPeriodData(ePeriods)
  const rollPerChart = rollingByPeriodData(rPeriods)

  if (loading && !qOk && !eOk && !rOk) return <div className="tab-loading">Loading forecast data…</div>

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={refreshAll} disabled={loading} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>{loading ? 'Refreshing…' : '↻ Refresh Data'}</button>
      </div>
      {(qOk || eOk || rOk) && <KpiStrip items={buildKpis(apSummary, forecasts, quarter, fiscalYear, eSummary, roll)} cols={5} />}

      {/* ── Section 1: AP Forecast (fn-ap-forecast) ─────────── */}
      <div className="chart-grid chart-grid--2">
        <ChartCard
          title={`AP Spend Forecast — Q${quarter} ${fyLabel} (BU: M30)`}
          subtitle={`$USD · P${String(pStart).padStart(2, '0')}–P${String(pEnd).padStart(2, '0')} · 95% CI bounds · Source: fn-ap-forecast`}
          fn="fn-ap-forecast"
          toolResult={qtrData}
          height={220}
          unavailable={!qOk || forecasts.length === 0}
          legend={[
            { color: '#3266ad', label: 'Forecast' },
            { color: '#e24b4a', label: 'Upper 95% CI' },
            { color: '#1d9e75', label: 'Lower 95% CI' },
          ]}
        >
          {qOk && forecasts.length > 0 && <Bar
            data={apForecastChartData(forecasts, quarter)}
            options={{
              ...BASE, scales: SCALES_USD,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${usd(ctx.raw)}` } } },
            }}
          />}
        </ChartCard>

        <ChartCard
          title="CI Range Breakdown by Period"
          subtitle="Stacked: Lower CI + Forecast Band + Upper CI"
          fn="fn-ap-forecast"
          height={220}
          unavailable={!qOk || forecasts.length === 0}
          legend={[
            { color: '#1d9e75', label: 'Lower 95%' },
            { color: '#3266ad', label: 'Forecast Band' },
            { color: '#e24b4a', label: 'Upper 95%' },
          ]}
        >
          {qOk && forecasts.length > 0 && <Bar
            data={ciRangeChartData(forecasts, quarter)}
            options={{
              ...BASE,
              scales: { x: { stacked: true, ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } }, y: { stacked: true, ticks: { color: TC, font: { size: 10 }, callback: v => usd(v) }, grid: { color: GC } } },
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${usd(ctx.raw)}` } } },
            }}
          />}
        </ChartCard>
      </div>

      {/* AP detail table + metric cards */}
      <div className="chart-grid chart-grid--21" style={{ marginTop: 11 }}>
        {qOk && forecasts.length > 0 ? (
          <ForecastTable forecasts={forecasts} quarter={quarter} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="chart-unavailable">No AP forecast data</span>
          </div>
        )}

        {qOk ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <MetricCard label="Q Total AP"    value={usd(apSummary.total_quarter_usd)} delta={`Q${quarter} ${fyLabel}`}                  sentiment="neu" />
            <MetricCard label="Avg Monthly"   value={usd(apSummary.avg_monthly_usd)}   delta={`${apSummary.periods_returned ?? 0} periods`} sentiment="neu" />
            <MetricCard label="Min Period"    value={usd(forecasts.length > 0 ? Math.min(...forecasts.map(f => f.forecasted_ap_usd ?? 0)) : 0)} delta="Lowest forecast period" sentiment="pos" />
            <MetricCard label="Max Period"    value={usd(forecasts.length > 0 ? Math.max(...forecasts.map(f => f.forecasted_ap_usd ?? 0)) : 0)} delta="Highest forecast period" sentiment="neu" />
            <MetricCard label="CI Spread"     value={usd(forecasts.reduce((s, f) => s + ((f.upper_95 ?? 0) - (f.lower_95 ?? 0)), 0))} delta="Total upper − lower" sentiment="neu" />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="chart-unavailable">Can't load AP forecast</span>
          </div>
        )}
      </div>

      {/* ── Section 2: Rolling Forecast (forecast_get_rolling) ── */}
      <div className="chart-grid chart-grid--21" style={{ marginTop: 11 }}>
        <ChartCard
          title={`Rolling Forecast — ${fyLabel} Full Year`}
          subtitle="Actuals YTD + Forecast Remainder vs Budget · Source: forecast_get_rolling"
          fn="fn-forecast-rolling"
          toolResult={rollData}
          height={210}
          unavailable={!rOk}
          legend={[
            { color: '#1d9e75', label: 'Actuals YTD' },
            { color: '#7f77dd', label: 'Forecast Remainder' },
            { color: '#3266ad', label: 'Full-Year Estimate' },
            { color: '#888780', label: 'Budget' },
          ]}
        >
          {rOk && <Bar
            data={rollingWaterfallData(roll)}
            options={{
              ...BASE, scales: SCALES_USD,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${usd(ctx.raw)}` } } },
            }}
          />}
        </ChartCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <MetricCard label="Full-Year Estimate"   value={usd(roll.full_year_estimate)}   delta={`${fyLabel} rolling`}              sentiment="neu" />
          <MetricCard label="Actuals YTD"          value={usd(roll.actuals_ytd)}           delta="Booked through current period"     sentiment="pos" />
          <MetricCard label="Forecast Remainder"   value={usd(roll.forecast_remainder)}    delta="Projected remaining periods"       sentiment="neu" />
          <MetricCard label="Full-Year Budget"     value={usd(roll.full_year_budget)}       delta="Annual budget"                     sentiment="neu" />
          <MetricCard label="Variance to Budget"   value={usd(roll.variance_to_budget)}     delta={roll.variance_to_budget > 0 ? 'Over budget' : roll.variance_to_budget < 0 ? 'Under budget' : 'On budget'} sentiment={roll.variance_to_budget > 0 ? 'neg' : roll.variance_to_budget < 0 ? 'pos' : 'neu'} />
        </div>
      </div>

      {/* Rolling by_period chart (if data) */}
      {rOk && rollPerChart && (
        <div style={{ marginTop: 11 }}>
          <ChartCard
            title={`Rolling Forecast by Period — ${fyLabel}`}
            subtitle="Actuals vs Forecast vs Budget by period · Source: forecast_get_rolling"
            fn="fn-forecast-rolling"
            height={200}
            legend={[
              { color: '#1d9e75', label: 'Actual' },
              { color: '#7f77dd', label: 'Forecast' },
              { color: '#888780', label: 'Budget' },
            ]}
          >
            <Line data={rollPerChart} options={{ ...BASE, scales: SCALES_USD }} />
          </ChartCard>
        </div>
      )}

      {/* ── Section 3: Expense Forecast (forecast_get_expense) ── */}
      <div className="chart-grid chart-grid--21" style={{ marginTop: 11 }}>
        <ChartCard
          title={`Expense Forecast Summary — ${fyLabel} P1–P12`}
          subtitle={`${eSummary.confidence_level ?? 80}% confidence · Forecast vs Run Rate vs Budget · Source: forecast_get_expense`}
          fn="fn-forecast-expense"
          toolResult={expData}
          height={210}
          unavailable={!eOk}
          legend={[
            { color: '#3266ad', label: 'Forecast' },
            { color: '#7f77dd', label: 'Run Rate' },
            { color: '#888780', label: 'Budget' },
          ]}
        >
          {eOk && <Bar
            data={expenseSummaryBarData(eSummary)}
            options={{
              ...BASE, scales: SCALES_USD,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${usd(ctx.raw)}` } } },
            }}
          />}
        </ChartCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <MetricCard label="Total Forecast"     value={usd(eSummary.total_forecast)}     delta={`${fyLabel} full year`}                              sentiment="neu" />
          <MetricCard label="Run Rate"           value={usd(eSummary.total_run_rate)}     delta="Extrapolated from actuals"                           sentiment="neu" />
          <MetricCard label="Budget"             value={usd(eSummary.total_budget)}        delta="Approved annual budget"                              sentiment="neu" />
          <MetricCard label="Δ vs Run Rate"      value={usd(eSummary.delta_vs_run_rate)}  delta={(eSummary.delta_vs_run_rate ?? 0) > 0 ? 'Above run rate' : (eSummary.delta_vs_run_rate ?? 0) < 0 ? 'Below run rate' : 'At run rate'} sentiment={(eSummary.delta_vs_run_rate ?? 0) > 0 ? 'warn' : 'pos'} />
          <MetricCard label="Δ vs Budget"        value={usd(eSummary.delta_vs_budget)}    delta={(eSummary.delta_vs_budget ?? 0) > 0 ? 'Over budget' : (eSummary.delta_vs_budget ?? 0) < 0 ? 'Under budget' : 'On budget'} sentiment={(eSummary.delta_vs_budget ?? 0) > 0 ? 'neg' : 'pos'} />
        </div>
      </div>

      {/* Expense by_category bar (if data) */}
      {eOk && catChart && (
        <div style={{ marginTop: 11 }}>
          <ChartCard
            title={`Expense Forecast by Category — ${fyLabel}`}
            subtitle="Forecast by expense category · Source: forecast_get_expense"
            fn="fn-forecast-expense"
            height={200}
            legend={[ { color: '#3266ad', label: 'Forecast' } ]}
          >
            <Bar data={catChart} options={{ ...BASE, scales: SCALES_USD }} />
          </ChartCard>
        </div>
      )}

      {/* Expense by_period line (if data) */}
      {eOk && expPerChart && (
        <div style={{ marginTop: 11 }}>
          <ChartCard
            title={`Expense Forecast by Period — ${fyLabel}`}
            subtitle="Period-level expense forecast · Source: forecast_get_expense"
            fn="fn-forecast-expense"
            height={200}
            legend={[ { color: '#3266ad', label: 'Expense Forecast' } ]}
          >
            <Line data={expPerChart} options={{ ...BASE, scales: SCALES_USD }} />
          </ChartCard>
        </div>
      )}

      {/* ── Alerts ──────────────────────────────────────────── */}
      {(qOk || eOk || rOk) && <AlertPanel title="Forecast Alerts" items={buildAlerts(forecasts, apSummary, eSummary, roll, eCats)} />}
    </>
  )
}
