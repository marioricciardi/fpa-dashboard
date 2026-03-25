import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

import KpiStrip  from '../components/KpiStrip.jsx'
import ChartCard from '../components/ChartCard.jsx'
import MetricCard from '../components/MetricCard.jsx'
import { balancesheetAnalysis } from '../data/balancesheet.js'
import { fmt } from '../utils/chartAdapter.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
const r = balancesheetAnalysis.result

const kpis = [
  { label: 'Total Assets',    value: fmt(r.assets.total_assets,          'usd_m'), delta: `CA: ${fmt(r.assets.current_assets.total,'usd_m')} · FA: ${fmt(r.assets.fixed_assets.total,'usd_m')}`, sentiment: 'neu' },
  { label: 'Total Liabilities',value: fmt(r.liabilities.total_liabilities,'usd_m'), delta: `CL: ${fmt(r.liabilities.current_liabilities.total,'usd_m')} · LT: ${fmt(r.liabilities.long_term.total,'usd_m')}`, sentiment: 'neu' },
  { label: 'Total Equity',    value: fmt(r.equity.total_equity,           'usd_m'), delta: `Retained earnings: ${fmt(r.equity.retained_earnings,'usd_m')}`, sentiment: 'pos' },
  { label: 'Current Ratio',   value: r.ratios.current_ratio.toFixed(2),   delta: 'Healthy (>1.5)', sentiment: 'pos' },
  { label: 'Debt / Equity',   value: r.ratios.debt_to_equity.toFixed(2),  delta: 'Conservative (<1.0)', sentiment: 'pos' },
]

function aleLabelData() {
  return {
    labels: ['Current Assets', 'Fixed Assets', 'Current Liab.', 'Long-Term Liab.', 'Equity'],
    datasets: [{
      data: [
        r.assets.current_assets.total,
        r.assets.fixed_assets.total,
        r.liabilities.current_liabilities.total,
        r.liabilities.long_term.total,
        r.equity.total_equity,
      ],
      backgroundColor: ['rgba(50,102,173,0.22)','rgba(29,158,117,0.22)','rgba(226,75,74,0.22)','rgba(239,159,39,0.22)','rgba(127,119,221,0.22)'],
      borderColor:     ['#3266ad','#1d9e75','#e24b4a','#ef9f27','#7f77dd'],
      borderWidth: 1.5, borderRadius: 3,
    }],
  }
}

function currentAssetsDoughnut() {
  const ca = r.assets.current_assets
  return {
    labels: ['Cash', 'AR', 'Inventory', 'Prepaid'],
    datasets: [{
      data: [ca.cash, ca.ar, ca.inventory, ca.prepaid],
      backgroundColor: ['#3266ad','#1d9e75','#7f77dd','#888780'],
      borderWidth: 0, hoverOffset: 4,
    }],
  }
}

export default function BalanceSheetTab() {
  const SCALES_M = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => fmt(v, 'usd_m') }, grid: { color: GC } },
  }

  return (
    <>
      <KpiStrip items={kpis} cols={5} />

      <div className="chart-grid chart-grid--21">
        <ChartCard
          title="A = L + E — Balance Sheet Components"
          subtitle="$M · FY2025 P6 · Source: F0902 (A/L/Q ledger types) + F0901 account master"
          fn="fn-balancesheet-analysis"
          toolResult={balancesheetAnalysis}
          height={220}
        >
          <Bar data={aleLabelData()} options={{ ...BASE, scales: SCALES_M }} />
        </ChartCard>

        <ChartCard
          title="Current Asset Composition"
          subtitle="$M · Cash / AR / Inventory / Prepaid"
          fn="fn-balancesheet-analysis"
          height={200}
        >
          <Doughnut
            data={currentAssetsDoughnut()}
            options={{
              responsive: true, maintainAspectRatio: false, cutout: '58%',
              plugins: {
                legend: { display: true, position: 'right', labels: { color: TC, font: { size: 9 }, boxWidth: 9, padding: 7 } },
                tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw, 'usd_m')}` } },
              },
            }}
          />
        </ChartCard>
      </div>

      <div className="chart-grid chart-grid--3" style={{ marginTop: 11 }}>
        <MetricCard label="Working Capital"       value={fmt(r.ratios.working_capital, 'usd_m')} delta="CA − CL" sentiment="pos" />
        <MetricCard label="Quick Ratio"           value={r.ratios.quick_ratio.toFixed(2)}        delta="(CA − Inventory) / CL" sentiment="pos" />
        <MetricCard label="Balance Sheet Check"   value={r.check === 0 ? 'PASS ✓' : `FAIL: ${r.check}`} delta="A − L − E must = 0" sentiment={r.check === 0 ? 'pos' : 'neg'} />
      </div>

      <div className="chart-grid chart-grid--3" style={{ marginTop: 9 }}>
        <MetricCard label="Cash"        value={fmt(r.assets.current_assets.cash,      'usd_m')} delta="Current assets" sentiment="pos" />
        <MetricCard label="AR Balance"  value={fmt(r.assets.current_assets.ar,        'usd_m')} delta="Current assets · fn-ar-aging (planned)" sentiment="warn" />
        <MetricCard label="AP Balance"  value={fmt(r.liabilities.current_liabilities.ap,'usd_m')} delta="Current liabilities · fn-ap-aging (planned)" sentiment="warn" />
      </div>
    </>
  )
}
