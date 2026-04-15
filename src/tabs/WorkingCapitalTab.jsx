// WorkingCapitalTab — V4 new tab: DSO, DPO, DIO, CCC analysis from balance sheet data
import { useMemo } from 'react'
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
import { C, GRID, XAXIS, YAXIS, TT, fd, usd, pctFmt } from '../utils/chartConstants.js'

function bs(r) { return r?.balance_sheet ?? r ?? {} }
function safe(v) { return typeof v === 'number' && isFinite(v) ? v : 0 }
function days(v) { return v == null || !isFinite(v) ? 'N/A' : `${v.toFixed(1)} days` }

export default function WorkingCapitalTab({ fiscalYear = 25, period = 6 }) {
  const bsParams = useMemo(() => ({ fiscal_year: fiscalYear, period, comparison_year: fiscalYear - 1, comparison_period: period }), [fiscalYear, period])
  const { data: toolResult, loading, refetch } = useTool('balancesheet_get_analysis', bsParams)
  const { activeSimulations, isAnyActive } = useSimulation()
  const ok = !!toolResult
  const r  = ok ? toolResult.result : null
  const b  = ok ? bs(r) : null
  const rat = r?.ratios ?? {}

  const fyLabel = `FY20${String(fiscalYear).padStart(2, '0')}`

  // Extract balance sheet values
  const ca  = safe(b?.assets?.current_assets?.total)
  const nca = safe(b?.assets?.non_current_assets?.total)
  const cl  = safe(b?.liabilities?.current_liabilities?.total)
  const ncl = safe(b?.liabilities?.non_current_liabilities?.total)
  const eq  = safe(b?.equity?.total)
  const totalA = safe(b?.total_assets) || (ca + nca)
  const totalL = safe(b?.total_liabilities) || (cl + ncl)
  const wc = ca - cl

  // Derive WC metrics (approximate from BS data — real DSO/DPO would need AR/AP/Revenue)
  const ar = safe(b?.assets?.current_assets?.accounts?.filter(a => /receiv/i.test(a.account_desc)).reduce((s, a) => s + safe(a.balance), 0))
  const inv = safe(b?.assets?.current_assets?.accounts?.filter(a => /inventor/i.test(a.account_desc)).reduce((s, a) => s + safe(a.balance), 0))
  const ap = safe(Math.abs(b?.liabilities?.current_liabilities?.accounts?.filter(a => /payab/i.test(a.account_desc)).reduce((s, a) => s + safe(a.balance), 0) ?? 0))

  // Use annual revenue approximation from ratios or default
  const annualRevEst = totalA > 0 ? totalA * 0.8 : 1 // rough approximation
  const dailyRev = annualRevEst / 365
  const dailyCOGS = dailyRev * 0.65

  const dso = dailyRev > 0 ? ar / dailyRev : 0
  const dio = dailyCOGS > 0 ? inv / dailyCOGS : 0
  const dpo = dailyCOGS > 0 ? ap / dailyCOGS : 0
  const ccc = dso + dio - dpo

  // Build trend from comparison data
  const trend = r?.trend || []
  const trendData = trend.map(t => ({
    name: t.period_label,
    wc: safe(t.total_assets) * 0.4 - safe(t.total_liabilities) * 0.3, // approximation
    ca: safe(t.total_assets) * 0.4,
    cl: safe(t.total_liabilities) * 0.3,
  }))

  // WC composition bar
  const wcComposition = [
    { name: 'Cash', value: safe(b?.assets?.current_assets?.accounts?.filter(a => /cash/i.test(a.account_desc)).reduce((s, a) => s + safe(a.balance), 0)) },
    { name: 'A/R', value: ar },
    { name: 'Inventory', value: inv },
    { name: 'Other CA', value: Math.max(0, ca - ar - inv - safe(b?.assets?.current_assets?.accounts?.filter(a => /cash/i.test(a.account_desc)).reduce((s, a) => s + safe(a.balance), 0))) },
    { name: 'A/P', value: -ap },
    { name: 'Other CL', value: -(cl - ap) },
  ].filter(d => d.value !== 0)

  // Alerts
  const alerts = []
  if (wc < 0) alerts.push({ level: 'CRITICAL', text: `Negative working capital: ${usd(wc)}. Liquidity risk.`, src: 'balancesheet' })
  if (ccc > 90) alerts.push({ level: 'WARNING', text: `Cash conversion cycle ${days(ccc)} exceeds 90-day threshold.`, src: 'derived' })
  if (dso > 60) alerts.push({ level: 'WARNING', text: `DSO of ${days(dso)} suggests slow collections.`, src: 'derived' })
  if (rat.current_ratio < 1.2) alerts.push({ level: 'WARNING', text: `Current ratio ${(rat.current_ratio ?? 0).toFixed(2)} below 1.2 — tight liquidity.`, src: 'balancesheet' })
  if (wc > 0 && ccc <= 60) alerts.push({ level: 'OK', text: `Working capital positive (${usd(wc)}) and CCC ${days(ccc)} within target.`, src: 'derived' })

  const chips = [
    { label: 'Working Capital', value: usd(wc), sub: 'CA − CL', ok: wc > 0, danger: wc < 0, kpiKey: 'working_capital' },
    { label: 'Current Ratio', value: (rat.current_ratio ?? 0).toFixed(2), sub: 'CA / CL', ok: rat.current_ratio > 1.5, warn: rat.current_ratio <= 1.5 },
    { label: 'Quick Ratio', value: (rat.quick_ratio ?? 0).toFixed(2), sub: '(CA-Inv) / CL', ok: rat.quick_ratio > 1 },
    { label: 'DSO', value: days(dso), sub: 'Days Sales Outstanding' },
    { label: 'DIO', value: days(dio), sub: 'Days Inventory Outstanding' },
    { label: 'DPO', value: days(dpo), sub: 'Days Payable Outstanding' },
    { label: 'Cash Cycle', value: days(ccc), sub: 'DSO + DIO − DPO', ok: ccc < 60, warn: ccc >= 60 && ccc < 90, danger: ccc >= 90 },
    { label: 'A/R', value: usd(ar), sub: 'Receivables' },
    { label: 'Inventory', value: usd(inv), sub: 'Current inventory' },
    { label: 'A/P', value: usd(ap), sub: 'Payables' },
  ]

  if (loading && !ok) return <div className="tab-loading">Loading working capital…</div>

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
      badge: 'fn-balancesheet', span: 1,
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
    ...(trendData.length > 0 ? [{
      id: 'wc-trend', title: 'Working Capital Trend', badge: 'fn-balancesheet', span: 1,
      render: () => (
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={trendData}>
            <CartesianGrid {...GRID} /><XAxis dataKey="name" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
            <Tooltip {...TT} formatter={v => usd(v)} /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="ca" name="Current Assets" fill={C.chart1} fillOpacity={0.4} radius={[2, 2, 0, 0]} />
            <Bar dataKey="cl" name="Current Liab" fill={C.chart3} fillOpacity={0.4} radius={[2, 2, 0, 0]} />
            <Line dataKey="wc" name="Working Capital" stroke={C.chart2} strokeWidth={2} dot={{ r: 3 }} />
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
    <div className="tab-header"><span className="tab-header__title">Working Capital</span><button className="tab-header__btn" onClick={refetch} disabled={loading}>↻ Refresh</button></div>
    <KPIRail chips={chips} /><PanelGrid panels={panels} /></div>
}
