export default function MetricCard({ label, value, delta, sentiment = 'neu' }) {
  return (
    <div style={{
      background: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      border: '0.5px solid var(--color-border-tertiary)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
        {value}
      </div>
      {delta && (
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', marginTop: 2 }}
          className={`kpi-card__delta kpi-card__delta--${sentiment}`}>
          {delta}
        </div>
      )}
    </div>
  )
}
