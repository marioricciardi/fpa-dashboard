// PanelGrid — Drag-to-reorder panel grid with minimize dock
// Each panel has a PanelShell with header, drag handle, minimize button, and sim badge

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSimulation } from '../context/SimulationContext.jsx'

const C = {
  bg: 'var(--color-bg-primary, #fff)',
  surf: 'var(--color-bg-secondary, #f8f8fa)',
  brd: 'var(--color-border-tertiary, rgba(0,0,0,0.10))',
  txt: 'var(--color-text-primary, #1a1a2e)',
  txts: 'var(--color-text-secondary, #5f5e6e)',
  txtt: 'var(--color-text-tertiary, #8887a0)',
  blue: '#7C3AED',
}

function FnBadge({ label }) {
  return <span style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(124,58,237,.1)', color: C.blue, borderRadius: 3, border: '0.5px solid rgba(124,58,237,.3)', whiteSpace: 'nowrap' }}>{label}</span>
}

function LowConf() {
  return <span style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(239,159,39,.1)', color: '#EF9F27', borderRadius: 3, border: '0.5px solid rgba(239,159,39,.3)' }}>low confidence</span>
}

function PanelShell({ title, badge, src, lowConf, simLabel, simColor, onMinimize, isDragging, isDropTarget, children }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, opacity: isDragging ? 0.45 : 1, boxShadow: isDropTarget ? `inset 0 0 0 2px ${C.blue}` : 'none', transition: 'opacity .12s, box-shadow .1s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px 6px', borderBottom: `0.5px solid ${C.brd}`, cursor: 'grab', userSelect: 'none', background: isDropTarget ? 'rgba(124,58,237,.04)' : C.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
          <svg width={10} height={14} viewBox="0 0 10 14" style={{ flexShrink: 0, opacity: 0.3 }}>
            {[0, 1].map(c => [0, 1, 2].map(r => <circle key={`${c}${r}`} cx={2 + c * 6} cy={3 + r * 4} r={1.4} fill={C.txt} />))}
          </svg>
          <span style={{ fontSize: 9, color: C.txtt, textTransform: 'uppercase', letterSpacing: '.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0, marginLeft: 6 }}>
          {src && <span style={{ fontSize: 9, color: C.txtt }}>{src}</span>}
          {badge && <FnBadge label={badge} />}
          {lowConf && <LowConf />}
          {simLabel && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${simColor}22`, color: simColor, border: `0.5px solid ${simColor}66` }}>⚡ {simLabel}</span>}
          <button onClick={e => { e.stopPropagation(); onMinimize() }} onMouseDown={e => e.stopPropagation()}
            style={{ width: 18, height: 18, borderRadius: 3, cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `0.5px solid ${C.brd}`, color: C.txtt, fontSize: 13, lineHeight: 1, fontWeight: 300 }}>−</button>
        </div>
      </div>
      <div style={{ padding: '10px 12px', flex: 1 }}>{children}</div>
    </div>
  )
}

export default function PanelGrid({ panels }) {
  const [order, setOrder] = useState(() => panels.map(p => p.id))
  const [minimized, setMinimized] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [overId, setOverId] = useState(null)
  const { activeSimulations } = useSimulation()
  const dragRef = useRef(null)
  const savedOrder = useRef(null)
  const debounce = useRef(null)

  // Sync order when panels are dynamically added/removed
  useEffect(() => {
    const panelIds = panels.map(p => p.id)
    setOrder(prev => {
      const added = panelIds.filter(id => !prev.includes(id))
      const kept = prev.filter(id => panelIds.includes(id))
      return added.length || kept.length !== prev.length ? [...kept, ...added] : prev
    })
  }, [panels.length, panels.map(p => p.id).join(',')])

  const onDragStart = useCallback((e, id) => { dragRef.current = id; savedOrder.current = [...order]; setActiveId(id); e.dataTransfer.effectAllowed = 'move' }, [order])
  const onDragOver = useCallback((e, id) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!dragRef.current || dragRef.current === id) return; setOverId(id); clearTimeout(debounce.current); debounce.current = setTimeout(() => { setOrder(prev => { const arr = [...prev], from = arr.indexOf(dragRef.current), to = arr.indexOf(id); if (from === -1 || to === -1 || from === to) return prev; arr.splice(from, 1); arr.splice(to, 0, dragRef.current); return arr }) }, 50) }, [])
  const onDrop = useCallback(e => { e.preventDefault(); clearTimeout(debounce.current); savedOrder.current = null }, [])
  const onDragEnd = useCallback(() => { clearTimeout(debounce.current); if (savedOrder.current) setOrder(savedOrder.current); savedOrder.current = null; dragRef.current = null; setActiveId(null); setOverId(null) }, [])
  const onDragLeave = useCallback((e, id) => { if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return; setOverId(prev => prev === id ? null : prev) }, [])
  const minimize = useCallback(id => setMinimized(prev => [...prev, id]), [])
  const restore = useCallback(id => { setMinimized(prev => prev.filter(m => m !== id)); setOrder(prev => prev.includes(id) ? prev : [...prev, id]) }, [])

  const activeIds = order.filter(id => !minimized.includes(id))
  const minDefs = minimized.map(id => panels.find(p => p.id === id)).filter(Boolean)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {activeIds.map(id => {
          const panel = panels.find(p => p.id === id)
          if (!panel) return null
          const simLabel = panel.simKPIs
            ? (() => { const s = activeSimulations.find(s => panel.simKPIs.some(k => s.affectedKPIs?.includes(k))); return s ? s.label : null })()
            : null
          const simColor = simLabel ? activeSimulations.find(s => s.label === simLabel)?.color : null
          return (
            <div key={id} draggable onDragStart={e => onDragStart(e, id)} onDragOver={e => onDragOver(e, id)} onDrop={onDrop} onDragEnd={onDragEnd} onDragLeave={e => onDragLeave(e, id)}
              style={{ gridColumn: `span ${panel.span || 1}`, border: `1px solid ${C.brd}`, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
              <PanelShell title={panel.title} badge={panel.badge} src={panel.src} lowConf={panel.lowConf}
                simLabel={simLabel} simColor={simColor}
                onMinimize={() => minimize(id)} isDragging={activeId === id} isDropTarget={overId === id && activeId !== id}>
                {panel.render()}
              </PanelShell>
            </div>
          )
        })}
      </div>
      {minDefs.length > 0 && (
        <div style={{ padding: '8px 14px', marginTop: 8, border: `1px solid ${C.brd}`, borderRadius: 6, background: C.surf, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: C.txtt, textTransform: 'uppercase', letterSpacing: '.4px', marginRight: 4 }}>MINIMIZED ({minDefs.length})</span>
          {minDefs.map(p => (
            <button key={p.id} onClick={() => restore(p.id)}
              style={{ fontSize: 10, padding: '4px 10px 4px 8px', borderRadius: 5, cursor: 'pointer', background: C.bg, border: `0.5px solid ${C.brd}`, color: C.txts, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12, color: C.blue, lineHeight: 1 }}>⊞</span>{p.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
