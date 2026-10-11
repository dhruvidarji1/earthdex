import { useState, useRef, useEffect } from 'react'
import Globe from 'react-globe.gl'
import Profile from './Profile'

// 🎨 THEME: change colors here
const T = { bg: '#ffffff', text: '#111111', nav: '#8f8f8f', accent: '#bfdbfe', lcd: '#eef7e8', lcdText: '#1f2d1f', rows: ['#fbe4e4', '#fef2c7', '#bfdbfe', '#f3e8ff'] }
const DEMO_LEADERS = [{ n: 'Demo: TrailFox', s: 34 }, { n: 'Demo: MossQueen', s: 20 }, { n: 'Demo: BirdNerd', s: 12 }]
const XP_NEW = 50 // points for a new species
const XP_REPEAT = 10 // points for seeing a species again

// 📐 LAYOUT (percent of the Pokédex area)
const FILES = { body: 'dex-bg.png', lcd: 'lcd.png', zoom: 'btn-zoom.png', info: 'btn-info.png', photo: 'btn-photo.png', toggle: 'btn-toggle.png', voice: 'btn-voice.png' }
const BTNS = ['zoom', 'info', 'photo', 'toggle', 'voice']
const LAYOUT = {
  body: { x: -22.4, y: -4.3, w: 143.8 }, lcd: { x: 5.7, y: 12.5, w: 91.9 }, screen: { x: 26.9, y: 25.6, w: 49.6, h: 36.3 },
  zoom: { x: 17.1, y: 64.8, w: 32.3 }, info: { x: 34.4, y: 52.5, w: 37.7 }, photo: { x: 39.8, y: 79.4, w: 21.1 }, toggle: { x: 53.3, y: 67.9, w: 35.4 },
  voice: { x: 28.2, y: 82.3, w: 10.8 },
}
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

// Shows your graphic from public/graphics, or an emoji if the file is missing
function Img({ src, size, fb }) {
  const [bad, setBad] = useState(false)
  return bad ? <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>{fb}</span>
    : <img src={`/graphics/${src}`} alt="" onError={() => setBad(true)} style={{ width: size, height: size, objectFit: 'contain' }} />
}

export default function App() {
  const [tab, setTab] = useState('dex')
  const [stage, setStage] = useState('live')
  const [photo, setPhoto] = useState(null)
  const [r, setR] = useState(null)
  const [info, setInfo] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [camErr, setCamErr] = useState(false)
  const [obs, setObs] = useState([])
  const [xp, setXp] = useState(0)
  const [me, setMe] = useState({ name: 'Explorer', handle: '@explorer' })
  const [sel, setSel] = useState(null)
  const [press, setPress] = useState(null)
  const video = useRef()
  const frame = useRef()
  const alpha = useRef({})
  const infoBox = useRef()
  const fileIn = useRef()

  const species = [...new Map(obs.map((o) => [o.sp.sci, o])).values()]
  const located = obs.filter((o) => o.lat != null)
  const level = Math.floor(xp / 100) + 1

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
  const shrink = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => { const s = Math.min(1, 1024 / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = i.width * s; c.height = i.height * s; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.85)) }; i.src = src })

  // Automatically logs every successful catch and awards XP
  const logCatch = (d, img) => {
    const isNew = !obs.some((o) => o.sp.sci === d.sci)
    const gain = isNew ? XP_NEW : XP_REPEAT
    const save = (lat, lng) => { setObs((p) => [{ sp: d, photo: img, date: new Date().toLocaleDateString(), lat, lng }, ...p]); setXp((x) => x + gain) }
    navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => save(p.coords.latitude, p.coords.longitude), () => save(null, null), { timeout: 8000 }) : save(null, null)
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
      if (!d.found) { alert(`Species not found 🔍\n${d.reason || 'No plant or animal detected.'}`); return again() }
      if (d.confidence === 'low') { alert(`Not sure what this is.\nCould be: ${d.alternatives.filter(Boolean).join(', ')}\nTry a closer, clearer photo.`); return again() }
      const result = logCatch(d, img)
      setR({ ...d, ...result }); setStage('result'); setInfo(false)
      say(`${d.name}. ${d.desc}`) // Pokédex reads the short description aloud
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
    if (k === 'info') { if (r && stage === 'result') setInfo((i) => !i); else alert('Take a photo of an animal or plant first!') }
    if (k === 'toggle' && info) infoBox.current?.scrollBy({ top: part === 'up' ? -80 : 80, behavior: 'smooth' }) // only scrolls on the info screen
    if (k === 'voice') {
      if (speechSynthesis.speaking) speechSynthesis.cancel()
      else if (r && stage === 'result') say(`${r.name}. ${r.desc}`)
    }
  }

  const pill = { padding: '12px 20px', borderRadius: 24, border: 'none', background: T.accent, fontWeight: 700, fontSize: 16, cursor: 'pointer' }
  let screen

  if (tab === 'dex') screen = <>
    <input ref={fileIn} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
    <div ref={frame} onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={() => setPress(null)}
      style={{ position: 'relative', width: '100%', aspectRatio: '3 / 4', overflow: 'hidden', touchAction: 'manipulation', userSelect: 'none', marginTop: 8 }}>
      {['body', 'lcd'].map((k) => <img key={k} src={`/graphics/${FILES[k]}`} alt="" draggable={false} style={{ ...sq(k), pointerEvents: 'none' }} />)}

      {/* LCD screen: camera, photo, or info text */}
      <div style={{ ...sq('screen'), overflow: 'hidden', background: '#000', display: 'grid', placeItems: 'center' }}>
        {info && r ? (
          <div ref={infoBox} style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: T.lcd, color: T.lcdText, padding: '8px 10px', fontSize: 12, lineHeight: 1.45, fontFamily: 'ui-monospace, Menlo, monospace' }}>
            <b style={{ fontSize: 14 }}>{r.name}</b> {r.isNew && '★ NEW'}<br /><i>{r.sci}</i>
            <div style={{ fontSize: 10, margin: '4px 0' }}>{r.verified ? '✅ Verified in GBIF' : '⚠️ AI suggestion'} · {r.confidence} confidence{r.rank !== 'species' ? ` · ${r.rank} only` : ''}</div>
            {r.safety && <p style={{ color: '#b91c1c' }}>⚠️ {r.safety}</p>}
            <p>{r.desc}</p>
            {r.article && <p>{r.article}</p>}
            <p><b>Diet:</b> {r.diet}<br /><b>Habitat:</b> {r.habitat}<br /><b>Conservation:</b> {r.status}</p>
            <p style={{ fontSize: 10, opacity: 0.7 }}>▲▼ use the cross to scroll · yellow button to close</p>
          </div>
        ) : <>
          {stage === 'live' && !camErr && <video ref={video} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />}
          {stage === 'live' && camErr && <span style={{ color: '#fff', textAlign: 'center', fontSize: 12, padding: 8 }}>📷 Press the photo button to take a picture</span>}
          {stage !== 'live' && photo && <img src={photo} alt="scan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          {stage === 'scanning' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#0006', color: '#fff', fontWeight: 700 }}>Analyzing…</div>}
          {stage === 'result' && r && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#000a', color: '#fff', fontSize: 12, padding: '4px 8px' }}>
            <b>{r.name}</b> · +{r.gain} XP {r.isNew && '★ NEW'}<br /><span style={{ fontSize: 10 }}>yellow = info · teal = scan again</span>
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
  </>

  else if (tab === 'globe') screen = <>
    <Globe width={Math.min(innerWidth, 480) - 32} height={420} backgroundColor="rgba(0,0,0,0)"
      globeImageUrl="https://unpkg.com/three-globe/example/img/earth-day.jpg"
      htmlElementsData={located} htmlLat="lat" htmlLng="lng"
      htmlElement={(o) => { const el = document.createElement('img'); el.src = o.photo; el.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:10px;border:2px solid #fff;cursor:pointer;pointer-events:auto'; el.onclick = () => setSel(o); return el }} />
    <p style={{ textAlign: 'center' }}>{located.length} places · {species.length} species</p>
    {sel && <div style={{ background: T.accent, borderRadius: 20, padding: 12 }}><b>{sel.sp.name}</b> · {sel.date}</div>}
  </>

  else if (tab === 'ranks') screen = [...DEMO_LEADERS, { n: `${me.name} (you)`, s: species.length }].sort((a, b) => b.s - a.s).map((u, i) => (
    <div key={u.n} style={{ display: 'flex', alignItems: 'center', gap: 20, background: T.rows[i % T.rows.length], borderRadius: 24, padding: '16px 24px', margin: '20px 0' }}>
      <Img src="player.png" size={60} fb="🧍" />
      <div><b style={{ fontSize: 20 }}>caught {u.s}</b><br /><small>#{i + 1} {u.n}</small></div>
    </div>))

    else screen = <Profile xp={xp} caught={species.length} places={new Set(located.map((o) => `${o.lat.toFixed(2)},${o.lng.toFixed(2)}`)).size} name={me.handle} />

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto', padding: '8px 16px 110px' }}>
      {screen}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: T.nav, padding: '8px 0' }}>
        {[['profile', 'nav-profile.png', '👤'], ['ranks', 'nav-trophy.png', '🏆'], ['dex', 'nav-dex.png', '📘'], ['globe', 'nav-globe.png', '🌐']].map(([t, src, fb]) => (
          <button key={t} onClick={() => { if (t !== 'dex') again(); setTab(t) }} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', opacity: tab === t ? 1 : 0.55 }}>
            <Img src={src} size={56} fb={fb} />
          </button>
        ))}
      </nav>
    </div>
  )
}