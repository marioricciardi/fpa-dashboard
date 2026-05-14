// WorkingCapitalTab — V5: wired to working_capital_analysis + working_capital_analytics
import { useMemo, useCallback } from 'react'
import {
  ComposedChart, Line, BarChart, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

import { KPIRail } from '../components/KPIChip.jsx'
import PanelGrid from '../components/PanelGrid.jsx'
import { GaugeArc, AlertRow } from '../components/ChartPrimitives.jsx'
import { useTool } from '../hooks/useTool.js'
import { useSimulation } from '../context/SimulationContext.jsx'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, usd, pctFmt } from '../utils/chartConstants.js'

function safe(v) { return typeof v === 'number' && isFinite(v) ? v : 0 }
function days(v) { return v == null || !isFinite(v) ? 'N/A' : `${v.toFixed(1)} days` }

export default function WorkingCapitalTab({ fiscalYear = 25, period = 6 }) {
  // ── NB-D: CCC, AR aging, AR forecast ──
  const wcParams = useMemo(() => ({ action: 'summary', fiscal_year: fiscalYear, periods: 3, top_n: 20 }), [fiscalYear])
  const { data: wcData, loading: wcL, refetch: rWc } = useTool('working_capital_analysis', wcParams)

  // ── NB-G: DSO/DIO/DPO time-series forecasts + trend ──
  const wcaParams = useMemo(() => ({ action: 'summary', fiscal_year: fiscalYear, periods: 6 }), [fiscalYear])
  const { data: wcaData, loading: wcaL, refetch: rWca } = useTool('working_capital_analytics', wcaParams)

  const handleRefresh = useCallback(() => { rWc(); rWca() }, [rWc, rWca])
  const { activeSimulations, isAnyActive } = useSimulation()

  const loading = wcL || wcaL
  const wc  = wcData?.result ?? wcData ?? {}
  const wca = wcaData?.result ?? wcaData ?? {}

  const fyLabel = `FY20${String(fiscalYear).padStart(2, '0')}`

  // ── CCC metrics from working_capital_analysis ──
  const dso = safe(wc.dso)
  const dio = safe(wc.dio)
  const dpo = safe(wc.dpo)
  const ccc = safe(wc.ccc)
  const ar  = safe(wc.ar_balance)
  const ap  = safe(wc.ap_balance)
  const inv = safe(wc.inventory_value)
  const wcVal = safe(wc.working_capital ?? (ar + inv - ap))
  const curRatio = safe(wc.current_ratio)

  // AR aging
  const arAging  = wc.ar_aging?.aging_buckets ?? []
  const arFcst   = wc.ar_forecast?.forecast ?? []

  // ── Forecasts from working_capital_analytics ──
  const dsoFcst = wca.dso_forecast?.forecast ?? []
  const dioFcst = wca.dio_forecast?.forecast ?? []
  const dpoFcst = wca.dpo_forecast?.forecast ?? []
  const trend   = wca.trend?.trend ?? wca.trend ?? []

  // WC composition bar — prefer NB-G's GBOBJ-classified composition; fall back
  // to NB-D balances + a 30% cash approximation only if NB-G isn't loaded.
  const wcaComposition = Array.isArray(wca.composition) ? wca.composition.filter(d => d.value !== 0) : []
  const cash = safe(wc.cash_balance ?? wcaComposition.find(c => c.name === 'Cash')?.value ?? wcVal * 0.3)
  const wcComposition = wcaComposition.length > 0 ? wcaComposition : [
    { name: 'Cash', value: cash }, { name: 'A/R', value: ar },
    { name: 'Inventory', value: inv }, { name: 'Other CA', value: Math.max(0, wcVal - cash - ar - inv + ap) },
    { name: 'A/P', value: -ap }, { name: 'Other CL', value: 0 },
  ].filter(d => d.value !== 0)

  // Trend chart data from NB-G
  const trendData = Array.isArray(trend) ? trend.map(t => ({
    name: `FY${t.fiscal_year ?? t.sequence_id}`,
    dso: safe(t.dso), dio: safe(t.dio), dpo: safe(t.dpo), ccc: safe(t.ccc),
  })) : []

  // DSO forecast chart (merge history + forecast from NB-G)
  const dsoHistory = wca.dso_forecast?.history ?? []
  const dsoChartData = [...dsoHistory.map(h => ({ p: `H${h.period_seq}`, actual: h.actual, forecast: null })),
    ...dsoFcst.map(f => ({ p: `F${f.period_seq}`, actual: null, forecast: f.forecasted, lower: f.lower_95, upper: f.upper_95 }))]

  // Alerts
  const alerts = []
  if (wcVal < 0) alerts.push({ level: 'CRITICAL', text: `Negative working capital: ${usd(wcVal)}. Liquidity risk.`, src: 'working_capital_analysis' })
  if (ccc > 90) alerts.push({ level: 'WARNING', text: `Cash conversion cycle ${days(ccc)} exceeds 90-day threshold.`, src: 'working_capital_analysis' })
  if (dso > 60) alerts.push({ level: 'WARNING', text: `DSO of ${days(dso)} suggests slow collections.`, src: 'working_capital_analysis' })
  if (curRatio > 0 && curRatio < 1.2) alerts.push({ level: 'WARNING', text: `Current ratio ${curRatio.toFixed(2)} below 1.2 — tight liquidity.`, src: 'working_capital_analysis' })
  if (arAging.some(b => b.risk === 'CRITICAL')) alerts.push({ level: 'CRITICAL', text: `AR aging: ${usd(arAging.filter(b => b.risk === 'CRITICAL').reduce((s, b) => s + (b.amount ?? 0), 0))} past 120 days.`, src: 'working_capital_analysis' })
  if (wcVal > 0 && ccc <= 60) alerts.push({ level: 'OK', text: `Working capital positive (${usd(wcVal)}) and CCC ${days(ccc)} within target.`, src: 'working_capital_analysis' })

  const chips = [
    { label: 'Working Capital', value: usd(wcVal), sub: 'CA − CL', ok: wcVal > 0, danger: wcVal < 0, kpiKey: 'working_capital' },
    { label: 'Current Ratio', value: curRatio ? curRatio.toFixed(2) : '—', sub: 'CA / CL', ok: curRatio > 1.5, warn: curRatio > 0 && curRatio <= 1.5 },
    { label: 'DSO', value: days(dso), sub: 'Days Sales Outstanding' },
    { label: 'DIO', value: days(dio), sub: 'Days Inventory Outstanding' },
    { label: 'DPO', value: days(dpo), sub: 'Days Payable Outstanding' },
    { label: 'Cash Cycle', value: days(ccc), sub: 'DSO + DIO − DPO', ok: ccc < 60, warn: ccc >= 60 && ccc < 90, danger: ccc >= 90 },
    { label: 'A/R', value: usd(ar), sub: 'Receivables' },
    { label: 'Inventory', value: usd(inv), sub: 'Current inventory' },
    { label: 'A/P', value: usd(ap), sub: 'Payables' },
    { label: 'Periods Fcst', value: `${dsoFcst.length}`, sub: 'DSO/DIO/DPO forecast' },
  ]

  if (loading && !wcData && !wcaData) return <div className="tab-loading">Loading working capital…</div>

  const panels = [
    {
      id: 'wc-gauges', title: 'Cash Conversion Cycle Gauges', span: 2,
      render: () => (
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16, padding: '8px 0' }}>
          <GaugeArc label="DSO" value={dso} max={120} unit=" days" color={dso > 60 ? C.red : dso > 45 ? C.amber : C.teal}
            meaning="Avg days to collect receivables" target="< 45 days" />
          <GaugeArc label="DIO" value={dio} max={120} unit=" days" color={dio > 60 ? C.red : dio > 30 ? C.amber : C.teal}
            meaning="Avg days inventory is held" target="< 30 days" />
          <GaugeArc label="DPO" value={dpo} max={120} unit=" days" color={dpo < 20 ? C.amber : C.teal}
            meaning="Avg days to pay suppliers" target="> 20 days" />
          <GaugeArc label="CCC" value={ccc} max={150} unit=" days" color={ccc > 90 ? C.red : ccc > 60 ? C.amber : C.teal}
            meaning="Full cash-to-cash cycle" target="< 60 days" />
        </div>
      ),
    },
    {
      id: 'wc-composition', title: `Working Capital Composition — ${fyLabel} P${period}`,
      badge: 'fn-working-capital', span: 1,
      render: () => wcComposition.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(100, wcComposition.length * 26)}>
          <BarChart data={wcComposition} layout="vertical" margin={{ left: 60, right: 10 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical /><XAxis type="number" {...XAXIS} tickFormatter={v => fd(v)} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: C.txtt }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {wcComposition.map((d, i) => (
                <Bar key={i} fill={d.value >= 0 ? C.teal : C.red} fillOpacity={0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>No WC data</div>,
    },
    ...(arAging.length > 0 ? [{
      id: 'wc-ar-aging', title: `AR Aging — Total ${usd(ar)}`, badge: 'fn-working-capital', span: 1,
      render: () => (
        <ResponsiveContainer width="100%" height={Math.max(100, arAging.length * 26)}>
          <BarChart data={arAging} layout="vertical" margin={{ left: 50, right: 10 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical /><XAxis type="number" {...XAXIS} tickFormatter={v => fd(v)} />
            <YAxis dataKey="bucket" type="category" tick={{ fontSize: 9, fill: C.txtt }} axisLine={false} tickLine={false} width={50} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <Bar dataKey="amount" name="Amount" fill={C.chart1} fillOpacity={0.6} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    }] : []),
    ...(dsoChartData.length > 0 ? [{
      id: 'wc-dso-fcst', title: 'DSO Forecast — fn-working-capital-analytics', badge: 'fn-wc-analytics', span: 1,
      render: () => (
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={dsoChartData}>
            <CartesianGrid {...GRID} /><XAxis dataKey="p" {...XAXIS} /><YAxis {...YAXIS} />
            <Tooltip {...TT} /><Legend wrapperStyle={{ fontSize: 10 }} />
            {dsoChartData.some(d => d.upper) && <Area dataKey="upper" fill={C.chart3} stroke="none" fillOpacity={0.08} legendType="none" />}
            {dsoChartData.some(d => d.lower) && <Area dataKey="lower" fill="white" stroke="none" fillOpacity={1} legendType="none" />}
            <Line dataKey="actual" name="Actual DSO" stroke={C.chart2} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            <Line dataKey="forecast" name="Forecast DSO" stroke={C.chart5} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
    }] : []),
    ...(trendData.length > 0 ? [{
      id: 'wc-trend', title: 'Working Capital Trend — DSO / DIO / DPO / CCC', badge: 'fn-wc-analytics', span: 2,
      render: () => (
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={trendData}>
            <CartesianGrid {...GRID} /><XAxis dataKey="name" {...XAXIS} /><YAxis {...YAXIS} />
            <Tooltip {...TT} /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="dso" name="DSO" fill={C.chart1} fillOpacity={0.5} radius={[2, 2, 0, 0]} />
            <Bar dataKey="dio" name="DIO" fill={C.chart3} fillOpacity={0.5} radius={[2, 2, 0, 0]} />
            <Bar dataKey="dpo" name="DPO" fill={C.chart4} fillOpacity={0.5} radius={[2, 2, 0, 0]} />
            <Line dataKey="ccc" name="CCC" stroke={C.chart2} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
    }] : []),
    {
      id: 'wc-alerts', title: `Working Capital Alerts — ${alerts.length}`, span: 2,
      render: () => <div>{alerts.map((a, i) => <AlertRow key={i} {...a} />)}</div>,
    },
  ]

  return <div>
    <div className="tab-header"><span className="tab-header__title">Working Capital</span><button className="tab-header__btn" onClick={handleRefresh} disabled={loading}>↻ Refresh</button></div>
    <KPIRail chips={chips} /><PanelGrid panels={panels} /></div>
}
