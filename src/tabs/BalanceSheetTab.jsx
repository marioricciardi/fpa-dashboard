// BalanceSheetTab — V5: wired to balance_sheet_risk (NB-E) + existing balancesheet_get_analysis
import { useMemo, useCallback } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

import { KPIRail } from '../components/KPIChip.jsx'
import PanelGrid from '../components/PanelGrid.jsx'
import { AlertRow, GaugeArc } from '../components/ChartPrimitives.jsx'
import { useTool } from '../hooks/useTool.js'
import { C, GRID, XAXIS, YAXIS, TT, TH, TD, TDL, fd, usd, pctFmt } from '../utils/chartConstants.js'

/* ── helpers ───────────────────────────────────────────────────── */
function ratio(v) { return v == null ? 'N/A' : v.toFixed(2) }
function bs(r) { return r?.balance_sheet ?? r ?? {} }
function groupAccounts(accounts) {
  const map = {}
  for (const a of (accounts || [])) {
    const key = a.account_desc || `Obj ${a.object_account}`
    map[key] = (map[key] || 0) + (a.balance ?? 0)
  }
  return Object.entries(map).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
}

const COLORS = [C.chart1, C.chart2, C.chart5, C.chart4, C.chart3, C.lime, C.gray, '#b08d57']

function AccountTable({ title, accounts, color }) {
  if (!accounts || accounts.length === 0) return null
  const sorted = [...accounts].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
  return (
    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Obj','Sub','Description','BU','Balance'].map(h => <th key={h} style={h === 'Balance' ? TH : { ...TH, ...TDL }}>{h}</th>)}</tr></thead>
        <tbody>
          {sorted.map((a, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.surf }}>
              <td style={TDL}>{a.object_account}</td>
              <td style={TDL}>{a.subsidiary}</td>
              <td style={TDL}>{a.account_desc}</td>
              <td style={TDL}>{a.business_unit}</td>
              <td style={{ ...TD, fontWeight: 500, color: a.balance < 0 ? C.red : undefined }}>{usd(a.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── main component ─────────────────────────────────────────── */

export default function BalanceSheetTab({ fiscalYear = 25, period = 6 }) {
  const bsParams = useMemo(() => ({ fiscal_year: fiscalYear, period, comparison_year: fiscalYear - 1, comparison_period: period }), [fiscalYear, period])
  const { data: toolResult, loading: bsL, refetch: rBs } = useTool('balancesheet_get_analysis', bsParams)

  // ── NB-E: Balance Sheet Risk (Z-Score, profitability, cashflow) ──
  const riskParams = useMemo(() => ({ action: 'summary', fiscal_year: fiscalYear }), [fiscalYear])
  const { data: riskData, loading: rkL, refetch: rRisk } = useTool('balance_sheet_risk', riskParams)
  const handleRefresh = useCallback(() => { rBs(); rRisk() }, [rBs, rRisk])

  const loading = bsL || rkL
  const ok = !!toolResult
  const r  = ok ? toolResult.result : null

  const b = ok ? bs(r) : null
  const rat  = r?.ratios ?? {}
  const meta = r?.metadata ?? {}
  const balanced = b?.balanced ?? meta?.balanced

  const fyLabel   = `FY20${String(fiscalYear).padStart(2, '0')}`
  const prevLabel = `FY20${String(fiscalYear - 1).padStart(2, '0')}`

  const ca = b?.assets?.current_assets?.total ?? 0
  const nca = b?.assets?.non_current_assets?.total ?? 0
  const cl = b?.liabilities?.current_liabilities?.total ?? 0
  const ncl = b?.liabilities?.non_current_liabilities?.total ?? 0
  const eq = b?.equity?.total ?? 0
  const totalA = b?.total_assets ?? (ca + nca)
  const totalL = b?.total_liabilities ?? (cl + ncl)
  const wc = ca - cl

  // ── A=L+E stacked bar data ──
  const aleData = [
    { name: 'Assets', 'Current Assets': ca, 'Non-Current Assets': nca },
    { name: 'Liab + Equity', 'Current Liabilities': cl, 'Non-Current Liabilities': ncl, 'Equity': eq },
  ]

  // ── Current asset donut data ──
  const accts = b?.assets?.current_assets?.accounts || []
  const grouped = groupAccounts(accts).slice(0, 8)
  const donutData = grouped.map(([k, v]) => ({ name: k, value: Math.abs(v) }))

  // ── Trend data ──
  const trend = r?.trend || []
  const trendData = trend.map(t => ({ name: t.period_label, Assets: t.total_assets ?? 0, Liabilities: t.total_liabilities ?? 0, Equity: t.total_equity ?? 0 }))

  // ── NB-E Risk data ──
  const risk = riskData?.result ?? riskData ?? {}
  const zscore = risk.zscore?.zscore_details?.[0] ?? risk.zscore_details?.[0] ?? {}
  const zZone  = zscore.z_zone ?? risk.zone_summary ? Object.keys(risk.zone_summary ?? {})[0] : null
  const profRow = risk.profitability?.profitability?.[0] ?? {}
  const riskScores = risk.risk_scores?.risk_scores ?? []

  // KPI chips — primary BS metrics + NB-E risk overlays
  const chips = [
    { label: 'Total Assets', value: usd(totalA), sub: fyLabel, ok: totalA > 0, danger: totalA < 0 },
    { label: 'Total Liab', value: usd(totalL), sub: fyLabel },
    { label: 'Equity', value: usd(eq), sub: fyLabel, ok: eq > 0, danger: eq < 0 },
    { label: 'Working Capital', value: usd(wc), sub: 'CA − CL', ok: wc > 0, danger: wc < 0 },
    { label: 'Current Ratio', value: ratio(rat.current_ratio), sub: '> 1.5 healthy',
      ok: rat.current_ratio > 1.5, warn: rat.current_ratio > 1 && rat.current_ratio <= 1.5, danger: rat.current_ratio <= 1 },
    { label: 'Quick Ratio', value: ratio(rat.quick_ratio), sub: '> 1 healthy',
      ok: rat.quick_ratio > 1, danger: rat.quick_ratio < 1 },
    { label: 'Debt / Equity', value: ratio(rat.debt_to_equity), sub: '< 2 healthy',
      ok: rat.debt_to_equity < 2, danger: rat.debt_to_equity > 3 },
    { label: 'Balanced', value: balanced ? 'Yes' : 'No', sub: 'A = L + E', ok: balanced, danger: !balanced },
  ]
  if (zscore.textbook_zscore != null) {
    chips.push({ label: 'Altman Z', value: zscore.textbook_zscore.toFixed(2), sub: zZone ?? '—',
      ok: zZone === 'SAFE', warn: zZone === 'GREY', danger: zZone === 'DISTRESS' })
  }
  if (profRow.roa != null) chips.push({ label: 'ROA', value: pctFmt(profRow.roa * 100), sub: 'Return on Assets' })
  if (profRow.roe != null) chips.push({ label: 'ROE', value: pctFmt(profRow.roe * 100), sub: 'Return on Equity' })

  if (loading && !ok && !riskData) return <div className="tab-loading">Loading balance sheet…</div>

  const panels = [
    {
      id: 'bs-ale', title: 'A = L + E — Balance Sheet Components',
      badge: 'fn-balancesheet', src: 'F0902', span: 2,
      render: () => (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={aleData} margin={{ left: 10 }}>
            <CartesianGrid {...GRID} /><XAxis dataKey="name" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
            <Tooltip {...TT} formatter={v => usd(v)} /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Current Assets" stackId="a" fill={C.chart1} fillOpacity={0.65} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Non-Current Assets" stackId="a" fill={C.chart6} fillOpacity={0.3} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Current Liabilities" stackId="a" fill={C.chart3} fillOpacity={0.65} />
            <Bar dataKey="Non-Current Liabilities" stackId="a" fill={C.chart4} fillOpacity={0.3} />
            <Bar dataKey="Equity" stackId="a" fill={C.chart2} fillOpacity={0.55} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      id: 'bs-donut', title: `Current Asset Composition — ${fyLabel} P${period}`,
      badge: 'fn-balancesheet', span: 1,
      render: () => donutData.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} label={({ name, value }) => `${name}: ${usd(value)}`} labelLine={{ stroke: C.txtt, strokeWidth: 0.5 }} style={{ fontSize: 8 }}>
              {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip {...TT} formatter={v => usd(v)} />
          </PieChart>
        </ResponsiveContainer>
      ) : <div style={{ fontSize: 11, color: C.txtt, padding: 20 }}>No current asset accounts</div>,
    },
    ...(trendData.length > 0 ? [{
      id: 'bs-trend', title: `Period Trend — ${prevLabel} vs ${fyLabel}`,
      badge: 'fn-balancesheet', span: 2,
      render: () => (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={trendData}>
            <CartesianGrid {...GRID} /><XAxis dataKey="name" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
            <Tooltip {...TT} formatter={v => usd(v)} /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Assets" fill={C.chart1} fillOpacity={0.55} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Liabilities" fill={C.chart3} fillOpacity={0.55} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Equity" fill={C.chart2} fillOpacity={0.55} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    }] : []),
    {
      id: 'bs-ca', title: 'Current Assets', span: 1,
      render: () => <AccountTable title="Current Assets" accounts={b?.assets?.current_assets?.accounts} color={C.blue} />,
    },
    {
      id: 'bs-cl', title: 'Current Liabilities', span: 1,
      render: () => <AccountTable title="Current Liabilities" accounts={b?.liabilities?.current_liabilities?.accounts} color={C.red} />,
    },
    {
      id: 'bs-nca', title: 'Non-Current Assets', span: 1,
      render: () => <AccountTable title="Non-Current Assets" accounts={b?.assets?.non_current_assets?.accounts} color={C.blue} />,
    },
    {
      id: 'bs-ncl', title: 'Non-Current Liabilities', span: 1,
      render: () => <AccountTable title="Non-Current Liabilities" accounts={b?.liabilities?.non_current_liabilities?.accounts} color={C.red} />,
    },
    ...(b?.equity?.accounts?.length > 0 ? [{
      id: 'bs-eq', title: 'Equity Accounts', span: 2,
      render: () => <AccountTable title="Equity" accounts={b.equity.accounts} color={C.purple} />,
    }] : []),
    ...(zscore.textbook_zscore != null ? [{
      id: 'bs-zscore', title: `Altman Z-Score — ${zZone ?? '—'}`, badge: 'fn-balance-sheet-risk', span: 1,
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12 }}>
            <GaugeArc label="Z-Score" value={zscore.textbook_zscore} max={5} unit=""
              color={zZone === 'SAFE' ? C.teal : zZone === 'GREY' ? C.amber : C.red}
              meaning="Altman bankruptcy predictor" target="> 2.99 SAFE" />
          </div>
          <div style={{ fontSize: 10, color: C.txtt, padding: '0 8px' }}>
            {['x1_wc_assets','x2_equity_assets','x3_ebit_assets','x4_equity_liab','x5_revenue_assets']
              .filter(k => zscore[k] != null)
              .map(k => <span key={k} style={{ marginRight: 12 }}>{k.replace('_', ' ')}: {zscore[k].toFixed(3)}</span>)}
          </div>
        </div>
      ),
    }] : []),
    ...(profRow.roa != null ? [{
      id: 'bs-profit', title: 'Profitability Ratios — NB-E', badge: 'fn-balance-sheet-risk', span: 1,
      render: () => (
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12, padding: '8px 0' }}>
          <GaugeArc label="ROA" value={(profRow.roa ?? 0) * 100} max={30} unit="%" color={(profRow.roa ?? 0) > 0.08 ? C.teal : C.amber}
            meaning="Return on Assets" target="> 8%" />
          <GaugeArc label="ROE" value={(profRow.roe ?? 0) * 100} max={40} unit="%" color={(profRow.roe ?? 0) > 0.12 ? C.teal : C.amber}
            meaning="Return on Equity" target="> 12%" />
          <GaugeArc label="EBIT Margin" value={(profRow.ebit_margin ?? 0) * 100} max={30} unit="%" color={(profRow.ebit_margin ?? 0) > 0.10 ? C.teal : C.amber}
            meaning="EBIT / Revenue" target="> 10%" />
        </div>
      ),
    }] : []),
  ]

  return <div>
    <div className="tab-header"><span className="tab-header__title">Balance Sheet</span><button className="tab-header__btn" onClick={handleRefresh} disabled={loading}>↻ Refresh</button></div>
    <KPIRail chips={chips} /><PanelGrid panels={panels} /></div>
}
