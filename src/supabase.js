import { createClient } from '@supabase/supabase-js'

// Connects the app to your Supabase project (keys come from .env.local / Vercel)
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)