// PnLTab — V4 visual layout with recharts, PanelGrid, KPIChip
import { useMemo } from 'react'
import {
  ComposedChart, Line, BarChart, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

import { KPIRail } from '../components/KPIChip.jsx'
import PanelGrid from '../components/PanelGrid.jsx'
import { WaterfallBar } from '../components/ChartPrimitives.jsx'
import { useSimulation, augmentPeriodData } from '../context/SimulationContext.jsx'
import { useTool } from '../hooks/useTool.js'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, usd, pctFmt } from '../utils/chartConstants.js'

/* ── data access ────────────────────────────────────────────── */
function pnl(data) { return data?.result?.pnl_summary ?? data?.pnl_summary ?? {} }
function wf(data)  { return data?.result?.waterfall ?? data?.waterfall ?? [] }
function br(data)  { return data?.result?.bridge ?? data?.bridge ?? [] }
function bp(data)  { return data?.result?.by_period ?? data?.by_period ?? [] }
function prod(data){ return data?.result?.revenue_by_product ?? data?.revenue_by_product ?? [] }
function meta(data){ return data?.result?.metadata ?? data?.metadata ?? {} }

export default function PnLTab({ fiscalYear = 25, period = 6 }) {
  const { activeSimulations } = useSimulation()
  const pnlParams = useMemo(() => ({ fiscal_year: fiscalYear, period_from: 1, period_to: period, comparison_year: fiscalYear - 1 }), [fiscalYear, period])
  const { data: toolResult, loading, refetch } = useTool('pnl_get_analysis', pnlParams)
  const ok = !!toolResult

  const s       = ok ? pnl(toolResult)  : {}
  const steps   = ok ? wf(toolResult)   : []
  const bSteps  = ok ? br(toolResult)   : []
  const periods = ok ? bp(toolResult)   : []
  const products = ok ? prod(toolResult) : []
  const m       = ok ? meta(toolResult)  : {}

  const fyLabel   = `FY20${String(fiscalYear).padStart(2, '0')}`
  const prevLabel = `FY20${String(fiscalYear - 1).padStart(2, '0')}`

  // ── KPI chips ──
  const priorEbitda = bSteps.find(b => b.type === 'start')?.amount ?? 0
  const revChange   = bSteps.find(b => b.driver?.includes('Revenue'))?.amount ?? 0
  const chips = [
    { label: 'Revenue', value: usd(s.revenue), sub: revChange !== 0 ? `${usd(revChange)} vs prior year` : 'No change', danger: s.revenue < 0, ok: s.revenue > 0, sparkData: periods.map(p => p.revenue ?? 0), kpiKey: 'revenue' },
    { label: 'Gross Profit', value: usd(s.gross_profit), sub: s.gross_margin_pct != null ? `${pctFmt(s.gross_margin_pct)} margin` : 'N/A', danger: s.gross_profit < 0, ok: s.gross_profit > 0, sparkData: periods.map(p => p.gross_profit ?? 0), kpiKey: 'gp' },
    { label: 'EBITDA', value: usd(s.ebitda), sub: s.ebitda_margin_pct != null ? `${pctFmt(s.ebitda_margin_pct)} margin` : 'N/A', danger: s.ebitda < 0, ok: s.ebitda > 0, sparkData: periods.map(p => p.ebitda ?? 0), kpiKey: 'ebitda' },
    { label: 'EBIT', value: usd(s.ebit), sub: s.ebit_margin_pct != null ? `${pctFmt(s.ebit_margin_pct)} margin` : 'N/A', danger: s.ebit < 0, ok: s.ebit > 0, kpiKey: 'ebit' },
    { label: 'Prior Yr EBITDA', value: usd(priorEbitda), sub: `${prevLabel} comparison`, danger: priorEbitda < 0, ok: priorEbitda > 0 },
    { label: 'COGS', value: usd(s.cogs), sub: s.revenue ? `${pctFmt((s.cogs / s.revenue) * 100)} of revenue` : 'N/A', danger: s.cogs < 0, ok: s.cogs > 0 },
    { label: 'SG&A', value: usd(s.sga), sub: 'Selling, General & Admin', danger: s.sga < 0, ok: s.sga > 0, sparData: periods.map(p => p.sga ?? 0), kpiKey: 'sga' },
    { label: 'R&D', value: usd(s.rd), sub: 'Research & Development', danger: s.rd < 0, ok: s.rd > 0 },
    { label: 'D&A', value: usd(s.da), sub: 'Depreciation & Amortization', danger: s.da < 0, ok: s.da > 0 },
    { label: 'Periods', value: `${periods.length}`, sub: `P${m.period_from ?? 1}–P${m.period_to ?? period}` },
  ]

  // Build period trend data
  const trendData = periods.map(p => ({
    p: `P${p.period_num}`, rev: p.revenue ?? 0, cogs: p.cogs ?? 0, gp: p.gross_profit ?? 0,
    sga: p.sga ?? 0, ebitda: p.ebitda ?? 0,
  }))

  // Build waterfall data
  const waterfallItems = steps.map(st => ({
    name: st.label, change: st.amount, isTotal: st.type === 'total',
  }))
  const bridgeItems = bSteps.map(b => ({
    name: b.driver ?? b.label ?? '', change: b.amount ?? 0, isTotal: b.type === 'start' || b.type === 'end',
  }))

  // Product data for bar chart
  const prodData = products.map(p => ({
    name: `Item ${p.item}`, revenue: p.revenue, cogs: p.cogs, margin: p.gross_margin,
  }))

  if (loading && !ok) return <div className="tab-loading">Loading P&amp;L data…</div>

  const panels = [
    {
      id: 'pnl-waterfall', title: `P&L Waterfall — Revenue to EBIT · ${fyLabel} P${m.period_from ?? 1}–P${m.period_to ?? period}`,
      badge: 'fn-pnl-analysis', src: 'F0902', span: 1, simKPIs: ['revenue', 'ebitda'],
      render: () => waterfallItems.length > 0 ? <WaterfallBar items={waterfallItems} /> : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading waterfall…</div>,
    },
    {
      id: 'pnl-bridge', title: `EBITDA Bridge — ${prevLabel} to ${fyLabel}`,
      badge: 'fn-pnl-analysis', src: 'F0902', span: 1, simKPIs: ['ebitda'],
      render: () => bridgeItems.length > 0 ? <WaterfallBar items={bridgeItems} /> : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading bridge…</div>,
    },
    {
      id: 'pnl-trend', title: `Period Trend — Revenue / COGS / GP / SG&A / EBITDA · ${fyLabel}`,
      badge: 'fn-pnl-analysis', src: 'F0902', span: 2, simKPIs: ['revenue', 'ebitda'],
      render: () => {
        const { data: d0, relevant } = augmentPeriodData(trendData, 'rev', 'revenue', activeSimulations)
        const { data: augData } = augmentPeriodData(d0, 'ebitda', 'ebitda', activeSimulations)
        return trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={augData}>
              <CartesianGrid {...GRID} /><XAxis dataKey="p" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
              <Tooltip {...TT} formatter={v => fd(v)} /><Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={0} stroke={C.brd} />
              {relevant.map((s, si) => [
                si === 0 && <Area key={`ab${si}`} dataKey={`s${si}_p90`} fill={s.color} stroke="none" fillOpacity={0.14} legendType="none" isAnimationActive={false} />,
                si === 0 && <Area key={`al${si}`} dataKey={`s${si}_p10`} fill="white" stroke="none" fillOpacity={1} legendType="none" isAnimationActive={false} />,
                <Line key={`lp${si}`} dataKey={`s${si}_p50`} stroke={s.color} strokeWidth={1.8} strokeDasharray="6 3" dot={false} name={`${s.label} P50`} isAnimationActive={false} />,
              ])}
              <Line dataKey="rev" name="Revenue" stroke={C.blue} strokeWidth={1.5} dot={{ r: 2 }} />
              <Line dataKey="cogs" name="COGS" stroke={C.red} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line dataKey="gp" name="Gross Profit" stroke={C.teal} strokeWidth={1.5} dot={{ r: 2 }} />
              <Line dataKey="sga" name="SG&A" stroke={C.amber} strokeWidth={1} dot={false} strokeDasharray="3 3" />
              <Line dataKey="ebitda" name="EBITDA" stroke={C.purple} strokeWidth={1.5} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading trend…</div>
      },
    },
    {
      id: 'pnl-products', title: `Revenue by Product Line · ${fyLabel} YTD`,
      badge: 'fn-pnl-analysis', span: 1,
      render: () => prodData.length > 0 ? (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={prodData} margin={{ left: 0, right: 10 }}>
            <CartesianGrid {...GRID} /><XAxis dataKey="name" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
            <Tooltip {...TT} formatter={v => usd(v)} />
            <Bar dataKey="revenue" name="Revenue" fill={C.blue} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
            <Bar dataKey="cogs" name="COGS" fill={C.red} fillOpacity={0.5} radius={[2, 2, 0, 0]} />
            <Bar dataKey="margin" name="Margin" fill={C.teal} fillOpacity={0.5} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>No product data</div>,
    },
    {
      id: 'pnl-table', title: `Period Detail — P&L by Period · ${periods.length} periods`, span: 1,
      render: () => periods.length > 0 ? (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Period','Revenue','COGS','GP','GM %','SG&A','D&A','EBITDA','EBITDA %'].map(h => <th key={h} style={h === 'Period' ? { ...TH, ...TDL } : TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {periods.map((p, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.surf }}>
                  <td style={TDL}>P{p.period_num}</td>
                  <td style={TD}>{usd(p.revenue)}</td>
                  <td style={TD}>{usd(p.cogs)}</td>
                  <td style={{ ...TD, fontWeight: 500 }}>{usd(p.gross_profit)}</td>
                  <td style={TD}>{pctFmt(p.gross_margin_pct)}</td>
                  <td style={TD}>{usd(p.sga)}</td>
                  <td style={TD}>{usd(p.da)}</td>
                  <td style={{ ...TD, fontWeight: 500 }}>{usd(p.ebitda)}</td>
                  <td style={TD}>{pctFmt(p.ebitda_margin_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>Loading…</div>,
    },
  ]

  return <div>
    <div className="tab-header"><span className="tab-header__title">Profit &amp; Loss</span><button className="tab-header__btn" onClick={refetch} disabled={loading}>↻ Refresh</button></div>
    <KPIRail chips={chips} /><PanelGrid panels={panels} /></div>
}
