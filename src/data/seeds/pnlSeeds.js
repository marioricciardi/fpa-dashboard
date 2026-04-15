// pnlSeeds.js — P&L seed constants by fiscal year (23–26)
// Pure data — no logic. Consumed by ../pnl.js

// Full-year totals at 100 % capacity
export const YEARLY = {
  23: { revenue: 28500000, cogs_pct: 0.425, sga: 4200000, rd: 1600000, da: 780000 },
  24: { revenue: 32800000, cogs_pct: 0.408, sga: 4500000, rd: 1900000, da: 840000 },
  25: { revenue: 36200000, cogs_pct: 0.392, sga: 4800000, rd: 2100000, da: 890000 },
  26: { revenue: 39800000, cogs_pct: 0.385, sga: 5100000, rd: 2300000, da: 950000 },
}

// Monthly revenue seasonality weights (index 0 = P1). Sums to 1.0.
export const SEASON = [
  0.070, 0.075, 0.080, 0.085, 0.090, 0.085,
  0.080, 0.085, 0.090, 0.085, 0.085, 0.090,
]

// Product mix for revenue-by-product breakdown
export const PRODUCTS = [
  { item: 'A1200', name: 'Industrial Pumps',   revShare: 0.28, cogsShare: 0.38 },
  { item: 'B3400', name: 'Control Valves',     revShare: 0.22, cogsShare: 0.35 },
  { item: 'C5600', name: 'Filtration Systems', revShare: 0.18, cogsShare: 0.42 },
  { item: 'D7800', name: 'Sensor Modules',     revShare: 0.17, cogsShare: 0.30 },
  { item: 'E9100', name: 'Service & Parts',    revShare: 0.15, cogsShare: 0.25 },
]
