import { useState, useRef, useEffect, useMemo } from 'react'
import Globe from 'react-globe.gl'
import * as THREE from 'three'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import { useArrange } from './Arrange'

// STYLE
const FONT = 'ui-monospace, Menlo, monospace' // same font as the LCD screen
const OCEAN = '#9fd8f5' // baby blue ocean
const LAND = ['#fbd3df', '#fdf1c6', '#c8ecd0', '#e6d9fb', '#ffe0c2', '#d4f0f7'] // pastel country colors
const OUTLINE = '#2b2b2b' // country border color
const SPIN = 0.6 // how fast the globe turns by itself (0 = no spinning)

// Every country's outline, each given a pastel color
const COUNTRIES = feature(world, world.objects.countries).features
COUNTRIES.forEach((c, i) => { c.properties.color = LAND[i % LAND.length] })

// LAYOUT (percent of the map area). Back-to-front order:
const ORDER = ['device', 'globe', 'card']
const DEFAULT_LAYOUT = {
  device: { x: -28.5, y: -3, w: 160, h: 104 },
  globe: { x: 9.7, y: 18.2, w: 89.3, h: 60.4 },
  card: { x: 20.9, y: 72.9, w: 64.9, h: 16.1 },
}

// Measures a box so the globe can fill it exactly
function useSize(ref) {
  const [s, setS] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setS({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return s
}

// pins = catches with a location (newest first); focusT = a new catch to show right away
export default function MapPage({ pins, speciesCount, focusT, onFocused }) {
  const { box, frame, bar, overlay } = useArrange('earthdex-map-layout', DEFAULT_LAYOUT, ORDER)
  const [sel, setSel] = useState(null)
  const [place, setPlace] = useState('')
  const globeBox = useRef()
  const g = useRef()
  const size = useSize(globeBox)
  const ocean = useMemo(() => new THREE.MeshLambertMaterial({ color: OCEAN }), [])

  // A new catch from the Pokédex opens straight away
  useEffect(() => {
    if (!focusT) return
    const p = pins.find((o) => o.t === focusT)
    if (p) setSel(p)
    onFocused?.()
  }, [focusT]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pin marker: your photo in a circle with a little point underneath
  const makePin = (o) => {
    const el = document.createElement('div')
    el.style.cssText = 'pointer-events:auto;cursor:pointer'
    el.innerHTML = `<div style="transform:translateY(-50%)">
      <div style="width:34px;height:34px;border-radius:50%;border:3px solid #222;background:#fff url('${o.photo}') center/cover;box-shadow:0 2px 0 #222"></div>
      <div style="width:0;height:0;margin:-1px auto 0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid #222"></div></div>`
    el.onclick = (e) => { e.stopPropagation(); setSel(o) }
    return el
  }

  // The starting size is the biggest the globe can get; you can still zoom out (smaller)
  const setupControls = () => {
    const c = g.current?.controls()
    if (!c) return
    c.autoRotate = !sel && SPIN > 0; c.autoRotateSpeed = SPIN
    c.minDistance = c.object.position.length()
    if (sel) g.current.pointOfView({ lat: sel.lat, lng: sel.lng }, 900)
  }
  // Stop spinning and turn to a pin when one is selected
  useEffect(() => {
    const c = g.current?.controls()
    if (c) c.autoRotate = !sel && SPIN > 0
    if (sel) g.current?.pointOfView({ lat: sel.lat, lng: sel.lng }, 900)
  }, [sel])

  // Place name: saved with the catch, or looked up if it's an older catch
  useEffect(() => {
    if (!sel) return
    if (sel.place) { setPlace(sel.place); return }
    setPlace('')
    let off = false
    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${sel.lat}&longitude=${sel.lng}&localityLanguage=en`)
      .then((r) => r.json())
      .then((d) => { if (!off) setPlace([d.city || d.locality, d.principalSubdivision, d.countryName].filter(Boolean).join(', ') || 'Unknown place') })
      .catch(() => { if (!off) setPlace('Place name unavailable') })
    return () => { off = true }
  }, [sel])

  const when = sel ? (sel.t ? new Date(sel.t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : sel.date) : ''
  const card = { ...box('card'), background: '#fff', border: '0.6cqw solid #222', borderRadius: '4cqw', boxShadow: '0 1.2cqw 0 #222', padding: '2.5cqw', boxSizing: 'border-box', fontFamily: FONT, color: '#1f1f2b' }

  return <>
    {bar}
    <style>{'@keyframes pop{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}'}</style>
    <div ref={frame} style={{ position: 'relative', width: '100%', aspectRatio: '9 / 14', containerType: 'inline-size', userSelect: 'none', marginTop: 8 }}>
      {/* Your pink Pokédex */}
      <img src="/graphics/dex-bg.png" alt="" draggable={false} style={{ ...box('device'), objectFit: 'contain', pointerEvents: 'none' }} />

      {/* Cartoon globe */}
      <div ref={globeBox} style={{ ...box('globe'), display: 'grid', placeItems: 'center', cursor: 'grab' }}>
        {size.w > 0 && <Globe ref={g} width={size.w} height={size.h} backgroundColor="rgba(0,0,0,0)"
          globeMaterial={ocean} showAtmosphere atmosphereColor="#ffffff" atmosphereAltitude={0.12}
          polygonsData={COUNTRIES} polygonCapColor={(d) => d.properties.color} polygonSideColor={() => 'rgba(0,0,0,0.15)'}
          polygonStrokeColor={() => OUTLINE} polygonAltitude={0.006}
          htmlElementsData={pins} htmlLat="lat" htmlLng="lng" htmlAltitude={0.02} htmlElement={makePin}
          onGlobeReady={setupControls} />}
      </div>

      {/* Info card for the selected pin, or a summary when nothing is selected */}
      {sel ? (
        <div key={sel.t || sel.date} style={{ ...card, display: 'flex', gap: '3cqw', alignItems: 'center', animation: 'pop .25s ease-out' }}>
          <img src={sel.photo} alt="" style={{ height: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '3cqw', border: '0.5cqw solid #222', flexShrink: 0, boxSizing: 'border-box' }} />
          <div style={{ flex: 1, minWidth: 0, fontSize: '2.6cqw', lineHeight: 1.45, overflow: 'hidden' }}>
            <div style={{ fontSize: '3.8cqw', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8cqw' }}>{sel.sp.name}</div>
            <i style={{ color: '#555' }}>{sel.sp.sci}</i>
            <div><b>Found:</b> {when}</div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><b>Place:</b> {place || 'Finding place...'}{sel.approx ? ' (approximate)' : ''}</div>
            <div style={{ fontSize: '2.1cqw', color: '#888' }}>{sel.lat.toFixed(4)}, {sel.lng.toFixed(4)}{sel.sp.type ? ` · ${sel.sp.type}` : ''}{sel.sp.status ? ` · ${sel.sp.status}` : ''}</div>
          </div>
          <button onClick={() => setSel(null)} style={{ position: 'absolute', top: '1.5cqw', right: '2cqw', border: 'none', background: 'none', fontSize: '2.6cqw', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT }}>Close</button>
        </div>
      ) : (
        <div style={{ ...card, display: 'grid', placeItems: 'center', textAlign: 'center', fontSize: '3cqw', lineHeight: 1.6 }}>
          <div>
            <b style={{ fontSize: '3.8cqw' }}>{pins.length} {pins.length === 1 ? 'pin' : 'pins'} · {speciesCount} species</b>
            <div>{pins.length ? 'Tap a pin to see your find' : 'Scan something to drop your first pin'}</div>
          </div>
        </div>
      )}

      {overlay}
    </div>
  </>
}