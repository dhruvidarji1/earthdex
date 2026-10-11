import { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useArrange } from './Arrange'

// ⚙️ SETTINGS
export const XP_PER_LEVEL = 2000
const AVATAR = { url: '/models/avatar.glb', distance: 2.2, light: 2.5 } // distance: smaller = bigger avatar
const FONT = 'ui-monospace, Menlo, monospace' // same font as the info screen
const TEXT_COLOR = '#222'
const BAR_COLOR = '#d9d9d9' // light gray bar
const FILL_COLOR = '#9fd8f5' // baby blue fill
const XP_TEXT_COLOR = '#a8a8a8' // light gray XP numbers
const XP_TEXT_SIZE = '50cqh' // XP numbers size (smaller number = smaller text)
const STATS_TEXT_SIZE = '3.6cqh' // stats text size (smaller number = smaller text)

// 📐 LAYOUT (percent of the profile area). Back-to-front order:
const ORDER = ['device', 'whitebox', 'stats', 'avatar', 'xpbar', 'xptext', 'level', 'username', 'edit', 'shop', 'trophy']
const FILES = { device: 'dex-bg.png', whitebox: 'white-box.png', edit: 'btn-edit.png', shop: 'btn-shop.png', trophy: 'btn-trophy.png', level: 'level.png', stats: 'stats-box.png' }
const DEFAULT_LAYOUT = {
  device: { x: -28.5, y: -3, w: 160, h: 104 }, whitebox: { x: -41.7, y: 10.1, w: 191.7, h: 69.8 }, avatar: { x: 16.8, y: 22, w: 35.7, h: 31.1 },
  edit: { x: 29.1, y: 24, w: 77.8, h: 22.1 }, shop: { x: 45.2, y: 38.9, w: 23.1, h: 13.8 }, trophy: { x: 67.2, y: 39.1, w: 20.5, h: 13.7 },
  level: { x: 19.4, y: 53.9, w: 13.4, h: 8 }, xpbar: { x: 32.2, y: 57.5, w: 52.7, h: 1.6 }, xptext: { x: 11.6, y: 59.4, w: 54.6, h: 2.3 },
  stats: { x: -17.8, y: 52.1, w: 144.6, h: 52.7 }, username: { x: 21.7, y: 49.8, w: 26, h: 2.4 },
}
// Tappable area of each button, trimmed in from its box edges: top right bottom left (bigger % = smaller area)
const HIT = { edit: '38% 27% 36% 27%', shop: '24% 24% 24% 24%', trophy: '24% 24% 24% 24%' }

const placeholder = { position: 'absolute', inset: 0, border: '2px dashed #bbb', borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 11, color: '#999' }

// An image, or a dashed placeholder if the file isn't added yet
function Pic({ k }) {
  const [bad, setBad] = useState(false)
  return bad ? <div style={placeholder}>{FILES[k]}</div>
    : <img src={`/graphics/${FILES[k]}`} alt="" draggable={false} onError={() => setBad(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
}

// A PNG button that presses in (no action yet). Only the drawn part is tappable.
function PressButton({ k, label, style }) {
  const [down, setDown] = useState(false)
  return (
    <div style={{ ...style, pointerEvents: 'none', transform: down ? 'scale(0.92) translateY(2%)' : 'none', filter: down ? 'brightness(0.85)' : 'none', transition: 'transform 70ms, filter 70ms' }}>
      <Pic k={k} />
      <button aria-label={label} onClick={() => {}} onPointerDown={() => { setDown(true); navigator.vibrate?.(15) }} onPointerUp={() => setDown(false)} onPointerLeave={() => setDown(false)}
        style={{ position: 'absolute', inset: HIT[k], padding: 0, border: 'none', background: 'none', cursor: 'pointer', pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }} />
    </div>
  )
}

// 3D avatar from a GLB file: drag to spin side to side only
function Avatar3D() {
  const ref = useRef()
  const [err, setErr] = useState(false)
  useEffect(() => {
    const el = ref.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, AVATAR.light))
    const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(3, 5, 4); scene.add(sun)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true
    controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2 // side to side only
    const fit = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix() }
    const ro = new ResizeObserver(fit); ro.observe(el); fit()
    new GLTFLoader().load(AVATAR.url, (gltf) => {
      const model = gltf.scene
      const bounds = new THREE.Box3().setFromObject(model)
      const size = bounds.getSize(new THREE.Vector3())
      model.position.sub(bounds.getCenter(new THREE.Vector3())) // center it so it spins in place
      scene.add(model)
      camera.position.set(0, 0, Math.max(size.x, size.y, size.z) * AVATAR.distance); controls.update()
    }, undefined, () => setErr(true))
    let raf
    const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop) }
    loop()
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement) }
  }, [])
  return <div ref={ref} style={{ position: 'absolute', inset: 0, cursor: 'grab' }}>
    {err && <div style={placeholder}>add public/models/avatar.glb</div>}
  </div>
}

export default function Profile({ xp, caught, places, name }) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const into = xp % XP_PER_LEVEL
  const { box, frame, bar, overlay } = useArrange('earthdex-profile-layout', DEFAULT_LAYOUT, ORDER)
  const still = { pointerEvents: 'none' } // decorations never block taps

  return <>
    {bar}
    <div ref={frame} style={{ position: 'relative', width: '100%', aspectRatio: '9 / 14', overflow: 'hidden', userSelect: 'none', color: TEXT_COLOR, fontFamily: FONT, marginTop: 8 }}>
      <div style={{ ...box('device'), ...still }}><Pic k="device" /></div>
      <div style={{ ...box('whitebox'), ...still }}><Pic k="whitebox" /></div>

      {/* Stats box */}
      <div style={{ ...box('stats'), ...still, containerType: 'size' }}>
        <Pic k="stats" />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center', fontWeight: 700, fontSize: STATS_TEXT_SIZE, lineHeight: 1.7 }}>
          <div>Animals caught: {caught}</div><div>Places explored: {places}</div>
        </div>
      </div>

      {/* Avatar sits above the decorations so it can be spun */}
      <div style={box('avatar')}><Avatar3D /></div>

      {/* XP bar: light gray, fills baby blue */}
      <div style={{ ...box('xpbar'), ...still, background: BAR_COLOR, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(into / XP_PER_LEVEL) * 100}%`, background: FILL_COLOR, borderRadius: 999, transition: 'width .8s ease' }} />
      </div>
      <div style={{ ...box('xptext'), ...still, containerType: 'size' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: XP_TEXT_COLOR, fontSize: XP_TEXT_SIZE, fontWeight: 700, whiteSpace: 'nowrap' }}>{into} / {XP_PER_LEVEL} XP</div>
      </div>

      {/* Level circle */}
      <div style={{ ...box('level'), ...still, containerType: 'size' }}>
        <Pic k="level" />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '45cqmin' }}>{level}</div>
      </div>

      {/* Username box */}
      <div style={{ ...box('username'), ...still, containerType: 'size' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#fff', border: '2px solid #222', borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: '55cqh', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>{name}</div>
      </div>

      <PressButton k="edit" label="edit profile" style={box('edit')} />
      <PressButton k="shop" label="shop" style={box('shop')} />
      <PressButton k="trophy" label="trophies" style={box('trophy')} />

      {overlay}
    </div>
  </>
}