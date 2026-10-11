import { useState } from 'react'
import { XP_PER_LEVEL } from './Profile'
import { useArrange } from './Arrange'

// 🎨 STYLE
const FONT = 'ui-monospace, Menlo, monospace' // same font as the LCD screen
const ROWS = ['#fbe4e4', '#c7e0fb', '#f1e6fb', '#fdf1c6'] // row colors
const RING = { 1: '#f2c94c', 2: '#b9bec8', 3: '#d9a066' } // gold, silver, bronze
const BLOCK = { 1: '#fdf1c6', 2: '#c7e0fb', 3: '#f1e6fb' } // podium block colors
const PERIODS = [['all', 'All time'], ['week', 'Weekly'], ['month', 'Monthly']]

// 📐 LAYOUT (percent of the leaderboard area). Back-to-front order:
const ORDER = ['device', 'screen', 'buttons']
const DEFAULT_LAYOUT = {
  device: { x: -28.5, y: -3, w: 160, h: 104 },
  screen: { x: 18.5, y: 24.7, w: 70.1, h: 58.3 }, buttons: { x: 19.9, y: 84.5, w: 66.6, h: 7.6 },
}

// DEMO players (sample accounts, always labeled DEMO): [name, all-time species, XP, this week, this month]
const DEMO = [
  ['TrailFox', 34, 3980, 6, 14], ['OwlEyes', 31, 3600, 5, 11], ['MossQueen', 27, 3100, 9, 12], ['BeetleBex', 24, 2750, 8, 13],
  ['CoralKai', 22, 2550, 1, 7], ['BirdNerd', 20, 2400, 3, 8], ['SproutSam', 18, 2100, 6, 10], ['RiverRae', 17, 1950, 2, 4],
  ['FernHunter', 15, 1700, 7, 9], ['MapleMo', 14, 1600, 5, 8], ['DuneDara', 13, 1400, 3, 6], ['PondWatcher', 12, 1250, 2, 6],
  ['HawkHugo', 11, 1150, 4, 5], ['PetalPia', 10, 1000, 1, 3], ['LichenLiam', 9, 800, 4, 5], ['ToadTeo', 8, 760, 2, 4],
  ['WillowWen', 7, 650, 3, 3], ['CricketCal', 6, 540, 0, 2], ['IvyIndi', 5, 430, 1, 2], ['ReefRio', 4, 350, 1, 1],
  ['SnailSol', 3, 220, 0, 1], ['ThistleTam', 2, 140, 0, 1], ['AcornAvi', 1, 60, 1, 1],
]
const levelOf = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1

// Round profile picture
function Face({ size, ring }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', background: '#e8e8ee', border: ring ? `0.8cqw solid ${ring}` : 'none', display: 'grid', placeItems: 'center', overflow: 'hidden', boxSizing: 'border-box' }}>
      <svg viewBox="0 0 24 24" width="72%" height="72%"><circle cx="12" cy="8.5" r="4.5" fill="#b4b4c2" /><path d="M2.5 25c0-6 4.3-9.5 9.5-9.5s9.5 3.5 9.5 9.5z" fill="#b4b4c2" /></svg>
    </div>
  )
}
const Chip = ({ you }) => <span style={{ display: 'inline-block', fontSize: '1.9cqw', fontWeight: 800, padding: '0.1cqw 1.1cqw', borderRadius: 999, border: '0.3cqw solid #222', background: you ? '#222' : '#fff', color: you ? '#fff' : '#222', verticalAlign: 'middle', marginLeft: '0.8cqw' }}>{you ? 'You' : 'DEMO'}</span>
const tag = (u) => (u.me ? <Chip you /> : <Chip />)

// A pill button that presses down when tapped
function Pill({ label, on, onClick }) {
  const [down, setDown] = useState(false)
  return (
    <button onClick={onClick} onPointerDown={() => { setDown(true); navigator.vibrate?.(15) }} onPointerUp={() => setDown(false)} onPointerLeave={() => setDown(false)}
      style={{ flex: 1, height: '78%', fontFamily: FONT, fontWeight: 800, fontSize: '3.3cqw', color: '#1f1f2b', background: on ? '#fdf1c6' : '#c7e0fb', border: '0.6cqw solid #222', borderRadius: 999, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        boxShadow: down ? '0 0.3cqw 0 #222' : '0 1.2cqw 0 #222', transform: down ? 'translateY(0.9cqw)' : 'none', transition: 'transform 70ms, box-shadow 70ms' }}>{label}</button>
  )
}

// mine = { name, xp, all, week, month }: your species counts for each period
export default function Leaderboard({ mine }) {
  const [period, setPeriod] = useState('all')
  const { box, frame, bar, overlay } = useArrange('earthdex-leaderboard-layout', DEFAULT_LAYOUT, ORDER)
  const col = period === 'all' ? 1 : period === 'week' ? 3 : 4
  const list = [
    ...DEMO.map((d) => ({ name: d[0], species: d[col], xp: d[2] })),
    { name: mine.name, species: mine[period], xp: mine.xp, me: true },
  ].sort((a, b) => b.species - a.species || b.xp - a.xp)
  const myRank = list.findIndex((u) => u.me) + 1
  const me = list[myRank - 1]
  const podium = [[list[1], 2], [list[0], 1], [list[2], 3]]

  return <>
    {bar}
    <div ref={frame} style={{ position: 'relative', width: '100%', aspectRatio: '9 / 14', containerType: 'inline-size', fontFamily: FONT, color: '#1f1f2b', userSelect: 'none', marginTop: 8 }}>
      {/* Your pink Pokédex */}
      <img src="/graphics/dex-bg.png" alt="" draggable={false} style={{ ...box('device'), objectFit: 'contain', pointerEvents: 'none' }} />

      {/* Gray screen */}
      <div style={{ ...box('screen'), background: '#c9c9cf', border: '0.7cqw solid #222', borderRadius: '4cqw', padding: '2cqw', display: 'flex', boxSizing: 'border-box' }}>
        <div style={{ flex: 1, minHeight: 0, background: '#fff', border: '0.5cqw solid #222', borderRadius: '2.5cqw', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#f1e6fb', fontSize: '2.4cqw', padding: '1.2cqw 2cqw', borderBottom: '0.4cqw solid #222' }}>Players marked DEMO are sample accounts.</div>

          {/* Scrollable area: podium + everyone else */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '1.5cqw', padding: '3cqw 2cqw 0', borderBottom: '0.4cqw solid #222' }}>
              {podium.map(([u, n]) => u && (
                <div key={n} style={{ width: '31%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {n === 1 && <div style={{ fontSize: '4.5cqw', lineHeight: 1 }}>👑</div>}
                  <Face size={n === 1 ? '12cqw' : '9.5cqw'} ring={RING[n]} />
                  <div style={{ marginTop: '-1.5cqw' }}>{tag(u)}</div>
                  <div style={{ fontSize: '2.7cqw', fontWeight: 800, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize: '2.7cqw', fontWeight: 800 }}>{u.species} species</div>
                  <div style={{ fontSize: '2cqw', color: '#666', marginBottom: '1cqw' }}>Lv {levelOf(u.xp)} · {u.xp.toLocaleString()} XP</div>
                  <div style={{ width: '100%', height: n === 1 ? '11cqw' : n === 2 ? '7.5cqw' : '5.5cqw', background: BLOCK[n], border: '0.5cqw solid #222', borderBottom: 'none', borderRadius: '2cqw 2cqw 0 0', display: 'grid', placeItems: 'center', fontSize: '5cqw', fontWeight: 900, boxSizing: 'border-box' }}>{n}</div>
                </div>
              ))}
            </div>

            {list.slice(3).map((u, i) => (
              <div key={u.name} style={{ display: 'flex', alignItems: 'center', gap: '2cqw', margin: '1.6cqw 2cqw', padding: '1.6cqw 2.5cqw', borderRadius: '3cqw', background: ROWS[i % ROWS.length], border: u.me ? '0.5cqw solid #222' : '0.5cqw solid transparent' }}>
                <b style={{ width: '5cqw', textAlign: 'center', fontSize: '3.2cqw' }}>{i + 4}</b>
                <Face size="7.5cqw" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '3cqw', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}{tag(u)}</div>
                  <div style={{ fontSize: '2.2cqw', color: '#666' }}>Lv {levelOf(u.xp)} · {u.xp.toLocaleString()} XP</div>
                </div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: '4.6cqw', fontWeight: 900, lineHeight: 1 }}>{u.species}</div><div style={{ fontSize: '2cqw' }}>species</div></div>
              </div>
            ))}
          </div>

          {/* Your rank, always visible */}
          <div style={{ borderTop: '0.4cqw solid #222', padding: '1.5cqw' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2cqw', padding: '1.4cqw 2.5cqw', borderRadius: '3cqw', border: '0.5cqw solid #222', background: '#fff' }}>
              <div style={{ textAlign: 'center', width: '7cqw' }}><b style={{ fontSize: '3.8cqw' }}>#{myRank}</b><div style={{ fontSize: '1.8cqw' }}>of {list.length}</div></div>
              <Face size="7.5cqw" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '3cqw', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name}<Chip you /></div>
                <div style={{ fontSize: '2.2cqw', color: '#666' }}>Lv {levelOf(me.xp)} · {me.xp.toLocaleString()} XP</div>
              </div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: '4.6cqw', fontWeight: 900, lineHeight: 1 }}>{me.species}</div><div style={{ fontSize: '2cqw' }}>species</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Period buttons */}
      <div style={{ ...box('buttons'), display: 'flex', gap: '2.5cqw' }}>
        {PERIODS.map(([p, label]) => <Pill key={p} label={label} on={period === p} onClick={() => setPeriod(p)} />)}
      </div>

      {overlay}
    </div>
  </>
}