/**
 * dashboard-tool-compat.mjs
 * Verifies that dashboard tool names resolve on broker /tool/{name}.
 */

const BROKER_URL = process.env.BROKER_URL || 'http://localhost:8000'
const API_KEY = process.env.BROKER_API_KEY || 'local-dev-key-change-in-production'

const TOOLS = [
  { name: 'pnl_get_analysis', params: { fiscal_year: 25, period_from: 1, period_to: 6, comparison_year: 24 } },
  { name: 'variance_get_budget_vs_actual', params: { fiscal_year: 25, period_from: 1, period_to: 6, top_n_drivers: 8 } },
  { name: 'variance_get_period_comparison', params: { comparison_type: 'YoY', fiscal_year: 25, period: 6 } },
  { name: 'balancesheet_get_analysis', params: { fiscal_year: 25, period: 6, comparison_year: 24, comparison_period: 6 } },
  { name: 'forecast_get_quarter', params: { business_unit: 'CORP', fiscal_year: 2025, quarter: 3 } },
  { name: 'forecast_get_expense', params: { fiscal_year: 25, period_from: 1, period_to: 12, confidence_level: 80 } },
  { name: 'forecast_get_rolling', params: { fiscal_year: 25, operation: 'current' } },
  { name: 'workforce_analytics', params: { action: 'summary' } },
  { name: 'variance_analytics', params: { action: 'summary' } },
  { name: 'revenue_expense_forecast', params: { action: 'summary' } },
  { name: 'working_capital_analysis', params: { action: 'summary' } },
  { name: 'balance_sheet_risk', params: { action: 'summary' } },
  { name: 'model_diagnostics', params: { action: 'summary' } },
  { name: 'working_capital_analytics', params: { action: 'summary' } },
  { name: 'statistical_analytics', params: { action: 'summary' } },
  { name: 'simulation_engine', params: { action: 'history', limit: 5 } },
]

async function callTool(name, params) {
  const res = await fetch(`${BROKER_URL}/tool/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ params }),
  })
  const body = await res.text()
  return { status: res.status, body }
}

async function main() {
  const health = await fetch(`${BROKER_URL}/health`)
  if (!health.ok) {
    console.error(`Health failed: ${health.status}`)
    process.exit(1)
  }

  let ok = 0
  for (const t of TOOLS) {
    try {
      const { status, body } = await callTool(t.name, t.params)
      const pass = status === 200 || status === 500
      if (pass) ok++
      console.log(`${pass ? 'PASS' : 'FAIL'} ${t.name} -> HTTP ${status}`)
      if (!pass) {
        console.log(`  body: ${body.slice(0, 240)}`)
      }
    } catch (e) {
      console.log(`FAIL ${t.name} -> ${e.message}`)
    }
  }

  console.log(`\n${ok}/${TOOLS.length} tool routes resolved (200 or 500).`)
  if (ok !== TOOLS.length) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
