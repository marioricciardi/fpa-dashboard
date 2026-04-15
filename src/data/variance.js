// variance.js — param-aware mocks for variance tools
// Seed data lives in ./seeds/varianceSeeds.js — this file is logic only.
import { YEARLY_BUDGET, YEARLY_PNL } from './seeds/varianceSeeds.js'

function enrichDrivers(drivers, periodScale) {
  return drivers.map(d => {
    const budget = Math.round(d.budget * periodScale)
    const actual = Math.round(d.actual * periodScale)
    const variance = actual - budget
    return {
      ...d, budget, actual, variance,
      abs_variance: Math.abs(variance),
      variance_pct: budget !== 0 ? +((variance / budget) * 100).toFixed(1) : 0,
      direction: variance > 0 ? 'unfavorable' : variance < 0 ? 'favorable' : 'on-target',
    }
  })
}

export function budgetVsActual(params = {}) {
  const fy    = params.fiscal_year ?? 25
  const pFrom = params.period_from ?? 1
  const pTo   = params.period_to ?? 6
  const topN  = params.top_n_drivers ?? 8

  const raw = YEARLY_BUDGET[fy] || YEARLY_BUDGET[25]
  const periodScale = (pTo - pFrom + 1) / 12

  const drivers = enrichDrivers(raw, periodScale).slice(0, topN)
  const totalBudget = drivers.reduce((s, d) => s + d.budget, 0)
  const totalActual = drivers.reduce((s, d) => s + d.actual, 0)
  const totalVariance = totalActual - totalBudget

  return {
    result: {
      summary: {
        total_budget: totalBudget,
        total_actual: totalActual,
        total_variance: totalVariance,
        variance_pct: totalBudget !== 0 ? +((totalVariance / totalBudget) * 100).toFixed(1) : 0,
      },
      drivers,
      metadata: { fiscal_year: fy, period_from: pFrom, period_to: pTo },
    },
    computation_method: 'sql_aggregation',
    r_squared: null,
    _low_confidence: false,
    model_version: 'mock-v2.0',
  }
}

export function periodComparison(params = {}) {
  const fy   = params.fiscal_year ?? 25
  const per  = params.period ?? 6
  const comp = fy - 1

  const cur = YEARLY_PNL[fy]   || YEARLY_PNL[25]
  const pri = YEARLY_PNL[comp] || YEARLY_PNL[24]
  const scale = per / 12

  const cRev = Math.round(cur.revenue * scale)
  const cOpex = Math.round(cur.opex * scale)
  const cNI  = Math.round(cur.net_income * scale)
  const pRev = Math.round(pri.revenue * scale)
  const pOpex = Math.round(pri.opex * scale)
  const pNI  = Math.round(pri.net_income * scale)

  return {
    result: {
      comparison_type: 'YoY',
      current: { fiscal_year: fy, period: per, revenue: cRev, opex: cOpex, net_income: cNI, gross_margin_pct: cur.gm_pct },
      prior:   { fiscal_year: comp, period: per, revenue: pRev, opex: pOpex, net_income: pNI, gross_margin_pct: pri.gm_pct },
      deltas: {
        revenue:          { amount: cRev - pRev,  pct: +((cRev - pRev) / pRev * 100).toFixed(1) },
        opex:             { amount: cOpex - pOpex, pct: +((cOpex - pOpex) / pOpex * 100).toFixed(1) },
        net_income:       { amount: cNI - pNI,    pct: +((cNI - pNI) / pNI * 100).toFixed(1) },
        gross_margin_pct: { amount: +(cur.gm_pct - pri.gm_pct).toFixed(1), pct: +((cur.gm_pct - pri.gm_pct) / pri.gm_pct * 100).toFixed(1) },
      },
    },
    computation_method: 'sql_aggregation',
    r_squared: null,
    _low_confidence: false,
    model_version: 'mock-v2.0',
  }
}
