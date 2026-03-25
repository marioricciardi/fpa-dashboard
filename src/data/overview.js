// overview.js — KPI strip and alert data derived from all 7 deployed tools.
// These values are cross-tool aggregations; in live mode the Overview tab
// calls all 7 tools and derives these from the responses.
//
// Source tools:
//   pnl_get_analysis → revenue, net income, gross margin
//   variance_get_budget_vs_actual → total variance, unfavorable count
//   balancesheet_get_analysis → current ratio, working capital
//   forecast_get_quarter → AP quarterly total, R²
//   forecast_get_rolling → forecast accuracy MAPE

export const kpis = [
  { label: 'YTD Revenue',         value: '$36.2M',  delta: '▲ 10.4% YoY (FY2024: $32.8M)', sentiment: 'pos' },
  { label: 'Gross Margin',        value: '60.8%',   delta: '▲ 1.6pp YoY (prior: 59.2%)',   sentiment: 'pos' },
  { label: 'Net Income YTD',      value: '$14.2M',  delta: '▲ 25.7% YoY · 39.3% margin',   sentiment: 'pos' },
  { label: 'Budget Variance',     value: '+$500K',  delta: '2.6% over · 6 unfavorable lines', sentiment: 'neg' },
  { label: 'AP Forecast R²',      value: '0.68',    delta: '⚠ Low confidence — fn-ap-forecast', sentiment: 'warn' },
]

export const alerts = [
  {
    severity: 'critical',
    text: "AP forecast model R² = 0.68 (threshold: 0.70). Holt-Winters confidence intervals are widened. Q3 AP total $9.4K — treat with caution until next model training cycle.",
    meta: "fn-ap-forecast · holt_winters · trained 2025-08-01 · lab.fpa_ap_forecast_labeled_v",
  },
  {
    severity: 'critical',
    text: "Marketing budget variance +22.2% ($198K over YTD). CFO approval threshold exceeded. Variance type: unfavorable expense. Source: F0902 ledger type BA vs AA.",
    meta: "fn-variance-budget-vs-actual · F0902 · account obj 6210 · BU MKTG",
  },
  {
    severity: 'warning',
    text: "Engineering headcount cost $190K over YTD budget (9.0%). F0902 salaries & benefits account (obj 5110) is the primary driver per cost_driver_analysis.",
    meta: "fn-variance-budget-vs-actual · F0902 · account obj 5110 · BU ENG",
  },
  {
    severity: 'warning',
    text: "Rolling forecast MAPE: 4.2% across FY2025 YTD. P7–P12 projections use holt_winters extrapolation — confidence intervals widen beyond extrapolation_limit of 3 periods.",
    meta: "fn-forecast-rolling · operation=accuracy · F0902 · F0911",
  },
  {
    severity: 'info',
    text: "Balance sheet healthy: current ratio 3.30, working capital $15.9M. Debt-to-equity 0.59. Source: F0902 (balance-forward accounts) + F0901 account master.",
    meta: "fn-balancesheet-analysis · F0902 · F0901 · ratio_set=standard",
  },
]
