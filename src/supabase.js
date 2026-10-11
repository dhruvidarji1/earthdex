import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// The publishable key is safe in the browser: database rules decide what each user can read or change.
// null means the .env.local values are missing, so the leaderboard shows labelled sample data instead.
export const supabase = url && key ? createClient(url, key) : null
