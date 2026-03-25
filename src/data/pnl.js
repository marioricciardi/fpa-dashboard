// pnl.js — mock ToolResult for pnl_get_analysis
// OCI Function: fn-pnl-analysis
// ADW source: F0902 (ledger types AA / BA), F0911
// JDE account types: R (revenue), X (expense)

export const pnlAnalysis = {
  result: {
    revenue: { total: 36200000, yoy_delta: 3400000, yoy_pct: 10.4 },
    cogs:    { total: 14200000, yoy_delta:  980000, yoy_pct:  7.4 },
    gross_margin: { amount: 22000000, pct: 60.8, yoy_delta_pp: 1.6 },
    opex: {
      sga:       { total: 4800000, yoy_delta: 240000 },
      rd:        { total: 2100000, yoy_delta: 210000 },
      da:        { total:  890000, yoy_delta:  45000 },
      total_opex:{ total: 7790000, yoy_delta: 495000 },
    },
    net_income: { total: 14210000, pct_of_revenue: 39.3, yoy_delta: 2905000, yoy_pct: 25.7 },
    periods: [
      { period: 1, revenue: 4200000, cogs: 1680000, gross_margin: 2520000, opex: 1890000, net_income: 630000 },
      { period: 2, revenue: 4500000, cogs: 1800000, gross_margin: 2700000, opex: 2025000, net_income: 675000 },
      { period: 3, revenue: 4100000, cogs: 1640000, gross_margin: 2460000, opex: 1845000, net_income: 615000 },
      { period: 4, revenue: 4800000, cogs: 1920000, gross_margin: 2880000, opex: 2160000, net_income: 720000 },
      { period: 5, revenue: 5200000, cogs: 2080000, gross_margin: 3120000, opex: 2340000, net_income: 780000 },
      { period: 6, revenue: 4900000, cogs: 1960000, gross_margin: 2940000, opex: 2205000, net_income: 735000 },
      { period: 7, revenue: 5100000, cogs: 2040000, gross_margin: 3060000, opex: 2295000, net_income: 765000 },
      { period: 8, revenue: 5400000, cogs: 2160000, gross_margin: 3240000, opex: 2430000, net_income: 810000 },
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
    'Ledger type AA for actuals, BA for budget',
    'Revenue = account type R, Expenses = account type X',
    'Fiscal year 25, periods 1–8',
    'Comparison year 24 for YoY deltas',
  ],
  chart_data: {
    labels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],
    series: {
      revenue:      [4200000, 4500000, 4100000, 4800000, 5200000, 4900000, 5100000, 5400000],
      cogs:         [1680000, 1800000, 1640000, 1920000, 2080000, 1960000, 2040000, 2160000],
      gross_margin: [2520000, 2700000, 2460000, 2880000, 3120000, 2940000, 3060000, 3240000],
      opex:         [1890000, 2025000, 1845000, 2160000, 2340000, 2205000, 2295000, 2430000],
      net_income:   [ 630000,  675000,  615000,  720000,  780000,  735000,  765000,  810000],
    },
  },
  chart_title: 'P&L Analysis — FY2025 YTD (P1–P8)',
  chart_type: 'composed',
  interaction_group: null,
}
