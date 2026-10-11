import { useState, useRef, useEffect } from 'react'
import MapPage from './MapPage'
import Profile from './Profile'
import Leaderboard from './Leaderboard'

// THEME: change colors here
const T = { bg: '#ffffff', text: '#111111', lcd: '#eef7e8', lcdText: '#1f2d1f' }
const NAV_COLOR = '#fdd6e1' // pink nav bar (matches the Pokédex)
const NAV_HEIGHT = 72 // nav bar height in pixels
const NAV_ICON = 50 // nav image size in pixels
const FILL = 1 // 1 = the Pokédex fills the phone's width; 0.95 = a little smaller
const XP_NEW = 50 // points for a new species
const XP_REPEAT = 10 // points for seeing a species again
const PLAYER_NAME = 'Explorer' // the name shown on the profile and leaderboard
const SAVE_KEY = 'earthdex-save' // where progress is saved in this browser

// POKÉDEX LAYOUT (percent of the Pokédex area)
const FILES = { body: 'dex-bg.png', lcd: 'lcd.png', zoom: 'btn-zoom.png', info: 'btn-info.png', photo: 'btn-photo.png', toggle: 'btn-toggle.png', voice: 'btn-voice.png' }
const BTNS = ['zoom', 'info', 'photo', 'toggle', 'voice']
const LAYOUT = {
  body: { x: -22.4, y: -4.3, w: 143.8 }, lcd: { x: 5.7, y: 12.5, w: 91.9 }, screen: { x: 26.9, y: 25.6, w: 49.6, h: 36.3 },
  zoom: { x: 17.1, y: 64.8, w: 32.3 }, info: { x: 34.4, y: 52.5, w: 37.7 }, photo: { x: 39.8, y: 79.4, w: 21.1 }, toggle: { x: 53.3, y: 67.9, w: 35.4 },
  voice: { x: 28.2, y: 82.3, w: 10.8 },
}
// Fits the Pokédex into the same page shape as the other tabs (bigger width = bigger Pokédex)
const FIT = { left: '-3.58%', top: '1.67%', width: '111.27%' }
// Buttons split into parts that press separately: [name, visible slice, press origin]
const PIECES = {
  zoom: [['in', 'inset(0 50% 0 0)', '25% 50%'], ['out', 'inset(0 0 0 50%)', '75% 50%']],
  toggle: [['up', 'polygon(0 0,100% 0,50% 50%)', '50% 25%'], ['right', 'polygon(100% 0,100% 100%,50% 50%)', '75% 50%'], ['down', 'polygon(0 100%,100% 100%,50% 50%)', '50% 75%'], ['left', 'polygon(0 0,0 100%,50% 50%)', '25% 50%']],
}
const partOf = (k, u, v) => {
  if (k === 'zoom') return u < 0.5 ? 'in' : 'out'
  if (k === 'toggle') { const dx = u - 0.5, dy = v - 0.5; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') }
  return k
}
const sq = (k) => { const b = LAYOUT[k]; return { position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, ...(b.h != null ? { height: `${b.h}%` } : { aspectRatio: '1 / 1' }) } }

// Load saved progress from this browser (or start fresh)
const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {} } catch { return {} } }
const DAY = 86400000

// Shows your graphic from public/graphics, or a word if the file is missing
function Img({ src, size, fb }) {
  const [bad, setBad] = useState(false)
  return bad ? <span style={{ fontSize: 12, fontWeight: 700 }}>{fb}</span>
    : <img src={`/graphics/${src}`} alt="" draggable={false} onError={() => setBad(true)} style={{ width: size, height: size, objectFit: 'contain' }} />
}

export default function App() {
  const [tab, setTab] = useState('dex')
  const [stage, setStage] = useState('live')
  const [photo, setPhoto] = useState(null)
  const [r, setR] = useState(null)
  const [info, setInfo] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [camErr, setCamErr] = useState(false)
  const [obs, setObs] = useState(() => loadSave().obs || [])
  const [xp, setXp] = useState(() => loadSave().xp || 0)
  const [press, setPress] = useState(null)
  const video = useRef()
  const frame = useRef()
  const alpha = useRef({})
  const infoBox = useRef()
  const fileIn = useRef()

  const species = [...new Map(obs.map((o) => [o.sp.sci, o])).values()]
  const located = obs.filter((o) => o.lat != null)
  const speciesSince = (days) => new Set(obs.filter((o) => Date.now() - new Date(o.t).getTime() < days * DAY).map((o) => o.sp.sci)).size

  // Save progress in this browser whenever it changes
  useEffect(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ obs, xp })) } catch { /* storage full or blocked */ } }, [obs, xp])

  // Read each button PNG's transparency so only the drawn part is tappable
  useEffect(() => {
    BTNS.forEach((k) => {
      const i = new Image()
      i.onload = () => { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const g = c.getContext('2d'); g.drawImage(i, 0, 0); try { alpha.current[k] = g.getImageData(0, 0, c.width, c.height) } catch { /* ignore */ } }
      i.src = `/graphics/${FILES[k]}`
    })
  }, [])

  // Live camera inside the screen (back camera)
  useEffect(() => {
    if (tab !== 'dex' || stage !== 'live') return
    if (!navigator.mediaDevices) { setCamErr(true); return }
    let stream
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => { stream = s; if (video.current) video.current.srcObject = s })
      .catch(() => setCamErr(true))
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [tab, stage])

  const say = (t) => { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(t)) }
  const shrink = (src, max = 1024) => new Promise((ok) => { const i = new Image(); i.onload = () => { const s = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = i.width * s; c.height = i.height * s; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.8)) }; i.src = src })
  const getSpot = () => new Promise((ok) => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition((p) => ok([p.coords.latitude, p.coords.longitude]), () => ok([null, null]), { timeout: 8000 })
    : ok([null, null]))

  // Logs every successful catch and awards XP
  const logCatch = async (d, img) => {
    const isNew = !obs.some((o) => o.sp.sci === d.sci)
    const gain = isNew ? XP_NEW : XP_REPEAT
    const thumb = await shrink(img, 320)
    const [lat, lng] = await getSpot()
    setObs((p) => [{ sp: d, photo: thumb, date: new Date().toLocaleDateString(), t: new Date().toISOString(), lat, lng }, ...p])
    setXp((x) => x + gain)
    return { isNew, gain }
  }

  const identify = async (src) => {
    setStage('scanning')
    try {
      const img = await shrink(src)
      setPhoto(img)
      const res = await fetch('/api/identify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: img.split(',')[1] }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Identification failed')
      if (!d.found) { alert(`Species not found.\n${d.reason || 'No plant or animal detected.'}`); return again() }
      if (d.confidence === 'low') { alert(`Not sure what this is.\nCould be: ${d.alternatives.filter(Boolean).join(', ')}\nTry a closer, clearer photo.`); return again() }
      setR({ ...d, gain: null }); setStage('result'); setInfo(false)
      say(`${d.name}. ${d.desc}`) // Pokédex reads the short description aloud
      const saved = await logCatch(d, img)
      setR((prev) => ({ ...prev, ...saved }))
    } catch (e) { alert(`Scan failed: ${e.message}`); again() }
  }
  const snap = () => {
    const v = video.current
    if (!v?.videoWidth) return
    const w = v.videoWidth / zoom, h = v.videoHeight / zoom, c = document.createElement('canvas')
    c.width = w; c.height = h
    c.getContext('2d').drawImage(v, (v.videoWidth - w) / 2, (v.videoHeight - h) / 2, w, h, 0, 0, w, h)
    identify(c.toDataURL('image/jpeg', 0.9))
  }
  const onFile = (e) => { const f = e.target.files?.[0]; if (f) identify(URL.createObjectURL(f)); e.target.value = '' }
  const again = () => { speechSynthesis.cancel(); setStage('live'); setInfo(false); setPhoto(null) }

  // ---- Tapping the drawn buttons ----
  const hitTest = (e) => {
    const R = frame.current.getBoundingClientRect()
    const px = ((e.clientX - R.left) / R.width) * 100, py = ((e.clientY - R.top) / R.height) * 100
    for (const k of [...BTNS].reverse()) {
      const b = LAYOUT[k], bh = (b.w * R.width) / R.height
      const u = (px - b.x) / b.w, v = (py - b.y) / bh
      if (u < 0 || u > 1 || v < 0 || v > 1) continue
      const d = alpha.current[k]
      if (!d || d.data[(Math.floor(v * (d.height - 1)) * d.width + Math.floor(u * (d.width - 1))) * 4 + 3] > 20) return { k, u, v }
    }
    return null
  }
  const onDown = (e) => {
    const h = hitTest(e)
    if (!h) return
    const part = partOf(h.k, h.u, h.v)
    if (h.k === 'toggle' && (part === 'left' || part === 'right')) return // side arms are decoration
    setPress({ ...h, part }); navigator.vibrate?.(15)
  }
  const onUp = () => {
    if (!press) return
    const { k, part } = press
    setPress(null)
    if (k === 'zoom') setZoom((z) => (part === 'in' ? Math.min(4, z + 0.5) : Math.max(1, z - 0.5)))
    if (k === 'photo') {
      if (stage === 'live') camErr ? fileIn.current?.click() : snap()
      else if (stage === 'result') again()
    }
    if (k === 'info') { if (r && stage === 'result') setInfo((i) => !i); else alert('Take a photo of an animal or plant first.') }
    if (k === 'toggle' && info) infoBox.current?.scrollBy({ top: part === 'up' ? -80 : 80, behavior: 'smooth' }) // only scrolls on the info screen
    if (k === 'voice') {
      if (speechSynthesis.speaking) speechSynthesis.cancel()
      else if (r && stage === 'result') say(`${r.name}. ${r.desc}`)
    }
  }

  let screen

  if (tab === 'dex') screen = <>
    <input ref={fileIn} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
    {/* Same page shape as the other tabs, so the Pokédex is the same size everywhere */}
    <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 14', overflow: 'hidden', marginTop: 8 }}>
    <div ref={frame} onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={() => setPress(null)}
      style={{ position: 'absolute', ...FIT, aspectRatio: '3 / 4', touchAction: 'manipulation', userSelect: 'none' }}>
      {['body', 'lcd'].map((k) => <img key={k} src={`/graphics/${FILES[k]}`} alt="" draggable={false} style={{ ...sq(k), pointerEvents: 'none' }} />)}

      {/* LCD screen: camera, photo, or info text */}
      <div style={{ ...sq('screen'), overflow: 'hidden', background: '#000', display: 'grid', placeItems: 'center' }}>
        {info && r ? (
          <div ref={infoBox} style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: T.lcd, color: T.lcdText, padding: '8px 10px', fontSize: 12, lineHeight: 1.45, fontFamily: 'ui-monospace, Menlo, monospace' }}>
            <b style={{ fontSize: 14 }}>{r.name}</b> {r.isNew && 'NEW'}<br /><i>{r.sci}</i>
            <div style={{ fontSize: 10, margin: '4px 0' }}>{r.verified ? 'Verified in GBIF' : 'AI suggestion (not verified)'} · {r.confidence} confidence{r.rank !== 'species' ? ` · ${r.rank} only` : ''}</div>
            {r.safety && <p style={{ color: '#b91c1c' }}><b>Safety:</b> {r.safety}</p>}
            <p>{r.desc}</p>
            {r.article && <p>{r.article}</p>}
            <p><b>Diet:</b> {r.diet}<br /><b>Habitat:</b> {r.habitat}<br /><b>Conservation:</b> {r.status}</p>
            <p style={{ fontSize: 10, opacity: 0.7 }}>Use the cross to scroll. Press yellow to close.</p>
          </div>
        ) : <>
          {stage === 'live' && !camErr && <video ref={video} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />}
          {stage === 'live' && camErr && <span style={{ color: '#fff', textAlign: 'center', fontSize: 12, padding: 8 }}>Press the photo button to take a picture</span>}
          {stage !== 'live' && photo && <img src={photo} alt="scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          {stage === 'scanning' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#0006', color: '#fff', fontWeight: 700 }}>Analyzing...</div>}
          {stage === 'result' && r && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#000a', color: '#fff', fontSize: 12, padding: '4px 8px' }}>
            <b>{r.name}</b> · {r.gain == null ? 'saving...' : `+${r.gain} XP`} {r.isNew && 'NEW'}<br /><span style={{ fontSize: 10 }}>yellow = info · teal = scan again</span>
          </div>}
        </>}
      </div>

      {/* Buttons: each part presses on its own */}
      {BTNS.map((k) => (PIECES[k] || [[k, 'none', null]]).map(([id, clip, origin]) => {
        const on = press?.k === k && press.part === id
        return <img key={k + id} src={`/graphics/${FILES[k]}`} alt="" draggable={false} style={{ ...sq(k), pointerEvents: 'none', clipPath: clip,
          transformOrigin: origin || (on ? `${press.u * 100}% ${press.v * 100}%` : 'center'),
          transform: on ? 'scale(0.9) translateY(1.5%)' : 'none', filter: on ? 'brightness(0.8)' : 'none', transition: 'transform 70ms, filter 70ms' }} />
      }))}
    </div>
    </div>
  </>

  else if (tab === 'globe') screen = <MapPage pins={located} speciesCount={species.length} />

  else if (tab === 'ranks') screen = <Leaderboard mine={{ name: PLAYER_NAME, xp, all: species.length, week: speciesSince(7), month: speciesSince(30) }} />

  else screen = <Profile xp={xp} caught={species.length} places={new Set(located.map((o) => `${o.lat.toFixed(2)},${o.lng.toFixed(2)}`)).size} name={'@' + PLAYER_NAME.toLowerCase()} />

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, fontFamily: 'system-ui', overflow: 'hidden' }}>
      {/* Page area: the Pokédex is sized to fill the phone and sits right on top of the nav bar */}
      <main style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', containerType: 'size' }}>
        <div style={{ position: 'absolute', left: '50%', bottom: 0, width: `min(${124.2 * FILL}cqw, ${71.5 * FILL}cqh)`, transform: 'translate(-51.5%, 5%)' }}>
          {screen}
        </div>
        {tab === 'profile' && (
          <button onClick={() => { if (confirm('Erase all catches and XP on this device?')) { setObs([]); setXp(0) } }}
            style={{ position: 'absolute', top: 6, right: 10, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: '#aaa', fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace' }}>Reset demo progress</button>
        )}
      </main>

      {/* Pink nav bar, snug under the Pokédex */}
      <nav style={{ flexShrink: 0, display: 'flex', background: NAV_COLOR, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[['profile', 'nav-profile.png', 'Profile'], ['ranks', 'nav-trophy.png', 'Ranks'], ['dex', 'nav-dex.png', 'Dex'], ['globe', 'nav-globe.png', 'Map']].map(([t, src, fb]) => (
          <button key={t} onClick={() => { if (t !== 'dex') again(); setTab(t) }}
            style={{ flex: 1, height: NAV_HEIGHT, display: 'grid', placeItems: 'center', background: 'none', border: 'none', cursor: 'pointer', opacity: tab === t ? 1 : 0.5, transition: 'opacity 150ms', WebkitTapHighlightColor: 'transparent' }}>
            <Img src={src} size={NAV_ICON} fb={fb} />
          </button>
        ))}
      </nav>
    </div>
  )
}