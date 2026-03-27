import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

import KpiStrip   from '../components/KpiStrip.jsx'
import ChartCard  from '../components/ChartCard.jsx'
import AlertPanel from '../components/AlertPanel.jsx'
import MetricCard from '../components/MetricCard.jsx'
import { useTool } from '../hooks/useTool.js'
import { useMemo } from 'react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
const TH = { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)', textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--color-border-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }
const TD = { fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderBottom: '0.5px solid var(--color-border-tertiary)' }

/* ── formatting ─────────────────────────────────────────────── */

function usd(v) {
  if (v == null) return '$0'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pctFmt(v) {
  if (v == null || !isFinite(v)) return 'N/A'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

/* ── deduplicate drivers by unique key ────────────────────── */

function dedupeDrivers(drivers) {
  const seen = new Set()
  const out = []
  for (const d of (drivers || [])) {
    const key = `${d.account}|${d.subsidiary}|${d.business_unit}|${d.budget}|${d.actual}`
    if (!seen.has(key)) { seen.add(key); out.push(d) }
  }
  return out
}

/* ── KPI strip ──────────────────────────────────────────────── */

function buildKpis(summary, drivers, fy, per) {
  const s = summary || {}
  const unique = dedupeDrivers(drivers)
  const unfav = unique.filter(d => d.direction === 'unfavorable').length
  const fav   = unique.filter(d => d.direction === 'favorable' || d.direction === 'on-target').length
  const varSign = (s.total_variance ?? 0) >= 0 ? '+' : ''
  return [
    { label: 'Total Budget',    value: usd(s.total_budget),   delta: `YTD FY20${String(fy).padStart(2,'0')} P1–P${per}`, sentiment: 'neu' },
    { label: 'Total Actual',    value: usd(s.total_actual),   delta: s.variance_pct != null ? `${pctFmt(s.variance_pct)} vs budget` : 'No budget baseline', sentiment: (s.total_actual ?? 0) > (s.total_budget ?? 0) ? 'neg' : 'pos' },
    { label: 'Net Variance',    value: `${varSign}${usd(s.total_variance)}`, delta: `${unfav} unfavorable · ${fav} favorable/on-target`, sentiment: (s.total_variance ?? 0) > 0 ? 'neg' : 'pos' },
    { label: 'Largest Driver',  value: unique.length > 0 ? usd(unique[0].abs_variance) : '$0', delta: unique.length > 0 ? `${unique[0].account_desc} (${unique[0].bu_name})` : 'None', sentiment: unique.length > 0 && unique[0].direction === 'unfavorable' ? 'neg' : 'pos' },
    { label: 'Driver Count',    value: String(unique.length), delta: `of ${drivers?.length ?? 0} rows returned`, sentiment: 'neu' },
  ]
}

/* ── tornado chart from drivers ─────────────────────────────── */

function tornadoData(drivers) {
  const unique = dedupeDrivers(drivers).filter(d => d.abs_variance > 0)
  const sorted = [...unique].sort((a, b) => b.abs_variance - a.abs_variance)
  return {
    labels: sorted.map(d => `${d.account_desc} (${d.account}.${d.subsidiary})`),
    datasets: [{
      label: 'Variance',
      data: sorted.map(d => d.variance),
      backgroundColor: sorted.map(d => d.direction === 'unfavorable' ? 'rgba(226,75,74,0.25)' : d.direction === 'favorable' ? 'rgba(99,153,34,0.25)' : 'rgba(136,135,128,0.18)'),
      borderColor:     sorted.map(d => d.direction === 'unfavorable' ? '#e24b4a' : d.direction === 'favorable' ? '#639922' : '#888780'),
      borderWidth: 1.5, borderRadius: 3,
    }],
  }
}

/* ── budget vs actual grouped bar from drivers ───────────── */

function budgetActualData(drivers) {
  const unique = dedupeDrivers(drivers)
  const sorted = [...unique].sort((a, b) => b.abs_variance - a.abs_variance)
  const labels = sorted.map(d => `${d.account_desc} (${d.account}.${d.subsidiary})`)
  return {
    labels,
    datasets: [
      { label: 'Budget', data: sorted.map(d => d.budget), backgroundColor: 'rgba(50,102,173,0.25)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3 },
      {
        label: 'Actual', data: sorted.map(d => d.actual),
        backgroundColor: sorted.map(d => d.actual > d.budget ? 'rgba(226,75,74,0.22)' : 'rgba(29,158,117,0.22)'),
        borderColor:     sorted.map(d => d.actual > d.budget ? '#e24b4a' : '#1d9e75'),
        borderWidth: 1.5, borderRadius: 3,
      },
    ],
  }
}

/* ── variance by BU (grouped) ──────────────────────────────── */

function varianceByBU(drivers) {
  const unique = dedupeDrivers(drivers)
  const buMap = {}
  for (const d of unique) {
    const key = d.bu_name || `BU ${d.business_unit}`
    if (!buMap[key]) buMap[key] = { budget: 0, actual: 0, variance: 0 }
    buMap[key].budget += d.budget
    buMap[key].actual += d.actual
    buMap[key].variance += d.variance
  }
  const sorted = Object.entries(buMap).sort((a, b) => Math.abs(b[1].variance) - Math.abs(a[1].variance))
  return {
    labels: sorted.map(([k]) => k),
    datasets: [
      { label: 'Budget', data: sorted.map(([, v]) => v.budget), backgroundColor: 'rgba(50,102,173,0.25)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3 },
      { label: 'Actual', data: sorted.map(([, v]) => v.actual),
        backgroundColor: sorted.map(([, v]) => v.actual > v.budget ? 'rgba(226,75,74,0.22)' : 'rgba(29,158,117,0.22)'),
        borderColor: sorted.map(([, v]) => v.actual > v.budget ? '#e24b4a' : '#1d9e75'),
        borderWidth: 1.5, borderRadius: 3 },
    ],
  }
}

/* ── alerts ─────────────────────────────────────────────────── */

function buildAlerts(drivers, summary) {
  const unique = dedupeDrivers(drivers)
  const alerts = []

  if ((summary?.total_budget ?? 0) === 0 && (summary?.total_actual ?? 0) !== 0) {
    alerts.push({ severity: 'warning', text: `No budget amounts loaded for this period. All actual spend of ${usd(summary.total_actual)} shows as variance. Ensure BA ledger type is populated.`, meta: 'fn-variance-budget-vs-actual · F0902 · ledger type BA' })
  }

  for (const d of unique.filter(d => d.direction === 'unfavorable').slice(0, 3)) {
    const pctStr = d.variance_pct != null && isFinite(d.variance_pct) ? ` (${pctFmt(d.variance_pct)})` : ' (no budget baseline)'
    alerts.push({
      severity: d.abs_variance > 500 ? 'critical' : 'warning',
      text: `${d.account_desc} — Acct ${d.account}.${d.subsidiary}, BU "${d.bu_name}": actual ${usd(d.actual)} vs budget ${usd(d.budget)}${pctStr}.`,
      meta: `fn-variance-budget-vs-actual · obj ${d.account} · sub ${d.subsidiary} · BU ${d.business_unit}`,
    })
  }

  const onTarget = unique.filter(d => d.direction === 'on-target')
  if (onTarget.length > 0) {
    alerts.push({ severity: 'info', text: `${onTarget.length} account(s) on-target with zero variance: ${onTarget.map(d => d.account_desc).join(', ')}.`, meta: 'fn-variance-budget-vs-actual · on-target' })
  }

  return alerts
}

/* ── driver detail table ───────────────────────────────────── */

function DriverTable({ drivers }) {
  const unique = dedupeDrivers(drivers)
  if (unique.length === 0) return null
  const sorted = [...unique].sort((a, b) => b.abs_variance - a.abs_variance)
  return (
    <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border-tertiary)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500, borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        Variance Drivers Detail
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{unique.length} unique accounts</span>
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Acct</th>
              <th style={TH}>Sub</th>
              <th style={TH}>Description</th>
              <th style={TH}>BU</th>
              <th style={TH}>BU Name</th>
              <th style={{ ...TH, textAlign: 'right' }}>Budget</th>
              <th style={{ ...TH, textAlign: 'right' }}>Actual</th>
              <th style={{ ...TH, textAlign: 'right' }}>Variance</th>
              <th style={{ ...TH, textAlign: 'right' }}>Var %</th>
              <th style={TH}>Direction</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-primary)' }}>
                <td style={TD}>{d.account}</td>
                <td style={TD}>{d.subsidiary}</td>
                <td style={TD}>{d.account_desc}</td>
                <td style={TD}>{d.business_unit}</td>
                <td style={TD}>{d.bu_name}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{usd(d.budget)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{usd(d.actual)}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 500, color: d.direction === 'unfavorable' ? 'var(--red, #e24b4a)' : d.direction === 'favorable' ? 'var(--green, #639922)' : undefined }}>{usd(d.variance)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{pctFmt(d.variance_pct)}</td>
                <td style={{ ...TD, textTransform: 'uppercase', fontSize: 9, fontWeight: 600, color: d.direction === 'unfavorable' ? '#e24b4a' : d.direction === 'favorable' ? '#639922' : '#888780' }}>{d.direction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── main component ─────────────────────────────────────────── */

export default function VarianceTab({ fiscalYear = 25, period = 6 }) {
  const bvaParams = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: period, top_n_drivers: 8 }), [fiscalYear, period])
  const pcParams  = useMemo(() => ({ comparison_type: 'YoY', fiscal_year: fiscalYear, period }), [fiscalYear, period])
  const { data: bvaData, loading: bvaLoading, refetch: rBva } = useTool('variance_get_budget_vs_actual', bvaParams)
  const { data: pcData,  loading: pcLoading, refetch: rPc }   = useTool('variance_get_period_comparison', pcParams)
  const refreshAll = () => { rBva(); rPc() }

  const bvaOk = !!bvaData
  const pcOk  = !!pcData
  const summary = bvaOk ? (bvaData.result?.summary ?? bvaData.summary ?? {}) : {}
  const drivers = bvaOk ? (bvaData.result?.drivers ?? bvaData.drivers ?? []) : []
  const meta    = bvaOk ? (bvaData.result?.metadata ?? bvaData.metadata ?? {}) : {}
  const p = pcOk ? pcData.result : null

  const loading = bvaLoading || pcLoading

  const fyLabel   = `FY20${String(fiscalYear).padStart(2, '0')}`
  const prevLabel = `FY20${String(fiscalYear - 1).padStart(2, '0')}`

  const SCALES_USD_H = {
    x: { ticks: { color: TC, font: { size: 10 }, callback: v => usd(v) }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
  }
  const SCALES_USD_V = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => usd(v) }, grid: { color: GC } },
  }

  if (loading && !bvaOk && !pcOk) return <div className="tab-loading">Loading variance data…</div>

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={refreshAll} disabled={loading} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>{loading ? 'Refreshing…' : '↻ Refresh Data'}</button>
      </div>
      {bvaOk && <KpiStrip items={buildKpis(summary, drivers, fiscalYear, period)} cols={5} />}

      {/* Row 1: Tornado + Budget vs Actual */}
      <div className="chart-grid chart-grid--2">
        <ChartCard
          title="Variance Tornado — by Account"
          subtitle={`YTD ${fyLabel} P${meta.period_from ?? 1}–P${meta.period_to ?? period} · Red = unfavorable · Green = favorable · Source: F0902`}
          fn="fn-variance-budget-vs-actual"
          toolResult={bvaData}
          height={Math.max(180, dedupeDrivers(drivers).filter(d => d.abs_variance > 0).length * 38)}
          unavailable={!bvaOk}
          legend={[
            { color: '#e24b4a', label: 'Unfavorable' },
            { color: '#639922', label: 'Favorable' },
            { color: '#888780', label: 'On-Target' },
          ]}
        >
          {bvaOk && <Bar
            data={tornadoData(drivers)}
            options={{
              ...BASE, indexAxis: 'y',
              scales: SCALES_USD_H,
              plugins: { legend: { display: false }, tooltip: { callbacks: {
                label: ctx => {
                  const d = dedupeDrivers(drivers).filter(d => d.abs_variance > 0).sort((a, b) => b.abs_variance - a.abs_variance)[ctx.dataIndex]
                  return d ? `${d.direction}: ${usd(d.variance)} (Budget: ${usd(d.budget)}, Actual: ${usd(d.actual)})` : usd(ctx.raw)
                },
              }}},
            }}
          />}
        </ChartCard>

        <ChartCard
          title="Budget vs Actual — by Account"
          subtitle={`YTD ${fyLabel} · Blue = Budget · Red/Green = Actual · Source: F0902 BA vs AA`}
          fn="fn-variance-budget-vs-actual"
          height={Math.max(180, dedupeDrivers(drivers).length * 38)}
          unavailable={!bvaOk}
          legend={[
            { color: '#3266ad', label: 'Budget' },
            { color: '#1d9e75', label: 'Favorable' },
            { color: '#e24b4a', label: 'Unfavorable' },
          ]}
        >
          {bvaOk && <Bar
            data={budgetActualData(drivers)}
            options={{
              ...BASE, indexAxis: 'y',
              scales: SCALES_USD_H,
              plugins: { legend: { display: false }, tooltip: { callbacks: {
                label: ctx => `${ctx.dataset.label}: ${usd(ctx.raw)}`,
              }}},
            }}
          />}
        </ChartCard>
      </div>

      {/* Row 2: Variance by BU + YoY metrics */}
      <div className="chart-grid chart-grid--21" style={{ marginTop: 11 }}>
        <ChartCard
          title={`Variance by Business Unit — ${fyLabel}`}
          subtitle="Grouped by BU · Budget vs Actual · Source: F0902"
          fn="fn-variance-budget-vs-actual"
          height={200}
          unavailable={!bvaOk}
          legend={[
            { color: '#3266ad', label: 'Budget' },
            { color: '#1d9e75', label: 'Favorable' },
            { color: '#e24b4a', label: 'Unfavorable' },
          ]}
        >
          {bvaOk && <Bar
            data={varianceByBU(drivers)}
            options={{
              ...BASE,
              scales: SCALES_USD_V,
              plugins: { legend: { display: false }, tooltip: { callbacks: {
                label: ctx => `${ctx.dataset.label}: ${usd(ctx.raw)}`,
              }}},
            }}
          />}
        </ChartCard>

        {pcOk ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <MetricCard label="Revenue YoY" value={pctFmt(p?.deltas?.revenue?.pct ?? p?.delta_pct)} delta={usd(p?.deltas?.revenue?.amount ?? p?.delta ?? 0)} sentiment="pos" />
            <MetricCard label="OpEx YoY"    value={pctFmt(p?.deltas?.opex?.pct)} delta={usd(p?.deltas?.opex?.amount ?? 0)} sentiment="neg" />
            <MetricCard label="Net Inc YoY" value={pctFmt(p?.deltas?.net_income?.pct)} delta={usd(p?.deltas?.net_income?.amount ?? 0)} sentiment="pos" />
            <MetricCard label="Gross Margin Δ" value={`${p?.deltas?.gross_margin_pct?.amount != null ? (p.deltas.gross_margin_pct.amount >= 0 ? '+' : '') + p.deltas.gross_margin_pct.amount : 0}pp`} delta="YoY percentage points" sentiment="pos" />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="chart-unavailable">Can't load period comparison</span>
          </div>
        )}
      </div>

      {/* Row 3: Driver detail table */}
      {bvaOk && drivers.length > 0 && (
        <div style={{ marginTop: 11 }}>
          <DriverTable drivers={drivers} />
        </div>
      )}

      {/* Row 4: Alerts */}
      {bvaOk && <AlertPanel title="Variance Alerts" items={buildAlerts(drivers, summary)} />}
    </>
  )
}
