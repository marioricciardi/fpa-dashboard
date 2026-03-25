import { useState, useRef, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { Send } from 'lucide-react'
import { chatQuery } from '../api/broker.js'
import { fmt } from '../utils/chartAdapter.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

const TC = '#888780', GC = 'rgba(0,0,0,0.06)'
const PALETTE = ['#3266ad','#1d9e75','#7f77dd','#ef9f27','#e24b4a','#639922','#888780']

function buildChartData(chartData, chartType) {
  if (!chartData) return null
  const { labels, series } = chartData
  const keys = Object.keys(series)
  const datasets = keys.map((key, i) => ({
    label: key,
    data: series[key],
    ...(chartType === 'line'
      ? { borderColor: PALETTE[i % PALETTE.length], borderWidth: 2, pointRadius: 3, pointBackgroundColor: PALETTE[i % PALETTE.length], fill: false, tension: 0.3 }
      : { backgroundColor: PALETTE[i % PALETTE.length] + '38', borderColor: PALETTE[i % PALETTE.length], borderWidth: 1.5, borderRadius: 3 }),
  }))
  return { labels, datasets }
}

function TraceTimeline({ trace }) {
  if (!trace) return null
  const allSteps = [...(trace.routing || []), ...(trace.agents || []), ...(trace.post || [])]
  const maxMs = trace.total_ms || Math.max(...allSteps.map(s => s.duration_ms))

  const statusColor = (s) => {
    if (s === 'error') return 'var(--red)'
    if (s === 'warn') return 'var(--amber)'
    return 'var(--teal)'
  }
  const statusDot = (s) => {
    if (s === 'error') return '●'
    if (s === 'warn') return '●'
    return '●'
  }

  // Calculate approximate start offsets for timeline bars
  let runningOffset = 0
  const withOffsets = allSteps.map(step => {
    const item = { ...step, offset: runningOffset }
    // Routing steps are sequential; agents are parallel (share same offset)
    if (step.type === 'routing' || step.type === 'post') {
      runningOffset += step.duration_ms
    } else {
      // Agents start at same offset (parallel dispatch)
    }
    return item
  })
  // Fix agent offsets: they all start after dispatch
  const dispatchEnd = (trace.routing || []).reduce((s, r) => s + r.duration_ms, 0)
  const agentEnd = dispatchEnd + Math.max(...(trace.agents || [{ duration_ms: 0 }]).map(a => a.duration_ms))
  let postOffset = agentEnd
  const finalSteps = withOffsets.map(step => {
    if (trace.agents?.includes(step) && step.type !== 'routing' && step.type !== 'post') {
      return { ...step, offset: dispatchEnd }
    }
    if (step.type === 'post') {
      const s = { ...step, offset: postOffset }
      postOffset += step.duration_ms
      return s
    }
    return step
  })

  return (
    <div className="chat-trace">
      <div className="chat-trace__header">
        <span className="chat-trace__badge">Execution trace · {trace.nodes} nodes · {(trace.total_ms / 1000).toFixed(1)}s total</span>
      </div>

      {trace.routing?.length > 0 && (
        <div className="chat-trace__section">
          <div className="chat-trace__section-label">ROUTING</div>
          {trace.routing.map((r, i) => (
            <div key={i} className="chat-trace__row">
              <span className="chat-trace__dot" style={{ color: statusColor(r.status) }}>{statusDot(r.status)}</span>
              <span className="chat-trace__name">{r.name}</span>
              <span className="chat-trace__detail">{r.detail}</span>
              <span className="chat-trace__ms">{(r.duration_ms / 1000).toFixed(1)}s</span>
            </div>
          ))}
        </div>
      )}

      {trace.agents?.length > 0 && (
        <div className="chat-trace__section">
          <div className="chat-trace__section-label">DOMAIN AGENTS — PARALLEL</div>
          {trace.agents.map((a, i) => (
            <div key={i} className="chat-trace__row">
              <span className="chat-trace__dot" style={{ color: statusColor(a.status) }}>{statusDot(a.status)}</span>
              <span className="chat-trace__name">{a.name}</span>
              <span className="chat-trace__detail">{a.detail}</span>
              <span className="chat-trace__ms">{(a.duration_ms / 1000).toFixed(1)}s</span>
            </div>
          ))}
        </div>
      )}

      {trace.post?.length > 0 && (
        <div className="chat-trace__section">
          <div className="chat-trace__section-label">POST-PROCESSING</div>
          {trace.post.map((p, i) => (
            <div key={i} className="chat-trace__row">
              <span className="chat-trace__dot" style={{ color: statusColor(p.status) }}>{statusDot(p.status)}</span>
              <span className="chat-trace__name">{p.name}</span>
              <span className="chat-trace__detail">{p.detail}</span>
              <span className="chat-trace__ms">{(p.duration_ms / 1000).toFixed(1)}s</span>
            </div>
          ))}
        </div>
      )}

      <div className="chat-trace__section">
        <div className="chat-trace__section-label">TIMELINE</div>
        <div className="chat-trace__timeline">
          {finalSteps.map((step, i) => {
            const pct = (step.duration_ms / maxMs) * 100
            const leftPct = (step.offset / maxMs) * 100
            return (
              <div key={i} className="chat-trace__bar-row">
                <span className="chat-trace__bar-label">{step.name}</span>
                <div className="chat-trace__bar-track">
                  <div
                    className="chat-trace__bar"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      left: `${leftPct}%`,
                      background: statusColor(step.status),
                    }}
                  />
                </div>
                <span className="chat-trace__ms">{(step.duration_ms / 1000).toFixed(1)}s</span>
              </div>
            )
          })}
          <div className="chat-trace__axis">
            <span>0ms</span>
            <span>{(maxMs * 0.25 / 1000).toFixed(1)}s</span>
            <span>{(maxMs * 0.5 / 1000).toFixed(1)}s</span>
            <span>{(maxMs * 0.75 / 1000).toFixed(1)}s</span>
            <span>{(maxMs / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnswerMarkdown({ text }) {
  // Simple markdown-to-JSX: bold, bullet points, warnings
  const lines = text.split('\n')
  return (
    <div className="chat-answer-text">
      {lines.map((line, i) => {
        const trimmed = line.trimStart()
        const indent = line.length - trimmed.length
        // Bold headers
        const rendered = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Warning emoji
        const hasWarning = trimmed.startsWith('⚠')

        if (trimmed === '') return <div key={i} style={{ height: 8 }} />

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ')
        const isSubBullet = indent >= 2 && isBullet

        if (isBullet) {
          return (
            <div key={i} className={`chat-answer-bullet ${isSubBullet ? 'chat-answer-bullet--sub' : ''} ${hasWarning ? 'chat-answer-bullet--warn' : ''}`}>
              <span className="chat-answer-bullet__dot">•</span>
              <span dangerouslySetInnerHTML={{ __html: rendered.replace(/^[-•]\s*/, '') }} />
            </div>
          )
        }

        return (
          <p key={i} className={hasWarning ? 'chat-answer-warn' : ''} style={{ marginLeft: indent * 4 }}
            dangerouslySetInnerHTML={{ __html: rendered }} />
        )
      })}
    </div>
  )
}

export default function AgentChatTab() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, content: m.role === 'user' ? m.content : m.data?.answer || '' }))
      const result = await chatQuery(text, history)
      setMessages(prev => [...prev, { role: 'assistant', data: result }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', data: { answer: `Error: ${e.message}`, sources: [], trace: null } }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')

  const CHART_OPTS = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom', labels: { color: TC, font: { size: 9 }, boxWidth: 9, padding: 8 } } },
    scales: {
      x: { ticks: { color: TC, font: { size: 9 } }, grid: { color: GC } },
      y: { ticks: { color: TC, font: { size: 9 }, callback: v => typeof v === 'number' && v > 10000 ? fmt(v, 'usd_m') : `$${v}` }, grid: { color: GC } },
    },
  }

  return (
    <div className="chat-layout">
      {/* LEFT: conversation */}
      <div className="chat-left">
        <div className="chat-messages" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty__title">SmartRouter</div>
              <div className="chat-empty__sub">Ask a financial question — the agent will route to the appropriate OCI Functions and return analysis from Oracle ADW.</div>
              <div className="chat-empty__examples">
                <button onClick={() => setInput('Show me the balance sheet for CORP')}>Balance sheet for CORP</button>
                <button onClick={() => setInput('What is the budget vs actual variance?')}>Budget vs actual variance</button>
                <button onClick={() => setInput('Forecast AP expenses for Q3')}>Forecast AP expenses for Q3</button>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
              {msg.role === 'user' ? (
                <div className="chat-msg__user">{msg.content}</div>
              ) : (
                <div className="chat-msg__assistant">
                  <AnswerMarkdown text={msg.data?.answer || ''} />
                  {msg.data?.sources?.length > 0 && (
                    <div className="chat-msg__sources">
                      {msg.data.sources.map((s, j) => (
                        <span key={j} className="chat-msg__source-tag">{s}</span>
                      ))}
                    </div>
                  )}
                  {/* Inline chart for this message */}
                  {msg.data?.chart_data && (
                    <div className="chat-msg__chart-inline">
                      <div className="chat-msg__chart-title">{msg.data.chart_title}</div>
                      <div style={{ height: 180 }}>
                        {msg.data.chart_type === 'line'
                          ? <Line data={buildChartData(msg.data.chart_data, 'line')} options={CHART_OPTS} />
                          : <Bar data={buildChartData(msg.data.chart_data, 'bar')} options={CHART_OPTS} />}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-msg chat-msg--assistant">
              <div className="chat-msg__loading">
                <span className="chat-dot-pulse" />
                Routing query to agents…
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="chat-input-bar">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Message SmartRouter"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button className="chat-send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* RIGHT: execution trace + chart */}
      <div className="chat-right">
        {lastAssistant?.data?.trace ? (
          <TraceTimeline trace={lastAssistant.data.trace} />
        ) : (
          <div className="chat-right-empty">
            <div className="chat-right-empty__text">Execution trace will appear here after a query</div>
          </div>
        )}
      </div>
    </div>
  )
}
