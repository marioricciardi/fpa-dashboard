// chatMock.js — mock responses for the Agent Chat tab
// Simulates the fpa-broker /chat endpoint (intent-router-ensemble)

const MOCK_RESPONSES = [
  {
    keywords: ['balance sheet', 'assets', 'liabilities', 'equity'],
    response: {
      answer: [
        'As of period 6 of fiscal year 2025, the balance sheet for business unit CORP shows:',
        '',
        '**Assets**',
        '- Current Assets: $22.9M (Cash $12.4M, AR $6.8M, Inventory $3.2M)',
        '- Fixed Assets: $11.8M (PP&E $8.9M, Intangibles $2.1M)',
        '- **Total Assets: $34.6M**',
        '',
        '**Liabilities**',
        '- Current Liabilities: $6.9M (AP $4.2M, Accrued $1.8M)',
        '- Long-Term: $5.9M (LT Debt $5.2M)',
        '- **Total Liabilities: $12.8M**',
        '',
        '**Equity: $21.8M** (Retained Earnings $16.8M)',
        '',
        '**Key Ratios:**',
        '- Current Ratio: 3.30 (healthy)',
        '- Debt-to-Equity: 0.59 (conservative)',
        '- Working Capital: $15.9M',
        '- Quick Ratio: 2.84',
        '',
        'Balance sheet check: A − L − E = 0 ✓ (Source: sq-1)',
      ].join('\n'),
      sources: ['fn-balancesheet-analysis'],
      trace: {
        total_ms: 3620,
        nodes: 4,
        routing: [
          { name: 'Orchestrator', type: 'routing', status: 'ok', duration_ms: 820, detail: 'sequential · 1 sub-question' },
          { name: 'Dispatch', type: 'routing', status: 'ok', duration_ms: 150, detail: '1 send fired' },
        ],
        agents: [
          { name: 'BALANCESHEET agent', status: 'ok', duration_ms: 1480, detail: 'Provide the balance sheet for business unit CORP' },
        ],
        post: [
          { name: 'Consolidation', type: 'post', status: 'ok', duration_ms: 620, detail: 'sequential' },
          { name: 'Format', type: 'post', status: 'ok', duration_ms: 550, detail: '' },
        ],
      },
      chart_data: {
        labels: ['Current Assets', 'Fixed Assets', 'Current Liab.', 'LT Liab.', 'Equity'],
        series: { values: [22850000, 11780000, 6920000, 5880000, 21830000] },
      },
      chart_type: 'bar',
      chart_title: 'Balance Sheet — FY2025 P6',
    },
  },
  {
    keywords: ['forecast', 'ap', 'expense', 'spend'],
    response: {
      answer: [
        'For business unit CORP, the AP expense forecast for Q3 FY2025 is:',
        '',
        '- **Total AP spend forecast: $9.42K USD**',
        '- Average monthly AP spend forecast: $3.14K USD',
        '',
        'Forecast by period:',
        '- Period 1: $2.89K (95% confidence interval: $2.33K – $3.46K)',
        '- Period 2: $3.01K (95% confidence interval: $2.42K – $3.60K)',
        '- Period 3: $3.52K (95% confidence interval: $2.83K – $4.21K)',
        '',
        '⚠ **Note:** This forecast is model-generated and may have low confidence due to limited historical data or extrapolation. R² = 0.68 (Source: sq-2)',
        '',
        'Full-year expense forecast by category:',
        '- COGS: $14.2M (CI: $13.5M – $14.9M)',
        '- SG&A: $4.8M (CI: $4.5M – $5.1M)',
        '- R&D: $2.1M (CI: $1.9M – $2.3M)',
        '- D&A: $890K (CI: $820K – $960K)',
        '- **Total OpEx Forecast: $22.3M**',
      ].join('\n'),
      sources: ['fn-ap-forecast', 'fn-forecast-expense'],
      trace: {
        total_ms: 8240,
        nodes: 5,
        routing: [
          { name: 'Orchestrator', type: 'routing', status: 'ok', duration_ms: 1100, detail: 'sequential · 2 sub-questions' },
          { name: 'Dispatch', type: 'routing', status: 'ok', duration_ms: 200, detail: '2 sends fired' },
        ],
        agents: [
          { name: 'FPA agent', status: 'warn', duration_ms: 3200, detail: 'Provide the expense forecast for CORP (R²=0.68)' },
          { name: 'FORECAST agent', status: 'ok', duration_ms: 2100, detail: 'Full-year expense forecast by category' },
        ],
        post: [
          { name: 'Consolidation', type: 'post', status: 'ok', duration_ms: 890, detail: 'sequential' },
          { name: 'Format', type: 'post', status: 'ok', duration_ms: 750, detail: '' },
        ],
      },
      chart_data: {
        labels: ['2025-P07', '2025-P08', '2025-P09'],
        series: {
          spend: [2890.0, 3010.0, 3520.0],
          avg: [3140.0, 3140.0, 3140.0],
          ci_low: [2330.0, 2420.0, 2830.0],
          ci_high: [3460.0, 3600.0, 4210.0],
        },
      },
      chart_type: 'line',
      chart_title: 'AP Spend Forecast — Q3 2025 (BU: CORP)',
    },
  },
  {
    keywords: ['variance', 'budget', 'actual'],
    response: {
      answer: [
        'Budget vs Actual variance analysis for FY2025 P1–P6:',
        '',
        '**Summary:**',
        '- Total Budget: $19.6M',
        '- Total Actual: $20.1M',
        '- **Net Variance: +$500K (2.6% over budget)**',
        '- Unfavorable lines: 6 | Favorable lines: 4',
        '',
        '**Top Unfavorable Drivers:**',
        '- Marketing Programs (MKTG): +$198K over budget (22.2%) — CFO approval threshold exceeded',
        '- Salaries & Benefits (ENG): +$190K over budget (9.0%)',
        '- Cloud Infrastructure (IT): +$145K over budget (10.4%)',
        '- Software Licenses (IT): +$45K over budget (7.8%)',
        '',
        '**Favorable Items:**',
        '- Sales Commissions (SALES): −$200K under budget (11.1%)',
        '- R&D Personnel (RD): −$89K under budget (4.0%)',
        '- Operations (OPS): −$98K under budget (7.0%)',
        '',
        'Source: F0902 ledger type BA vs AA (Source: sq-1)',
      ].join('\n'),
      sources: ['fn-variance-budget-vs-actual'],
      trace: {
        total_ms: 5200,
        nodes: 4,
        routing: [
          { name: 'Orchestrator', type: 'routing', status: 'ok', duration_ms: 900, detail: 'sequential · 1 sub-question' },
          { name: 'Dispatch', type: 'routing', status: 'ok', duration_ms: 180, detail: '1 send fired' },
        ],
        agents: [
          { name: 'VARIANCE agent', status: 'ok', duration_ms: 2400, detail: 'Compare budget vs actual for all BUs' },
        ],
        post: [
          { name: 'Consolidation', type: 'post', status: 'ok', duration_ms: 920, detail: 'sequential' },
          { name: 'Format', type: 'post', status: 'ok', duration_ms: 800, detail: '' },
        ],
      },
      chart_data: {
        labels: ['Salaries', 'Marketing', 'Cloud Infra', 'SW Licenses', 'R&D', 'Sales', 'Operations', 'Finance'],
        series: {
          budget: [2100000, 900000, 1400000, 580000, 2200000, 1800000, 1400000, 600000],
          actual: [2290000, 1098000, 1545000, 625000, 2111000, 1600000, 1302000, 618000],
        },
      },
      chart_type: 'bar',
      chart_title: 'Budget vs Actual — FY2025 P1–P6',
    },
  },
]

const DEFAULT_RESPONSE = {
  answer: [
    'For business unit M30, the following information applies:',
    '',
    '- As of period 6 of fiscal year 2015, the balance sheet reports all values as zero. This means there are no recorded assets, liabilities, equity amounts, or computed financial ratios for that period. (Source: sq-1)',
    '',
    '- The AP (Accounts Payable) expense forecast for the third quarter (Q3) of fiscal year 2015 is:',
    '  - Total AP spend forecast: $9.42K USD',
    '  - Average monthly AP spend forecast: $3.14K USD',
    '  - Forecast by period:',
    '    - Period 1: $2.89K (95% confidence interval: $2.33K – $3.46K)',
    '    - Period 2: $3.01K (95% confidence interval: $2.42K – $3.60K)',
    '    - Period 3: $3.52K (95% confidence interval: $2.83K – $4.21K)',
    '',
    '  ⚠ Note: This forecast is model-generated and may have low confidence due to limited historical data or extrapolation. (Source: sq-2)',
    '',
    '- Year-over-Year expense comparison for period 6 in fiscal years 2015 and 2016:',
    '  - Fiscal Year 2015, Period 6: Total expense is 0',
    '  - Fiscal Year 2016, Period 6: Total expense is 0',
    '  - There is no variance between the two periods — expenses are reported as zero for both years in period 6. (Source: sq-3)',
    '',
    'Business Unit: M30',
    '',
    'Fiscal Periods: Period 6 of FY2015 and FY2016 (balance sheet and expense comparison), Q3 FY2015 (AP expense forecast)',
  ].join('\n'),
  sources: ['fn-balancesheet-analysis', 'fn-ap-forecast', 'fn-variance-period-comparison'],
  trace: {
    total_ms: 28027,
    nodes: 7,
    routing: [
      { name: 'Orchestrator', type: 'routing', status: 'ok', duration_ms: 5700, detail: 'sequential · 3 sub-questions' },
      { name: 'Dispatch', type: 'routing', status: 'ok', duration_ms: 10, detail: '3 sends fired' },
    ],
    agents: [
      { name: 'BALANCESHEET agent', status: 'error', duration_ms: 3600, detail: 'Provide the balance sheet for business u0' },
      { name: 'FPA agent', status: 'ok', duration_ms: 4600, detail: 'Provide the expense forecast for busines0' },
      { name: 'VARIANCE agent', status: 'ok', duration_ms: 5200, detail: 'Compare expenses for business unit M30 i0' },
    ],
    post: [
      { name: 'Consolidation', type: 'post', status: 'ok', duration_ms: 10, detail: 'sequential' },
      { name: 'Format', type: 'post', status: 'ok', duration_ms: 8900, detail: '' },
    ],
  },
  chart_data: {
    labels: ['2025-P07', '2025-P08', '2025-P09'],
    series: {
      spend: [2890.0, 3010.0, 3520.0],
      avg: [3140.0, 3140.0, 3140.0],
    },
  },
  chart_type: 'line',
  chart_title: 'Expenses and Average (2019-P01 to 2019-P03)',
}

export function getMockResponse(message) {
  const lower = message.toLowerCase()
  for (const mock of MOCK_RESPONSES) {
    if (mock.keywords.some(kw => lower.includes(kw))) {
      return mock.response
    }
  }
  return DEFAULT_RESPONSE
}
