// balancesheet.js — param-aware mock for balancesheet_get_analysis
// Seed data lives in ./seeds/balancesheetSeeds.js — this file is logic only.
import { YEARLY_BS, COA } from './seeds/balancesheetSeeds.js'

function acctRow(obj, sub, desc, bu, bal) {
  return { object_account: obj, subsidiary: sub, account_desc: desc, business_unit: bu, balance: bal }
}

function buildAccounts(section, sectionData, scale) {
  return COA[section].map(c => {
    const raw = sectionData[c.field] ?? 0
    const val = c.share != null ? Math.round(raw * c.share * scale) : Math.round(raw * scale)
    return acctRow(c.obj, c.sub, c.desc, c.bu, val)
  })
}

export function balancesheetAnalysis(params = {}) {
  const fy      = params.fiscal_year ?? 25
  const per     = params.period ?? 6
  const compFY  = params.comparison_year ?? fy - 1
  const compPer = params.comparison_period ?? per

  const y = YEARLY_BS[fy] || YEARLY_BS[25]

  // Scale by period (simulate mid-year growth: ~85% at P1, ~100% at P12)
  const scale = 0.85 + (per / 12) * 0.15

  const caAccts  = buildAccounts('ca',  y.ca,  scale)
  const ncaAccts = buildAccounts('nca', y.nca, scale)
  const clAccts  = buildAccounts('cl',  y.cl,  scale)
  const nclAccts = buildAccounts('ncl', y.ncl, scale)
  // Equity: common stock doesn't scale, retained does
  const eqAccts = COA.eq.map(c => {
    const raw = y.eq[c.field] ?? 0
    const val = c.field === 'common' ? raw : Math.round(raw * scale)
    return acctRow(c.obj, c.sub, c.desc, c.bu, val)
  })

  const total = arr => arr.reduce((s, a) => s + a.balance, 0)
  const caTotal  = total(caAccts)
  const ncaTotal = total(ncaAccts)
  const totalAssets = caTotal + ncaTotal
  const clTotal  = total(clAccts)
  const nclTotal = total(nclAccts)
  const totalLiab = clTotal + nclTotal
  const eqTotal  = total(eqAccts)

  const invTotal = caAccts
    .filter(a => a.account_desc.startsWith('Inventory'))
    .reduce((s, a) => s + a.balance, 0)

  const currentRatio = caTotal / clTotal
  const quickRatio   = (caTotal - invTotal) / clTotal

  // Trend data: prior year + current year at quarterly intervals
  const trendPoints = []
  for (const tfy of [compFY, fy]) {
    const td = YEARLY_BS[tfy] || y
    for (const tp of [3, 6, 9, 12]) {
      if (tfy === fy && tp > per) break
      const ts = 0.85 + (tp / 12) * 0.15
      const tCa  = Math.round((td.ca.cash + td.ca.ar + td.ca.inventory + td.ca.prepaid) * ts)
      const tNca = Math.round((td.nca.ppe + td.nca.intangibles + td.nca.other) * ts)
      const tCl  = Math.round((td.cl.ap + td.cl.accrued + td.cl.deferred) * ts)
      const tNcl = Math.round((td.ncl.lt_debt + td.ncl.deferred_tax) * ts)
      const tEq  = td.eq.common + Math.round(td.eq.retained * ts)
      trendPoints.push({
        period_label: `FY${tfy} P${tp}`,
        total_assets: tCa + tNca,
        total_liabilities: tCl + tNcl,
        total_equity: tEq,
      })
    }
  }

  return {
    result: {
      balance_sheet: {
        assets: {
          current_assets:     { total: caTotal,  accounts: caAccts },
          non_current_assets: { total: ncaTotal, accounts: ncaAccts },
        },
        total_assets: totalAssets,
        liabilities: {
          current_liabilities:     { total: clTotal,  accounts: clAccts },
          non_current_liabilities: { total: nclTotal, accounts: nclAccts },
        },
        total_liabilities: totalLiab,
        equity: { total: eqTotal, accounts: eqAccts },
        balanced: true,
      },
      ratios: {
        current_ratio:     +currentRatio.toFixed(2),
        quick_ratio:       +quickRatio.toFixed(2),
        debt_to_equity:    +(totalLiab / eqTotal).toFixed(2),
        debt_to_assets:    +(totalLiab / totalAssets).toFixed(2),
        equity_multiplier: +(totalAssets / eqTotal).toFixed(2),
        working_capital:   caTotal - clTotal,
      },
      trend: trendPoints,
      metadata: {
        fiscal_year: fy, period: per,
        comparison_year: compFY, comparison_period: compPer,
        balanced: true, imbalance_amount: 0,
      },
    },
    computation_method: 'sql_aggregation',
    r_squared: null,
    _low_confidence: false,
    model_version: 'mock-v2.0',
  }
}
