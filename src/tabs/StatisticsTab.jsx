// StatisticsTab — V4 new tab: distribution analysis, correlation, descriptive stats
import { useMemo, useCallback } from 'react'
import {
  BarChart, Bar, ScatterChart, Scatter, Line,
  ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ZAxis,
} from 'recharts'

import { KPIRail } from '../components/KPIChip.jsx'
import PanelGrid from '../components/PanelGrid.jsx'
import { AlertRow, GaugeArc } from '../components/ChartPrimitives.jsx'
import { useTool } from '../hooks/useTool.js'
import { useSimulation, augmentPeriodData } from '../context/SimulationContext.jsx'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, usd, pctFmt } from '../utils/chartConstants.js'

/* ── stat helpers ─────────────────────────────────────────────── */
function mean(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0 }
function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
function stdev(arr) {
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(arr.length - 1, 1))
}
function percentile(arr, p) {
  const s = [...arr].sort((a, b) => a - b)
  const i = (p / 100) * (s.length - 1)
  const lo = Math.floor(i), hi = Math.ceil(i)
  return lo === hi ? s[lo] : s[lo] + (i - lo) * (s[hi] - s[lo])
}
function skewness(arr) {
  const m = mean(arr), s = stdev(arr), n = arr.length
  if (s === 0 || n < 3) return 0
  return (n / ((n - 1) * (n - 2))) * arr.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0)
}
function histogram(arr, bins) {
  if (!arr.length) return []
  // Sturges' rule capped to requested max — avoids sparse gaps with small N
  const k = bins ?? Math.max(3, Math.min(12, Math.ceil(1 + Math.log2(arr.length))))
  const min = Math.min(...arr), max = Math.max(...arr)
  const width = (max - min) / k || 1
  const counts = new Array(k).fill(0)
  arr.forEach(v => { counts[Math.min(Math.floor((v - min) / width), k - 1)]++ })
  return counts.map((c, i) => ({ bin: usd(min + i * width), count: c }))
}

export default function StatisticsTab({ fiscalYear = 25, period = 6 }) {
  // Pull PnL and Variance data for statistical analysis
  const pnlParams = useMemo(() => ({ fiscal_year: fiscalYear, period }), [fiscalYear, period])
  const varParams = useMemo(() => ({ fiscal_year: fiscalYear, period }), [fiscalYear, period])
  const { data: pnlData, loading: pL, refetch: rPnl } = useTool('pnl_get_analysis', pnlParams)
  const { data: varData, loading: vL, refetch: rVar } = useTool('variance_get_budget_vs_actual', varParams)
  const handleRefresh = useCallback(() => { rPnl(); rVar() }, [rPnl, rVar])
  const { activeSimulations } = useSimulation()

  const loading = pL || vL
  const pnlOk = !!pnlData, varOk = !!varData

  // Extract period data
  const periods = pnlData?.result?.by_period || pnlData?.result?.periods || pnlData?.periods || []
  const revenues = periods.map(p => p.revenue ?? p.net_revenue ?? 0).filter(v => v !== 0)
  const cogs = periods.map(p => Math.abs(p.cogs ?? p.cost_of_goods_sold ?? 0)).filter(v => v !== 0)
  const gps = periods.map(p => p.gross_profit ?? 0).filter(v => v !== 0)
  const ebitdas = periods.map(p => p.ebitda ?? 0).filter(v => v !== 0)

  // Variance drivers
  const drivers = varData?.result?.drivers || varData?.drivers || []
  const variances = drivers.map(d => d.variance ?? d.amount ?? 0).filter(v => v !== 0)

  const revMean = mean(revenues), revStd = stdev(revenues), revMedian = median(revenues)
  const gpMean = mean(gps), gpStd = stdev(gps)
  const ebitdaMean = mean(ebitdas), ebitdaStd = stdev(ebitdas)
  const varMean = mean(variances), varStd = stdev(variances)
  const revSkew = skewness(revenues)
  const cv = revMean !== 0 ? (revStd / revMean) * 100 : 0 // coefficient of variation

  // Histogram of revenue
  const revHist = histogram(revenues)
  // Histogram of variances
  const varHist = histogram(variances)

  // Scatter: Revenue vs Gross Profit
  const scatterData = periods.map(p => ({
    x: p.revenue ?? p.net_revenue ?? 0,
    y: p.gross_profit ?? 0,
    name: p.period_label || `P${p.period}`,
  })).filter(d => d.x !== 0 || d.y !== 0)

  // descriptive stats table
  const statsRows = [
    { metric: 'Revenue', n: revenues.length, mean: revMean, median: revMedian, std: revStd, min: revenues.length ? Math.min(...revenues) : 0, max: revenues.length ? Math.max(...revenues) : 0, p25: revenues.length ? percentile(revenues, 25) : 0, p75: revenues.length ? percentile(revenues, 75) : 0 },
    { metric: 'Gross Profit', n: gps.length, mean: gpMean, median: median(gps), std: gpStd, min: gps.length ? Math.min(...gps) : 0, max: gps.length ? Math.max(...gps) : 0, p25: gps.length ? percentile(gps, 25) : 0, p75: gps.length ? percentile(gps, 75) : 0 },
    { metric: 'EBITDA', n: ebitdas.length, mean: ebitdaMean, median: median(ebitdas), std: ebitdaStd, min: ebitdas.length ? Math.min(...ebitdas) : 0, max: ebitdas.length ? Math.max(...ebitdas) : 0, p25: ebitdas.length ? percentile(ebitdas, 25) : 0, p75: ebitdas.length ? percentile(ebitdas, 75) : 0 },
    { metric: 'Variance', n: variances.length, mean: varMean, median: median(variances), std: varStd, min: variances.length ? Math.min(...variances) : 0, max: variances.length ? Math.max(...variances) : 0, p25: variances.length ? percentile(variances, 25) : 0, p75: variances.length ? percentile(variances, 75) : 0 },
  ]

  const alerts = []
  if (cv > 20) alerts.push({ level: 'WARNING', text: `Revenue CV of ${pctFmt(cv)} indicates high volatility.`, src: 'pnl_analysis' })
  if (Math.abs(revSkew) > 1) alerts.push({ level: 'INFO', text: `Revenue distribution skewness: ${revSkew.toFixed(2)} (${revSkew > 0 ? 'right' : 'left'}-skewed).`, src: 'pnl_analysis' })
  if (ebitdaStd > ebitdaMean * 0.3 && ebitdaMean > 0) alerts.push({ level: 'WARNING', text: `EBITDA std dev is ${pctFmt((ebitdaStd / ebitdaMean) * 100)} of mean — inconsistent margins.`, src: 'pnl_analysis' })
  if (varStd > 0) alerts.push({ level: 'INFO', text: `Variance driver dispersion: μ=${usd(varMean)}, σ=${usd(varStd)}`, src: 'variance' })

  const chips = [
    { label: 'Revenue μ', value: usd(revMean), sub: `σ = ${usd(revStd)}` },
    { label: 'Revenue CV', value: pctFmt(cv), sub: 'σ/μ', warn: cv > 20, ok: cv <= 20 },
    { label: 'Revenue Skew', value: revSkew.toFixed(2), sub: revSkew > 0 ? 'Right-skewed' : 'Left-skewed' },
    { label: 'GP μ', value: usd(gpMean), sub: `σ = ${usd(gpStd)}` },
    { label: 'EBITDA μ', value: usd(ebitdaMean), sub: `σ = ${usd(ebitdaStd)}` },
    { label: 'Variance μ', value: usd(varMean), sub: `σ = ${usd(varStd)}` },
    { label: 'N Periods', value: `${revenues.length}`, sub: 'Observations' },
    { label: 'N Drivers', value: `${variances.length}`, sub: 'Variance drivers' },
    { label: 'Revenue Range', value: `${usd(revenues.length ? Math.min(...revenues) : 0)} – ${usd(revenues.length ? Math.max(...revenues) : 0)}`, sub: 'Min – Max' },
    { label: 'Rev P25–P75', value: `${usd(revenues.length ? percentile(revenues, 25) : 0)} – ${usd(revenues.length ? percentile(revenues, 75) : 0)}`, sub: 'IQR' },
  ]

  if (loading && !pnlOk && !varOk) return <div className="tab-loading">Loading statistics…</div>

  const panels = [
    {
      id: 'st-rev-hist', title: 'Revenue Distribution', badge: 'pnl_analysis', span: 1,
      render: () => revHist.length > 0 ? (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={revHist} barCategoryGap={0} barGap={0}>
            <CartesianGrid {...GRID} /><XAxis dataKey="bin" {...XAXIS} /><YAxis {...YAXIS} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'rgba(255,255,255,0.45)' } }} allowDecimals={false} />
            <Tooltip {...TT} />
            <Bar dataKey="count" fill={C.chart1} fillOpacity={0.6} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Insufficient data</div>,
    },
    {
      id: 'st-var-hist', title: 'Variance Distribution', badge: 'variance', span: 1,
      render: () => varHist.length > 0 ? (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={varHist} barCategoryGap={0} barGap={0}>
            <CartesianGrid {...GRID} /><XAxis dataKey="bin" {...XAXIS} /><YAxis {...YAXIS} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'rgba(255,255,255,0.45)' } }} allowDecimals={false} />
            <Tooltip {...TT} />
            <ReferenceLine x={0} stroke={C.gray} strokeDasharray="4 2" />
            <Bar dataKey="count" fill={C.chart5} fillOpacity={0.6} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Insufficient data</div>,
    },
    {
      id: 'st-scatter', title: 'Revenue vs Gross Profit', badge: 'pnl_analysis', span: 1,
      render: () => scatterData.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
          <ScatterChart margin={{ left: 10, right: 10 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="x" type="number" name="Revenue" {...XAXIS} tickFormatter={v => fd(v)} />
            <YAxis dataKey="y" type="number" name="Gross Profit" {...YAXIS} tickFormatter={v => fd(v)} />
            <ZAxis range={[30, 30]} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <Scatter data={scatterData} fill={C.chart2} fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Insufficient data</div>,
    },
    {
      id: 'st-gauges', title: 'Stability Gauges', span: 1,
      render: () => (
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12, padding: '8px 0' }}>
          <GaugeArc label="Revenue CV" value={cv} max={50} unit="%" color={cv > 20 ? C.red : cv > 10 ? C.amber : C.teal} />
          <GaugeArc label="|Skewness|" value={Math.abs(revSkew)} max={3} unit="" color={Math.abs(revSkew) > 1 ? C.amber : C.teal} />
        </div>
      ),
    },
    {
      id: 'st-table', title: 'Descriptive Statistics', span: 2,
      render: () => (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Metric','N','Mean','Median','Std Dev','Min','P25','P75','Max'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {statsRows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.surf }}>
                  <td style={{ ...TDL, fontWeight: 500 }}>{row.metric}</td>
                  <td style={TD}>{row.n}</td>
                  <td style={TD}>{usd(row.mean)}</td>
                  <td style={TD}>{usd(row.median)}</td>
                  <td style={TD}>{usd(row.std)}</td>
                  <td style={TD}>{usd(row.min)}</td>
                  <td style={TD}>{usd(row.p25)}</td>
                  <td style={TD}>{usd(row.p75)}</td>
                  <td style={TD}>{usd(row.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'st-alerts', title: `Statistical Alerts — ${alerts.length}`, span: 2,
      render: () => <div>{alerts.map((a, i) => <AlertRow key={i} {...a} />)}</div>,
    },
  ]

  return <div>
    <div className="tab-header"><span className="tab-header__title">Statistics</span><button className="tab-header__btn" onClick={handleRefresh} disabled={loading}>↻ Refresh</button></div>
    <KPIRail chips={chips} /><PanelGrid panels={panels} /></div>
}
