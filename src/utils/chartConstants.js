// Shared design tokens and chart config for recharts-based panels

export const C = {
  // UI chrome (badges, buttons, header accents) — stays purple
  blue: '#7C3AED',
  // Chart-specific: strong, distinct, high-contrast palette
  chart1: '#2563EB',   // vivid blue — primary chart series
  chart2: '#059669',   // emerald green — secondary / positive
  chart3: '#E11D48',   // rose red — negative / alerts
  chart4: '#F97316',   // bright orange — tertiary
  chart5: '#8B5CF6',   // medium purple — quaternary
  chart6: '#0891B2',   // cyan — fifth series
  // Semantic colors
  teal: '#059669', purple: '#8B5CF6',
  amber: '#F59E0B', red: '#E11D48', coral: '#EA580C', gray: '#6B7280',
  lime: '#65A30D',
  bg: 'var(--color-bg-primary, #fff)',
  surf: 'var(--color-bg-secondary, #f8f8fa)',
  brd: 'var(--color-border-tertiary, rgba(0,0,0,0.10))',
  txt: 'var(--color-text-primary, #1a1a2e)',
  txts: 'var(--color-text-secondary, #5f5e6e)',
  txtt: 'var(--color-text-tertiary, #8887a0)',
}

export const GRID = { strokeDasharray: '3 3', stroke: 'rgba(0,0,0,0.06)', vertical: false }
export const XAXIS = { tick: { fontSize: 10, fill: C.txtt }, axisLine: false, tickLine: false }
export const YAXIS = { tick: { fontSize: 10, fill: C.txtt }, axisLine: false, tickLine: false, width: 52 }
export const TT = { contentStyle: { fontSize: 11, borderRadius: 6, border: `0.5px solid ${C.brd}`, boxShadow: 'none' }, itemStyle: { color: C.txts } }

export const TH = { fontSize: 9, color: C.txtt, textTransform: 'uppercase', letterSpacing: '.4px', padding: '5px 8px', borderBottom: `0.5px solid ${C.brd}`, textAlign: 'right', background: C.surf }
export const TD = { fontSize: 10, color: C.txts, padding: '4px 8px', borderBottom: `0.5px solid ${C.brd}`, textAlign: 'right' }
export const TDL = { ...TD, textAlign: 'left' }

export const fd = v => v == null ? 'N/A' : Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(2)}`
export const fp = (v, d = 1) => v == null ? 'N/A' : `${v.toFixed(d)}%`
export const fn2 = v => v == null ? 'N/A' : v.toFixed(2)
export const fδ = v => v == null ? 'N/A' : (v >= 0 ? '+' : '') + fd(v)

export function pctFmt(v) {
  if (v == null || !isFinite(v)) return 'N/A'
  return `${v.toFixed(1)}%`
}

export function usd(v) {
  if (v == null) return '$0'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
