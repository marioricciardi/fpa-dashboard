const VARIANTS = {
  critical: 'alert-badge--critical',
  warning:  'alert-badge--warning',
  info:     'alert-badge--info',
}

export default function AlertItem({ severity, text, meta }) {
  return (
    <div className="alert-item">
      <span className={`alert-badge ${VARIANTS[severity] ?? ''}`}>
        {severity.toUpperCase()}
      </span>
      <div>
        <p className="alert-content__text">{text}</p>
        {meta && <span className="alert-content__meta">{meta}</span>}
      </div>
    </div>
  )
}
