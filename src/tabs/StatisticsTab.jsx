// StatisticsTab — V5: wired to statistical_analytics (NB-H) + legacy PnL/Variance
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
import { useSimulation } from '../context/SimulationContext.jsx'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, usd, pctFmt } from '../utils/chartConstants.js'

/* ── fallback stat helpers (used when server stats unavailable) ── */
function _mean(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0 }
function _median(arr) { const s=[...arr].sort((a,b)=>a-b), m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2 }
function _stdev(arr) { const m=_mean(arr); return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/Math.max(arr.length-1,1)) }
function _pct(arr,p) { const s=[...arr].sort((a,b)=>a-b), i=(p/100)*(s.length-1), lo=Math.floor(i), hi=Math.ceil(i); return lo===hi?s[lo]:s[lo]+(i-lo)*(s[hi]-s[lo]) }
function _skew(arr) { const m=_mean(arr),s=_stdev(arr),n=arr.length; return s===0||n<3?0:(n/((n-1)*(n-2)))*arr.reduce((a,v)=>a+((v-m)/s)**3,0) }
function _hist(arr, bins) {
  if (!arr.length) return []
  const k = bins ?? Math.max(3, Math.min(12, Math.ceil(1+Math.log2(arr.length))))
  const mn=Math.min(...arr), mx=Math.max(...arr), w=(mx-mn)/k||1
  const c=new Array(k).fill(0)
  arr.forEach(v=>{ c[Math.min(Math.floor((v-mn)/w),k-1)]++ })
  return c.map((cnt,i)=>({ bin: usd(mn+i*w), count: cnt }))
}

export default function StatisticsTab({ fiscalYear = 25, period = 6 }) {
  // ── NB-H: Statistical Analytics (server-side descriptive / histograms / correlation / anomalies) ──
  const saParams = useMemo(() => ({ action: 'summary', fiscal_year: fiscalYear, top_n: 20 }), [fiscalYear])
  const { data: saData, loading: saL, refetch: rSa } = useTool('statistical_analytics', saParams)

  // ── Legacy PnL + Variance (fallback if NB-H unavailable) ──
  const pnlParams = useMemo(() => ({ fiscal_year: fiscalYear, period }), [fiscalYear, period])
  const varParams = useMemo(() => ({ fiscal_year: fiscalYear, period }), [fiscalYear, period])
  const { data: pnlData, loading: pL, refetch: rPnl } = useTool('pnl_get_analysis', pnlParams)
  const { data: varData, loading: vL, refetch: rVar } = useTool('variance_get_budget_vs_actual', varParams)
  const handleRefresh = useCallback(() => { rSa(); rPnl(); rVar() }, [rSa, rPnl, rVar])
  const { activeSimulations } = useSimulation()

  const loading = saL || pL || vL
  const sa = saData?.result ?? saData ?? {}
  const hasSA = !!sa.descriptive || !!sa.histograms || !!sa.correlation

  // ─── Server-side descriptive stats (NB-H) ──────────────────
  const serverStats = sa.descriptive?.stats ?? []
  // NB-H now returns histograms keyed by metric name directly: {revenue: [...], variance: [...]}
  // Older shape kept the array under .histograms.<metric> — accept both.
  const serverHistograms = sa.histograms ?? {}
  const serverCorr = sa.correlation?.correlation ?? sa.correlation ?? {}
  const serverAnomalies = sa.anomalies?.scored_periods ?? []
  const anomalyCount = sa.anomalies?.anomaly_count ?? serverAnomalies.filter(s => !s.is_normal).length

  // ─── Fallback: extract from PnL periods ────────────────────
  const periods = pnlData?.result?.by_period || pnlData?.result?.periods || pnlData?.periods || []
  const revenues = periods.map(p => p.revenue ?? p.net_revenue ?? 0).filter(v => v !== 0)
  const gps = periods.map(p => p.gross_profit ?? 0).filter(v => v !== 0)
  const ebitdas = periods.map(p => p.ebitda ?? 0).filter(v => v !== 0)
  const drivers = varData?.result?.drivers || varData?.drivers || []
  const variances = drivers.map(d => d.variance ?? d.amount ?? 0).filter(v => v !== 0)

  // Use server stats when available, else compute locally
  const revStat  = serverStats.find(s => /revenue/i.test(s.metric_name))
  const gpStat   = serverStats.find(s => /gross/i.test(s.metric_name))
  const ebitStat = serverStats.find(s => /ebit/i.test(s.metric_name))

  const revMean  = revStat?.mean_val  ?? _mean(revenues)
  const revStd   = revStat?.stddev_val ?? _stdev(revenues)
  const revMedian= revStat?.median_val ?? _median(revenues)
  const revSkew  = revStat?.skewness   ?? _skew(revenues)
  const cv       = revStat?.cv_pct     ?? (revMean !== 0 ? (revStd / revMean) * 100 : 0)
  const gpMean   = gpStat?.mean_val    ?? _mean(gps)
  const gpStd    = gpStat?.stddev_val  ?? _stdev(gps)
  const ebitdaMean = ebitStat?.mean_val ?? _mean(ebitdas)
  const ebitdaStd  = ebitStat?.stddev_val ?? _stdev(ebitdas)
  const varMean  = _mean(variances)
  const varStd   = _stdev(variances)

  // Histograms: prefer server (NB-H returns lowercased metric keys: revenue / variance / cogs)
  const _histRows = serverHistograms.revenue ?? serverHistograms.Revenue ?? null
  const revHist = _histRows
    ? _histRows.map(b => ({ bin: usd(b.bin_lower), count: b.count_val }))
    : _hist(revenues)
  const _varHistRows = serverHistograms.variance ?? serverHistograms.Variance ?? null
  const varHist = _varHistRows
    ? _varHistRows.map(b => ({ bin: usd(b.bin_lower), count: b.count_val }))
    : _hist(variances)

  // Scatter: Revenue vs Gross Profit (from PnL periods or server correlation data)
  const scatterData = periods.map(p => ({
    x: p.revenue ?? p.net_revenue ?? 0, y: p.gross_profit ?? 0,
    name: p.period_label || `P${p.period}`,
  })).filter(d => d.x !== 0 || d.y !== 0)

  // Build descriptive stats table rows
  const statsRows = serverStats.length > 0
    ? serverStats.map(s => ({
        metric: s.metric_name, n: s.n, mean: s.mean_val, median: s.median_val,
        std: s.stddev_val, min: s.min_val, max: s.max_val, p25: s.p25, p75: s.p75,
      }))
    : [
        { metric: 'Revenue', n: revenues.length, mean: revMean, median: revMedian, std: revStd, min: revenues.length?Math.min(...revenues):0, max: revenues.length?Math.max(...revenues):0, p25: revenues.length?_pct(revenues,25):0, p75: revenues.length?_pct(revenues,75):0 },
        { metric: 'Gross Profit', n: gps.length, mean: gpMean, median: _median(gps), std: gpStd, min: gps.length?Math.min(...gps):0, max: gps.length?Math.max(...gps):0, p25: gps.length?_pct(gps,25):0, p75: gps.length?_pct(gps,75):0 },
        { metric: 'EBITDA', n: ebitdas.length, mean: ebitdaMean, median: _median(ebitdas), std: ebitdaStd, min: ebitdas.length?Math.min(...ebitdas):0, max: ebitdas.length?Math.max(...ebitdas):0, p25: ebitdas.length?_pct(ebitdas,25):0, p75: ebitdas.length?_pct(ebitdas,75):0 },
      ]

  // Alerts
  const alerts = []
  if (cv > 20) alerts.push({ level: 'WARNING', text: `Revenue CV of ${pctFmt(cv)} indicates high volatility.`, src: 'statistical_analytics' })
  if (Math.abs(revSkew) > 1) alerts.push({ level: 'INFO', text: `Revenue distribution skewness: ${revSkew.toFixed(2)} (${revSkew > 0 ? 'right' : 'left'}-skewed).`, src: 'statistical_analytics' })
  if (ebitdaStd > ebitdaMean * 0.3 && ebitdaMean > 0) alerts.push({ level: 'WARNING', text: `EBITDA std dev is ${pctFmt((ebitdaStd / ebitdaMean) * 100)} of mean — inconsistent margins.`, src: 'statistical_analytics' })
  if (anomalyCount > 0) alerts.push({ level: 'WARNING', text: `${anomalyCount} anomalous period(s) detected by NB-H model.`, src: 'statistical_analytics' })
  if (serverCorr.r_squared > 0) alerts.push({ level: 'INFO', text: `Revenue↔GP correlation: R²=${serverCorr.r_squared.toFixed(2)}, Pearson r=${(serverCorr.pearson_r ?? 0).toFixed(2)}`, src: 'statistical_analytics' })
  if (varStd > 0) alerts.push({ level: 'INFO', text: `Variance driver dispersion: μ=${usd(varMean)}, σ=${usd(varStd)}`, src: 'variance' })

  const chips = [
    { label: 'Revenue μ', value: usd(revMean), sub: `σ = ${usd(revStd)}` },
    { label: 'Revenue CV', value: pctFmt(cv), sub: 'σ/μ', warn: cv > 20, ok: cv <= 20 },
    { label: 'Revenue Skew', value: typeof revSkew === 'number' ? revSkew.toFixed(2) : '—', sub: revSkew > 0 ? 'Right-skewed' : 'Left-skewed' },
    { label: 'GP μ', value: usd(gpMean), sub: `σ = ${usd(gpStd)}` },
    { label: 'EBITDA μ', value: usd(ebitdaMean), sub: `σ = ${usd(ebitdaStd)}` },
    { label: 'Variance μ', value: usd(varMean), sub: `σ = ${usd(varStd)}` },
    { label: 'R²', value: serverCorr.r_squared != null ? serverCorr.r_squared.toFixed(2) : '—', sub: 'Rev↔GP', ok: (serverCorr.r_squared ?? 0) > 0.8 },
    { label: 'Anomalies', value: `${anomalyCount}`, sub: 'Flagged periods', warn: anomalyCount > 0 },
    { label: 'N Periods', value: `${revenues.length || serverStats[0]?.n || 0}`, sub: 'Observations' },
    { label: hasSA ? 'Source' : 'Fallback', value: hasSA ? 'NB-H' : 'Local', sub: hasSA ? 'Server analytics' : 'Client-side' },
  ]

  if (loading && !saData && !pnlData && !varData) return <div className="tab-loading">Loading statistics…</div>

  const panels = [
    {
      id: 'st-rev-hist', title: 'Revenue Distribution', badge: hasSA ? 'fn-statistical-analytics' : 'pnl_analysis', span: 1,
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
      id: 'st-scatter', title: `Revenue vs Gross Profit${serverCorr.r_squared != null ? ` — R² ${serverCorr.r_squared.toFixed(2)}` : ''}`, badge: hasSA ? 'fn-statistical-analytics' : 'pnl_analysis', span: 1,
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
    ...(serverAnomalies.length > 0 ? [{
      id: 'st-anomalies', title: `Anomaly Detection — ${anomalyCount} flagged`, badge: 'fn-statistical-analytics', span: 2,
      render: () => (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Period','Revenue','GP Margin','EBITDA Margin','Score','Normal'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>{serverAnomalies.map((a, i) => (
              <tr key={i} style={{ background: !a.is_normal ? 'rgba(255,87,51,0.08)' : i % 2 === 0 ? 'transparent' : C.surf }}>
                <td style={TDL}>FY{a.fiscal_year} P{a.period_num}</td>
                <td style={TD}>{usd(a.revenue)}</td>
                <td style={TD}>{a.gp_margin_pct != null ? `${a.gp_margin_pct.toFixed(1)}%` : '—'}</td>
                <td style={TD}>{a.ebitda_margin_pct != null ? `${a.ebitda_margin_pct.toFixed(1)}%` : '—'}</td>
                <td style={TD}>{a.anomaly_score?.toFixed(3)}</td>
                <td style={TD}>{a.is_normal ? '✓' : '✗'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ),
    }] : []),
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
