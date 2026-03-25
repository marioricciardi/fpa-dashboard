// variance.js — mock ToolResult for variance_get_budget_vs_actual and
//               variance_get_period_comparison
// OCI Functions: fn-variance-budget-vs-actual, fn-variance-period-comparison
// ADW source: F0902 (ledger type BA = budget, AA = actual)

export const budgetVsActual = {
  result: {
    summary: {
      total_budget:        19600000,
      total_actual:        20100000,
      total_variance:        500000,
      total_variance_pct:      2.6,
      favorable_count:           4,
      unfavorable_count:         6,
    },
    top_drivers: [
      { account: 'Salaries & Benefits',  account_obj: '5110', business_unit: 'ENG',   budget: 2100000, actual: 2290000, variance:  190000, variance_pct:  9.0, favorable: false },
      { account: 'Marketing Programs',   account_obj: '6210', business_unit: 'MKTG',  budget:  900000, actual: 1098000, variance:  198000, variance_pct: 22.2, favorable: false },
      { account: 'Cloud Infrastructure', account_obj: '7420', business_unit: 'IT',    budget: 1400000, actual: 1545000, variance:  145000, variance_pct: 10.4, favorable: false },
      { account: 'Software Licenses',    account_obj: '7410', business_unit: 'IT',    budget:  580000, actual:  625000, variance:   45000, variance_pct:  7.8, favorable: false },
      { account: 'R&D Personnel',        account_obj: '5210', business_unit: 'RD',    budget: 2200000, actual: 2111000, variance:  -89000, variance_pct: -4.0, favorable: true  },
      { account: 'Sales Commissions',    account_obj: '6110', business_unit: 'SALES', budget: 1800000, actual: 1600000, variance: -200000, variance_pct:-11.1, favorable: true  },
      { account: 'Operations',           account_obj: '5310', business_unit: 'OPS',   budget: 1400000, actual: 1302000, variance:  -98000, variance_pct: -7.0, favorable: true  },
      { account: 'Finance Overhead',     account_obj: '8110', business_unit: 'FIN',   budget:  600000, actual:  618000, variance:   18000, variance_pct:  3.0, favorable: false },
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
    'Budget ledger type: BA, Actual ledger type: AA',
    'Fiscal year 25, periods 1–6',
    'top_n_drivers: 8, variance_type: all',
    'Positive variance = unfavorable (over budget)',
  ],
  chart_data: {
    labels: ['Salaries','Marketing','Cloud Infra','SW Licenses','R&D','Sales','Operations','Finance'],
    series: {
      budget: [2100000,  900000, 1400000, 580000, 2200000, 1800000, 1400000, 600000],
      actual: [2290000, 1098000, 1545000, 625000, 2111000, 1600000, 1302000, 618000],
      variance: [190000, 198000, 145000, 45000, -89000, -200000, -98000, 18000],
    },
  },
  chart_title: 'Budget vs Actual Variance — FY2025 P1–P6',
  chart_type: 'bar',
  interaction_group: 'variance-fy25',
}

export const periodComparison = {
  result: {
    comparison_type: 'YoY',
    current: { fiscal_year: 25, period: 6, revenue: 36200000, opex: 19100000, net_income: 14210000, gross_margin_pct: 60.8 },
    prior:   { fiscal_year: 24, period: 6, revenue: 32800000, opex: 18100000, net_income: 11305000, gross_margin_pct: 59.2 },
    deltas: {
      revenue:          { amount: 3400000, pct: 10.4, favorable: true  },
      opex:             { amount: 1000000, pct:  5.5, favorable: false },
      net_income:       { amount: 2905000, pct: 25.7, favorable: true  },
      gross_margin_pct: { amount:     1.6, pct:  2.7, favorable: true  },
    },
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
    'comparison_type: YoY',
    'Fiscal year 25, period 6 vs fiscal year 24, period 6',
    'F0902 ledger type AA',
  ],
  chart_data: {
    labels: ['Revenue', 'OpEx', 'Net Income'],
    series: {
      'FY2025': [36200000, 19100000, 14210000],
      'FY2024': [32800000, 18100000, 11305000],
    },
  },
  chart_title: 'YoY Period Comparison — P6 FY2025 vs FY2024',
  chart_type: 'bar',
  interaction_group: 'variance-fy25',
}
