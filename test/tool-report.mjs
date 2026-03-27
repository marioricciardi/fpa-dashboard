/**
 * tool-report.mjs — Calls every broker tool and prints a diagnostic report.
 *
 * Usage:  node test/tool-report.mjs
 *
 * Requires Node 18+ (native fetch).
 */

const BROKER_URL = process.env.BROKER_URL || 'http://localhost:8000'
const API_KEY    = process.env.BROKER_API_KEY || 'local-dev-key-change-in-production'

const TOOLS = [
  { name: 'pnl_get_analysis',              params: { fiscal_year: 25, period_from: 1, period_to: 8, comparison_year: 24 } },
  { name: 'variance_get_budget_vs_actual',  params: { fiscal_year: 25, period_from: 1, period_to: 6, top_n_drivers: 8 } },
  { name: 'variance_get_period_comparison', params: { comparison_type: 'YoY', fiscal_year: 25, period: 6 } },
  { name: 'balancesheet_get_analysis',      params: { fiscal_year: 25, period: 6, comparison_year: 24, comparison_period: 6 } },
  { name: 'forecast_get_quarter',           params: { business_unit: 'CORP', fiscal_year: 2025, quarter: 3 } },
  { name: 'forecast_get_expense',           params: { fiscal_year: 25, period_from: 1, period_to: 12, confidence_level: 80 } },
  { name: 'forecast_get_rolling',           params: { fiscal_year: 25, operation: 'current' } },
]

function summarise(data) {
  const lines = []
  // Top-level fields
  lines.push(`  chart_data:    ${data.chart_data ? 'YES (' + (data.chart_data.labels?.length ?? 0) + ' labels)' : 'null'}`)
  lines.push(`  chart_title:   ${data.chart_title ?? 'null'}`)
  lines.push(`  chart_type:    ${data.chart_type ?? 'null'}`)
  lines.push(`  r_squared:     ${data.r_squared ?? 'null'}`)
  lines.push(`  _low_confidence: ${data._low_confidence ?? 'null'}`)
  lines.push(`  computation_method: ${data.computation_method ?? 'null'}`)
  lines.push(`  model_version: ${data.model_version ?? 'null'}`)

  // result sub-object
  const r = data.result
  if (!r) {
    lines.push(`  result:        null`)
  } else if (r.error) {
    lines.push(`  result.error:  ${r.error}`)
    lines.push(`  result.type:   ${r.type ?? 'n/a'}`)
  } else {
    const keys = Object.keys(r)
    lines.push(`  result keys:   [${keys.join(', ')}]`)
    // Show a few key nested values
    for (const k of keys) {
      const v = r[k]
      if (v == null) {
        lines.push(`    .${k}: null`)
      } else if (typeof v === 'object' && !Array.isArray(v)) {
        const subKeys = Object.keys(v)
        const preview = subKeys.slice(0, 6).map(sk => {
          const sv = v[sk]
          return `${sk}=${sv === null ? 'null' : typeof sv === 'object' ? '{...}' : sv}`
        }).join(', ')
        lines.push(`    .${k}: {${preview}${subKeys.length > 6 ? ', ...' : ''}}`)
      } else if (Array.isArray(v)) {
        lines.push(`    .${k}: Array[${v.length}]`)
      } else {
        lines.push(`    .${k}: ${v}`)
      }
    }
  }
  return lines.join('\n')
}

async function callTool(name, params) {
  const url = `${BROKER_URL}/tool/${encodeURIComponent(name)}`
  const start = Date.now()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ params }),
  })
  const elapsed = Date.now() - start
  const body = await res.text()
  return { status: res.status, elapsed, body }
}

async function main() {
  console.log('=' .repeat(80))
  console.log('FPA Dashboard — Tool Diagnostic Report')
  console.log(`Broker: ${BROKER_URL}`)
  console.log(`Date:   ${new Date().toISOString()}`)
  console.log('=' .repeat(80))

  // Health check
  try {
    const hRes = await fetch(`${BROKER_URL}/health`)
    const hBody = await hRes.json()
    console.log(`\n[HEALTH] ${hRes.status} — ${JSON.stringify(hBody)}`)
  } catch (e) {
    console.log(`\n[HEALTH] FAILED — ${e.message}`)
    console.log('Broker is not reachable. Aborting.')
    process.exit(1)
  }

  const results = []

  for (const tool of TOOLS) {
    console.log(`\n${'─'.repeat(80)}`)
    console.log(`TOOL: ${tool.name}`)
    console.log(`Params: ${JSON.stringify(tool.params)}`)
    try {
      const { status, elapsed, body } = await callTool(tool.name, tool.params)
      let parsed
      try { parsed = JSON.parse(body) } catch { parsed = null }

      const hasError = parsed?.result?.error || parsed?.result?.type === 'DatabaseError'
      const hasChart = !!parsed?.chart_data
      const verdict = status !== 200 ? `HTTP ${status}` : hasError ? 'ERROR in result' : hasChart ? 'OK + chart_data' : 'OK (no chart_data)'

      console.log(`Status: ${status} | ${elapsed}ms | Verdict: ${verdict}`)

      if (parsed) {
        console.log(summarise(parsed))
      } else {
        console.log(`  Raw body (first 300 chars): ${body.substring(0, 300)}`)
      }

      results.push({ tool: tool.name, status, elapsed, verdict, hasChart, hasError: !!hasError })
    } catch (e) {
      console.log(`  FETCH ERROR: ${e.message}`)
      results.push({ tool: tool.name, status: 0, elapsed: 0, verdict: `NETWORK ERROR: ${e.message}`, hasChart: false, hasError: true })
    }
  }

  // Summary table
  console.log(`\n${'═'.repeat(80)}`)
  console.log('SUMMARY')
  console.log('═'.repeat(80))
  console.log(`${'Tool'.padEnd(38)} ${'Status'.padEnd(8)} ${'ms'.padEnd(7)} ${'Chart'.padEnd(7)} Verdict`)
  console.log('─'.repeat(80))
  for (const r of results) {
    console.log(
      `${r.tool.padEnd(38)} ${String(r.status).padEnd(8)} ${String(r.elapsed).padEnd(7)} ${(r.hasChart ? 'YES' : 'NO').padEnd(7)} ${r.verdict}`
    )
  }
  console.log('─'.repeat(80))
  const ok = results.filter(r => !r.hasError && r.status === 200).length
  console.log(`${ok}/${results.length} tools returned successfully.`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
