import { useState, useRef, useEffect } from 'react'

// Set to true to show the ✏️ Arrange buttons again
export const SHOW_ARRANGE = false

const small = { padding: '6px 12px', borderRadius: 12, border: '1px solid #ccc', background: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }
const round = (v) => Math.round(v * 10) / 10

// Lets you drag and resize the pieces of a page. key = where the layout is saved in this browser.
export function useArrange(key, defaults, order) {
  const [L, setL] = useState(() => {
    if (!SHOW_ARRANGE) return defaults
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') } } catch { return defaults }
  })
  const [edit, setEdit] = useState(false)
  const [sel, setSel] = useState(null)
  const frame = useRef()
  useEffect(() => { if (SHOW_ARRANGE) { try { localStorage.setItem(key, JSON.stringify(L)) } catch { /* ignore */ } } }, [key, L])

  const box = (k) => ({ position: 'absolute', left: `${L[k].x}%`, top: `${L[k].y}%`, width: `${L[k].w}%`, height: `${L[k].h}%` })
  const drag = (k, mode, e) => {
    e.preventDefault(); e.stopPropagation()
    const R = frame.current.getBoundingClientRect(), s = { ...L[k] }, sx = e.clientX, sy = e.clientY
    const move = (ev) => {
      const dx = ((ev.clientX - sx) / R.width) * 100, dy = ((ev.clientY - sy) / R.height) * 100
      setL((p) => ({ ...p, [k]: mode === 'move' ? { ...s, x: s.x + dx, y: s.y + dy } : { ...s, w: Math.max(3, s.w + dx), h: Math.max(1, s.h + dy) } }))
    }
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up) }
    addEventListener('pointermove', move); addEventListener('pointerup', up)
  }
  const pick = (e) => {
    const R = frame.current.getBoundingClientRect(), px = ((e.clientX - R.left) / R.width) * 100, py = ((e.clientY - R.top) / R.height) * 100
    const k = [...order].reverse().find((k) => px >= L[k].x && px <= L[k].x + L[k].w && py >= L[k].y && py <= L[k].y + L[k].h)
    setSel(k || null); if (k) drag(k, 'move', e)
  }
  const copy = () => {
    const text = JSON.stringify(L, (k, v) => (typeof v === 'number' ? round(v) : v))
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => alert('Layout copied! Paste it to Claude.'), () => prompt('Copy this layout:', text))
    else prompt('Copy this layout:', text)
  }

  const bar = SHOW_ARRANGE ? (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', margin: '4px 0' }}>
      {edit ? <>
        <button style={small} onClick={copy}>📋 Copy layout</button>
        <button style={small} onClick={() => confirm('Reset layout?') && setL(defaults)}>↺ Reset</button>
        <button style={{ ...small, background: '#000', color: '#fff' }} onClick={() => { setEdit(false); setSel(null) }}>Done</button>
      </> : <button style={small} onClick={() => setEdit(true)}>✏️ Arrange</button>}
    </div>
  ) : null

  const overlay = edit ? (
    <div onPointerDown={pick} style={{ position: 'absolute', inset: 0, touchAction: 'none', outline: '1px dashed #999', zIndex: 50 }}>
      {sel && <div style={{ ...box(sel), outline: '2px dashed #e11d48', pointerEvents: 'none' }}>
        <span style={{ position: 'absolute', top: -18, left: 0, fontSize: 11, color: '#e11d48', fontFamily: 'system-ui' }}>{sel}</span>
        <div onPointerDown={(e) => drag(sel, 'size', e)} style={{ position: 'absolute', right: -12, bottom: -12, width: 24, height: 24, borderRadius: 12, background: '#e11d48', pointerEvents: 'auto', cursor: 'nwse-resize' }} />
      </div>}
    </div>
  ) : null

  return { box, frame, bar, overlay }
}