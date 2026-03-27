import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Bar, Doughnut } from 'react-chartjs-2'

import KpiStrip  from '../components/KpiStrip.jsx'
import ChartCard from '../components/ChartCard.jsx'
import MetricCard from '../components/MetricCard.jsx'
import { useTool } from '../hooks/useTool.js'
import { useMemo } from 'react'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }

/* ── helpers ───────────────────────────────────────────────────── */

function usd(v) {
  if (v == null) return '$0'
  const abs = Math.abs(v)
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pct(v, digits = 2) {
  if (v == null) return 'N/A'
  return `${v.toFixed(digits)}%`
}

function ratio(v) {
  if (v == null) return 'N/A'
  return v.toFixed(2)
}

/** Navigate the actual API response to the balance_sheet sub-object */
function bs(r) { return r?.balance_sheet ?? r ?? {} }

/** Group account lines by account_desc, summing balances */
function groupAccounts(accounts) {
  const map = {}
  for (const a of (accounts || [])) {
    const key = a.account_desc || `Obj ${a.object_account}`
    map[key] = (map[key] || 0) + (a.balance ?? 0)
  }
  return Object.entries(map).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
}

/* ── KPI strip (CFO-level summary) ──────────────────────────── */

function buildKpis(r) {
  const b = bs(r)
  const ca = b.assets?.current_assets?.total ?? 0
  const nca = b.assets?.non_current_assets?.total ?? 0
  const cl = b.liabilities?.current_liabilities?.total ?? 0
  const ncl = b.liabilities?.non_current_liabilities?.total ?? 0
  const eq = b.equity?.total ?? 0
  const totalA = b.total_assets ?? (ca + nca)
  const totalL = b.total_liabilities ?? (cl + ncl)
  const rat = r?.ratios ?? {}
  const wc = ca - cl

  return [
    { label: 'Total Assets',      value: usd(totalA),             delta: `CA: ${usd(ca)} · NCA: ${usd(nca)}`, sentiment: 'neu' },
    { label: 'Total Liabilities',  value: usd(totalL),             delta: `CL: ${usd(cl)} · LT: ${usd(ncl)}`, sentiment: 'neu' },
    { label: 'Total Equity',      value: usd(eq),                 delta: eq === 0 ? 'No equity posted' : undefined, sentiment: eq > 0 ? 'pos' : 'warn' },
    { label: 'Working Capital',   value: usd(wc),                 delta: `CA − CL · ${wc >= 0 ? 'Positive' : '⚠ Negative'}`, sentiment: wc >= 0 ? 'pos' : 'neg' },
    { label: 'Current Ratio',     value: ratio(rat.current_ratio), delta: rat.current_ratio != null && rat.current_ratio > 1.5 ? 'Healthy (>1.5)' : '⚠ Below 1.5', sentiment: rat.current_ratio != null && rat.current_ratio > 1.5 ? 'pos' : 'warn' },
  ]
}

/* ── A = L + E stacked bar ──────────────────────────────────── */

function aleBarData(r) {
  const b = bs(r)
  const ca = b.assets?.current_assets?.total ?? 0
  const nca = b.assets?.non_current_assets?.total ?? 0
  const cl = b.liabilities?.current_liabilities?.total ?? 0
  const ncl = b.liabilities?.non_current_liabilities?.total ?? 0
  const eq = b.equity?.total ?? 0
  return {
    labels: ['Assets', 'Liabilities + Equity'],
    datasets: [
      { label: 'Current Assets',     data: [ca, 0],  backgroundColor: 'rgba(50,102,173,0.35)',  borderColor: '#3266ad', borderWidth: 1, borderRadius: 3 },
      { label: 'Non-Current Assets', data: [nca, 0], backgroundColor: 'rgba(50,102,173,0.15)',  borderColor: '#3266ad', borderWidth: 1, borderRadius: 3 },
      { label: 'Current Liabilities', data: [0, cl], backgroundColor: 'rgba(226,75,74,0.35)',   borderColor: '#e24b4a', borderWidth: 1, borderRadius: 3 },
      { label: 'Non-Current Liabilities', data: [0, ncl], backgroundColor: 'rgba(226,75,74,0.15)', borderColor: '#e24b4a', borderWidth: 1, borderRadius: 3 },
      { label: 'Equity',              data: [0, eq], backgroundColor: 'rgba(127,119,221,0.35)', borderColor: '#7f77dd', borderWidth: 1, borderRadius: 3 },
    ],
  }
}

/* ── Current assets doughnut (from actual accounts) ─────────── */

function assetDoughnut(r) {
  const accts = bs(r).assets?.current_assets?.accounts || []
  const grouped = groupAccounts(accts).slice(0, 8) // top 8
  const labels = grouped.map(([k]) => k)
  const data = grouped.map(([, v]) => v)
  const COLORS = ['#3266ad','#1d9e75','#7f77dd','#ef9f27','#e24b4a','#639922','#888780','#b08d57']
  return {
    labels,
    datasets: [{
      data,
      backgroundColor: COLORS.slice(0, data.length),
      borderWidth: 0, hoverOffset: 4,
    }],
  }
}

/* ── Trend bar (current vs prior year) ─────────────────────── */

function trendBarData(r, fiscalYear) {
  const trend = r?.trend || []
  if (trend.length === 0) return null
  const labels = trend.map(t => t.period_label)
  return {
    labels,
    datasets: [
      { label: 'Total Assets', data: trend.map(t => t.total_assets ?? 0),      backgroundColor: 'rgba(50,102,173,0.3)',  borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3 },
      { label: 'Total Liabilities', data: trend.map(t => t.total_liabilities ?? 0), backgroundColor: 'rgba(226,75,74,0.3)', borderColor: '#e24b4a', borderWidth: 1.5, borderRadius: 3 },
      { label: 'Total Equity', data: trend.map(t => t.total_equity ?? 0),      backgroundColor: 'rgba(127,119,221,0.3)', borderColor: '#7f77dd', borderWidth: 1.5, borderRadius: 3 },
    ],
  }
}

/* ── Account detail table (for controllers) ────────────────── */

const TH = { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)', textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--color-border-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }
const TD = { fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderBottom: '0.5px solid var(--color-border-tertiary)' }

function AccountTable({ title, accounts, color }) {
  if (!accounts || accounts.length === 0) return null
  const sorted = [...accounts].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
  return (
    <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border-tertiary)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 500, borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
        {title}
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{accounts.length} accounts</span>
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Obj</th>
              <th style={TH}>Sub</th>
              <th style={TH}>Description</th>
              <th style={TH}>BU</th>
              <th style={{ ...TH, textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-primary)' }}>
                <td style={TD}>{a.object_account}</td>
                <td style={TD}>{a.subsidiary}</td>
                <td style={TD}>{a.account_desc}</td>
                <td style={TD}>{a.business_unit}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 500, color: a.balance < 0 ? 'var(--red)' : undefined }}>{usd(a.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── main component ─────────────────────────────────────────── */

export default function BalanceSheetTab({ fiscalYear = 25, period = 6 }) {
  const bsParams = useMemo(() => ({ fiscal_year: fiscalYear, period, comparison_year: fiscalYear - 1, comparison_period: period }), [fiscalYear, period])
  const { data: toolResult, loading, refetch } = useTool('balancesheet_get_analysis', bsParams)
  const ok = !!toolResult
  const r  = ok ? toolResult.result : null

  const b = ok ? bs(r) : null
  const meta = r?.metadata ?? {}
  const rat  = r?.ratios ?? {}
  const balanced = b?.balanced ?? meta?.balanced

  const fyLabel   = `FY20${String(fiscalYear).padStart(2, '0')}`
  const prevLabel = `FY20${String(fiscalYear - 1).padStart(2, '0')}`

  const SCALES_USD = {
    x: { stacked: true, ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { stacked: true, ticks: { color: TC, font: { size: 10 }, callback: v => usd(v) }, grid: { color: GC } },
  }
  const SCALES_TREND = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => usd(v) }, grid: { color: GC } },
  }

  if (loading && !ok) return <div className="tab-loading">Loading balance sheet data…</div>

  const trendData = ok ? trendBarData(r, fiscalYear) : null

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={refetch} disabled={loading} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>{loading ? 'Refreshing…' : '↻ Refresh Data'}</button>
      </div>
      {ok && <KpiStrip items={buildKpis(r)} cols={5} />}

      {/* Row 1: A=L+E stacked bar + Asset composition doughnut */}
      <div className="chart-grid chart-grid--21">
        <ChartCard
          title="A = L + E — Balance Sheet Components"
          subtitle={`${fyLabel} P${period} · Source: F0902 (A/L/Q ledger types) + F0901 account master`}
          fn="fn-balancesheet-analysis"
          toolResult={toolResult}
          height={220}
          unavailable={!ok}
          legend={[
            { color: '#3266ad', label: 'Assets' },
            { color: '#e24b4a', label: 'Liabilities' },
            { color: '#7f77dd', label: 'Equity' },
          ]}
        >
          {ok && <Bar data={aleBarData(r)} options={{ ...BASE, scales: SCALES_USD, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${usd(ctx.raw)}` } } } }} />}
        </ChartCard>

        <ChartCard
          title="Current Asset Composition"
          subtitle={`Top accounts by balance · ${fyLabel} P${period}`}
          fn="fn-balancesheet-analysis"
          height={200}
          unavailable={!ok}
        >
          {ok && <Doughnut
            data={assetDoughnut(r)}
            plugins={[ChartDataLabels]}
            options={{
              responsive: true, maintainAspectRatio: false, cutout: '55%',
              plugins: {
                legend: { display: true, position: 'right', labels: { color: TC, font: { size: 9 }, boxWidth: 9, padding: 6 } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${usd(ctx.raw)}` } },
                datalabels: {
                  color: TC, font: { size: 9, weight: 500 }, anchor: 'end', align: 'end', offset: 2,
                  formatter: v => usd(v),
                  display: ctx => Math.abs(ctx.dataset.data[ctx.dataIndex]) > 0,
                },
              },
            }}
          />}
        </ChartCard>
      </div>

      {ok && (
        <>
          {/* Row 2: Financial ratios + Balance check */}
          <div className="chart-grid chart-grid--3" style={{ marginTop: 11 }}>
            <MetricCard label="Current Ratio"       value={ratio(rat.current_ratio)}   delta="Current Assets / Current Liabilities"                     sentiment={rat.current_ratio != null && rat.current_ratio > 1.5 ? 'pos' : 'warn'} />
            <MetricCard label="Quick Ratio"         value={ratio(rat.quick_ratio)}     delta="(CA − Inventory) / CL"                                    sentiment={rat.quick_ratio != null && rat.quick_ratio > 1.0 ? 'pos' : 'warn'} />
            <MetricCard label="Debt to Assets"      value={rat.debt_to_assets != null ? pct(rat.debt_to_assets * 100) : 'N/A'} delta="Total Liabilities / Total Assets" sentiment={rat.debt_to_assets != null && rat.debt_to_assets < 0.5 ? 'pos' : 'warn'} />
          </div>

          <div className="chart-grid chart-grid--3" style={{ marginTop: 9 }}>
            <MetricCard label="Debt / Equity"       value={ratio(rat.debt_to_equity)}  delta={rat.debt_to_equity == null ? 'No equity — cannot compute' : 'Total Liabilities / Total Equity'} sentiment={rat.debt_to_equity != null && rat.debt_to_equity < 1.0 ? 'pos' : 'warn'} />
            <MetricCard label="Equity Multiplier"   value={ratio(rat.equity_multiplier)} delta={rat.equity_multiplier == null ? 'No equity — cannot compute' : 'Total Assets / Total Equity'} sentiment="neu" />
            <MetricCard label="Balance Sheet Check"
              value={balanced === true ? 'BALANCED ✓' : balanced === false ? `IMBALANCE: ${usd(meta.imbalance_amount)}` : 'Unknown'}
              delta="A − (L + E) must = 0"
              sentiment={balanced === true ? 'pos' : 'neg'}
            />
          </div>

          {/* Row 3: Trend — current vs prior year */}
          {trendData && (
            <div style={{ marginTop: 11 }}>
              <ChartCard
                title={`Period Trend — ${prevLabel} vs ${fyLabel}`}
                subtitle={`Total Assets / Liabilities / Equity at P${period} · Source: F0902`}
                fn="fn-balancesheet-analysis"
                height={180}
                legend={[
                  { color: '#3266ad', label: 'Assets' },
                  { color: '#e24b4a', label: 'Liabilities' },
                  { color: '#7f77dd', label: 'Equity' },
                ]}
              >
                <Bar data={trendData} options={{ ...BASE, scales: SCALES_TREND, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${usd(ctx.raw)}` } } } }} />
              </ChartCard>
            </div>
          )}

          {/* Row 4: Account detail tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginTop: 11 }}>
            <AccountTable title="Current Assets" accounts={b.assets?.current_assets?.accounts} color="#3266ad" />
            <AccountTable title="Current Liabilities" accounts={b.liabilities?.current_liabilities?.accounts} color="#e24b4a" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginTop: 9 }}>
            <AccountTable title="Non-Current Assets" accounts={b.assets?.non_current_assets?.accounts} color="rgba(50,102,173,0.6)" />
            <AccountTable title="Non-Current Liabilities" accounts={b.liabilities?.non_current_liabilities?.accounts} color="rgba(226,75,74,0.6)" />
          </div>
          {b.equity?.accounts?.length > 0 && (
            <div style={{ marginTop: 9 }}>
              <AccountTable title="Equity" accounts={b.equity.accounts} color="#7f77dd" />
            </div>
          )}
        </>
      )}
    </>
  )
}
