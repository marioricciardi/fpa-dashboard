import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Bar, Doughnut } from 'react-chartjs-2'

import KpiStrip   from '../components/KpiStrip.jsx'
import AlertPanel from '../components/AlertPanel.jsx'
import ChartCard  from '../components/ChartCard.jsx'

import { useTool } from '../hooks/useTool.js'
import { fmt } from '../utils/chartAdapter.js'
import { useMemo } from 'react'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }

/* ---------- derived data builders ---------- */

function buildKpis(pnlResult, bvaSummary, fqtrSummary) {
  const s = pnlResult?.pnl_summary ?? pnlResult ?? {}
  const varPct = bvaSummary?.variance_pct ?? bvaSummary?.total_variance_pct
  const qTotal = fqtrSummary?.total_quarter_usd ?? 0
  const qAvg   = fqtrSummary?.avg_monthly_usd ?? 0
  return [
    { label: 'YTD Revenue',     value: usd(s.revenue ?? 0),             delta: s.gross_margin_pct != null ? `${s.gross_margin_pct.toFixed(1)}% gross margin` : 'N/A', sentiment: s.revenue > 0 ? 'pos' : 'neu' },
    { label: 'Gross Profit',    value: usd(s.gross_profit ?? 0),         delta: s.gross_margin_pct != null ? `${s.gross_margin_pct.toFixed(1)}% margin` : 'N/A', sentiment: s.gross_profit > 0 ? 'pos' : 'warn' },
    { label: 'EBITDA',          value: usd(s.ebitda ?? 0),               delta: s.ebitda_margin_pct != null ? `${s.ebitda_margin_pct.toFixed(1)}% margin` : 'N/A', sentiment: s.ebitda > 0 ? 'pos' : 'warn' },
    { label: 'Budget Variance', value: usd(bvaSummary?.total_variance ?? 0), delta: varPct != null ? `${varPct}% over budget` : 'No budget baseline', sentiment: 'neg' },
    { label: 'Q AP Forecast',   value: usd(qTotal), delta: qTotal > 0 ? `Avg ${usd(qAvg)}/mo` : 'No forecast data', sentiment: 'neu' },
  ]
}

function buildAlerts(bva, bs, fqtr, froll) {
  const items = []
  // AP forecast summary
  const fqtrSum = fqtr?.result?.summary ?? fqtr?.summary ?? {}
  if (fqtrSum.total_quarter_usd != null && fqtrSum.total_quarter_usd > 0) {
    items.push({
      severity: 'info',
      text: `AP forecast: ${usd(fqtrSum.total_quarter_usd)} total for quarter (avg ${usd(fqtrSum.avg_monthly_usd)}/mo, ${fqtrSum.periods_returned ?? 0} periods).`,
      meta: `fn-ap-forecast · 95% CI bounds`,
    })
  }
  // Worst unfavorable budget driver
  const bvaDrivers = bva?.result?.drivers || bva?.drivers || []
  const unfav = bvaDrivers.filter(d => d.direction === 'unfavorable').sort((a, b) => (b.abs_variance ?? 0) - (a.abs_variance ?? 0))
  if (unfav.length > 0) {
    const d = unfav[0]
    items.push({
      severity: 'critical',
      text: `${d.account_desc} (Acct ${d.account}.${d.subsidiary}, BU "${d.bu_name}") — actual ${usd(d.actual)} vs budget ${usd(d.budget)}, variance ${usd(d.variance)}. Source: F0902 BA vs AA.`,
      meta: `fn-variance-budget-vs-actual · obj ${d.account} · BU ${d.business_unit}`,
    })
  }
  // Second worst driver
  if (unfav.length > 1) {
    const d = unfav[1]
    items.push({
      severity: 'warning',
      text: `${d.account_desc} (Acct ${d.account}.${d.subsidiary}, BU "${d.bu_name}") — actual ${usd(d.actual)} vs budget ${usd(d.budget)}, variance ${usd(d.variance)}.`,
      meta: `fn-variance-budget-vs-actual · obj ${d.account} · BU ${d.business_unit}`,
    })
  }
  // Rolling forecast
  const roll = froll?.result ?? froll ?? {}
  const fyEst = roll.full_year_estimate ?? 0
  const fyBudget = roll.full_year_budget ?? 0
  const rollVar = roll.variance_to_budget ?? 0
  if (fyEst > 0) {
    const severity = rollVar < 0 ? 'warning' : 'info'
    items.push({
      severity,
      text: `Rolling full-year estimate ${usd(fyEst)} vs budget ${usd(fyBudget)} — variance ${usd(rollVar)} (${fyBudget ? ((rollVar / fyBudget) * 100).toFixed(1) : 0}%).`,
      meta: `fn-forecast-rolling · actuals YTD ${usd(roll.actuals_ytd ?? 0)} + remainder ${usd(roll.forecast_remainder ?? 0)}`,
    })
  }
  // Balance sheet health
  const ratios = bs?.result?.ratios
  if (ratios && ratios.current_ratio != null) {
    items.push({
      severity: 'info',
      text: `Balance sheet healthy: current ratio ${ratios.current_ratio.toFixed(2)}, working capital ${fmt(ratios.working_capital, 'usd_m')}. Debt-to-equity ${(ratios.debt_to_equity ?? 0).toFixed(2)}.`,
      meta: `fn-balancesheet-analysis · F0902 · F0901 · ratio_set=standard`,
    })
  }
  return items
}

function dedupeDrivers(drivers) {
  const seen = new Set()
  const out = []
  for (const d of (drivers || [])) {
    const key = `${d.account}|${d.subsidiary}|${d.business_unit}|${d.budget}|${d.actual}`
    if (!seen.has(key)) { seen.add(key); out.push(d) }
  }
  return out
}

function variantBarData(bva) {
  const drivers = dedupeDrivers(bva?.result?.drivers ?? bva?.drivers ?? [])
  const sorted = [...drivers].sort((a, b) => (b.abs_variance ?? 0) - (a.abs_variance ?? 0))
  const labels = sorted.map(d => `${d.account_desc} (${d.account}.${d.subsidiary})`)
  const budget = sorted.map(d => d.budget)
  const actual = sorted.map(d => d.actual)
  return {
    labels,
    datasets: [
      { label: 'Budget', data: budget, backgroundColor: 'rgba(50,102,173,0.18)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3 },
      {
        label: 'Actual',
        data: actual,
        backgroundColor: actual.map((a, i) => a > (budget[i] ?? 0) ? 'rgba(226,75,74,0.22)' : 'rgba(29,158,117,0.20)'),
        borderColor:     actual.map((a, i) => a > (budget[i] ?? 0) ? '#e24b4a' : '#1d9e75'),
        borderWidth: 1.5, borderRadius: 3,
      },
    ],
  }
}

function usd(v) {
  if (v == null) return '$0'
  const abs = Math.abs(v)
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function assetAllocationData(r) {
  const a = r?.assets || r?.balance_sheet?.assets || {}
  const accts = a?.current_assets?.accounts || []

  // Group by description, take top 8
  const map = {}
  for (const acct of accts) {
    const key = acct.account_desc || `Obj ${acct.object_account}`
    map[key] = (map[key] || 0) + (acct.balance ?? 0)
  }
  const sorted = Object.entries(map).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8)

  // Fallback: if no accounts, try named fields
  if (sorted.length === 0) {
    const ca = a?.current_assets || {}
    sorted.push(['Cash', ca?.cash ?? 0], ['AR', ca?.ar ?? 0], ['Inventory', ca?.inventory ?? 0], ['Prepaid', ca?.prepaid ?? 0])
  }

  const COLORS = ['#3266ad','#1d9e75','#7f77dd','#ef9f27','#e24b4a','#639922','#888780','#b08d57']
  return {
    labels: sorted.map(([k]) => k),
    datasets: [{
      data: sorted.map(([, v]) => v),
      backgroundColor: COLORS.slice(0, sorted.length),
      borderWidth: 0,
      hoverOffset: 4,
    }],
  }
}

export default function OverviewTab({ fiscalYear = 25, period = 6 }) {
  const quarter = Math.ceil(period / 3)
  const pnlParams  = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: period, comparison_year: fiscalYear - 1 }), [fiscalYear, period])
  const bvaParams  = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: period, top_n_drivers: 8 }), [fiscalYear, period])
  const bsParams   = useMemo(() => ({ fiscal_year: fiscalYear, period, comparison_year: fiscalYear - 1, comparison_period: period }), [fiscalYear, period])
  const fqtrParams = useMemo(() => ({ business_unit: 'M30', fiscal_year: 2000 + fiscalYear, quarter }), [fiscalYear, quarter])
  const frollParams = useMemo(() => ({ fiscal_year: fiscalYear, operation: 'current' }), [fiscalYear])
  const { data: pnlData, loading: pnlL, refetch: rPnl }     = useTool('pnl_get_analysis', pnlParams)
  const { data: bvaData, loading: bvaL, refetch: rBva }     = useTool('variance_get_budget_vs_actual', bvaParams)
  const { data: bsData,  loading: bsL, refetch: rBs }      = useTool('balancesheet_get_analysis', bsParams)
  const { data: fqtrData, loading: fqtrL, refetch: rFqtr }  = useTool('forecast_get_quarter', fqtrParams)
  const { data: frollData, loading: frollL, refetch: rFroll } = useTool('forecast_get_rolling', frollParams)
  const refreshAll = () => { rPnl(); rBva(); rBs(); rFqtr(); rFroll() }

  const anyLoading = pnlL || bvaL || bsL || fqtrL || frollL

  const pnlOk  = !!pnlData
  const bvaOk  = !!bvaData
  const bsOk   = !!bsData
  const fqtrOk = !!fqtrData
  const frollOk = !!frollData

  // KPIs — show with whatever data is available; use empty fallbacks
  const fqtrSum = fqtrOk ? (fqtrData.result?.summary ?? fqtrData.summary ?? {}) : {}
  const kpis = (pnlOk || bvaOk || fqtrOk)
    ? buildKpis(pnlData?.result ?? {}, bvaData?.result?.summary ?? {}, fqtrSum)
    : null

  // Alerts: derive from whatever live data is available
  const alerts = (bvaOk || bsOk || fqtrOk)
    ? buildAlerts(bvaData, bsData, fqtrData, frollData)
    : []

  if (anyLoading && !pnlOk && !bvaOk && !bsOk && !fqtrOk && !frollOk) return <div className="tab-loading">Loading overview…</div>

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={refreshAll} disabled={anyLoading} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 4, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>{anyLoading ? 'Refreshing…' : '↻ Refresh Data'}</button>
      </div>
      {kpis && <KpiStrip items={kpis} cols={5} />}

      <div className="chart-grid chart-grid--21">
        <ChartCard
          title="Budget vs Actual — Top Variance Drivers"
          subtitle={`YTD · FY20${String(fiscalYear).padStart(2, '0')} P1–P${period} · Red = over budget · Source: F0902 BA vs AA`}
          fn="fn-variance-budget-vs-actual"
          toolResult={bvaData}
          height={215}
          unavailable={!bvaOk && !bvaL}
          legend={[
            { color: '#3266ad', label: 'Budget' },
            { color: '#1d9e75', label: 'Favorable' },
            { color: '#e24b4a', label: 'Unfavorable' },
          ]}
        >
          {bvaL && !bvaOk && <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--color-text-tertiary)',fontSize:11}}>Loading…</div>}
          {bvaOk && <Bar
            data={variantBarData(bvaData)}
            options={{
              ...BASE,
              indexAxis: 'y',
              scales: {
                x: { ticks: { color: TC, font: { size: 10 }, callback: v => usd(v) }, grid: { color: GC } },
                y: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
              },
            }}
          />}
        </ChartCard>

        <ChartCard
          title="Current Asset Composition"
          subtitle={`Top accounts · F0902 balance-forward · FY20${String(fiscalYear).padStart(2, '0')} P${period}`}
          fn="fn-balancesheet-analysis"
          toolResult={bsData}
          height={185}
          unavailable={!bsOk && !bsL}
        >
          {bsL && !bsOk && <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--color-text-tertiary)',fontSize:11}}>Loading…</div>}
          {bsOk && <Doughnut
            data={assetAllocationData(bsData.result)}
            plugins={[ChartDataLabels]}
            options={{
              responsive: true, maintainAspectRatio: false, cutout: '60%',
              plugins: {
                legend: { display: true, position: 'right', labels: { color: TC, font: { size: 9 }, boxWidth: 9, padding: 7 } },
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

      {alerts.length > 0 && <AlertPanel title="Platform Alerts" items={alerts} />}
    </>
  )
}
