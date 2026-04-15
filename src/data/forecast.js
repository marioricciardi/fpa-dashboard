// forecast.js — param-aware mocks for forecast tools
// Seed data lives in ./seeds/forecastSeeds.js — this file is logic only.
import { SEASON, AP_QUARTERLY, EXPENSE_YEARLY, ROLLING_YEARLY, ACTUAL_NOISE } from './seeds/forecastSeeds.js'

const r = v => Math.round(v)

export function forecastGetQuarter(params = {}) {
  const bu = params.business_unit || 'M30'
  const fy = params.fiscal_year ?? 2025
  const quarter = params.quarter ?? 3
  const fyShort = fy > 100 ? fy - 2000 : fy

  const ap = AP_QUARTERLY[fyShort] || AP_QUARTERLY[25]
  const pStart = (quarter - 1) * 3 + 1
  const lowConf = ap.r2 < 0.70

  const forecast = []
  for (let i = 0; i < 3; i++) {
    const base = ap.base * (1 + ap.growth * i)
    const noise = 1 + (i * 0.04)
    const fc = +(base * noise).toFixed(1)
    const spread = fc * (lowConf ? 0.20 : 0.14)
    forecast.push({
      period: `${fy}-P${String(pStart + i).padStart(2, '0')}`,
      forecasted_ap_usd: fc,
      upper_95: +(fc + spread).toFixed(1),
      lower_95: +(fc - spread).toFixed(1),
    })
  }

  const total = +forecast.reduce((s, f) => s + f.forecasted_ap_usd, 0).toFixed(1)
  const avg = +(total / 3).toFixed(1)

  return {
    result: {
      business_unit: bu,
      fiscal_year: fy,
      quarter,
      forecast,
      summary: { total_quarter_usd: total, avg_monthly_usd: avg, periods_returned: 3 },
    },
    computation_method: 'holt_winters',
    r_squared: ap.r2,
    _low_confidence: lowConf,
    confidence_low: forecast[0].lower_95,
    confidence_high: forecast[forecast.length - 1].upper_95,
    confidence_pct: 95,
    model_version: 'hw-v2.1',
    trained_as_of: `20${fyShort}-08-01`,
    coefficients_used: { alpha: ap.alpha, beta: ap.beta, gamma: ap.gamma },
    valid_for_units: [bu],
    extrapolation_limit: 3,
  }
}

export function forecastGetExpense(params = {}) {
  const fy = params.fiscal_year ?? 25
  const pFrom = params.period_from ?? 1
  const pTo = params.period_to ?? 12

  const e = EXPENSE_YEARLY[fy] || EXPENSE_YEARLY[25]
  const total = e.cogs + e.sga + e.rd + e.da + e.other
  const budget = r(total * e.budget_mult)
  const runRate = r(total * 1.02)

  const by_category = [
    { category: 'COGS',  forecast: e.cogs, amount: e.cogs },
    { category: 'SG&A',  forecast: e.sga,  amount: e.sga },
    { category: 'R&D',   forecast: e.rd,   amount: e.rd },
    { category: 'D&A',   forecast: e.da,   amount: e.da },
    { category: 'Other', forecast: e.other, amount: e.other },
  ]

  const by_period = []
  for (let p = pFrom; p <= pTo; p++) {
    by_period.push({
      period: p, period_num: p,
      forecast: r(total * SEASON[p - 1]),
      amount: r(total * SEASON[p - 1]),
    })
  }

  return {
    result: {
      summary: {
        total_forecast: total,
        total_budget: budget,
        total_run_rate: runRate,
        delta_vs_budget: total - budget,
        delta_vs_run_rate: total - runRate,
      },
      by_category,
      by_period,
    },
    computation_method: 'sql_aggregation',
    r_squared: null,
    _low_confidence: false,
    confidence_low: r(total * 0.95),
    confidence_high: r(total * 1.05),
    confidence_pct: 80,
    model_version: 'mock-v2.0',
  }
}

export function forecastGetRolling(params = {}) {
  const fy = params.fiscal_year ?? 25

  const ro = ROLLING_YEARLY[fy] || ROLLING_YEARLY[25]
  const curPer = ro.currentPeriod
  const annualRev = ro.fullYear

  const by_period = []
  let actualsYTD = 0, forecastRemainder = 0

  for (let p = 1; p <= 12; p++) {
    const budget   = r(ro.budget * SEASON[p - 1])
    const forecast = r(annualRev * SEASON[p - 1])
    const hasActual = p <= curPer
    const actual = hasActual ? r(forecast * ACTUAL_NOISE[p - 1]) : null

    if (hasActual) actualsYTD += actual
    else forecastRemainder += forecast

    by_period.push({ period: p, period_num: p, budget, actual, forecast })
  }

  return {
    result: {
      operation: params.operation ?? 'current',
      fiscal_year: fy,
      full_year_estimate: r(actualsYTD + forecastRemainder),
      actuals_ytd: actualsYTD,
      forecast_remainder: forecastRemainder,
      full_year_budget: ro.budget,
      variance_to_budget: r(actualsYTD + forecastRemainder) - ro.budget,
      accuracy: { mape: ro.mape },
      by_period,
    },
    computation_method: 'sql_aggregation',
    r_squared: null,
    _low_confidence: false,
    model_version: 'mock-v2.0',
  }
}
