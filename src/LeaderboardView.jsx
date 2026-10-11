import { useState } from 'react'

// The leaderboard, drawn inside the blank pink Pokédex picture (public/graphics/dex-bg.png).
// Everything is positioned in picture pixels and sized in em, so it scales with the artwork on any screen.
const B = { x: 253, y: 76, w: 518, h: 893 } // the visible Pokédex inside the 1024 x 1024 PNG
const box = (x1, y1, x2, y2) => ({
  position: 'absolute',
  left: `${((x1 - B.x) / B.w) * 100}%`, top: `${((y1 - B.y) / B.h) * 100}%`,
  width: `${((x2 - x1) / B.w) * 100}%`, height: `${((y2 - y1) / B.h) * 100}%`,
})

// 🎨 Colors from the original Ranks screen: soft yellow, blue, purple, pink. No pink buttons.
const C = { ink: '#1c1c1c', bezel: '#c9c9cd', yellow: '#fef2c7', blue: '#bfdbfe', purple: '#f3e8ff', pink: '#fbe4e4', gold: '#f5c542', silver: '#aeb4bd', bronze: '#d99a5b' }
const ROW_COLORS = [C.pink, C.blue, C.purple]

export const PERIODS = [['all', 'All time'], ['week', 'Weekly'], ['month', 'Monthly']]
const WHEN = { all: '', week: ' this week', month: ' this month' }

const CSS = `
.lb, .lb * { box-sizing: border-box; }
.lb button { font-family: inherit; }
.lb button:focus-visible { outline: .2em solid ${C.ink}; outline-offset: .15em; }
.lb ol::-webkit-scrollbar { width: .45em; }
.lb ol::-webkit-scrollbar-thumb { background: #b9bcc4; border-radius: 1em; }
`

// Grey head-and-shoulders avatar (the same look the 3D profile avatar will use). `ring` marks the top three.
function Avatar({ size, ring }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" style={{ width: size, height: size, flex: 'none', borderRadius: '50%', overflow: 'hidden', boxShadow: ring ? `0 0 0 .2em ${ring}` : 'none' }}>
      <circle cx="20" cy="20" r="20" fill="#e6e8ec" />
      <ellipse cx="20" cy="39" rx="15" ry="12" fill="url(#lbBody)" />
      <circle cx="20" cy="15.5" r="7.5" fill="url(#lbHead)" />
    </svg>
  )
}

function Crown() {
  return (
    <svg viewBox="0 0 24 14" aria-hidden="true" style={{ width: '1.7em', height: '1em', marginBottom: '.15em' }}>
      <path d="M2 12.5 L1 3 L7 7 L12 1 L17 7 L23 3 L22 12.5 Z" fill={C.gold} stroke={C.ink} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

const Tag = ({ children, dark, flush }) => (
  <span style={{ flex: 'none', marginLeft: flush ? 0 : '.4em', whiteSpace: 'nowrap', padding: '.1em .45em', borderRadius: '1em', border: `.1em solid ${C.ink}`, background: dark ? C.ink : '#fff', color: dark ? '#fff' : C.ink, fontSize: '.6em', fontWeight: 800, lineHeight: 1.3 }}>{children}</span>
)

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }

// One player: rank, avatar, name, level, XP, species. Used for list rows and for the pinned "you" bar.
function Line({ r, bg, outlined, lead, leadWidth = '1.9em' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.55em', background: bg, borderRadius: '1.25em', padding: '.4em .8em .4em .5em', border: `.17em solid ${outlined ? C.ink : 'transparent'}` }}>
      <div style={{ width: leadWidth, flex: 'none', textAlign: 'center', lineHeight: 1.05 }}>{lead}</div>
      <Avatar size="2.4em" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <b style={ellipsis}>{r.display_name}</b>
          {r.is_demo && <Tag>DEMO</Tag>}{r.is_me && <Tag dark>You</Tag>}
        </div>
        <div style={{ ...ellipsis, fontSize: '.76em', opacity: 0.75 }}>Lv {r.level} · {r.xp.toLocaleString()} XP</div>
      </div>
      <div style={{ flex: 'none', textAlign: 'right', lineHeight: 1 }}>
        <b style={{ fontSize: '1.3em' }}>{r.species}</b><br /><span style={{ fontSize: '.68em' }}>species</span>
      </div>
    </div>
  )
}

// Top three on a podium: yellow, blue, purple blocks, with a crown on first place.
function Slot({ r, n }) {
  const fill = n === 1 ? C.yellow : n === 2 ? C.blue : C.purple
  const ring = n === 1 ? C.gold : n === 2 ? C.silver : C.bronze
  const size = n === 1 ? '3.4em' : '2.7em'
  const badge = r?.is_me ? 'You' : r?.is_demo ? 'DEMO' : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, textAlign: 'center' }}>
      {n === 1 && <Crown />}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {r ? <Avatar size={size} ring={ring} /> : <div style={{ width: size, height: size, borderRadius: '50%', border: '.15em dashed #b9bcc4' }} />}
        {badge && <span style={{ position: 'absolute', bottom: '-.6em', left: '50%', transform: 'translateX(-50%)', display: 'flex' }}><Tag dark={badge === 'You'} flush>{badge}</Tag></span>}
      </div>
      <b style={{ ...ellipsis, maxWidth: '100%', fontSize: '.76em', marginTop: '.75em', opacity: r ? 1 : 0.5 }}>{r ? r.display_name : 'Open spot'}</b>
      {r && <>
        <b style={{ fontSize: '.78em' }}>{r.species} species</b>
        <span style={{ ...ellipsis, maxWidth: '100%', fontSize: '.7em', opacity: 0.75 }}>Lv {r.level} · {r.xp.toLocaleString()} XP</span>
      </>}
      <div style={{ width: '100%', height: n === 1 ? '2.2em' : n === 2 ? '1.7em' : '1.4em', marginTop: '.3em', background: fill, border: `.17em solid ${C.ink}`, borderBottom: 'none', borderRadius: '.6em .6em 0 0', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: n === 1 ? '1.4em' : '1.15em' }}>{n}</div>
    </div>
  )
}

const periodBtn = (on) => ({
  fontWeight: 800, fontSize: '.95em', color: C.ink, cursor: 'pointer',
  background: on ? C.yellow : C.blue, border: `.18em solid ${C.ink}`, borderRadius: '999em',
  boxShadow: on ? 'none' : `0 .22em 0 ${C.ink}`, transform: on ? 'translateY(.22em)' : 'none',
})

// rows: [{ place, display_name, level, species, xp, is_demo, is_me }], me: the signed-in player's row (or null)
export default function LeaderboardView({ rows = [], me = null, total = 0, period = 'all', onPeriod = () => {}, source = 'demo', notice = '', loading = false, error = null, onRetry = () => {} }) {
  const [noArt, setNoArt] = useState(false)
  const banner = source === 'demo' ? notice : rows.some((r) => r.is_demo) ? 'Players marked DEMO are samples, not real people.' : ''
  const ready = !loading && !error
  const center = { flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '1em', fontSize: '.85em', lineHeight: 1.35 }

  return (
    <section className="lb" aria-label="Global leaderboard" style={{ containerType: 'inline-size', position: 'relative', width: '100%', aspectRatio: `${B.w} / ${B.h}`, overflow: 'hidden', marginTop: 8 }}>
      <style>{CSS}</style>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <radialGradient id="lbHead" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#dcdfe5" /><stop offset="1" stopColor="#979ba5" /></radialGradient>
          <radialGradient id="lbBody" cx=".4" cy=".15" r=".95"><stop offset="0" stopColor="#d2d5db" /><stop offset="1" stopColor="#8f939d" /></radialGradient>
        </defs>
      </svg>

      {noArt
        ? <div style={{ position: 'absolute', inset: 0, background: '#fdd8e3', border: `3px solid ${C.ink}`, borderRadius: '8% / 4%' }} />
        : <img src="/graphics/dex-bg.png" alt="" draggable={false} onError={() => setNoArt(true)} style={{ position: 'absolute', width: `${(1024 / B.w) * 100}%`, left: `${(-B.x / B.w) * 100}%`, top: `${(-B.y / B.h) * 100}%`, pointerEvents: 'none', userSelect: 'none' }} />}

      <div style={{ position: 'absolute', inset: 0, fontSize: '3.55cqw', color: C.ink }}>
        {/* Title in the notch of the Pokédex */}
        <div style={{ ...box(604, 170, 758, 236), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', lineHeight: 1.15 }}>
          <h2 style={{ margin: 0, fontSize: '1.05em', fontWeight: 900 }}>Leaderboard</h2>
          <span style={{ fontSize: '.68em' }}>species discovered</span>
        </div>

        {/* The screen */}
        <div style={{ ...box(303, 252, 750, 826), background: C.bezel, border: `.2em solid ${C.ink}`, borderRadius: '1.1em', padding: '.7em', display: 'flex' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff', border: `.15em solid ${C.ink}`, borderRadius: '.5em', overflow: 'hidden' }}>
            {banner && <div style={{ flex: 'none', background: C.purple, borderBottom: `.1em solid ${C.ink}`, padding: '.4em .7em', fontSize: '.76em', lineHeight: 1.3 }}>{banner}</div>}

            {loading && (
              <div role="status" aria-live="polite" style={{ flex: 1, padding: '.8em .6em', display: 'grid', gap: '.5em', alignContent: 'start' }}>
                <span style={{ fontSize: '.8em' }}>Loading rankings…</span>
                {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: '3.2em', borderRadius: '1.25em', background: '#eceef2' }} />)}
              </div>
            )}

            {error && (
              <div role="alert" style={{ ...center, alignContent: 'center', gap: '.6em' }}>
                <span>{error}</span>
                <button onClick={onRetry} style={{ ...periodBtn(false), padding: '.5em 1.4em', fontSize: '.9em' }}>Try again</button>
              </div>
            )}

            {ready && rows.length === 0 && <div style={center}>No one is on the board{WHEN[period]} yet.<br />Catch a species to take first place.</div>}

            {ready && rows.length > 0 && <>
              <div role="group" aria-label="Top three" style={{ flex: 'none', display: 'grid', gridTemplateColumns: '1fr 1.18fr 1fr', gap: '.5em', alignItems: 'end', padding: '.6em .6em 0' }}>
                <Slot r={rows[1]} n={2} /><Slot r={rows[0]} n={1} /><Slot r={rows[2]} n={3} />
              </div>
              <ol start={4} aria-label="Ranks 4 and below" style={{ flex: 1, minHeight: 0, margin: 0, padding: '.55em .6em', listStyle: 'none', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '.45em', alignContent: 'start', overflowY: 'auto', borderTop: `.15em solid ${C.ink}` }}>
                {rows.slice(3).map((r, i) => <li key={r.place} style={{ minWidth: 0 }}><Line r={r} bg={ROW_COLORS[i % 3]} outlined={r.is_me} lead={<b>{r.place}</b>} /></li>)}
                {rows.length <= 5 && <li style={{ textAlign: 'center', fontSize: '.75em', opacity: 0.6, padding: '.8em 0' }}>More explorers will show up here.</li>}
              </ol>
            </>}

            {/* Your own rank, always visible */}
            {ready && (
              <div style={{ flex: 'none', padding: '.45em .6em', background: '#fff', borderTop: `.15em solid ${C.ink}` }}>
                {me
                  ? <Line r={me} bg="#fff" outlined leadWidth="2.9em" lead={<><b style={{ fontSize: '1.15em' }}>#{me.place}</b><br /><span style={{ fontSize: '.64em' }}>of {total}</span></>} />
                  : <div style={{ fontSize: '.78em', textAlign: 'center', lineHeight: 1.3 }}>You're not ranked yet. Catch a species{WHEN[period]} to join the board.</div>}
              </div>
            )}
          </div>
        </div>

        {/* Period buttons: the selected one turns yellow, the others stay blue */}
        <div role="group" aria-label="Time period" style={{ ...box(303, 848, 750, 914), display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1em', paddingBottom: '.25em' }}>
          {PERIODS.map(([k, label]) => (
            <button key={k} aria-pressed={period === k} onClick={() => onPeriod(k)} style={periodBtn(period === k)}>{label}</button>
          ))}
        </div>
      </div>
    </section>
  )
}
