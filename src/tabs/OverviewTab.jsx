import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

import KpiStrip   from '../components/KpiStrip.jsx'
import AlertPanel from '../components/AlertPanel.jsx'
import ChartCard  from '../components/ChartCard.jsx'

import { kpis, alerts }      from '../data/overview.js'
import { budgetVsActual }    from '../data/variance.js'
import { balancesheetAnalysis } from '../data/balancesheet.js'
import { toBarData, toDoughnutData, fmt } from '../utils/chartAdapter.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }

function variantBarData() {
  const { chart_data } = budgetVsActual
  const { labels, series } = chart_data
  return {
    labels,
    datasets: [
      { label: 'Budget', data: series.budget, backgroundColor: 'rgba(50,102,173,0.18)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3 },
      {
        label: 'Actual',
        data: series.actual,
        backgroundColor: series.actual.map((a, i) => a > series.budget[i] ? 'rgba(226,75,74,0.22)' : 'rgba(29,158,117,0.20)'),
        borderColor:     series.actual.map((a, i) => a > series.budget[i] ? '#e24b4a' : '#1d9e75'),
        borderWidth: 1.5, borderRadius: 3,
      },
    ],
  }
}

function assetAllocationData() {
  const r = balancesheetAnalysis.result
  return {
    labels: ['Cash', 'AR', 'Inventory', 'PP&E', 'Intangibles', 'Other'],
    datasets: [{
      data: [
        r.assets.current_assets.cash,
        r.assets.current_assets.ar,
        r.assets.current_assets.inventory,
        r.assets.fixed_assets.ppe_net,
        r.assets.fixed_assets.intangibles,
        r.assets.fixed_assets.other_lt + r.assets.current_assets.prepaid,
      ],
      backgroundColor: ['#3266ad','#1d9e75','#7f77dd','#ef9f27','#e24b4a','#888780'],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  }
}

export default function OverviewTab() {
  return (
    <>
      <KpiStrip items={kpis} cols={5} />

      <div className="chart-grid chart-grid--21">
        <ChartCard
          title="Budget vs Actual — by GL Account"
          subtitle="YTD · $M · FY2025 P1–P6 · Red = over budget · Source: F0902 BA vs AA"
          fn="fn-variance-budget-vs-actual"
          toolResult={budgetVsActual}
          height={215}
          legend={[
            { color: '#3266ad', label: 'Budget' },
            { color: '#1d9e75', label: 'Favorable' },
            { color: '#e24b4a', label: 'Unfavorable' },
          ]}
        >
          <Bar
            data={variantBarData()}
            options={{
              ...BASE,
              scales: {
                x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
                y: { ticks: { color: TC, font: { size: 10 }, callback: v => fmt(v, 'usd_m') }, grid: { color: GC } },
              },
            }}
          />
        </ChartCard>

        <ChartCard
          title="Asset Composition"
          subtitle="$M · F0902 balance-forward · FY2025 P6"
          fn="fn-balancesheet-analysis"
          toolResult={balancesheetAnalysis}
          height={185}
        >
          <Doughnut
            data={assetAllocationData()}
            options={{
              responsive: true, maintainAspectRatio: false, cutout: '60%',
              plugins: {
                legend: { display: true, position: 'right', labels: { color: TC, font: { size: 9 }, boxWidth: 9, padding: 7 } },
                tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw, 'usd_m')}` } },
              },
            }}
          />
        </ChartCard>
      </div>

      <AlertPanel title="Platform Alerts" items={alerts} />
    </>
  )
}
