// BalanceSheetTab — V4 recharts + PanelGrid + KPIChip
import { useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

import { KPIRail } from '../components/KPIChip.jsx'
import PanelGrid from '../components/PanelGrid.jsx'
import { AlertRow } from '../components/ChartPrimitives.jsx'
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
  const { data: toolResult, loading, refetch } = useTool('balancesheet_get_analysis', bsParams)
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

  // ── Chips ──
  const chips = [
    { label: 'Total Assets', value: usd(totalA), sub: `CA ${usd(ca)} + NCA ${usd(nca)}` },
    { label: 'Total Liabilities', value: usd(totalL), sub: `CL ${usd(cl)} + LT ${usd(ncl)}` },
    { label: 'Total Equity', value: usd(eq), sub: eq > 0 ? 'Positive' : 'Warning', ok: eq > 0, warn: eq <= 0 },
    { label: 'Working Capital', value: usd(wc), sub: `CA − CL`, ok: wc >= 0, danger: wc < 0 },
    { label: 'Current Ratio', value: ratio(rat.current_ratio), sub: rat.current_ratio > 1.5 ? 'Healthy' : '< 1.5', ok: rat.current_ratio > 1.5, warn: rat.current_ratio <= 1.5 },
    { label: 'Quick Ratio', value: ratio(rat.quick_ratio), sub: rat.quick_ratio > 1 ? 'Healthy' : '< 1.0', ok: rat.quick_ratio > 1 },
    { label: 'Debt / Assets', value: rat.debt_to_assets != null ? pctFmt(rat.debt_to_assets * 100) : 'N/A', sub: 'TL / TA', ok: rat.debt_to_assets < 0.5 },
    { label: 'Debt / Equity', value: ratio(rat.debt_to_equity), sub: 'TL / TE', ok: rat.debt_to_equity < 1 },
    { label: 'Equity Multiplier', value: ratio(rat.equity_multiplier), sub: 'TA / TE' },
    { label: 'Balance Check', value: balanced === true ? 'BALANCED ✓' : balanced === false ? 'IMBALANCE' : '—', sub: balanced === false ? usd(meta.imbalance_amount) : 'A − (L+E) = 0', ok: balanced === true, danger: balanced === false },
  ]

  if (loading && !ok) return <div className="tab-loading">Loading balance sheet…</div>

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
  ]

  return <div>
    <div className="tab-header"><span className="tab-header__title">Balance Sheet</span><button className="tab-header__btn" onClick={refetch} disabled={loading}>↻ Refresh</button></div>
    <KPIRail chips={chips} /><PanelGrid panels={panels} /></div>
}
