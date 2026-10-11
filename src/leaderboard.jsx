import { useState } from 'react'
import LeaderboardView from './LeaderboardView'
import { useLeaderboard } from './leaderboardData'

// mine = { name, species, level, xp } for this session. It is only used for the sample board
// (no database or not signed in). With a real account the database supplies your rank.
export default function Leaderboard({ mine }) {
  const [period, setPeriod] = useState('all')
  const board = useLeaderboard(period, mine)
  return <LeaderboardView {...board} period={period} onPeriod={setPeriod} />
}
