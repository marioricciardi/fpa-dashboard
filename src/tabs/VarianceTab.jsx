import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

import KpiStrip   from '../components/KpiStrip.jsx'
import ChartCard  from '../components/ChartCard.jsx'
import AlertPanel from '../components/AlertPanel.jsx'
import MetricCard from '../components/MetricCard.jsx'
import { budgetVsActual, periodComparison } from '../data/variance.js'
import { fmt } from '../utils/chartAdapter.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
const s = budgetVsActual.result.summary
const p = periodComparison.result

const kpis = [
  { label: 'Total Budget',         value: fmt(s.total_budget, 'usd_m'),   delta: 'YTD FY2025 P1–P6', sentiment: 'neu' },
  { label: 'Total Actual',         value: fmt(s.total_actual, 'usd_m'),   delta: `${s.total_variance_pct}% over budget`, sentiment: 'neg' },
  { label: 'Net Variance',         value: `+${fmt(s.total_variance, 'usd_k')}`, delta: `${s.unfavorable_count} unfavorable · ${s.favorable_count} favorable`, sentiment: 'neg' },
  { label: 'YoY Revenue Δ',        value: `+${p.deltas.revenue.pct}%`,   delta: `+${fmt(p.deltas.revenue.amount, 'usd_m')} vs FY2024`, sentiment: 'pos' },
  { label: 'YoY Net Income Δ',     value: `+${p.deltas.net_income.pct}%`, delta: `+${fmt(p.deltas.net_income.amount, 'usd_m')} vs FY2024`, sentiment: 'pos' },
]

function tornadoData() {
  const { labels, series } = budgetVsActual.chart_data
  return {
    labels,
    datasets: [{
      label: 'Variance',
      data: series.variance,
      backgroundColor: series.variance.map(v => v > 0 ? 'rgba(226,75,74,0.22)' : 'rgba(99,153,34,0.22)'),
      borderColor:     series.variance.map(v => v > 0 ? '#e24b4a' : '#639922'),
      borderWidth: 1.5, borderRadius: 3,
    }],
  }
}

function yoyBarData() {
  const { labels, series } = periodComparison.chart_data
  return {
    labels,
    datasets: [
      { label: 'FY2025', data: series['FY2025'], backgroundColor: 'rgba(50,102,173,0.22)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3 },
      { label: 'FY2024', data: series['FY2024'], backgroundColor: 'rgba(136,135,128,0.22)', borderColor: '#888780', borderWidth: 1.5, borderRadius: 3 },
    ],
  }
}

const varianceAlerts = [
  { severity: 'critical', text: "Marketing Programs (obj 6210, BU MKTG) +$198K over budget (22.2%). CFO approval threshold of $150K exceeded.", meta: "fn-variance-budget-vs-actual · F0902 · ledger BA vs AA · period 1–6" },
  { severity: 'critical', text: "Engineering Salaries & Benefits (obj 5110, BU ENG) +$190K over budget (9.0%). Exceeds 10% variance policy threshold.", meta: "fn-variance-budget-vs-actual · F0902 · account type X" },
  { severity: 'warning',  text: "Cloud Infrastructure (obj 7420, BU IT) +$145K over budget (10.4%). Cloud cost optimization review recommended.", meta: "fn-variance-budget-vs-actual · F0902" },
  { severity: 'info',     text: "Sales Commissions (obj 6110, BU SALES) $200K under budget (11.1%). Undeployed budget subject to year-end clawback policy.", meta: "fn-variance-budget-vs-actual · F0902 · favorable" },
]

export default function VarianceTab() {
  const SCALES_K = {
    x: { ticks: { color: TC, font: { size: 10 }, callback: v => (v >= 0 ? '+' : '') + fmt(Math.abs(v), 'usd_k') }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
  }
  const SCALES_M = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => fmt(v, 'usd_m') }, grid: { color: GC } },
  }

  return (
    <>
      <KpiStrip items={kpis} cols={5} />

      <ChartCard
        title="Budget Variance Tornado — by GL Account"
        subtitle="YTD actual − budget · Red = over budget (unfavorable) · Green = under (favorable) · Source: F0902"
        fn="fn-variance-budget-vs-actual"
        toolResult={budgetVsActual}
        height={245}
      >
        <Bar
          data={tornadoData()}
          options={{
            ...BASE,
            indexAxis: 'y',
            scales: SCALES_K,
            plugins: { legend: { display: false }, tooltip: { callbacks: {
              label: ctx => (ctx.raw >= 0 ? 'Over budget: +' : 'Under budget: ') + fmt(Math.abs(ctx.raw), 'usd_k'),
            }}},
          }}
        />
      </ChartCard>

      <div className="chart-grid chart-grid--21" style={{ marginTop: 11 }}>
        <ChartCard
          title="YoY Period Comparison — P6 FY2025 vs FY2024"
          subtitle="Revenue / OpEx / Net Income · $M · Source: F0902 ledger type AA"
          fn="fn-variance-period-comparison"
          toolResult={periodComparison}
          height={215}
          legend={[
            { color: '#3266ad', label: 'FY2025' },
            { color: '#888780', label: 'FY2024' },
          ]}
        >
          <Bar data={yoyBarData()} options={{ ...BASE, scales: SCALES_M }} />
        </ChartCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <MetricCard label="Revenue YoY" value={`+${p.deltas.revenue.pct}%`} delta={`+${fmt(p.deltas.revenue.amount, 'usd_m')}`} sentiment="pos" />
          <MetricCard label="OpEx YoY"    value={`+${p.deltas.opex.pct}%`}    delta={`+${fmt(p.deltas.opex.amount, 'usd_m')}`}    sentiment="neg" />
          <MetricCard label="Net Inc YoY" value={`+${p.deltas.net_income.pct}%`} delta={`+${fmt(p.deltas.net_income.amount, 'usd_m')}`} sentiment="pos" />
          <MetricCard label="Gross Margin Δ" value={`+${p.deltas.gross_margin_pct.amount}pp`} delta="YoY percentage points" sentiment="pos" />
        </div>
      </div>

      <AlertPanel title="Variance Alerts" items={varianceAlerts} />
    </>
  )
}
