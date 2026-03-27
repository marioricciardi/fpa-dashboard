import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Tooltip, Legend
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

import KpiStrip  from '../components/KpiStrip.jsx'
import ChartCard from '../components/ChartCard.jsx'
import MetricCard from '../components/MetricCard.jsx'
import { useTool } from '../hooks/useTool.js'
import { useMemo } from 'react'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

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
  return `${v.toFixed(1)}%`
}

/* ── data access ────────────────────────────────────────────── */
function pnl(data) { return data?.result?.pnl_summary ?? data?.pnl_summary ?? {} }
function wf(data)  { return data?.result?.waterfall ?? data?.waterfall ?? [] }
function br(data)  { return data?.result?.bridge ?? data?.bridge ?? [] }
function bp(data)  { return data?.result?.by_period ?? data?.by_period ?? [] }
function prod(data){ return data?.result?.revenue_by_product ?? data?.revenue_by_product ?? [] }
function meta(data){ return data?.result?.metadata ?? data?.metadata ?? {} }

/* ── KPI strip (CFO-level summary) ──────────────────────────── */

function buildKpis(s, bridge, fy) {
  const priorEbitda = bridge.find(b => b.type === 'start')?.amount ?? 0
  const revChange   = bridge.find(b => b.driver?.includes('Revenue'))?.amount ?? 0
  return [
    { label: 'Revenue',        value: usd(s.revenue),       delta: revChange !== 0 ? `${usd(revChange)} vs prior year` : 'No change', sentiment: s.revenue > 0 ? 'pos' : 'neu' },
    { label: 'Gross Profit',   value: usd(s.gross_profit),  delta: s.gross_margin_pct != null ? `${pctFmt(s.gross_margin_pct)} margin` : 'No revenue', sentiment: s.gross_profit > 0 ? 'pos' : 'warn' },
    { label: 'EBITDA',         value: usd(s.ebitda),        delta: s.ebitda_margin_pct != null ? `${pctFmt(s.ebitda_margin_pct)} margin` : 'N/A', sentiment: s.ebitda > 0 ? 'pos' : 'warn' },
    { label: 'EBIT',           value: usd(s.ebit),          delta: s.ebit_margin_pct != null ? `${pctFmt(s.ebit_margin_pct)} margin` : 'N/A', sentiment: s.ebit > 0 ? 'pos' : 'warn' },
    { label: 'Prior Yr EBITDA', value: usd(priorEbitda),    delta: `FY20${String(fy - 1).padStart(2, '0')} comparison`, sentiment: 'neu' },
  ]
}

/* ── P&L waterfall chart ────────────────────────────────────── */

function waterfallData(steps) {
  const labels = steps.map(s => s.label)
  const data   = steps.map(s => s.amount)
  const colors = steps.map(s =>
    s.type === 'total'    ? 'rgba(50,102,173,0.35)' :
    s.type === 'negative' ? 'rgba(226,75,74,0.30)' :
                            'rgba(29,158,117,0.30)'
  )
  const borders = steps.map(s =>
    s.type === 'total'    ? '#3266ad' :
    s.type === 'negative' ? '#e24b4a' :
                            '#1d9e75'
  )
  return {
    labels,
    datasets: [{
      label: 'P&L Waterfall',
      data,
      backgroundColor: colors,
      borderColor: borders,
      borderWidth: 1.5, borderRadius: 3,
    }],
  }
}

/* ── EBITDA bridge chart ────────────────────────────────────── */

function bridgeData(steps) {
  const labels = steps.map(s => s.driver)
  const data   = steps.map(s => s.amount)
  const colors = steps.map(s =>
    s.type === 'start' ? 'rgba(136,135,128,0.30)' :
    s.type === 'end'   ? 'rgba(50,102,173,0.35)' :
    s.amount >= 0      ? 'rgba(29,158,117,0.30)' :
                         'rgba(226,75,74,0.30)'
  )
  const borders = steps.map(s =>
    s.type === 'start' ? '#888780' :
    s.type === 'end'   ? '#3266ad' :
    s.amount >= 0      ? '#1d9e75' :
                         '#e24b4a'
  )
  return {
    labels,
    datasets: [{
      label: 'EBITDA Bridge',
      data,
      backgroundColor: colors,
      borderColor: borders,
      borderWidth: 1.5, borderRadius: 3,
    }],
  }
}

/* ── Period trend line chart ────────────────────────────────── */

function periodTrendData(periods) {
  const labels = periods.map(p => `P${p.period_num}`)
  return {
    labels,
    datasets: [
      { label: 'Revenue',      data: periods.map(p => p.revenue),      borderColor: '#3266ad', backgroundColor: 'transparent', pointRadius: 3, tension: 0.3, borderWidth: 2 },
      { label: 'COGS',         data: periods.map(p => p.cogs),         borderColor: '#e24b4a', backgroundColor: 'transparent', pointRadius: 0, tension: 0.3, borderWidth: 2, borderDash: [4, 2] },
      { label: 'Gross Profit', data: periods.map(p => p.gross_profit), borderColor: '#1d9e75', backgroundColor: 'transparent', pointRadius: 3, tension: 0.3, borderWidth: 2 },
      { label: 'SG&A',         data: periods.map(p => p.sga),          borderColor: '#ef9f27', backgroundColor: 'transparent', pointRadius: 0, tension: 0.3, borderWidth: 2, borderDash: [3, 3] },
      { label: 'EBITDA',       data: periods.map(p => p.ebitda),       borderColor: '#7f77dd', backgroundColor: 'transparent', pointRadius: 3, tension: 0.3, borderWidth: 2 },
    ],
  }
}

/* ── Product margin bar chart ───────────────────────────────── */

function productMarginData(products) {
  const labels = products.map(p => `Item ${p.item}`)
  return {
    labels,
    datasets: [
      { label: 'Revenue', data: products.map(p => p.revenue), backgroundColor: 'rgba(50,102,173,0.30)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3 },
      { label: 'COGS',    data: products.map(p => p.cogs),    backgroundColor: 'rgba(226,75,74,0.25)', borderColor: '#e24b4a', borderWidth: 1.5, borderRadius: 3 },
      { label: 'Margin',  data: products.map(p => p.gross_margin), backgroundColor: 'rgba(29,158,117,0.25)', borderColor: '#1d9e75', borderWidth: 1.5, borderRadius: 3 },
    ],
  }
}

/* ── Period detail table ────────────────────────────────────── */

function PeriodTable({ periods }) {
  if (!periods || periods.length === 0) return null
  return (
    <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border-tertiary)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500, borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        Period Detail — P&L by Period
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{periods.length} periods</span>
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Period</th>
              <th style={{ ...TH, textAlign: 'right' }}>Revenue</th>
              <th style={{ ...TH, textAlign: 'right' }}>COGS</th>
              <th style={{ ...TH, textAlign: 'right' }}>Gross Profit</th>
              <th style={{ ...TH, textAlign: 'right' }}>GM %</th>
              <th style={{ ...TH, textAlign: 'right' }}>SG&A</th>
              <th style={{ ...TH, textAlign: 'right' }}>D&A</th>
              <th style={{ ...TH, textAlign: 'right' }}>EBITDA</th>
              <th style={{ ...TH, textAlign: 'right' }}>EBITDA %</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-primary)' }}>
                <td style={TD}>P{p.period_num}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{usd(p.revenue)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{usd(p.cogs)}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 500 }}>{usd(p.gross_profit)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{pctFmt(p.gross_margin_pct)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{usd(p.sga)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{usd(p.da)}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 500 }}>{usd(p.ebitda)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{pctFmt(p.ebitda_margin_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Product margin table ───────────────────────────────────── */

function ProductTable({ products }) {
  if (!products || products.length === 0) return null
  return (
    <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border-tertiary)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500, borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        Revenue by Product Line
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{products.length} items</span>
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Item</th>
              <th style={{ ...TH, textAlign: 'right' }}>Revenue</th>
              <th style={{ ...TH, textAlign: 'right' }}>COGS</th>
              <th style={{ ...TH, textAlign: 'right' }}>Gross Margin</th>
              <th style={{ ...TH, textAlign: 'right' }}>Margin %</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-primary)' }}>
                <td style={TD}>{p.item}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{usd(p.revenue)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{usd(p.cogs)}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 500, color: p.gross_margin >= 0 ? 'var(--green, #639922)' : 'var(--red, #e24b4a)' }}>{usd(p.gross_margin)}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 500 }}>{pctFmt(p.margin_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── main component ─────────────────────────────────────────── */

export default function PnLTab({ fiscalYear = 25, period = 6 }) {
  const pnlParams = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: period, comparison_year: fiscalYear - 1 }), [fiscalYear, period])
  const { data: toolResult, loading, refetch } = useTool('pnl_get_analysis', pnlParams)
  const ok = !!toolResult

  const s       = ok ? pnl(toolResult)  : {}
  const steps   = ok ? wf(toolResult)   : []
  const bSteps  = ok ? br(toolResult)   : []
  const periods = ok ? bp(toolResult)   : []
  const products = ok ? prod(toolResult) : []
  const m       = ok ? meta(toolResult)  : {}

  const fyLabel   = `FY20${String(fiscalYear).padStart(2, '0')}`
  const prevLabel = `FY20${String(fiscalYear - 1).padStart(2, '0')}`

  const SCALES_USD = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => usd(v) }, grid: { color: GC } },
  }

  if (loading && !ok) return <div className="tab-loading">Loading P&amp;L data…</div>

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={refetch} disabled={loading} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>{loading ? 'Refreshing…' : '↻ Refresh Data'}</button>
      </div>
      {ok && <KpiStrip items={buildKpis(s, bSteps, fiscalYear)} cols={5} />}

      {/* Row 1: P&L Waterfall + EBITDA Bridge */}
      <div className="chart-grid chart-grid--2">
        <ChartCard
          title="P&L Waterfall — Revenue to EBIT"
          subtitle={`YTD ${fyLabel} P${m.period_from ?? 1}–P${m.period_to ?? period} · Source: F0902 · account types R and X`}
          fn="fn-pnl-analysis"
          toolResult={toolResult}
          height={220}
          unavailable={!ok || steps.length === 0}
          legend={[
            { color: '#3266ad', label: 'Total/Subtotal' },
            { color: '#e24b4a', label: 'Cost/Expense' },
            { color: '#1d9e75', label: 'Positive' },
          ]}
        >
          {ok && steps.length > 0 && <Bar
            data={waterfallData(steps)}
            options={{
              ...BASE, scales: SCALES_USD,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${usd(ctx.raw)}` } } },
            }}
          />}
        </ChartCard>

        <ChartCard
          title={`EBITDA Bridge — ${prevLabel} to ${fyLabel}`}
          subtitle={`YoY change drivers · Source: F0902`}
          fn="fn-pnl-analysis"
          height={220}
          unavailable={!ok || bSteps.length === 0}
          legend={[
            { color: '#888780', label: 'Start/End' },
            { color: '#1d9e75', label: 'Positive Δ' },
            { color: '#e24b4a', label: 'Negative Δ' },
          ]}
        >
          {ok && bSteps.length > 0 && <Bar
            data={bridgeData(bSteps)}
            options={{
              ...BASE, scales: SCALES_USD,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${usd(ctx.raw)}` } } },
            }}
          />}
        </ChartCard>
      </div>

      {/* Row 2: Period trend + P&L metrics */}
      <div className="chart-grid chart-grid--21" style={{ marginTop: 11 }}>
        <ChartCard
          title={`Period Trend — ${fyLabel} P${m.period_from ?? 1}–P${m.period_to ?? period}`}
          subtitle="Revenue / COGS / Gross Profit / SG&A / EBITDA · Source: F0902"
          fn="fn-pnl-analysis"
          height={200}
          unavailable={!ok || periods.length === 0}
          legend={[
            { color: '#3266ad', label: 'Revenue' },
            { color: '#e24b4a', label: 'COGS' },
            { color: '#1d9e75', label: 'Gross Profit' },
            { color: '#ef9f27', label: 'SG&A' },
            { color: '#7f77dd', label: 'EBITDA' },
          ]}
        >
          {ok && periods.length > 0 && <Line
            data={periodTrendData(periods)}
            options={{ ...BASE, scales: SCALES_USD }}
          />}
        </ChartCard>

        {ok ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <MetricCard label="Revenue"      value={usd(s.revenue)}      delta={`${fyLabel} YTD`}                               sentiment={s.revenue > 0 ? 'pos' : 'neu'} />
            <MetricCard label="COGS"         value={usd(s.cogs)}         delta={s.revenue ? `${pctFmt((s.cogs / s.revenue) * 100)} of revenue` : 'N/A'} sentiment="neg" />
            <MetricCard label="SG&A"         value={usd(s.sga)}          delta="Selling, General & Admin"                        sentiment="neg" />
            <MetricCard label="R&D"          value={usd(s.rd)}           delta="Research & Development"                          sentiment="neu" />
            <MetricCard label="D&A"          value={usd(s.da)}           delta="Depreciation & Amortization"                     sentiment="neu" />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="chart-unavailable">Can't load</span>
          </div>
        )}
      </div>

      {/* Row 3: Product margins (chart + table) */}
      {ok && products.length > 0 && (
        <div className="chart-grid chart-grid--21" style={{ marginTop: 11 }}>
          <ChartCard
            title="Revenue by Product Line"
            subtitle={`Revenue / COGS / Gross Margin · ${fyLabel} YTD`}
            fn="fn-pnl-analysis"
            height={180}
            legend={[
              { color: '#3266ad', label: 'Revenue' },
              { color: '#e24b4a', label: 'COGS' },
              { color: '#1d9e75', label: 'Gross Margin' },
            ]}
          >
            <Bar
              data={productMarginData(products)}
              options={{ ...BASE, scales: SCALES_USD, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${usd(ctx.raw)}` } } } }}
            />
          </ChartCard>

          <ProductTable products={products} />
        </div>
      )}

      {/* Row 4: Period detail table */}
      {ok && periods.length > 0 && (
        <div style={{ marginTop: 11 }}>
          <PeriodTable periods={periods} />
        </div>
      )}
    </>
  )
}
