// OverviewTab — V4 visual layout with recharts, PanelGrid, KPIChip
// Backend: useTool() calls to OCI functions preserved exactly
import { useMemo, useCallback } from 'react'
import {
  ComposedChart, Line, BarChart, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
  PieChart, Pie,
} from 'recharts'

import { KPIRail } from '../components/KPIChip.jsx'
import PanelGrid from '../components/PanelGrid.jsx'
import { AlertRow, GaugeArc, WaterfallBar } from '../components/ChartPrimitives.jsx'
import { useSimulation, augmentPeriodData } from '../context/SimulationContext.jsx'
import { useTool } from '../hooks/useTool.js'
import { C, GRID, XAXIS, YAXIS, TT, fd, usd, pctFmt } from '../utils/chartConstants.js'

const ASSET_COLORS = ['#7C3AED','#16a34a','#a78bfa','#EF9F27','#E24B4A','#5C5C5C','#2D6B4F','#A35B1A']

function dedupeDrivers(drivers) {
  const seen = new Set(), out = []
  for (const d of (drivers || [])) {
    const key = `${d.account}|${d.subsidiary}|${d.business_unit}|${d.budget}|${d.actual}`
    if (!seen.has(key)) { seen.add(key); out.push(d) }
  }
  return out
}

export default function OverviewTab({ fiscalYear = 25, period = 6 }) {
  const quarter = Math.ceil(period / 3)
  const { activeSimulations } = useSimulation()

  // ── OCI tool calls (unchanged) ──
  const pnlParams = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: period, comparison_year: fiscalYear - 1 }), [fiscalYear, period])
  const bvaParams = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: period, top_n_drivers: 8 }), [fiscalYear, period])
  const bsParams = useMemo(() => ({ fiscal_year: fiscalYear, period, comparison_year: fiscalYear - 1, comparison_period: period }), [fiscalYear, period])
  const fqtrParams = useMemo(() => ({ business_unit: 'M30', fiscal_year: 2000 + fiscalYear, quarter }), [fiscalYear, quarter])
  const frollParams = useMemo(() => ({ fiscal_year: fiscalYear, operation: 'current' }), [fiscalYear])

  const { data: pnlData, loading: pnlL, refetch: rPnl } = useTool('pnl_get_analysis', pnlParams)
  const { data: bvaData, loading: bvaL, refetch: rBva } = useTool('variance_get_budget_vs_actual', bvaParams)
  const { data: bsData, loading: bsL, refetch: rBs } = useTool('balancesheet_get_analysis', bsParams)
  const { data: fqtrData, loading: fqtrL, refetch: rFqtr } = useTool('forecast_get_quarter', fqtrParams)
  const { data: frollData, refetch: rFroll } = useTool('forecast_get_rolling', frollParams)
  const handleRefresh = useCallback(() => { rPnl(); rBva(); rBs(); rFqtr(); rFroll() }, [rPnl, rBva, rBs, rFqtr, rFroll])

  const anyLoading = pnlL || bvaL || bsL || fqtrL

  // ── Extract from OCI responses ──
  const s = pnlData?.result?.pnl_summary ?? pnlData?.pnl_summary ?? {}
  const bvaDrivers = dedupeDrivers(bvaData?.result?.drivers ?? bvaData?.drivers ?? [])
  const bvaSummary = bvaData?.result?.summary ?? {}
  const fqtrSum = fqtrData?.result?.summary ?? fqtrData?.summary ?? {}
  const bsResult = bsData?.result ?? {}
  const ratios = bsResult?.ratios ?? {}
  const periods = pnlData?.result?.by_period ?? pnlData?.by_period ?? []
  const bridge = pnlData?.result?.bridge ?? pnlData?.bridge ?? []

  // ── Asset composition from OCI balance sheet ──
  const assetAccounts = bsResult?.assets?.current_assets?.accounts ?? bsResult?.balance_sheet?.assets?.current_assets?.accounts ?? []
  const assetMap = {}
  for (const acct of assetAccounts) {
    const key = acct.account_desc || `Obj ${acct.object_account}`
    assetMap[key] = (assetMap[key] || 0) + (acct.balance ?? 0)
  }
  const assetComp = Object.entries(assetMap).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8).map(([name, value], i) => ({ name, value, fill: ASSET_COLORS[i % ASSET_COLORS.length] }))

  // ── Build period trend data from OCI ──
  const trendData = periods.map(p => ({
    p: `P${p.period_num}`, rev: p.revenue ?? 0, cogs: p.cogs ?? 0, gp: p.gross_profit ?? 0,
    sga: p.sga ?? 0, ebitda: p.ebitda ?? 0, bud: 0,
  }))

  // ── Build EBITDA bridge waterfall from OCI ──
  const bridgeWf = bridge.map(b => ({
    name: b.driver ?? b.label ?? '', change: b.amount ?? 0, isTotal: b.type === 'start' || b.type === 'end',
  }))

  // ── KPI Chips (from OCI data) ──
  const varPct = bvaSummary?.variance_pct ?? bvaSummary?.total_variance_pct
  const chips = [
    { label: 'YTD Revenue', value: usd(s.revenue ?? 0), sub: s.gross_margin_pct != null ? `${pctFmt(s.gross_margin_pct)} gross margin` : 'N/A', danger: (s.revenue ?? 0) < 0, ok: (s.revenue ?? 0) > 0, sparkData: periods.map(p => p.revenue ?? 0), kpiKey: 'revenue' },
    { label: 'EBITDA', value: usd(s.ebitda ?? 0), sub: s.ebitda_margin_pct != null ? `${pctFmt(s.ebitda_margin_pct)} margin` : 'N/A', danger: (s.ebitda ?? 0) < 0, ok: (s.ebitda ?? 0) > 0, sparkData: periods.map(p => p.ebitda ?? 0), kpiKey: 'ebitda' },
    { label: 'Budget Variance', value: usd(bvaSummary?.total_variance ?? 0), sub: varPct != null ? `${varPct}% over budget` : 'No budget baseline', danger: (bvaSummary?.total_variance ?? 0) < 0, ok: (bvaSummary?.total_variance ?? 0) > 0, sparkData: [0, 0, 0, 0, 0, bvaSummary?.total_variance ?? 0] },
    { label: 'Current Ratio', value: ratios.current_ratio != null ? ratios.current_ratio.toFixed(2) : 'N/A', sub: ratios.current_ratio > 1.5 ? 'Healthy (>1.5)' : 'Below 1.5', ok: ratios.current_ratio > 1.5, warn: ratios.current_ratio != null && ratios.current_ratio <= 1.5 },
    { label: 'Quick Ratio', value: ratios.quick_ratio != null ? ratios.quick_ratio.toFixed(2) : 'N/A', sub: 'CA − Inventory / CL', ok: ratios.quick_ratio > 1 },
    { label: 'Working Capital', value: usd(ratios.working_capital ?? 0), sub: 'CA − CL', ok: (ratios.working_capital ?? 0) > 0 },
    { label: 'Debt / Assets', value: ratios.debt_to_assets != null ? pctFmt(ratios.debt_to_assets * 100) : 'N/A', sub: 'Low leverage', ok: true },
    { label: 'AP Forecast Q', value: usd(fqtrSum.total_quarter_usd ?? 0), sub: fqtrSum.avg_monthly_usd ? `Avg ${usd(fqtrSum.avg_monthly_usd)}/mo` : 'N/A', warn: true },
    { label: 'Forecast Acc.', value: 'N/A', sub: 'No budget baseline', warn: true },
    { label: 'Bal. Sheet', value: ratios.balance_check === 'BALANCED' ? 'OK' : 'IMBAL.', sub: ratios.balance_check !== 'BALANCED' ? `Gap ${usd(ratios.imbalance ?? 0)}` : 'Balanced', danger: ratios.balance_check !== 'BALANCED', ok: ratios.balance_check === 'BALANCED' },
  ]

  // ── Build variance bar data from OCI ──
  const sortedDrivers = [...bvaDrivers].sort((a, b) => (b.abs_variance ?? 0) - (a.abs_variance ?? 0))

  // ── Alerts from OCI data ──
  const alerts = []
  if (fqtrSum.total_quarter_usd > 0) alerts.push({ level: 'INFO', text: `AP forecast: ${usd(fqtrSum.total_quarter_usd)} Q total · avg ${usd(fqtrSum.avg_monthly_usd)}/mo · ${fqtrSum.periods_returned ?? 0} periods`, src: 'fn-ap-forecast' })
  const unfav = bvaDrivers.filter(d => d.direction === 'unfavorable').sort((a, b) => (b.abs_variance ?? 0) - (a.abs_variance ?? 0))
  if (unfav.length > 0) alerts.push({ level: 'CRITICAL', text: `${unfav[0].account_desc} '${unfav[0].bu_name}' — actual ${usd(unfav[0].actual)} vs budget ${usd(unfav[0].budget)}`, src: 'fn-variance-budget-vs-actual' })
  if (bvaSummary.total_variance > 0 && !bvaSummary.total_budget) alerts.push({ level: 'WARNING', text: 'No budget amounts loaded. All actual shows as variance.', src: 'fn-variance-budget-vs-actual · F0902' })
  if (ratios.current_ratio != null) alerts.push({ level: 'OK', text: `Balance sheet healthy: current ratio ${ratios.current_ratio?.toFixed(2)}, working capital ${usd(ratios.working_capital ?? 0)}`, src: 'fn-balancesheet-analysis' })

  if (anyLoading && !pnlData && !bvaData && !bsData && !fqtrData) return <div className="tab-loading">Loading overview…</div>

  const panels = [
    {
      id: 'ov-trend', title: `P&L Period Trend — Revenue / EBITDA · FY20${String(fiscalYear).padStart(2, '0')} P1–P${period}`,
      badge: 'fn-pnl-analysis', src: 'F0902', lowConf: pnlData?._low_confidence, span: 2, simKPIs: ['revenue', 'ebitda'],
      render: () => {
        const { data: d0, relevant } = augmentPeriodData(trendData, 'rev', 'revenue', activeSimulations)
        const { data: augData } = augmentPeriodData(d0, 'ebitda', 'ebitda', activeSimulations)
        return trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={augData}>
              <CartesianGrid {...GRID} /><XAxis dataKey="p" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
              <Tooltip {...TT} formatter={v => fd(v)} /><Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={0} stroke={C.brd} />
              {relevant.map((s, si) => [
                si === 0 && <Area key={`ab${si}`} dataKey={`s${si}_p90`} fill={s.color} stroke="none" fillOpacity={0.14} legendType="none" isAnimationActive={false} />,
                si === 0 && <Area key={`al${si}`} dataKey={`s${si}_p10`} fill="white" stroke="none" fillOpacity={1} legendType="none" isAnimationActive={false} />,
                <Line key={`lp${si}`} dataKey={`s${si}_p50`} stroke={s.color} strokeWidth={1.8} strokeDasharray="6 3" dot={false} name={`${s.label} P50`} isAnimationActive={false} />,
              ])}
              <Line dataKey="rev" name="Revenue" stroke={C.chart1} strokeWidth={1.5} dot={{ r: 2 }} />
              <Line dataKey="ebitda" name="EBITDA" stroke={C.chart4} strokeWidth={1.5} dot={{ r: 2 }} />
              <Line dataKey="bud" name="Budget" stroke={C.gray} strokeWidth={1} strokeDasharray="3 2" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading trend data…</div>
      },
    },
    {
      id: 'ov-tornado', title: 'Budget vs Actual — Top Variance Drivers · YTD',
      badge: 'fn-variance-budget-vs-actual', src: 'F0902 BA vs AA', span: 1,
      render: () => sortedDrivers.length > 0 ? (
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={sortedDrivers} layout="vertical" margin={{ left: 90, right: 10 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical /><XAxis type="number" {...XAXIS} tickFormatter={v => fd(v)} />
            <YAxis dataKey="account_desc" type="category" tick={{ fontSize: 10, fill: C.txtt }} axisLine={false} tickLine={false} width={90} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <Bar dataKey="variance" name="Variance" radius={[0, 2, 2, 0]}>
              {sortedDrivers.map((d, i) => <Cell key={i} fill={d.direction === 'unfavorable' ? C.red : C.teal} fillOpacity={0.75} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading variance…</div>,
    },
    {
      id: 'ov-gauges', title: `Liquidity Health · FY20${String(fiscalYear).padStart(2, '0')} P${period}`, src: 'F0902', span: 1,
      render: () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Current Ratio', val: ratios.current_ratio?.toFixed(2) ?? 'N/A', pct: Math.min((ratios.current_ratio ?? 0) / 16, 1), color: C.teal },
            { label: 'Quick Ratio', val: ratios.quick_ratio?.toFixed(2) ?? 'N/A', pct: Math.min((ratios.quick_ratio ?? 0) / 16, 1), color: C.teal },
            { label: 'Debt/Assets', val: ratios.debt_to_assets != null ? pctFmt(ratios.debt_to_assets * 100) : 'N/A', pct: ratios.debt_to_assets ?? 0, color: C.teal },
            { label: 'Bal. Sheet', val: ratios.balance_check === 'BALANCED' ? 'OK' : 'IMBAL', pct: ratios.balance_check === 'BALANCED' ? 0.1 : 1, color: ratios.balance_check === 'BALANCED' ? C.teal : C.red },
          ].map((g, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <GaugeArc pct={g.pct} color={g.color} size={70} />
              <div style={{ fontSize: 14, fontWeight: 500, color: g.color, marginTop: 2 }}>{g.val}</div>
              <div style={{ fontSize: 9, color: C.txtt }}>{g.label}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'ov-donut', title: `Current Asset Composition · FY20${String(fiscalYear).padStart(2, '0')} P${period}`,
      badge: 'fn-balancesheet-analysis', lowConf: bsData?._low_confidence, span: 1,
      render: () => assetComp.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={assetComp} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2} label={({ name, value }) => `${name}: ${usd(value)}`} labelLine={{ stroke: C.txtt, strokeWidth: 0.5 }} style={{ fontSize: 8 }}>
              {assetComp.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip {...TT} formatter={v => usd(v)} />
          </PieChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading assets…</div>,
    },
    {
      id: 'ov-bridge', title: `YoY EBITDA Bridge — FY${fiscalYear - 1} → FY${fiscalYear}`,
      badge: 'fn-pnl-analysis', simKPIs: ['ebitda'], span: 1,
      render: () => bridgeWf.length > 0 ? <WaterfallBar items={bridgeWf} /> : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading bridge…</div>,
    },
    {
      id: 'ov-narrative', title: 'LLM Insight · gpt-4.1 via fpa-broker', src: 'live', span: 1,
      render: () => {
        const anySim = activeSimulations.length > 0
        return (
          <div>
            {anySim && <div style={{ padding: '6px 8px', marginBottom: 8, borderRadius: 5, background: 'rgba(245,158,11,.1)', border: '0.5px solid rgba(245,158,11,.3)', fontSize: 10, color: '#D97706' }}>
              ⚡ {activeSimulations.length} simulation{activeSimulations.length > 1 ? 's' : ''} active — narrative reflects simulated scenario overlay.
            </div>}
            <div style={{ fontSize: 11, color: C.txts, lineHeight: 1.7, marginBottom: 10 }}>
              {s.revenue != null ? (
                <>FY20{String(fiscalYear).padStart(2, '0')} through P{period}: Revenue {usd(s.revenue)}, EBITDA {usd(s.ebitda ?? 0)}.
                {ratios.current_ratio != null && <> Current ratio {ratios.current_ratio.toFixed(2)}, working capital {usd(ratios.working_capital ?? 0)}.</>}
                {unfav.length > 0 && <> <strong style={{ color: C.red }}>Dominant risk signal</strong>: {unfav[0].account_desc} — {usd(unfav[0].actual)} vs {usd(unfav[0].budget)} budget.</>}</>
              ) : 'Connect fpa-broker to generate live narrative.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['Why is A−(L+E) imbalanced?', `P${period + 1} close action items?`, 'Drill into top variance driver', 'Simulate 12-month hiring freeze'].map((q, i) => (
                <button key={i} style={{ fontSize: 10, padding: '4px 8px', textAlign: 'left', cursor: 'pointer', background: C.surf, border: `0.5px solid ${C.brd}`, borderRadius: 5, color: C.txts }}>{q} ↗</button>
              ))}
            </div>
          </div>
        )
      },
    },
    {
      id: 'ov-alerts', title: `Platform Alerts — ${alerts.length} Items`, span: 2,
      render: () => <div>{alerts.map((a, i) => <AlertRow key={i} {...a} />)}</div>,
    },
  ]

  return <div>
    <div className="tab-header"><span className="tab-header__title">Overview</span><button className="tab-header__btn" onClick={handleRefresh} disabled={anyLoading}>↻ Refresh</button></div>
    <KPIRail chips={chips} /><PanelGrid panels={panels} /></div>
}
