import AlertItem from './AlertItem.jsx'

export default function AlertPanel({ title, items }) {
  return (
    <div className="alert-panel">
      <div className="alert-panel__title">{title} — {items.length} items</div>
      {items.map((item, i) => <AlertItem key={i} {...item} />)}
    </div>
  )
}
