export default function KpiStrip({ items, cols = 5 }) {
  return (
    <div className={`kpi-strip kpi-strip--${cols}`}>
      {items.map((item, i) => (
        <div key={i} className="kpi-card">
          <div className="kpi-card__label">{item.label}</div>
          <div className="kpi-card__value">{item.value}</div>
          <div className={`kpi-card__delta kpi-card__delta--${item.sentiment ?? 'neu'}`}>
            {item.delta}
          </div>
        </div>
      ))}
    </div>
  )
}
