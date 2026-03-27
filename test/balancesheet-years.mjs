/**
 * balancesheet-years.mjs — Test balancesheet_get_analysis for FY2015–FY2022.
 *
 * Usage:  node test/balancesheet-years.mjs
 *
 * Requires Node 18+ (native fetch).
 */

const BROKER_URL = process.env.BROKER_URL || 'http://localhost:8000'
const API_KEY    = process.env.BROKER_API_KEY || 'local-dev-key-change-in-production'

async function callTool(fiscalYear) {
  const params = { fiscal_year: fiscalYear, period: 12, comparison_year: fiscalYear - 1, comparison_period: 12 }
  const res = await fetch(`${BROKER_URL}/tool/balancesheet_get_analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ params }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

function hasNonZero(obj) {
  if (obj == null) return false
  for (const v of Object.values(obj)) {
    if (typeof v === 'number' && v !== 0) return true
    if (typeof v === 'object' && v !== null && hasNonZero(v)) return true
  }
  return false
}

async function main() {
  console.log('Balance Sheet Analysis — FY2015 through FY2022')
  console.log('═'.repeat(70))

  for (let fy = 15; fy <= 22; fy++) {
    const label = `FY20${String(fy).padStart(2, '0')}`
    try {
      const { status, data } = await callTool(fy)
      const result = data.result || {}

      if (result.error) {
        console.log(`${label}  ❌ ERROR  ${result.type || ''}: ${result.error}`)
        continue
      }

      const bs = result.balance_sheet || result
      const assets = bs.assets || {}
      const liabilities = bs.liabilities || {}
      const equity = bs.equity || {}
      const ratios = result.ratios || {}

      const totalA = assets.total_assets ?? 0
      const totalL = liabilities.total_liabilities ?? 0
      const totalE = equity.total_equity ?? equity.total ?? 0
      const cr     = ratios.current_ratio
      const dte    = ratios.debt_to_equity

      const nonZero = hasNonZero(result)

      console.log(
        `${label}  ${nonZero ? '✅ DATA' : '⚠️  ZEROS'}  ` +
        `Assets: ${fmt(totalA)}  Liab: ${fmt(totalL)}  Equity: ${fmt(totalE)}  ` +
        `CR: ${cr != null ? cr.toFixed(2) : 'n/a'}  D/E: ${dte != null ? dte.toFixed(2) : 'n/a'}`
      )
    } catch (err) {
      console.log(`${label}  ❌ FETCH FAILED  ${err.message}`)
    }
  }

  console.log('═'.repeat(70))
  console.log('Done.')
}

function fmt(n) {
  if (n == null) return '$0'
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

main()
