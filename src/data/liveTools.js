// liveTools.js — Mock adapters for new OCI Function tools
// Each export matches the return shape of the corresponding fn-* OCI Function.
// Reuses seed data from existing modules where possible.
import { YEARLY_BS }    from './seeds/balancesheetSeeds.js'
import { YEARLY_BUDGET, YEARLY_PNL } from './seeds/varianceSeeds.js'
import { SEASON, EXPENSE_YEARLY, ROLLING_YEARLY, AP_QUARTERLY } from './seeds/forecastSeeds.js'

const fy = (p) => p?.fiscal_year ?? 25
const now = () => new Date().toISOString()

/* ───────────────────────────────────────────────────────────── */
/*  variance_analytics  (NB-B — fn-variance-analytics)          */
/* ───────────────────────────────────────────────────────────── */
export function varianceAnalytics(params = {}) {
  const action = params.action ?? 'summary'
  const year   = fy(params)
  const rows   = YEARLY_BUDGET[year] ?? YEARLY_BUDGET[25]
  const topN   = params.top_n ?? 20
  const period = params.period ?? 6
  const scale  = period / 12

  const drivers = rows.map(r => {
    const b = Math.round(r.budget * scale)
    const a = Math.round(r.actual * scale)
    const v = a - b
    return { ...r, budget: b, actual: a, variance: v, abs_variance: Math.abs(v),
      variance_pct: b !== 0 ? (v / b) * 100 : 0,
      direction: v > 0 ? 'unfavorable' : v < 0 ? 'favorable' : 'on-target' }
  })
  const totalBud = drivers.reduce((s, d) => s + d.budget, 0)
  const totalAct = drivers.reduce((s, d) => s + d.actual, 0)
  const summary  = { total_budget: totalBud, total_actual: totalAct,
    total_variance: totalAct - totalBud,
    variance_pct: totalBud ? ((totalAct - totalBud) / totalBud) * 100 : 0 }

  if (action === 'budget_vs_actual') return { result: { summary, drivers, metadata: { action, fiscal_year: year } } }

  const pnl = YEARLY_PNL[year] ?? YEARLY_PNL[25]
  const prior = YEARLY_PNL[year - 1] ?? YEARLY_PNL[23]
  if (action === 'period_comparison') {
    return { result: {
      current: { revenue: Math.round(pnl.revenue * scale), opex: Math.round(pnl.opex * scale), net_income: Math.round(pnl.net_income * scale), gm_pct: pnl.gm_pct },
      prior:   { revenue: Math.round(prior.revenue * scale), opex: Math.round(prior.opex * scale), net_income: Math.round(prior.net_income * scale), gm_pct: prior.gm_pct },
      deltas: {
        revenue:    { amount: Math.round((pnl.revenue - prior.revenue) * scale), pct: ((pnl.revenue - prior.revenue) / prior.revenue) * 100 },
        opex:       { amount: Math.round((pnl.opex - prior.opex) * scale), pct: ((pnl.opex - prior.opex) / prior.opex) * 100 },
        net_income: { amount: Math.round((pnl.net_income - prior.net_income) * scale), pct: ((pnl.net_income - prior.net_income) / prior.net_income) * 100 },
        gross_margin_pct: { amount: +(pnl.gm_pct - prior.gm_pct).toFixed(1) },
      },
      metadata: { action, fiscal_year: year },
    }}
  }

  // anomalies — mock top-N anomalous periods
  if (action === 'anomalies') {
    const anomalies = drivers.slice(0, topN).map((d, i) => ({
      case_id: i + 1, fiscal_year: year, period_num: (i % 12) + 1,
      account_desc: d.account_desc, variance: d.variance,
      anomaly_score: +(0.4 + Math.abs(d.variance_pct) / 200).toFixed(4),
      is_normal: Math.abs(d.variance_pct) < 10 ? 1 : 0,
    }))
    return { result: { scored_periods: anomalies, anomaly_count: anomalies.filter(a => !a.is_normal).length, metadata: { action } } }
  }

  // stl_decomposition
  if (action === 'stl_decomposition') {
    const stl = Array.from({ length: 12 }, (_, i) => ({
      period_seq: i + 1, observed: Math.round(totalAct / 12 * SEASON[i] / 0.083),
      trend: Math.round(totalAct / 12), seasonal: +((SEASON[i] - 0.083) * totalAct).toFixed(0),
      residual: Math.round((Math.random() - 0.5) * totalAct * 0.01),
    }))
    return { result: { stl, metadata: { action } } }
  }

  // summary
  return { result: { budget_vs_actual: { summary, drivers },
    anomalies: { scored_periods: [], anomaly_count: 0 },
    stl_decomposition: { stl: [] },
    metadata: { action: 'summary', fiscal_year: year, generated_utc: now() } } }
}

/* ───────────────────────────────────────────────────────────── */
/*  revenue_expense_forecast  (NB-C — fn-revenue-expense-forecast) */
/* ───────────────────────────────────────────────────────────── */
export function revenueExpenseForecast(params = {}) {
  const action  = params.action ?? 'summary'
  const year    = fy(params)
  const periods = params.periods ?? 6
  const exp     = EXPENSE_YEARLY[year] ?? EXPENSE_YEARLY[25]
  const roll    = ROLLING_YEARLY[year] ?? ROLLING_YEARLY[25]
  const ap      = AP_QUARTERLY[year] ?? AP_QUARTERLY[25]
  const pnl     = YEARLY_PNL[year] ?? YEARLY_PNL[25]

  if (action === 'revenue_forecast') {
    const forecast = Array.from({ length: periods }, (_, i) => {
      const base = Math.round(pnl.revenue / 12 * (1 + ap.growth * (i + 1) / 12))
      return { period_seq: i + 1, actual: i < 3 ? base : null, forecasted: base,
        lower_95: Math.round(base * 0.9), upper_95: Math.round(base * 1.1) }
    })
    return { result: { history: forecast.filter(f => f.actual !== null), forecast: forecast.filter(f => f.actual === null),
      periods_returned: periods, metadata: { action } } }
  }

  if (action === 'expense_forecast') {
    const total = exp.cogs + exp.sga + exp.rd + exp.da + exp.other
    const totalBudget = Math.round(total * exp.budget_mult)
    const runRate = Math.round(total * (12 / Math.max(roll.currentPeriod, 1)))
    return { result: {
      summary: { total_forecast: total, total_budget: totalBudget, total_run_rate: runRate,
        delta_vs_budget: total - totalBudget, delta_vs_run_rate: total - runRate },
      by_category: [
        { category: 'COGS', forecast: exp.cogs }, { category: 'SG&A', forecast: exp.sga },
        { category: 'R&D', forecast: exp.rd }, { category: 'D&A', forecast: exp.da },
        { category: 'Other', forecast: exp.other },
      ],
      by_period: Array.from({ length: 12 }, (_, i) => ({
        period: i + 1, forecast: Math.round(total / 12 * SEASON[i] / 0.083) })),
      metadata: { action },
    } }
  }

  if (action === 'seasonal_indices') {
    return { result: { seasonal_indices: SEASON.map((s, i) => ({
      period: i + 1, index: +(s / 0.083).toFixed(4), raw: s })),
      metadata: { action } } }
  }

  if (action === 'rolling_forecast') {
    const fyEst = roll.fullYear
    const actYtd = Math.round(fyEst * (roll.currentPeriod / 12))
    const fcstRem = fyEst - actYtd
    const byPeriod = Array.from({ length: 12 }, (_, i) => ({
      period: i + 1,
      actual: i < roll.currentPeriod ? Math.round(fyEst / 12 * SEASON[i] / 0.083) : 0,
      forecast: i >= roll.currentPeriod ? Math.round(fyEst / 12 * SEASON[i] / 0.083) : 0,
      budget: Math.round(roll.budget / 12 * SEASON[i] / 0.083),
    }))
    return { result: { full_year_estimate: fyEst, actuals_ytd: actYtd,
      forecast_remainder: fcstRem, full_year_budget: roll.budget,
      variance_to_budget: fyEst - roll.budget, by_period: byPeriod,
      metadata: { action } } }
  }

  return { result: { revenue_forecast: {}, expense_forecast: {}, seasonal_indices: [],
    rolling_forecast: {}, metadata: { action: 'summary', generated_utc: now() } } }
}

/* ───────────────────────────────────────────────────────────── */
/*  working_capital_analysis  (NB-D — fn-working-capital)       */
/* ───────────────────────────────────────────────────────────── */
export function workingCapitalAnalysis(params = {}) {
  const action = params.action ?? 'summary'
  const year   = fy(params)
  const bs     = YEARLY_BS[year] ?? YEARLY_BS[25]
  const pnl    = YEARLY_PNL[year] ?? YEARLY_PNL[25]

  const dso = bs.ca.ar / (pnl.revenue / 365)
  const dio = bs.ca.inventory / ((pnl.revenue * (1 - pnl.gm_pct / 100)) / 365)
  const dpo = bs.cl.ap / ((pnl.revenue * (1 - pnl.gm_pct / 100)) / 365)
  const ccc = dso + dio - dpo

  const cccData = { dso: +dso.toFixed(1), dio: +dio.toFixed(1), dpo: +dpo.toFixed(1), ccc: +ccc.toFixed(1),
    ar_balance: bs.ca.ar, ap_balance: bs.cl.ap, inventory_value: bs.ca.inventory,
    annual_revenue: pnl.revenue, annual_cogs: Math.round(pnl.revenue * (1 - pnl.gm_pct / 100)) }

  if (action === 'ccc') return { result: cccData }

  if (action === 'ar_aging') {
    const buckets = [
      { bucket: '0-30', amount: Math.round(bs.ca.ar * 0.45), pct: 45, risk: 'LOW' },
      { bucket: '31-60', amount: Math.round(bs.ca.ar * 0.25), pct: 25, risk: 'LOW' },
      { bucket: '61-90', amount: Math.round(bs.ca.ar * 0.18), pct: 18, risk: 'MEDIUM' },
      { bucket: '91-120', amount: Math.round(bs.ca.ar * 0.08), pct: 8, risk: 'HIGH' },
      { bucket: '120+', amount: Math.round(bs.ca.ar * 0.04), pct: 4, risk: 'CRITICAL' },
    ]
    return { result: { aging_buckets: buckets, total_ar: bs.ca.ar, metadata: { action } } }
  }

  if (action === 'ar_forecast') {
    const periods = params.periods ?? 3
    const forecast = Array.from({ length: periods }, (_, i) => ({
      period_seq: i + 1, forecasted: Math.round(bs.ca.ar * (1 + 0.02 * (i + 1))),
      lower_95: Math.round(bs.ca.ar * (1 - 0.05 + 0.02 * (i + 1))),
      upper_95: Math.round(bs.ca.ar * (1 + 0.08 + 0.02 * (i + 1))),
    }))
    return { result: { forecast, periods_returned: periods, metadata: { action } } }
  }

  return { result: { ...cccData,
    ar_aging: { aging_buckets: [], total_ar: bs.ca.ar },
    ar_forecast: { forecast: [], periods_returned: 0 },
    metadata: { action: 'summary', generated_utc: now() } } }
}

/* ───────────────────────────────────────────────────────────── */
/*  workforce_analytics  (NB-A — fn-workforce-analytics)        */
/* ───────────────────────────────────────────────────────────── */
export function workforceAnalytics(params = {}) {
  // Mock matches the real fn-workforce-analytics shape (NB-A):
  //   actions: summary | scores | cost_by_center
  //   summary fields: headcount, total_cost, avg_cost, avg_attrition_prob,
  //                   high_risk_count, avg_ramp_months, cost_center_count
  //   by_cost_center rows use home_cost_center
  //   model_quality keyed by FPA_HEADCOUNT_COST_MODEL / FPA_ATTRITION_MODEL / FPA_HIRING_RAMP_MODEL
  const action = params.action ?? 'summary'
  const limit  = params.limit ?? 20

  const byCenter = [
    { home_cost_center: 'ENG',   headcount: 45, total_cost: 5400000, avg_attrition: 0.082 },
    { home_cost_center: 'SALES', headcount: 30, total_cost: 3000000, avg_attrition: 0.115 },
    { home_cost_center: 'MFG',   headcount: 80, total_cost: 5600000, avg_attrition: 0.063 },
    { home_cost_center: 'R&D',   headcount: 25, total_cost: 3250000, avg_attrition: 0.094 },
    { home_cost_center: 'OPS',   headcount: 35, total_cost: 2800000, avg_attrition: 0.071 },
    { home_cost_center: 'FIN',   headcount: 15, total_cost: 1500000, avg_attrition: 0.058 },
  ]
  const totalHC   = byCenter.reduce((s, c) => s + c.headcount, 0)
  const totalCost = byCenter.reduce((s, c) => s + c.total_cost, 0)
  const avgCost   = totalCost / totalHC
  const avgAttr   = byCenter.reduce((s, c) => s + c.avg_attrition * c.headcount, 0) / totalHC

  const scores = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
    employee_id: 1000 + i,
    home_cost_center: byCenter[i % byCenter.length].home_cost_center,
    tenure_months: 12 + i * 8,
    attrition_prob_12mo: +(0.35 - i * 0.025).toFixed(3),
    predicted_annual_cost: Math.round(80000 + i * 5000),
    est_ramp_months: +(4 + (i % 3) * 0.6).toFixed(1),
  }))

  const modelQuality = {
    FPA_HEADCOUNT_COST_MODEL: { R2: 0.82, RMSE: 9800, MAE: 7200 },
    FPA_ATTRITION_MODEL:      { ACCURACY: 0.78, STATUS: 1 },
    FPA_HIRING_RAMP_MODEL:    { R2: 0.71, RMSE: 1.4, MAE: 1.0 },
  }

  if (action === 'scores') {
    return { result: { scores, model_quality: modelQuality, metadata: { action, generated_utc: now() } } }
  }
  if (action === 'cost_by_center') {
    return { result: { by_cost_center: byCenter, model_quality: modelQuality, metadata: { action, generated_utc: now() } } }
  }
  // summary (default)
  return {
    result: {
      summary: {
        headcount:           totalHC,
        total_cost:          totalCost,
        avg_cost:            Math.round(avgCost),
        avg_attrition_prob:  +avgAttr.toFixed(4),
        high_risk_count:     scores.filter(s => s.attrition_prob_12mo > 0.25).length,
        avg_ramp_months:     +(scores.reduce((s, x) => s + x.est_ramp_months, 0) / scores.length).toFixed(1),
        cost_center_count:   byCenter.length,
      },
      by_cost_center: byCenter,
      model_quality:  modelQuality,
      metadata: { action: 'summary', generated_utc: now() },
    },
  }
}

/* ───────────────────────────────────────────────────────────── */
/*  balance_sheet_risk  (NB-E — fn-balance-sheet-risk)          */
/* ───────────────────────────────────────────────────────────── */
export function balanceSheetRisk(params = {}) {
  const action = params.action ?? 'summary'
  const year   = fy(params)
  const bs     = YEARLY_BS[year] ?? YEARLY_BS[25]
  const pnl    = YEARLY_PNL[year] ?? YEARLY_PNL[25]
  const totalA = Object.values(bs.ca).reduce((s, v) => s + v, 0) + Object.values(bs.nca).reduce((s, v) => s + v, 0)
  const totalL = Object.values(bs.cl).reduce((s, v) => s + v, 0) + Object.values(bs.ncl).reduce((s, v) => s + v, 0)
  const totalE = Object.values(bs.eq).reduce((s, v) => s + v, 0)
  const wc     = Object.values(bs.ca).reduce((s, v) => s + v, 0) - Object.values(bs.cl).reduce((s, v) => s + v, 0)
  const ebit   = Math.round(pnl.revenue * pnl.gm_pct / 100 * 0.6)

  if (action === 'cashflow_forecast') {
    const periods = params.periods ?? 4
    const baseQ = Math.round(ebit * 0.8 / 4)
    const forecast = Array.from({ length: periods }, (_, i) => ({
      period_seq: i + 1, actual: i === 0 ? baseQ : null, forecasted: Math.round(baseQ * (1 + 0.02 * (i + 1))),
      lower_95: Math.round(baseQ * 0.85), upper_95: Math.round(baseQ * 1.15),
    }))
    return { result: { history: forecast.filter(f => f.actual !== null), forecast: forecast.filter(f => f.actual === null),
      periods_returned: periods, metadata: { action } } }
  }

  if (action === 'profitability') {
    return { result: { profitability: [{
      bu: 'CORP', fiscal_year: year, revenue: pnl.revenue, ebit, total_assets: totalA, total_equity: totalE,
      roa: +(ebit / totalA).toFixed(4), roe: +(ebit / totalE).toFixed(4), ebit_margin: +(ebit / pnl.revenue).toFixed(4),
    }] } }
  }

  if (action === 'zscore') {
    const x1 = wc / totalA, x2 = totalE / totalA, x3 = ebit / totalA
    const x4 = totalE / totalL, x5 = pnl.revenue / totalA
    const z  = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5
    const zone = z > 2.99 ? 'SAFE' : z > 1.81 ? 'GREY' : 'DISTRESS'
    return { result: { zscore_details: [{
      bu: 'CORP', fiscal_year: year, x1_wc_assets: +x1.toFixed(4), x2_equity_assets: +x2.toFixed(4),
      x3_ebit_assets: +x3.toFixed(4), x4_equity_liab: +x4.toFixed(4), x5_revenue_assets: +x5.toFixed(4),
      textbook_zscore: +z.toFixed(4), model_zscore: +(z * 0.98).toFixed(4), z_zone: zone,
    }], zone_summary: { [zone]: 1 }, metadata: { action } } }
  }

  if (action === 'risk_scores') {
    const x1 = wc / totalA, x2 = totalE / totalA, x3 = ebit / totalA
    const x4 = totalE / totalL, x5 = pnl.revenue / totalA
    const z  = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5
    const zone = z > 2.99 ? 'SAFE' : z > 1.81 ? 'GREY' : 'DISTRESS'
    return { result: { risk_scores: [{
      bu: 'CORP', fiscal_year: year, textbook_zscore: +z.toFixed(4), model_zscore: +(z * 0.98).toFixed(4),
      predicted_roa: +(ebit / totalA).toFixed(4), z_zone: zone, total_assets: totalA,
      working_capital: wc, ebit,
    }], metadata: { action } } }
  }

  // summary
  return { result: { cashflow: { history: [], forecast: [], periods_returned: 0 },
    profitability: { profitability: [] }, zscore: { zscore_details: [], zone_summary: {} },
    risk_scores: { risk_scores: [] },
    metadata: { action: 'summary', generated_utc: now() } } }
}

/* ───────────────────────────────────────────────────────────── */
/*  model_diagnostics  (NB-F — fn-model-diagnostics)            */
/* ───────────────────────────────────────────────────────────── */
export function modelDiagnostics(params = {}) {
  const action = params.action ?? 'summary'

  // Aligned with NB-F's LAB.FPA_MODEL_REGISTRY_V — names match the SQL above
  // (FPA_COST_DRIVER_MODEL not _COST_VARIANCE_; SVM model name matches NB-B/H)
  const models = [
    { model_name: 'FPA_HEADCOUNT_COST_MODEL',         notebook_id: 'NB-A', mining_function: 'REGRESSION',     algorithm: 'ALGO_GENERALIZED_LINEAR_MODEL' },
    { model_name: 'FPA_ATTRITION_MODEL',               notebook_id: 'NB-A', mining_function: 'CLASSIFICATION', algorithm: 'ALGO_NAIVE_BAYES' },
    { model_name: 'FPA_HIRING_RAMP_MODEL',             notebook_id: 'NB-A', mining_function: 'REGRESSION',     algorithm: 'ALGO_GENERALIZED_LINEAR_MODEL' },
    { model_name: 'FPA_COST_DRIVER_MODEL',             notebook_id: 'NB-B', mining_function: 'REGRESSION',     algorithm: 'ALGO_GENERALIZED_LINEAR_MODEL' },
    { model_name: 'FPA_VARIANCE_ANOMALY_MODEL',        notebook_id: 'NB-B', mining_function: 'CLASSIFICATION', algorithm: 'ALGO_SUPPORT_VECTOR_MACHINES' },
    { model_name: 'FPA_REVENUE_TIMESERIES_MODEL',      notebook_id: 'NB-C', mining_function: 'TIME_SERIES',    algorithm: 'ALGO_EXPONENTIAL_SMOOTHING' },
    { model_name: 'FPA_EXPENSE_FORECAST_MODEL',        notebook_id: 'NB-C', mining_function: 'TIME_SERIES',    algorithm: 'ALGO_EXPONENTIAL_SMOOTHING' },
    { model_name: 'FPA_SEASONALITY_MODEL',             notebook_id: 'NB-C', mining_function: 'REGRESSION',     algorithm: 'ALGO_GENERALIZED_LINEAR_MODEL' },
    { model_name: 'FPA_AR_COLLECTABILITY_MODEL',       notebook_id: 'NB-D', mining_function: 'CLASSIFICATION', algorithm: 'ALGO_NAIVE_BAYES' },
    { model_name: 'FPA_AR_AGING_MODEL',                notebook_id: 'NB-D', mining_function: 'TIME_SERIES',    algorithm: 'ALGO_EXPONENTIAL_SMOOTHING' },
    { model_name: 'FPA_AP_PAYMENT_MODEL',              notebook_id: 'NB-D', mining_function: 'REGRESSION',     algorithm: 'ALGO_GENERALIZED_LINEAR_MODEL' },
    { model_name: 'FPA_CASHFLOW_MODEL',                notebook_id: 'NB-E', mining_function: 'TIME_SERIES',    algorithm: 'ALGO_EXPONENTIAL_SMOOTHING' },
    { model_name: 'FPA_PROFITABILITY_MODEL',           notebook_id: 'NB-E', mining_function: 'REGRESSION',     algorithm: 'ALGO_GENERALIZED_LINEAR_MODEL' },
    { model_name: 'FPA_CAPEX_IMPACT_MODEL',            notebook_id: 'NB-E', mining_function: 'REGRESSION',     algorithm: 'ALGO_GENERALIZED_LINEAR_MODEL' },
    { model_name: 'FPA_RATE_SENSITIVITY_MODEL',        notebook_id: 'NB-E', mining_function: 'REGRESSION',     algorithm: 'ALGO_GENERALIZED_LINEAR_MODEL' },
    { model_name: 'FPA_WC_DSO_MODEL',                  notebook_id: 'NB-G', mining_function: 'TIME_SERIES',    algorithm: 'ALGO_EXPONENTIAL_SMOOTHING' },
    { model_name: 'FPA_WC_DIO_MODEL',                  notebook_id: 'NB-G', mining_function: 'TIME_SERIES',    algorithm: 'ALGO_EXPONENTIAL_SMOOTHING' },
    { model_name: 'FPA_WC_DPO_MODEL',                  notebook_id: 'NB-G', mining_function: 'TIME_SERIES',    algorithm: 'ALGO_EXPONENTIAL_SMOOTHING' },
    { model_name: 'FPA_WC_CCC_FORECAST_MODEL',         notebook_id: 'NB-G', mining_function: 'REGRESSION',     algorithm: 'ALGO_GENERALIZED_LINEAR_MODEL' },
    { model_name: 'FPA_VARIANCE_ANOMALY_DETECT_MODEL', notebook_id: 'NB-H', mining_function: 'CLASSIFICATION', algorithm: 'ALGO_SUPPORT_VECTOR_MACHINES' },
  ]

  if (action === 'registry') return { result: { models, metadata: { action } } }

  const quality = models.map(m => ({
    ...m, r_squared: m.mining_function === 'REGRESSION' ? +(0.78 + Math.random() * 0.18).toFixed(3) : null,
    rmse: m.mining_function === 'REGRESSION' ? Math.round(500 + Math.random() * 3000) : null,
    mean_abs_error: m.mining_function === 'REGRESSION' ? Math.round(300 + Math.random() * 2000) : null,
    accuracy: m.mining_function === 'CLASSIFICATION' ? +(0.72 + Math.random() * 0.2).toFixed(3) : null,
    status_code: m.model_name === 'FPA_ATTRITION_MODEL' ? -1 : 0,
    confidence_flag: m.model_name === 'FPA_ATTRITION_MODEL' ? 'UNAVAILABLE' : 'OK',
  }))
  if (action === 'quality') return { result: { models: quality, confidence_summary: { OK: quality.filter(q => q.confidence_flag === 'OK').length, DEFERRED: 1 }, metadata: { action } } }

  if (action === 'health_check') {
    const health = models.map(m => ({
      model_name: m.model_name, notebook_id: m.notebook_id,
      status: m.model_name === 'FPA_ATTRITION_MODEL' ? 'UNAVAILABLE' : 'DEPLOYED',
    }))
    return { result: { models: health, deployed: health.filter(h => h.status === 'DEPLOYED').length,
      missing: 0, total: health.length, healthy: true, metadata: { action } } }
  }

  return { result: { registry: { models }, quality: { models: quality }, health_check: { deployed: models.length, missing: 0, healthy: true },
    metadata: { action: 'summary', generated_utc: now() } } }
}

/* ───────────────────────────────────────────────────────────── */
/*  working_capital_analytics  (NB-G — fn-working-capital-analytics) */
/* ───────────────────────────────────────────────────────────── */
export function workingCapitalForecast(params = {}) {
  const action  = params.action ?? 'summary'
  const periods = params.periods ?? 6
  const year    = fy(params)
  const bs      = YEARLY_BS[year] ?? YEARLY_BS[25]
  const pnl     = YEARLY_PNL[year] ?? YEARLY_PNL[25]
  const cogs    = pnl.revenue * (1 - pnl.gm_pct / 100)

  const dso = bs.ca.ar / (pnl.revenue / 365)
  const dio = bs.ca.inventory / (cogs / 365)
  const dpo = bs.cl.ap / (cogs / 365)
  const ccc = dso + dio - dpo

  if (action === 'metrics') return { result: { dso: +dso.toFixed(1), dio: +dio.toFixed(1), dpo: +dpo.toFixed(1), ccc: +ccc.toFixed(1),
    ar_balance: bs.ca.ar, ap_balance: bs.cl.ap, inventory_value: bs.ca.inventory,
    annual_revenue: pnl.revenue, annual_cogs: Math.round(cogs), working_capital: Object.values(bs.ca).reduce((s, v) => s + v, 0) - Object.values(bs.cl).reduce((s, v) => s + v, 0),
    current_ratio: +(Object.values(bs.ca).reduce((s, v) => s + v, 0) / Object.values(bs.cl).reduce((s, v) => s + v, 0)).toFixed(2) } }

  const makeForecast = (baseVal, label) => ({
    metric: label,
    history: [{ period_seq: 0, actual: +baseVal.toFixed(1) }],
    forecast: Array.from({ length: periods }, (_, i) => ({
      period_seq: i + 1, forecasted: +(baseVal * (1 + 0.01 * (i + 1))).toFixed(1),
      lower_95: +(baseVal * (1 - 0.05 + 0.01 * (i + 1))).toFixed(1),
      upper_95: +(baseVal * (1 + 0.06 + 0.01 * (i + 1))).toFixed(1),
    })),
    periods_returned: periods,
  })

  if (action === 'dso_forecast') return { result: makeForecast(dso, 'dso') }
  if (action === 'dio_forecast') return { result: makeForecast(dio, 'dio') }
  if (action === 'dpo_forecast') return { result: makeForecast(dpo, 'dpo') }
  if (action === 'ccc_forecast') return { result: { recent_ccc: [{ sequence_id: 1, dso: +dso.toFixed(1), dio: +dio.toFixed(1), dpo: +dpo.toFixed(1), ccc: +ccc.toFixed(1) }] } }

  if (action === 'trend') {
    const trend = [23, 24, 25, 26].filter(y => y <= year).map(y => {
      const b = YEARLY_BS[y] ?? YEARLY_BS[25]; const p = YEARLY_PNL[y] ?? YEARLY_PNL[25]; const c = p.revenue * (1 - p.gm_pct / 100)
      return { sequence_id: y, fiscal_year: y, dso: +(b.ca.ar / (p.revenue / 365)).toFixed(1),
        dio: +(b.ca.inventory / (c / 365)).toFixed(1), dpo: +(b.cl.ap / (c / 365)).toFixed(1),
        ccc: +((b.ca.ar / (p.revenue / 365)) + (b.ca.inventory / (c / 365)) - (b.cl.ap / (c / 365))).toFixed(1) }
    })
    return { result: { trend } }
  }

  return { result: {
    metrics: { dso: +dso.toFixed(1), dio: +dio.toFixed(1), dpo: +dpo.toFixed(1), ccc: +ccc.toFixed(1) },
    dso_forecast: makeForecast(dso, 'dso'), dio_forecast: makeForecast(dio, 'dio'),
    dpo_forecast: makeForecast(dpo, 'dpo'), ccc_forecast: { recent_ccc: [] },
    trend: { trend: [] }, metadata: { action: 'summary', generated_utc: now() } } }
}

/* ───────────────────────────────────────────────────────────── */
/*  statistical_analytics  (NB-H — fn-statistical-analytics)    */
/* ───────────────────────────────────────────────────────────── */
export function statisticalAnalytics(params = {}) {
  const action = params.action ?? 'summary'
  const topN   = params.top_n ?? 20
  const year   = fy(params)
  const pnl    = YEARLY_PNL[year] ?? YEARLY_PNL[25]
  const rows   = YEARLY_BUDGET[year] ?? YEARLY_BUDGET[25]

  const revBase  = pnl.revenue / 12
  const gpBase   = revBase * pnl.gm_pct / 100
  const ebitBase = gpBase * 0.55

  const makeStats = (label, base) => ({
    metric_name: label, n: 12, mean_val: +base.toFixed(0), median_val: +(base * 1.01).toFixed(0),
    stddev_val: +(base * 0.08).toFixed(0), min_val: +(base * 0.85).toFixed(0), max_val: +(base * 1.18).toFixed(0),
    p25: +(base * 0.94).toFixed(0), p75: +(base * 1.06).toFixed(0),
    cv_pct: 8.0, skewness: 0.15,
  })

  if (action === 'descriptive') return { result: { stats: [makeStats('Revenue', revBase), makeStats('Gross Profit', gpBase), makeStats('EBITDA', ebitBase)] } }

  if (action === 'histograms') {
    const makeHist = (label, base) => Array.from({ length: 8 }, (_, i) => ({
      bin_lower: +(base * (0.8 + i * 0.05)).toFixed(0), bin_upper: +(base * (0.85 + i * 0.05)).toFixed(0),
      count_val: i === 3 || i === 4 ? 3 : i === 2 || i === 5 ? 2 : 1,
    }))
    return { result: { histograms: { Revenue: makeHist('Revenue', revBase), 'Gross Profit': makeHist('GP', gpBase) } } }
  }

  if (action === 'correlation') {
    return { result: { correlation: { r_squared: 0.94, slope: +(pnl.gm_pct / 100).toFixed(3), intercept: -50000, pearson_r: 0.97, n_points: 12 } } }
  }

  if (action === 'anomalies') {
    const scored = Array.from({ length: Math.min(topN, 12) }, (_, i) => ({
      case_id: i + 1, fiscal_year: year, period_num: i + 1,
      revenue: Math.round(revBase * SEASON[i] / 0.083),
      gp_margin_pct: +(pnl.gm_pct + (Math.random() - 0.5) * 4).toFixed(2),
      ebitda_margin_pct: +(pnl.gm_pct * 0.55 + (Math.random() - 0.5) * 3).toFixed(2),
      is_normal: i < 10 ? 1 : 0,
      anomaly_score: i >= 10 ? +(0.6 + Math.random() * 0.3).toFixed(4) : +(0.1 + Math.random() * 0.2).toFixed(4),
    }))
    return { result: { scored_periods: scored, anomaly_count: scored.filter(s => !s.is_normal).length } }
  }

  return { result: {
    descriptive: { stats: [makeStats('Revenue', revBase), makeStats('Gross Profit', gpBase), makeStats('EBITDA', ebitBase)] },
    histograms: { histograms: {} }, correlation: { correlation: { r_squared: 0.94, pearson_r: 0.97 } },
    anomalies: { scored_periods: [], anomaly_count: 0 },
    metadata: { action: 'summary', generated_utc: now() } } }
}

/* ───────────────────────────────────────────────────────────── */
/*  simulation_engine  (NB-I — fn-simulation-engine)            */
/* ───────────────────────────────────────────────────────────── */
export function simulationEngine(params = {}) {
  const action = params.action ?? 'run'

  const templates = {
    hiring_freeze:   [{ param_name: 'freeze_months',    min_val: 3, max_val: 24, default_val: 6, unit: 'months' }],
    revenue_shock:   [{ param_name: 'revenue_change_pct', min_val: -30, max_val: 30, default_val: -10, unit: 'pct' }],
    cost_inflation:  [{ param_name: 'inflation_pct',    min_val: 1, max_val: 15, default_val: 5, unit: 'pct' }],
    capex_defer:     [{ param_name: 'defer_pct',        min_val: 10, max_val: 100, default_val: 50, unit: 'pct' }],
  }

  if (action === 'params') return { result: { templates, metadata: { action } } }

  if (action === 'history') {
    const runs = Array.from({ length: 3 }, (_, i) => ({
      run_id: `SIM-${1000 + i}`, template_id: ['hiring_freeze', 'revenue_shock', 'cost_inflation'][i],
      fiscal_year: 25, iterations: 2000, mean_impact: [-320000, -1100000, -680000][i],
      median_impact: [-310000, -1050000, -670000][i],
      p5_impact: [-180000, -600000, -350000][i], p95_impact: [-480000, -1600000, -1020000][i],
      run_rank: i + 1,
    }))
    return { result: { runs, count: runs.length, metadata: { action } } }
  }

  if (action === 'result') {
    return { result: { run_id: params.run_id ?? 'SIM-1000', template_id: 'hiring_freeze',
      fiscal_year: 25, iterations: 2000,
      summary: { mean_impact: -320000, median_impact: -310000, p5_impact: -180000, p95_impact: -480000, std_impact: 85000 },
      metadata: { action } } }
  }

  // action === 'run'
  const tid = params.template_id ?? 'hiring_freeze'
  const iterations = params.iterations ?? 2000
  const runId = `SIM-${Date.now().toString(36).toUpperCase()}`
  const mean_impact = tid === 'hiring_freeze' ? -320000 : tid === 'revenue_shock' ? -1100000 : tid === 'cost_inflation' ? -680000 : -450000
  return { result: {
    run_id: runId, template_id: tid, fiscal_year: params.fiscal_year ?? 25,
    iterations,
    summary: {
      mean_impact, median_impact: Math.round(mean_impact * 0.97),
      p5_impact: Math.round(mean_impact * 0.55), p95_impact: Math.round(mean_impact * 1.5),
      std_impact: Math.round(Math.abs(mean_impact) * 0.26),
    },
    models_used: tid === 'hiring_freeze' ? 'FPA_HEADCOUNT_COST_MODEL,FPA_ATTRITION_MODEL' : 'FPA_COST_VARIANCE_MODEL',
    params: params.params ?? {},
    metadata: { action: 'run', generated_utc: now() },
  } }
}


/* ───────────────────────────────────────────────────────────── */
/*  inventory  (fn-inventory: position + history + demand_forecast) */
/* ───────────────────────────────────────────────────────────── */
export function inventory(params = {}) {
  const action = params.action ?? 'position'

  if (action === 'history') {
    const metric = params.metric ?? 'turnover'
    const window = params.period_window ?? 8
    const rows = Array.from({ length: window }, (_, i) => ({
      period_seq: i + 1,
      period_label: `Q${(i % 4) + 1} FY${24 + Math.floor(i / 4)}`,
      value: metric === 'turnover' ? +(4.5 + Math.sin(i / 2) * 1.2).toFixed(2)
           : metric === 'write_off_rate' ? +(0.7 + i * 0.03).toFixed(3)
           : Math.round(40 + i * 2),
    }))
    return { result: { metric, rows, metadata: { action, generated_utc: now() } } }
  }

  if (action === 'demand_forecast') {
    const horizon = params.horizon_weeks ?? 13
    const rows = Array.from({ length: 12 }, (_, i) => ({
      item_id: `ITEM-${1000 + i}`,
      branch: ['M30', 'M40', 'M50'][i % 3],
      velocity_tier: ['A', 'A', 'B', 'C'][i % 4],
      model_used: ['FPA_INVENTORY_DEMAND_A_MODEL', 'FPA_INVENTORY_DEMAND_B_MODEL', 'tier_c_baseline'][i % 3],
      forecasted_demand_p50: Math.round(500 + Math.sin(i) * 200),
      p10_demand: Math.round(350 + Math.sin(i) * 150),
      p90_demand: Math.round(750 + Math.sin(i) * 300),
      safety_stock_qty: Math.round(120 + i * 8),
      current_qty: Math.round(380 + i * 25),
      recommended_reorder_qty: Math.max(0, Math.round(300 + Math.sin(i) * 200)),
    }))
    return { result: { horizon_weeks: horizon, confidence_pct: params.confidence_pct ?? 80,
      safety_stock_days: params.safety_stock_days ?? 14, rows, row_count: rows.length,
      metadata: { action, generated_utc: now() } } }
  }

  // position
  const view = params.view ?? 'summary'
  if (view === 'summary') {
    return { result: { total_value: 3200000, item_count: 1240, branch_count: 8,
      slow_moving_value: 240000, slow_moving_pct: 7.5,
      tier_a_value: 1850000, tier_b_value: 980000, tier_c_value: 370000,
      metadata: { action: 'position', view, generated_utc: now() } } }
  }
  if (view === 'slow_moving') {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      item_id: `SLOW-${100 + i}`, branch: 'M30',
      qty_on_hand: 80 - i * 4, value: Math.round(8000 - i * 400),
      days_since_movement: 90 + i * 8, category: ['RAW', 'WIP', 'FG'][i % 3],
    }))
    return { result: { rows, row_count: rows.length, metadata: { action: 'position', view } } }
  }
  // by_item / by_branch / by_category — simple synthetic
  return { result: { rows: [], view, metadata: { action: 'position', view, generated_utc: now() } } }
}


/* ───────────────────────────────────────────────────────────── */
/*  ap  (fn-ap: position + history)                              */
/* ───────────────────────────────────────────────────────────── */
export function ap(params = {}) {
  const action = params.action ?? 'position'
  if (action === 'position') {
    const view = params.view ?? 'aging'
    if (view === 'aging') {
      const buckets = [
        { bucket: 'current', amount: 1850000, vendor_count: 80, pct: 44.6 },
        { bucket: '1-30',    amount: 1050000, vendor_count: 52, pct: 25.3 },
        { bucket: '31-60',   amount:  620000, vendor_count: 28, pct: 14.9 },
        { bucket: '61-90',   amount:  340000, vendor_count: 15, pct:  8.2 },
        { bucket: '91-120',  amount:  170000, vendor_count:  8, pct:  4.1 },
        { bucket: '120+',    amount:  120000, vendor_count:  5, pct:  2.9 },
      ]
      return { result: { aging_buckets: buckets, total_open_ap: 4150000,
        metadata: { action, view, generated_utc: now() } } }
    }
    if (view === 'vendor_summary') {
      const vendors = Array.from({ length: 10 }, (_, i) => ({
        vendor_num: 50000 + i, vendor_name: `Vendor ${i + 1}`,
        open_amount: Math.round(500000 - i * 35000), invoice_count: 25 - i * 2,
        days_to_pay_avg: 28 + i,
      }))
      return { result: { vendors, metadata: { action, view, generated_utc: now() } } }
    }
    return { result: { rows: [], view, metadata: { action, view } } }
  }
  // history
  const metric = params.metric ?? 'vendor_concentration'
  if (metric === 'vendor_concentration') {
    const top = Array.from({ length: 12 }, (_, i) => ({
      vendor_num: 50000 + i, vendor_name: `Vendor ${i + 1}`,
      ytd_spend: Math.round(2500000 - i * 180000),
      cumulative_pct: +(8.4 * (i + 1)).toFixed(1),
    }))
    return { result: { top_vendors: top, pareto_threshold_pct: params.pareto_threshold_pct ?? 80,
      metadata: { action, metric, generated_utc: now() } } }
  }
  return { result: { metric, rows: [], metadata: { action, metric, generated_utc: now() } } }
}


/* ───────────────────────────────────────────────────────────── */
/*  ar  (fn-ar: position + history)                              */
/* ───────────────────────────────────────────────────────────── */
export function ar(params = {}) {
  const action = params.action ?? 'position'
  if (action === 'position') {
    const view = params.view ?? 'aging'
    if (view === 'aging') {
      const buckets = [
        { bucket: 'current', amount: 4200000, customer_count: 95, pct: 60.0 },
        { bucket: '1-30',    amount: 1450000, customer_count: 38, pct: 20.7 },
        { bucket: '31-60',   amount:  680000, customer_count: 22, pct:  9.7 },
        { bucket: '61-90',   amount:  340000, customer_count: 14, pct:  4.9 },
        { bucket: '91-120',  amount:  180000, customer_count:  8, pct:  2.6 },
        { bucket: '120+',    amount:  150000, customer_count:  6, pct:  2.1 },
      ]
      return { result: { aging_buckets: buckets, total_open_ar: 7000000,
        metadata: { action, view, generated_utc: now() } } }
    }
    if (view === 'customer_summary') {
      const customers = Array.from({ length: 10 }, (_, i) => ({
        customer_num: 30000 + i, customer_name: `Customer ${i + 1}`,
        open_amount: Math.round(800000 - i * 65000), invoice_count: 18 - i,
        days_past_due_avg: i * 6,
      }))
      return { result: { customers, metadata: { action, view, generated_utc: now() } } }
    }
    return { result: { rows: [], view, metadata: { action, view } } }
  }
  // history
  const metric = params.metric ?? 'payment_velocity'
  const window = params.period_window ?? 12
  const rows = Array.from({ length: window }, (_, i) => ({
    period_seq: i + 1, period_label: `M${i + 1}`,
    value: metric === 'payment_velocity' ? 38 + Math.sin(i) * 3
         : metric === 'late_payment_pct' ? 12 + Math.sin(i) * 2
         : Math.round(6000000 + Math.sin(i) * 500000),
  }))
  return { result: { metric, rows, metadata: { action, metric, generated_utc: now() } } }
}


/* ───────────────────────────────────────────────────────────── */
/*  capex  (fn-capex: position / history / dep_forecast / scenario) */
/* ───────────────────────────────────────────────────────────── */
export function capex(params = {}) {
  const action = params.action ?? 'position'

  if (action === 'position') {
    const view = params.view ?? 'by_company'
    if (view === 'by_company') {
      const rows = [
        { company: '00001', name: 'US Operations',    cost_basis: 24000000, accumulated_dep: 12500000, net_book_value: 11500000, asset_count: 320 },
        { company: '00200', name: 'EU Operations',    cost_basis:  9800000, accumulated_dep:  5300000, net_book_value:  4500000, asset_count: 145 },
        { company: '00300', name: 'APAC Operations',  cost_basis:  6200000, accumulated_dep:  3400000, net_book_value:  2800000, asset_count:  88 },
      ]
      return { result: { rows, metadata: { action, view, generated_utc: now() } } }
    }
    if (view === 'by_category') {
      const rows = [
        { category: 'IT Equipment',   cost_basis: 8500000, net_book_value: 3800000, asset_count: 220 },
        { category: 'Machinery',      cost_basis: 14000000, net_book_value: 7200000, asset_count: 145 },
        { category: 'Buildings',      cost_basis: 12000000, net_book_value: 6500000, asset_count:  18 },
        { category: 'Vehicles',       cost_basis: 3200000,  net_book_value: 1100000, asset_count:  62 },
        { category: 'Furniture',      cost_basis: 2300000,  net_book_value:  200000, asset_count: 108 },
      ]
      return { result: { rows, metadata: { action, view, generated_utc: now() } } }
    }
    return { result: { rows: [], view, metadata: { action, view } } }
  }

  if (action === 'history') {
    const metric = params.metric ?? 'spend_vs_plan'
    if (metric === 'spend_vs_plan') {
      const rows = Array.from({ length: 12 }, (_, i) => ({
        period_seq: i + 1, period_label: `M${i + 1}`,
        planned: Math.round(280000 + Math.sin(i) * 60000),
        actual:  Math.round(260000 + Math.sin(i) * 80000),
        variance: 0,
      })).map(r => ({ ...r, variance: r.actual - r.planned }))
      return { result: { metric, rows, total_planned: rows.reduce((s, r) => s + r.planned, 0),
        total_actual: rows.reduce((s, r) => s + r.actual, 0),
        metadata: { action, metric, generated_utc: now() } } }
    }
    const rows = Array.from({ length: 12 }, (_, i) => ({
      period_seq: i + 1, period_label: `M${i + 1}`,
      value: Math.round(180000 + Math.sin(i) * 40000),
    }))
    return { result: { metric, rows, metadata: { action, metric, generated_utc: now() } } }
  }

  if (action === 'depreciation_forecast') {
    const h = params.horizon_periods ?? 12
    const rows = Array.from({ length: h }, (_, i) => ({
      period_seq: i + 1, period_label: `M${i + 1}`,
      depreciation_expense: Math.round(165000 + i * 1500),
    }))
    return { result: { horizon_periods: h, rows,
      total_depreciation: rows.reduce((s, r) => s + r.depreciation_expense, 0),
      metadata: { action, generated_utc: now() } } }
  }

  if (action === 'scenario') {
    const stype = params.scenario_type ?? 'delay'
    const p = params.parameters ?? {}
    const amount = p.amount ?? 5000000
    const months = p.defer_months ?? p.acceleration_months ?? 6
    return { result: { scenario_type: stype, amount, months,
      baseline_npv:  amount,
      scenario_npv:  stype === 'delay' ? Math.round(amount * 0.94) : Math.round(amount * 1.04),
      cashflow_delta: stype === 'delay' ? -amount : +amount,
      assumptions: { wacc_pct: 8.0 },
      metadata: { action, generated_utc: now() } } }
  }

  return { result: { rows: [], action, metadata: { action, generated_utc: now() } } }
}


/* ───────────────────────────────────────────────────────────── */
/*  balance_sheet_forecast  (composite forward projection)        */
/* ───────────────────────────────────────────────────────────── */
export function balanceSheetForecast(params = {}) {
  const as_of = params.as_of_date ?? '2026-12-31'
  return { result: {
    as_of_date: as_of,
    line_items: [
      { name: 'Cash',                p50: 12400000, p10: 9800000,  p90: 15200000 },
      { name: 'A/R',                 p50:  7200000, p10: 6400000,  p90:  8100000 },
      { name: 'Inventory',           p50:  3400000, p10: 3100000,  p90:  3700000 },
      { name: 'Other CA',            p50:   450000, p10:  400000,  p90:   500000 },
      { name: 'Net Fixed Assets',    p50: 18200000, p10: 17900000, p90: 18500000 },
      { name: 'Total Assets',        p50: 41650000, p10: 37600000, p90: 46000000 },
      { name: 'A/P',                 p50:  4400000, p10: 3900000,  p90:  4900000 },
      { name: 'Other CL',            p50:  2900000, p10: 2700000,  p90:  3100000 },
      { name: 'Long-term Debt',      p50:  9500000, p10: 9500000,  p90:  9500000 },
      { name: 'Equity',              p50: 24850000, p10: 21500000, p90: 28500000 },
      { name: 'Total Liab+Equity',   p50: 41650000, p10: 37600000, p90: 46000000 },
    ],
    drift_check: { abs_imbalance: 0, balanced: true },
    drivers: {
      revenue_forecast_total: 48000000,
      cogs_forecast_total:    27000000,
      depreciation_total:     2150000,
      net_income_estimate:    3850000,
    },
    metadata: { action: 'forecast', generated_utc: now() },
  } }
}
