// balancesheet.js — mock ToolResult for balancesheet_get_analysis
// OCI Function: fn-balancesheet-analysis
// ADW source: F0902 (balance-forward accounts A/L/Q types), F0901

export const balancesheetAnalysis = {
  result: {
    assets: {
      current_assets: {
        cash:      12400000,
        ar:         6800000,
        inventory:  3200000,
        prepaid:     450000,
        total:     22850000,
      },
      fixed_assets: {
        ppe_net:    8900000,
        intangibles:2100000,
        other_lt:    780000,
        total:     11780000,
      },
      total_assets: 34630000,
    },
    liabilities: {
      current_liabilities: {
        ap:          4200000,
        accrued:     1800000,
        deferred_rev: 920000,
        total:       6920000,
      },
      long_term: {
        lt_debt:     5200000,
        deferred_tax: 680000,
        total:       5880000,
      },
      total_liabilities: 12800000,
    },
    equity: {
      common_stock:       5000000,
      retained_earnings: 16830000,
      total_equity:      21830000,
    },
    check: 0,    // assets - liabilities - equity; must equal 0
    ratios: {
      current_ratio:  3.30,
      debt_to_equity: 0.59,
      working_capital:15930000,
      quick_ratio:    2.84,
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
    'F0902 balance-forward accounts (A=asset, L=liability, Q=equity)',
    'F0901 account master for account classification',
    'Fiscal year 25, period 6',
    'ratio_set: standard (current_ratio, debt_to_equity, working_capital, quick_ratio)',
    'check field: assets - liabilities - equity = 0 (validates accounting equation)',
  ],
  chart_data: {
    labels: ['Current Assets', 'Fixed Assets', 'Current Liab.', 'LT Liab.', 'Equity'],
    series: {
      values: [22850000, 11780000, 6920000, 5880000, 21830000],
    },
  },
  chart_title: 'Balance Sheet — FY2025 P6',
  chart_type: 'bar',
  interaction_group: null,
}
