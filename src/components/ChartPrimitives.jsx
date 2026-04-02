// Shared chart primitives for V4 dashboard
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { C, GRID, XAXIS, YAXIS, TT, fd } from '../utils/chartConstants.js'

export function AlertRow({ level, text, src }) {
  const m = {
    CRITICAL: { bg: 'rgba(226,75,74,.10)', clr: C.red, brd: 'rgba(226,75,74,.3)', lbl: 'CRIT' },
    WARNING: { bg: 'rgba(239,159,39,.10)', clr: C.amber, brd: 'rgba(239,159,39,.3)', lbl: 'WARN' },
    INFO: { bg: 'rgba(124,58,237,.10)', clr: C.blue, brd: 'rgba(124,58,237,.3)', lbl: 'INFO' },
    OK: { bg: 'rgba(22,163,74,.10)', clr: C.teal, brd: 'rgba(22,163,74,.3)', lbl: 'OK' },
  }[level] || {}
  return (
    <div style={{ display: 'flex', gap: 6, padding: '5px 0', borderBottom: `0.5px solid ${C.brd}`, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3, background: m.bg, color: m.clr, border: `0.5px solid ${m.brd}`, whiteSpace: 'nowrap', marginTop: 1, fontWeight: 500 }}>{m.lbl}</span>
      <div>
        <div style={{ fontSize: 10, color: C.txts, lineHeight: 1.5 }}>{text}</div>
        <div style={{ fontSize: 9, color: C.txtt }}>{src}</div>
      </div>
    </div>
  )
}

export function GaugeArc({ pct = 0, color = C.teal, size = 70 }) {
  const arc = Math.PI * 28, filled = Math.min(Math.max(pct, 0), 1) * arc
  return (
    <svg width={size} height={Math.round(size * 0.66)} viewBox="0 0 70 46">
      <path d="M7 40 A28 28 0 0 1 63 40" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={6} strokeLinecap="round" />
      <path d="M7 40 A28 28 0 0 1 63 40" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${filled} ${arc}`} />
    </svg>
  )
}

function buildWaterfall(items) {
  let run = 0
  return items.map(item => {
    if (item.isTotal) { return { ...item, offset: 0, barVal: Math.abs(run), displayVal: run, isNeg: run < 0 } }
    const from = run; run += item.change
    return { ...item, offset: Math.min(from, run), barVal: Math.abs(item.change), displayVal: item.change, isNeg: item.change < 0 }
  })
}

export function WaterfallBar({ items }) {
  const data = buildWaterfall(items)
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid {...GRID} /><XAxis dataKey="name" {...XAXIS} interval={0} tick={{ fontSize: 9, fill: C.txtt }} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
        <Tooltip {...TT} formatter={(v, n, p) => n === 'offset' ? null : [fd(p.payload.displayVal), '']} />
        <Bar dataKey="offset" stackId="wf" fill="transparent" legendType="none" isAnimationActive={false} />
        <Bar dataKey="barVal" stackId="wf" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.isTotal ? C.blue : d.isNeg ? C.red : C.teal} fillOpacity={d.isTotal ? 0.85 : 0.75} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Missing({ fn, tables }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, padding: '3px 8px', background: 'rgba(239,159,39,.08)', color: C.amber, borderRadius: 4, border: '0.5px solid rgba(239,159,39,.3)' }}><span style={{ fontWeight: 500 }}>TODO</span> {fn} · {tables}</div>
}
