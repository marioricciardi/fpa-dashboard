// forecast.js — mock ToolResult for:
//   forecast_get_quarter  (fn-ap-forecast, Holt-Winters, lab.fpa_ap_forecast_labeled_v)
//   forecast_get_expense  (fn-forecast-expense, F0902 / F0911)
//   forecast_get_rolling  (fn-forecast-rolling, F0902 / F0911)
//
// NOTE: forecast_get_quarter has R²=0.68 → _low_confidence=true.
// The dashboard MUST show the ModelBadge warning and ConfidenceInfo strip.

export const forecastGetQuarter = {
  result: {
    business_unit: 'CORP',
    fiscal_year: 2025,
    quarter: 3,
    forecast: [
      { period: '2025-P07', forecasted_ap_usd: 2890.0, ci_low: 2330.0, ci_high: 3460.0 },
      { period: '2025-P08', forecasted_ap_usd: 3010.0, ci_low: 2420.0, ci_high: 3600.0 },
      { period: '2025-P09', forecasted_ap_usd: 3520.0, ci_low: 2830.0, ci_high: 4210.0 },
    ],
    summary: { total_quarter_usd: 9420.0, avg_monthly_usd: 3140.0 },
  },
  computation_method: 'holt_winters',
  r_squared: 0.68,
  _low_confidence: true,      // R² < 0.70 — ModelBadge must show warning
  confidence_low: 2330.0,
  confidence_high: 4210.0,
  confidence_pct: 80,
  model_version: 'hw-v2.1',
  trained_as_of: '2025-08-01',
  coefficients_used: { alpha: 0.3, beta: 0.1, gamma: 0.2 },
  valid_for_units: ['CORP'],
  extrapolation_limit: 3,
  assumptions: [
    'Holt-Winters triple exponential smoothing',
    'Training data: lab.fpa_ap_forecast_labeled_v (F0411 + BU attributes)',
    'Seasonality period: 12 months',
    'Forecast limited to extrapolation_limit of 3 periods',
  ],
  chart_data: {
    labels: ['2025-P07', '2025-P08', '2025-P09'],
    series: {
      spend:  [2890.0, 3010.0, 3520.0],
      avg:    [3140.0, 3140.0, 3140.0],
      ci_low: [2330.0, 2420.0, 2830.0],
      ci_high:[3460.0, 3600.0, 4210.0],
    },
  },
  chart_title: 'AP Spend Forecast — Q3 2025 (BU: CORP)',
  chart_type: 'line',
  interaction_group: 'forecast-fy25',
}

export const forecastGetExpense = {
  result: {
    fiscal_year: 25,
    period_from: 1,
    period_to: 12,
    categories: {
      COGS:  { forecasted: 14200000, ci_low: 13500000, ci_high: 14900000 },
      SGA:   { forecasted:  4800000, ci_low:  4500000, ci_high:  5100000 },
      RD:    { forecasted:  2100000, ci_low:  1900000, ci_high:  2300000 },
      DA:    { forecasted:   890000, ci_low:   820000, ci_high:   960000 },
      OTHER: { forecasted:   340000, ci_low:   290000, ci_high:   390000 },
    },
    total_opex: { forecasted: 22330000, ci_low: 21010000, ci_high: 23650000 },
  },
  computation_method: 'sql_aggregation',
  r_squared: null,
  _low_confidence: false,
  confidence_low: 21010000,
  confidence_high: 23650000,
  confidence_pct: 80,
  model_version: 'sql-v1.0',
  trained_as_of: null,
  coefficients_used: {},
  valid_for_units: ['ALL'],
  extrapolation_limit: null,
  assumptions: [
    'Full-year projection from YTD actuals in F0902',
    'account_category: all (COGS, SGA, RD, DA, OTHER)',
    'confidence_level: 80',
    'Run-rate extrapolation for remaining periods',
  ],
  chart_data: {
    labels: ['COGS', 'SG&A', 'R&D', 'D&A', 'Other'],
    series: {
      forecasted: [14200000, 4800000, 2100000, 890000, 340000],
      ci_low:     [13500000, 4500000, 1900000, 820000, 290000],
      ci_high:    [14900000, 5100000, 2300000, 960000, 390000],
    },
  },
  chart_title: 'Expense Forecast by Category — FY2025 Full Year',
  chart_type: 'bar',
  interaction_group: 'forecast-fy25',
}

export const forecastGetRolling = {
  result: {
    operation: 'current',
    fiscal_year: 25,
    accuracy: { mape: 4.2, rmse: 124000, bias: -0.8 },
    periods: [
      { period: 1,  budget: 3200000, actual: 3180000, forecast: 3180000 },
      { period: 2,  budget: 3400000, actual: 3520000, forecast: 3520000 },
      { period: 3,  budget: 3100000, actual: 3050000, forecast: 3050000 },
      { period: 4,  budget: 3600000, actual: 3720000, forecast: 3720000 },
      { period: 5,  budget: 3900000, actual: 3980000, forecast: 3980000 },
      { period: 6,  budget: 3700000, actual: 3840000, forecast: 3840000 },
      { period: 7,  budget: 3800000, actual: null,    forecast: 3910000 },
      { period: 8,  budget: 4100000, actual: null,    forecast: 4050000 },
      { period: 9,  budget: 4200000, actual: null,    forecast: 4180000 },
      { period: 10, budget: 4000000, actual: null,    forecast: 3990000 },
      { period: 11, budget: 4300000, actual: null,    forecast: 4260000 },
      { period: 12, budget: 4500000, actual: null,    forecast: 4480000 },
    ],
  },
  computation_method: 'sql_aggregation',
  r_squared: null,
  _low_confidence: false,
  confidence_low: null,
  confidence_high: null,
  confidence_pct: null,
  model_version: 'sql-v1.0',
  trained_as_of: null,
  coefficients_used: {},
  valid_for_units: ['ALL'],
  extrapolation_limit: null,
  assumptions: [
    'operation: current (latest rolling forecast)',
    'F0902 + F0911, fiscal year 25',
    'Actuals available P1–P6; P7–P12 are forecast',
    'MAPE computed over P1–P6 only',
  ],
  chart_data: {
    labels: ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12'],
    series: {
      budget:   [3200000,3400000,3100000,3600000,3900000,3700000,3800000,4100000,4200000,4000000,4300000,4500000],
      actual:   [3180000,3520000,3050000,3720000,3980000,3840000,null,null,null,null,null,null],
      forecast: [3180000,3520000,3050000,3720000,3980000,3840000,3910000,4050000,4180000,3990000,4260000,4480000],
    },
  },
  chart_title: 'Rolling Forecast vs Budget vs Actuals — FY2025',
  chart_type: 'composed',
  interaction_group: 'forecast-fy25',
}
