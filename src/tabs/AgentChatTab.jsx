import { useState, useRef, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { Send } from 'lucide-react'
import { chatQuery } from '../api/broker.js'
import { useSimulation } from '../context/SimulationContext.jsx'
import { C, GRID, XAXIS, YAXIS, TT, fd } from '../utils/chartConstants.js'

const PALETTE = [C.chart1, C.chart2, C.chart5, C.chart4, C.chart3, C.lime, C.gray]

function buildRechartsData(chartData) {
  if (!chartData) return []
  const { labels, series } = chartData
  const keys = Object.keys(series)
  return labels.map((label, i) => {
    const row = { name: label }
    keys.forEach(k => { row[k] = series[k][i] ?? 0 })
    return row
  })
}
function seriesKeys(chartData) {
  if (!chartData) return []
  return Object.keys(chartData.series)
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
  const [streamText, setStreamText] = useState('')
  const [traceOpen, setTraceOpen] = useState(true)
  const [traceWidth, setTraceWidth] = useState(380)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const resizing = useRef(false)

  const onResizeStart = useCallback((e) => {
    e.preventDefault()
    resizing.current = true
    const startX = e.clientX
    const startW = traceWidth
    const onMove = (ev) => {
      if (!resizing.current) return
      const delta = startX - ev.clientX
      setTraceWidth(Math.max(200, Math.min(700, startW + delta)))
    }
    const onUp = () => { resizing.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [traceWidth])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, streamText])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setStreamText('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, content: m.role === 'user' ? m.content : m.data?.answer || '' }))
      const result = await chatQuery(text, history, {
        onDelta: (partial) => setStreamText(partial),
      })
      setStreamText('')
      setMessages(prev => [...prev, { role: 'assistant', data: result }])
    } catch (e) {
      setStreamText('')
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

  const { simulations } = useSimulation()
  const simActive = simulations.length > 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: traceOpen ? `1fr auto ${traceWidth}px` : '1fr auto', gap: 0, height: 'calc(100vh - 120px)', minHeight: 0 }}>
      {/* LEFT: conversation */}
      <div className="chat-left">
        <div className="chat-messages" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty__title">SmartRouter{simActive ? ' (Simulation Active)' : ''}</div>
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
                  {/* Inline charts — support multiple from broker artifacts */}
                  {(msg.data?.charts?.length > 0 ? msg.data.charts : (msg.data?.chart_data ? [{ chart_data: msg.data.chart_data, chart_type: msg.data.chart_type, chart_title: msg.data.chart_title }] : [])).map((chart, ci) => {
                    const rcData = buildRechartsData(chart.chart_data)
                    const keys = seriesKeys(chart.chart_data)
                    const isLine = chart.chart_type === 'line'
                    return (
                      <div key={ci} className="chat-msg__chart-inline">
                        <div className="chat-msg__chart-title">{chart.chart_title}</div>
                        <ResponsiveContainer width="100%" height={180}>
                          {isLine ? (
                            <LineChart data={rcData}>
                              <CartesianGrid {...GRID} /><XAxis dataKey="name" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
                              <Tooltip {...TT} formatter={v => fd(v)} /><Legend wrapperStyle={{ fontSize: 9 }} />
                              {keys.map((k, i) => <Line key={k} dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 2 }} />)}
                            </LineChart>
                          ) : (
                            <BarChart data={rcData}>
                              <CartesianGrid {...GRID} /><XAxis dataKey="name" {...XAXIS} /><YAxis {...YAXIS} tickFormatter={v => fd(v)} />
                              <Tooltip {...TT} formatter={v => fd(v)} /><Legend wrapperStyle={{ fontSize: 9 }} />
                              {keys.map((k, i) => <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.6} radius={[2, 2, 0, 0]} />)}
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-msg chat-msg--assistant">
              {streamText ? (
                <div className="chat-msg__assistant">
                  <AnswerMarkdown text={streamText} />
                  <div style={{ fontSize: 9, color: C.txtt, marginTop: 4, fontStyle: 'italic' }}>Generating…</div>
                </div>
              ) : (
                <div className="chat-msg__loading">
                  <span className="chat-dot-pulse" />
                  Routing query to agents…
                </div>
              )}
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

      {/* RESIZE HANDLE + TOGGLE */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 12, cursor: traceOpen ? 'col-resize' : 'default', userSelect: 'none', position: 'relative' }}
        onMouseDown={traceOpen ? onResizeStart : undefined}>
        <button
          onClick={() => setTraceOpen(prev => !prev)}
          title={traceOpen ? 'Close trace panel' : 'Open trace panel'}
          style={{
            position: 'absolute', top: 8, width: 20, height: 20, borderRadius: '50%',
            border: '1px solid var(--color-border-tertiary)', background: 'var(--color-bg-primary)',
            color: 'var(--color-text-tertiary)', fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
            padding: 0, lineHeight: 1,
          }}>
          {traceOpen ? '›' : '‹'}
        </button>
        {traceOpen && <div style={{ width: 3, height: 32, borderRadius: 2, background: 'var(--color-border-tertiary)' }} />}
      </div>

      {/* RIGHT: execution trace */}
      {traceOpen && (
        <div className="chat-right">
          {(() => {
            const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
            return lastAssistant?.data?.trace ? (
              <TraceTimeline trace={lastAssistant.data.trace} />
            ) : (
              <div className="chat-right-empty">
                <div className="chat-right-empty__text">Execution trace will appear here after a query</div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
