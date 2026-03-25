// Shows ML quality metadata below a chart when present on a ToolResult
export default function ConfidenceInfo({ toolResult }) {
  if (!toolResult) return null
  const { r_squared, _low_confidence, confidence_low, confidence_high,
          confidence_pct, computation_method, trained_as_of, assumptions } = toolResult

  return (
    <div className="conf-strip">
      <span>{computation_method}</span>
      {r_squared != null && (
        <span className="conf-r2">R² {r_squared.toFixed(2)}</span>
      )}
      {_low_confidence && (
        <span className="conf-warn">low confidence</span>
      )}
      {confidence_pct != null && confidence_low != null && (
        <span>{confidence_pct}% CI: ${Math.round(confidence_low / 1000)}K – ${Math.round(confidence_high / 1000)}K</span>
      )}
      {trained_as_of && <span>trained {trained_as_of}</span>}
      {assumptions?.length > 0 && (
        <span title={assumptions.join(' · ')}>
          {assumptions.length} assumptions ⓘ
        </span>
      )}
    </div>
  )
}
