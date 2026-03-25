import ModelBadge from './ModelBadge.jsx'
import ConfidenceInfo from './ConfidenceInfo.jsx'

export default function ChartCard({
  title, subtitle, fn, toolResult,
  legend = [], height = 220, children
}) {
  const lowConf = toolResult?._low_confidence ?? false
  const rSq     = toolResult?.r_squared ?? null

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <span className="chart-card__title">{title}</span>
        {fn && <ModelBadge fn={fn} rSquared={rSq} lowConfidence={lowConf} />}
      </div>
      {subtitle && <div className="chart-card__subtitle">{subtitle}</div>}
      {legend.length > 0 && (
        <div className="chart-card__legend">
          {legend.map((l, i) => (
            <span key={i}>
              <span className="chart-card__legend-dot" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="chart-canvas-wrapper" style={{ height }}>
        {children}
      </div>
      {toolResult && <ConfidenceInfo toolResult={toolResult} />}
    </div>
  )
}
