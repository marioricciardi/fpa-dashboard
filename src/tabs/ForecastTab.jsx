import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

import KpiStrip   from '../components/KpiStrip.jsx'
import ChartCard  from '../components/ChartCard.jsx'
import AlertPanel from '../components/AlertPanel.jsx'
import { forecastGetQuarter, forecastGetExpense, forecastGetRolling } from '../data/forecast.js'
import { fmt } from '../utils/chartAdapter.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
const q = forecastGetQuarter.result
const e = forecastGetExpense.result
const rl = forecastGetRolling.result

const kpis = [
  { label: 'Q3 AP Forecast (CORP)', value: `$${q.summary.total_quarter_usd.toLocaleString()}`, delta: `Avg $${q.summary.avg_monthly_usd}/mo · holt_winters`, sentiment: 'neu' },
  { label: 'AP Forecast R²',        value: '0.68',   delta: '⚠ Below 0.70 threshold — low confidence', sentiment: 'warn' },
  { label: 'Full-Year Expense Fcst',value: fmt(e.total_opex.forecasted, 'usd_m'), delta: `80% CI: ${fmt(e.total_opex.ci_low,'usd_m')} – ${fmt(e.total_opex.ci_high,'usd_m')}`, sentiment: 'neu' },
  { label: 'Rolling Forecast MAPE', value: `${rl.accuracy.mape}%`,  delta: 'P1–P6 actuals vs forecast', sentiment: 'pos' },
  { label: 'Forecast Bias',         value: `${rl.accuracy.bias}%`,  delta: 'Negative = slight under-forecast', sentiment: 'neu' },
]

function apForecastLineData() {
  const { labels, series } = forecastGetQuarter.chart_data
  return {
    labels,
    datasets: [
      { label: 'Forecast', data: series.spend,   borderColor: '#7f77dd', borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#7f77dd', fill: false, tension: 0.3 },
      { label: 'Avg',      data: series.avg,     borderColor: '#888780', borderWidth: 1, borderDash: [4,3], pointRadius: 0, fill: false },
      { label: 'Lower CI', data: series.ci_low,  borderColor: 'transparent', pointRadius: 0, fill: '+1', backgroundColor: 'rgba(127,119,221,0.18)', tension: 0.3 },
      { label: 'Upper CI', data: series.ci_high, borderColor: 'transparent', pointRadius: 0, fill: false, tension: 0.3 },
    ],
  }
}

function expenseForecastBarData() {
  const { labels, series } = forecastGetExpense.chart_data
  return {
    labels,
    datasets: [
      { label: 'Forecast', data: series.forecasted, backgroundColor: 'rgba(50,102,173,0.22)', borderColor: '#3266ad', borderWidth: 1.5, borderRadius: 3 },
      { label: 'CI High',  data: series.ci_high,    backgroundColor: 'rgba(239,159,39,0.18)', borderColor: '#ef9f27', borderWidth: 1, borderRadius: 3 },
    ],
  }
}

function rollingLineData() {
  const { labels, series } = forecastGetRolling.chart_data
  return {
    labels,
    datasets: [
      { label: 'Budget',   data: series.budget,   borderColor: '#3266ad', borderWidth: 1.5, borderDash: [4,3], pointRadius: 0, fill: false, tension: 0.3 },
      { label: 'Actual',   data: series.actual,   borderColor: '#1d9e75', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#1d9e75', fill: false, tension: 0.3 },
      { label: 'Forecast', data: series.forecast, borderColor: '#7f77dd', borderWidth: 1.5, borderDash: [6,3], pointRadius: 2, pointBackgroundColor: '#7f77dd', fill: false, tension: 0.3 },
    ],
  }
}

const forecastAlerts = [
  { severity: 'critical', text: "AP Forecast R²=0.68 — below 0.70 low-confidence threshold. Holt-Winters model trained on lab.fpa_ap_forecast_labeled_v (F0411 + BU attributes). Widen CI margins in any AP-dependent cash planning.", meta: "fn-ap-forecast · holt_winters · alpha=0.3 · beta=0.1 · gamma=0.2 · trained 2025-08-01" },
  { severity: 'warning',  text: "Rolling forecast extrapolation_limit is 3 periods. P7–P12 projections are beyond this limit — accuracy degrades materially beyond P9.", meta: "fn-forecast-rolling · F0902 · F0911 · extrapolation_limit=3" },
  { severity: 'info',     text: "Full-year COGS forecast $14.2M (80% CI: $13.5M–$14.9M). Largest expense category — COGS variance is the primary driver of gross margin sensitivity.", meta: "fn-forecast-expense · F0902 · F0911 · account_category=COGS" },
]

export default function ForecastTab() {
  const SCALES_DOLLAR = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => `$${v}` }, grid: { color: GC } },
  }
  const SCALES_M = {
    x: { ticks: { color: TC, font: { size: 10 } }, grid: { color: GC } },
    y: { ticks: { color: TC, font: { size: 10 }, callback: v => fmt(v, 'usd_m') }, grid: { color: GC } },
  }

  return (
    <>
      <KpiStrip items={kpis} cols={5} />

      <div className="chart-grid chart-grid--2">
        <ChartCard
          title="AP Spend Forecast — Q3 2025 (BU: CORP)"
          subtitle="Holt-Winters · $USD · P07–P09 · 80% CI band · Source: lab.fpa_ap_forecast_labeled_v"
          fn="fn-ap-forecast"
          toolResult={forecastGetQuarter}
          height={215}
          legend={[
            { color: '#7f77dd', label: 'Forecast' },
            { color: '#888780', label: 'Avg' },
            { color: 'rgba(127,119,221,0.4)', label: '80% CI band' },
          ]}
        >
          <Line data={apForecastLineData()} options={{ ...BASE, scales: SCALES_DOLLAR }} />
        </ChartCard>

        <ChartCard
          title="Expense Forecast by Category — FY2025 Full Year"
          subtitle="$M · 80% confidence interval · Source: F0902 + F0911"
          fn="fn-forecast-expense"
          toolResult={forecastGetExpense}
          height={215}
          legend={[
            { color: '#3266ad', label: 'Forecast' },
            { color: '#ef9f27', label: '80% CI High' },
          ]}
        >
          <Bar data={expenseForecastBarData()} options={{ ...BASE, scales: SCALES_M }} />
        </ChartCard>
      </div>

      <ChartCard
        title="Rolling Forecast vs Budget vs Actuals — FY2025"
        subtitle="$M · P1–P6 actuals · P7–P12 forecast (dashed) · MAPE 4.2% · Source: F0902 + F0911"
        fn="fn-forecast-rolling"
        toolResult={forecastGetRolling}
        height={215}
        legend={[
          { color: '#3266ad', label: 'Budget' },
          { color: '#1d9e75', label: 'Actual' },
          { color: '#7f77dd', label: 'Forecast (dashed)' },
        ]}
      >
        <Line data={rollingLineData()} options={{ ...BASE, scales: SCALES_M }} />
      </ChartCard>

      <AlertPanel title="Forecast Alerts" items={forecastAlerts} />
    </>
  )
}
