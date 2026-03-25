import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Tooltip, Legend
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

import KpiStrip  from '../components/KpiStrip.jsx'
import ChartCard from '../components/ChartCard.jsx'
import MetricCard from '../components/MetricCard.jsx'
import { pnlAnalysis } from '../data/pnl.js'
import { toLineData, fmt } from '../utils/chartAdapter.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
const r = pnlAnalysis.result

const kpis = [
  { label: 'YTD Revenue',       value: fmt(r.revenue.total, 'usd_m'),        delta: `▲ ${r.revenue.yoy_pct}% YoY`,        sentiment: 'pos' },
  { label: 'Gross Margin %',    value: `${r.gross_margin.pct}%`,              delta: `▲ ${r.gross_margin.yoy_delta_pp}pp YoY`, sentiment: 'pos' },
  { label: 'COGS',              value: fmt(r.cogs.total, 'usd_m'),            delta: `▲ ${r.cogs.yoy_pct}% YoY`,           sentiment: 'neg' },
  { label: 'Total OpEx',        value: fmt(r.opex.total_opex.total, 'usd_m'), delta: `▲ ${fmt(r.opex.total_opex.yoy_delta, 'usd_k')} YoY`, sentiment: 'warn' },
  { label: 'Net Income',        value: fmt(r.net_income.total, 'usd_m'),      delta: `${r.net_income.pct_of_revenue}% margin · ▲${r.net_income.yoy_pct}% YoY`, sentiment: 'pos' },
]

function revExpLineData() {
  const { chart_data } = pnlAnalysis
  return toLineData(chart_data, {
    revenue:      { color: '#3266ad', label: 'Revenue', pointRadius: 3 },
    cogs:         { color: '#e24b4a', label: 'COGS',    dash: [4,2], pointRadius: 0 },
    gross_margin: { color: '#1d9e75', label: 'Gross Margin', pointRadius: 3 },
    opex:         { color: '#ef9f27', label: 'OpEx',    dash: [3,3], pointRadius: 0 },
    net_income:   { color: '#7f77dd', label: 'Net Income', pointRadius: 3 },
  })
}

function opexBarData() {
  return {
    labels: ['SG&A', 'R&D', 'D&A'],
    datasets: [
      {
        label: 'FY2025',
        data: [r.opex.sga.total, r.opex.rd.total, r.opex.da.total],
        backgroundColor: 'rgba(50,102,173,0.22)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3,
      },
      {
        label: 'YoY Δ',
        data: [r.opex.sga.yoy_delta, r.opex.rd.yoy_delta, r.opex.da.yoy_delta],
        backgroundColor: 'rgba(239,159,39,0.22)', borderColor: '#ef9f27', borderWidth: 1.5, borderRadius: 3,
      },
    ],
  }
}

export default function PnLTab() {
  const SCALES_M = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => fmt(v, 'usd_m') }, grid: { color: GC } },
  }
  const SCALES_K = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => fmt(v, 'usd_k') }, grid: { color: GC } },
  }

  return (
    <>
      <KpiStrip items={kpis} cols={5} />

      <ChartCard
        title="P&L Trend — Revenue / COGS / Gross Margin / OpEx / Net Income"
        subtitle="Monthly $M · FY2025 P1–P8 · Source: F0902 + F0911 · account types R and X"
        fn="fn-pnl-analysis"
        toolResult={pnlAnalysis}
        height={230}
        legend={[
          { color: '#3266ad', label: 'Revenue' },
          { color: '#e24b4a', label: 'COGS' },
          { color: '#1d9e75', label: 'Gross Margin' },
          { color: '#ef9f27', label: 'OpEx' },
          { color: '#7f77dd', label: 'Net Income' },
        ]}
      >
        <Line data={revExpLineData()} options={{ ...BASE, scales: SCALES_M }} />
      </ChartCard>

      <div className="chart-grid chart-grid--2" style={{ marginTop: 11 }}>
        <ChartCard
          title="OpEx Breakdown — Actual vs YoY Delta"
          subtitle="$M · SG&A / R&D / D&A · FY2025 YTD vs FY2024 YTD"
          fn="fn-pnl-analysis"
          height={210}
          legend={[
            { color: '#3266ad', label: 'FY2025 Actual' },
            { color: '#ef9f27', label: 'YoY Increase' },
          ]}
        >
          <Bar data={opexBarData()} options={{ ...BASE, scales: SCALES_M }} />
        </ChartCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <MetricCard label="SG&A" value={fmt(r.opex.sga.total, 'usd_m')} delta={`▲ ${fmt(r.opex.sga.yoy_delta, 'usd_k')} YoY`} sentiment="neg" />
          <MetricCard label="R&D" value={fmt(r.opex.rd.total, 'usd_m')} delta={`▲ ${fmt(r.opex.rd.yoy_delta, 'usd_k')} YoY`} sentiment="neg" />
          <MetricCard label="D&A" value={fmt(r.opex.da.total, 'usd_m')} delta={`▲ ${fmt(r.opex.da.yoy_delta, 'usd_k')} YoY`} sentiment="neu" />
          <MetricCard label="Gross Margin $" value={fmt(r.gross_margin.amount, 'usd_m')} delta={`${r.gross_margin.pct}% of revenue`} sentiment="pos" />
        </div>
      </div>
    </>
  )
}
