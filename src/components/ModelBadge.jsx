// Displays OCI Function name + optional R² indicator
// lowConfidence: when r_squared < 0.70 the broker sets _low_confidence=true
export default function ModelBadge({ fn, rSquared, lowConfidence }) {
  const cls = lowConfidence ? 'model-badge model-badge--warn' : 'model-badge'
  return (
    <span className={cls}>
      {fn}
      {rSquared != null && ` · R² ${rSquared.toFixed(2)}`}
      {lowConfidence && ' ⚠'}
    </span>
  )
}
