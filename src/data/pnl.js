// pnl.js — param-aware mock for pnl_get_analysis
// Seed data lives in ./seeds/pnlSeeds.js — this file is logic only.
import { YEARLY, SEASON, PRODUCTS } from './seeds/pnlSeeds.js'

const r = v => Math.round(v)
const sum = (arr, k) => arr.reduce((s, p) => s + (p[k] ?? 0), 0)

export function pnlAnalysis(params = {}) {
  const fy    = params.fiscal_year ?? 25
  const pFrom = params.period_from ?? 1
  const pTo   = params.period_to ?? 6
  const compFY = params.comparison_year ?? fy - 1

  const y  = YEARLY[fy]  || YEARLY[25]
  const cy = YEARLY[compFY] || YEARLY[fy - 1] || y

  // Build period rows
  const periods = []
  for (let p = pFrom; p <= pTo; p++) {
    const rev  = r(y.revenue * SEASON[p - 1])
    const cogs = r(rev * y.cogs_pct)
    const gp   = rev - cogs
    const sga  = r(y.sga / 12)
    const rd   = r(y.rd / 12)
    const da   = r(y.da / 12)
    const ebitda = gp - sga - rd
    const ebit   = ebitda - da
    periods.push({
      period_num: p, revenue: rev, cogs, gross_profit: gp,
      gross_margin_pct: +((gp / rev) * 100).toFixed(1),
      sga, rd, da, ebitda,
      ebitda_margin_pct: +((ebitda / rev) * 100).toFixed(1),
      ebit, ebit_margin_pct: +((ebit / rev) * 100).toFixed(1),
    })
  }

  const totalRev    = sum(periods, 'revenue')
  const totalCogs   = sum(periods, 'cogs')
  const totalGP     = sum(periods, 'gross_profit')
  const totalSGA    = sum(periods, 'sga')
  const totalRD     = sum(periods, 'rd')
  const totalDA     = sum(periods, 'da')
  const totalEBITDA = sum(periods, 'ebitda')
  const totalEBIT   = sum(periods, 'ebit')

  // Comparison year totals (same period range)
  let compRev = 0, compEBITDA = 0
  for (let p = pFrom; p <= pTo; p++) {
    const cRev = r(cy.revenue * SEASON[p - 1])
    compRev += cRev
    compEBITDA += cRev - r(cRev * cy.cogs_pct) - r(cy.sga / 12) - r(cy.rd / 12)
  }

  const pnl_summary = {
    revenue: totalRev, cogs: totalCogs,
    gross_profit: totalGP,
    gross_margin_pct: +((totalGP / totalRev) * 100).toFixed(1),
    sga: totalSGA, rd: totalRD, da: totalDA,
    ebitda: totalEBITDA,
    ebitda_margin_pct: +((totalEBITDA / totalRev) * 100).toFixed(1),
    ebit: totalEBIT,
    ebit_margin_pct: +((totalEBIT / totalRev) * 100).toFixed(1),
    net_income: totalEBIT,
  }

  const nPer = pTo - pFrom + 1
  const waterfall = [
    { label: 'Revenue',      amount: totalRev,    type: 'start' },
    { label: 'COGS',         amount: -totalCogs,  type: 'negative' },
    { label: 'Gross Profit', amount: totalGP,     type: 'total' },
    { label: 'SG&A',         amount: -totalSGA,   type: 'negative' },
    { label: 'R&D',          amount: -totalRD,    type: 'negative' },
    { label: 'EBITDA',       amount: totalEBITDA, type: 'total' },
    { label: 'D&A',          amount: -totalDA,    type: 'negative' },
    { label: 'EBIT',         amount: totalEBIT,   type: 'total' },
  ]

  const bridge = [
    { driver: `FY20${String(compFY).padStart(2,'0')} EBITDA`, amount: compEBITDA, type: 'start' },
    { driver: 'Revenue Change',  amount: totalRev - compRev, type: totalRev >= compRev ? 'positive' : 'negative' },
    { driver: 'COGS Change',     amount: -(totalCogs - r(compRev * cy.cogs_pct)), type: 'negative' },
    { driver: 'SG&A Change',     amount: -(totalSGA - r(cy.sga / 12 * nPer)), type: 'negative' },
    { driver: 'R&D Change',      amount: -(totalRD - r(cy.rd / 12 * nPer)), type: 'negative' },
    { driver: `FY20${String(fy).padStart(2,'0')} EBITDA`, amount: totalEBITDA, type: 'end' },
  ]

  const revenue_by_product = PRODUCTS.map(pr => {
    const rev = r(totalRev * pr.revShare)
    const cogs = r(rev * pr.cogsShare)
    return { item: pr.item, revenue: rev, cogs, gross_margin: rev - cogs }
  })

  const metadata = {
    fiscal_year: fy, comparison_year: compFY,
    period_from: pFrom, period_to: pTo,
    company: '', business_unit: 'ALL',
  }

  return {
    result: { pnl_summary, waterfall, bridge, by_period: periods, revenue_by_product, metadata },
    computation_method: 'sql_aggregation',
    r_squared: null,
    _low_confidence: false,
    model_version: 'mock-v2.0',
  }
}
