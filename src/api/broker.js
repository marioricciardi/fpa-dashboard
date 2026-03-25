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

// Mock data registry — maps tool name to the async import of its mock file
const MOCK_REGISTRY = {
  pnl_get_analysis:                 () => import('../data/pnl.js').then(m => m.pnlAnalysis),
  variance_get_budget_vs_actual:    () => import('../data/variance.js').then(m => m.budgetVsActual),
  variance_get_period_comparison:   () => import('../data/variance.js').then(m => m.periodComparison),
  forecast_get_quarter:             () => import('../data/forecast.js').then(m => m.forecastGetQuarter),
  forecast_get_expense:             () => import('../data/forecast.js').then(m => m.forecastGetExpense),
  forecast_get_rolling:             () => import('../data/forecast.js').then(m => m.forecastGetRolling),
  balancesheet_get_analysis:        () => import('../data/balancesheet.js').then(m => m.balancesheetAnalysis),
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
    return loader()
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
 * chatQuery(message, history)
 *
 * Sends a natural-language query to the fpa-broker SmartRouter / intent-router-ensemble.
 * In mock mode returns a canned response after a simulated delay.
 * In live mode POSTs to fpa-broker's OpenAI-compatible /v1/chat/completions endpoint.
 *
 * Returns: { answer, sources, trace, chart_data?, chart_type?, chart_title? }
 */
export async function chatQuery(message, history = []) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1200))
    return (await import('../data/chatMock.js')).getMockResponse(message)
  }

  const res = await fetch(`${BROKER_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(BROKER_API_KEY && { Authorization: `Bearer ${BROKER_API_KEY}` }),
    },
    body: JSON.stringify({
      model: 'openai.gpt-4.1',
      messages: [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`broker chat error ${res.status}: ${text}`)
  }

  const data = await res.json()
  // Transform OpenAI-compatible response to dashboard shape
  const content = data.choices?.[0]?.message?.content ?? ''
  return { answer: content, sources: [], trace: data }
}
