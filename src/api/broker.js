// broker.js — fpa-broker API client
//
// In mock mode (VITE_USE_MOCK=true): imports from src/data/ and resolves immediately.
// In live mode: POSTs to fpa-broker FastAPI at /tool/{toolName}
//
// fpa-broker exposes:
//   POST /tool/{tool_name}   body: { params: {...} }
//   Response: ToolResult dict (see ToolResult contract in spec)
//
// Auth: fpa-broker handles OCI resource principal auth internally.
// The dashboard does NOT need to pass OCI credentials directly.

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const BROKER_URL = import.meta.env.VITE_BROKER_URL || 'http://localhost:8000'
const BROKER_API_KEY = import.meta.env.VITE_BROKER_API_KEY || ''

// Mock data registry — maps tool name to async function(params) returning ToolResult.
// Each mock module exports a function that accepts { fiscal_year, period, ... }
// and returns year-appropriate data (FY23–FY26). Seed constants live in data/seeds/.
const MOCK_REGISTRY = {
  pnl_get_analysis:              (p) => import('../data/pnl.js').then(m => m.pnlAnalysis(p)),
  variance_get_budget_vs_actual: (p) => import('../data/variance.js').then(m => m.budgetVsActual(p)),
  variance_get_period_comparison:(p) => import('../data/variance.js').then(m => m.periodComparison(p)),
  forecast_get_quarter:          (p) => import('../data/forecast.js').then(m => m.forecastGetQuarter(p)),
  forecast_get_expense:          (p) => import('../data/forecast.js').then(m => m.forecastGetExpense(p)),
  forecast_get_rolling:          (p) => import('../data/forecast.js').then(m => m.forecastGetRolling(p)),
  balancesheet_get_analysis:     (p) => import('../data/balancesheet.js').then(m => m.balancesheetAnalysis(p)),
  // NB-A: Workforce Analytics
  workforce_analytics:           (p) => import('../data/liveTools.js').then(m => m.workforceAnalytics(p)),
  // NB-B: Variance Analytics (consolidated)
  variance_analytics:            (p) => import('../data/liveTools.js').then(m => m.varianceAnalytics(p)),
  // NB-C: Revenue & Expense Forecast (consolidated)
  revenue_expense_forecast:      (p) => import('../data/liveTools.js').then(m => m.revenueExpenseForecast(p)),
  // NB-D: Working Capital (CCC, AR aging, AR forecast)
  working_capital_analysis:      (p) => import('../data/liveTools.js').then(m => m.workingCapitalAnalysis(p)),
  // NB-E: Balance Sheet Risk
  balance_sheet_risk:            (p) => import('../data/liveTools.js').then(m => m.balanceSheetRisk(p)),
  // NB-F: Model Diagnostics
  model_diagnostics:             (p) => import('../data/liveTools.js').then(m => m.modelDiagnostics(p)),
  // NB-G: Working Capital Analytics (DSO/DIO/DPO forecasts)
  working_capital_analytics:     (p) => import('../data/liveTools.js').then(m => m.workingCapitalForecast(p)),
  // NB-H: Statistical Analytics
  statistical_analytics:         (p) => import('../data/liveTools.js').then(m => m.statisticalAnalytics(p)),
  // NB-I: Simulation Engine
  simulation_engine:             (p) => import('../data/liveTools.js').then(m => m.simulationEngine(p)),
}

/**
 * callTool(toolName, params)
 *
 * Returns a Promise<ToolResult>.
 * In mock mode returns static data with a 200ms simulated delay.
 * In live mode POSTs to fpa-broker and returns the response JSON.
 */
export async function callTool(toolName, params = {}) {
  if (USE_MOCK) {
    const loader = MOCK_REGISTRY[toolName]
    if (!loader) throw new Error(`No mock registered for tool: ${toolName}`)
    await new Promise(r => setTimeout(r, 200)) // simulate latency
    return loader(params)
  }

  const res = await fetch(`${BROKER_URL}/tool/${encodeURIComponent(toolName)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(BROKER_API_KEY && { Authorization: `Bearer ${BROKER_API_KEY}` }),
    },
    body: JSON.stringify({ params }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`broker error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * chatQuery(message, history, options)
 *
 * Sends a natural-language query to fpa-broker's OpenAI-compatible
 * /v1/chat/completions endpoint using SSE streaming (matching LibreChat style).
 *
 * options.onDelta(partialText) — called as content arrives for live display.
 *
 * Returns: { answer, sources, trace, charts }
 */
export async function chatQuery(message, history = [], { onDelta } = {}) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1200))
    return (await import('../data/chatMock.js')).getMockResponse(message)
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(BROKER_API_KEY && { Authorization: `Bearer ${BROKER_API_KEY}` }),
  }

  const body = JSON.stringify({
    model: 'openai.gpt-4.1',
    messages: [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ],
    stream: true,
  })

  const res = await fetch(`${BROKER_URL}/v1/chat/completions`, {
    method: 'POST', headers, body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`broker chat error ${res.status}: ${text}`)
  }

  // ── Read SSE stream ──────────────────────────────────────
  let fullContent = ''
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice(6)
      if (payload === '[DONE]') continue
      try {
        const chunk = JSON.parse(payload)
        const delta = chunk.choices?.[0]?.delta?.content
        if (delta) {
          fullContent += delta
          onDelta?.(fullContent)
        }
      } catch { /* skip malformed chunks */ }
    }
  }

  // If stream yielded nothing (broker may have returned non-streaming JSON)
  if (!fullContent && res.headers.get('content-type')?.includes('application/json')) {
    try {
      const data = JSON.parse(buffer || await res.text())
      fullContent = data.choices?.[0]?.message?.content ?? ''
    } catch { /* ignore */ }
  }

  return parseBrokerContent(fullContent)
}

// ── Artifact parser ────────────────────────────────────────────
// The broker embeds execution-trace and chart React artefacts in
// :::artifact{...}\n```tsx\n...```\n::: blocks within the content string.

function parseBrokerContent(content) {
  if (!content) return { answer: '', sources: [], trace: null, charts: [] }

  const artifactRe = /:::artifact\{([^}]*)\}\n```tsx\n([\s\S]*?)```\n:::/g

  let trace = null
  const charts = []
  let cleanText = content

  let match
  while ((match = artifactRe.exec(content)) !== null) {
    const attrs = match[1]
    const code  = match[2]
    const id    = attrs.match(/identifier="([^"]+)"/)?.[1] || ''
    const title = attrs.match(/title="([^"]+)"/)?.[1] || ''

    cleanText = cleanText.replace(match[0], '')

    if (id === 'fpa-exec-trace') {
      trace = parseTraceArtifact(code)
    } else if (id.startsWith('fpa-chart-')) {
      const cd = parseChartArtifact(code, title)
      if (cd) charts.push(cd)
    }
  }

  // Extract sources from trace agent names
  const sources = trace?.agents?.map(a => a.name) ?? []

  return {
    answer: cleanText.trim(),
    sources,
    trace,
    charts,
    // backward-compat single chart
    chart_data:  charts[0]?.chart_data  ?? null,
    chart_type:  charts[0]?.chart_type  ?? null,
    chart_title: charts[0]?.chart_title ?? null,
  }
}

function parseTraceArtifact(code) {
  const rowsMatch     = code.match(/const rows\s*=\s*(\[[\s\S]*?\]);/)
  const timelineMatch = code.match(/const timelineData\s*=\s*(\[[\s\S]*?\]);/)
  const totalMatch    = code.match(/const TOTAL\s*=\s*(\d+);/)

  if (!rowsMatch) return null

  try {
    const rows = JSON.parse(rowsMatch[1])
    const totalMs = totalMatch ? parseInt(totalMatch[1], 10) : 0

    const mapStatus = s => s === 'fail' ? 'error' : s === 'warn' ? 'warn' : 'ok'

    const routing = rows.filter(r => r.layer === 'routing').map(r => ({
      name: r.node, detail: r.detail, duration_ms: r.duration_ms,
      status: mapStatus(r.status), type: 'routing',
    }))
    const agents = rows.filter(r => r.layer === 'domain').map(r => ({
      name: r.node, detail: r.detail, duration_ms: r.duration_ms,
      status: mapStatus(r.status), type: 'agent',
      r2: r.r2 ?? null, warn: r.warn ?? false,
    }))
    const post = rows.filter(r => r.layer === 'post-processing').map(r => ({
      name: r.node, detail: r.detail, duration_ms: r.duration_ms,
      status: mapStatus(r.status), type: 'post',
    }))

    return { routing, agents, post, nodes: rows.length, total_ms: totalMs }
  } catch {
    return null
  }
}

function parseChartArtifact(code, title) {
  // Extract the data array from `const data = [...]`
  const dataMatch = code.match(/const data\s*=\s*\[\n([\s\S]*?)\];/)
  if (!dataMatch) return null

  try {
    // The broker emits JS object literals with some unquoted keys.
    // Fix them: { name: "x" } → { "name": "x" }
    let raw = dataMatch[1]
    raw = raw.replace(/(\{|,)\s*(\w+)\s*:/g, '$1 "$2":')
    const data = JSON.parse(`[${raw}]`)

    const labels = data.map(d => d.name)
    const series = {}
    for (const d of data) {
      for (const [key, val] of Object.entries(d)) {
        if (key === 'name') continue
        if (!series[key]) series[key] = []
        series[key].push(val)
      }
    }

    // Determine chart type from component usage
    const hasBar  = /\bBar\b/.test(code) && !/\bBarChart\b/.test(code.split('ComposedChart')[0] || '')
    const hasLine = /\bLine\b/.test(code)
    const chart_type = (hasBar && hasLine) ? 'composed' : hasLine ? 'line' : 'bar'

    return { chart_data: { labels, series }, chart_type, chart_title: title }
  } catch {
    return null
  }
}
