import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

// Sample players, used ONLY when there is no database connection or nobody is signed in.
// They are always shown with a DEMO tag and a banner. (supabase/leaderboard.sql has the same list for the database.)
export const DEMO_PLAYERS = [
  { name: 'TrailFox', level: 9, xp: 3980, all: 34, week: 5, month: 12 },
  { name: 'MossQueen', level: 8, xp: 3100, all: 27, week: 3, month: 9 },
  { name: 'BirdNerd', level: 7, xp: 2400, all: 20, week: 6, month: 11 },
  { name: 'FernHunter', level: 6, xp: 1700, all: 15, week: 2, month: 5 },
  { name: 'PondWatcher', level: 5, xp: 1250, all: 12, week: 4, month: 7 },
  { name: 'LichenLiam', level: 4, xp: 800, all: 9, week: 0, month: 3 },
  { name: 'MothMaven', level: 3, xp: 520, all: 6, week: 1, month: 2 },
  { name: 'BeetleBen', level: 2, xp: 240, all: 3, week: 1, month: 1 },
]

// `mine` is this browser session's progress. It is only added to the sample board, and only for this visit.
function demoBoard(period, mine) {
  const rows = DEMO_PLAYERS.map((p) => ({ display_name: p.name, level: p.level, xp: p.xp, species: p[period], is_demo: true, is_me: false }))
  if (mine.species > 0) rows.push({ display_name: mine.name, level: mine.level, xp: mine.xp, species: mine.species, is_demo: false, is_me: true })
  const ranked = rows.filter((r) => r.species > 0).sort((a, b) => b.species - a.species || b.xp - a.xp)
  ranked.forEach((r, i) => { r.place = i + 1 })
  return { rows: ranked, me: ranked.find((r) => r.is_me) || null, total: ranked.length }
}

const NOTICE = {
  none: 'Sample data: these players are not real.',
  signedout: 'Sample data. Sign in to see real players.',
}

export function useLeaderboard(period, mine = {}) {
  const me0 = { name: mine.name || 'Explorer', species: mine.species || 0, level: mine.level || 1, xp: mine.xp || 0 }
  const [status, setStatus] = useState(supabase ? 'loading' : 'none') // none | loading | signedout | error | live
  const [live, setLive] = useState({ rows: [], me: null, total: 0 })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!supabase) return
    let stale = false // ignore answers that arrive after the period changed or the screen closed
    setStatus('loading')
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (stale) return
      if (!s.session) return setStatus('signedout')
      // The database does the counting and ranking. The browser only asks for it.
      const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period, p_limit: 50 })
      if (stale) return
      if (error) return setStatus('error')
      setLive({ rows: data.filter((r) => r.place <= 50), me: data.find((r) => r.is_me) || null, total: data[0]?.total_players || 0 })
      setStatus('live')
    })()
    return () => { stale = true }
  }, [period, tick])

  const demo = useMemo(() => demoBoard(period, me0), [period, me0.name, me0.species, me0.level, me0.xp])
  const onRetry = () => setTick((t) => t + 1)

  if (status === 'live') return { ...live, source: 'live', onRetry }
  if (status === 'loading') return { rows: [], me: null, total: 0, source: 'live', loading: true, onRetry }
  if (status === 'error') return { rows: [], me: null, total: 0, source: 'live', error: 'Could not load the rankings. Check your connection.', onRetry }
  return { ...demo, source: 'demo', notice: NOTICE[status], onRetry }
}
