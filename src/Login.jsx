import { useState } from 'react'
import { supabase } from './supabase'

const FONT = 'ui-monospace, Menlo, monospace'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [username, setUsername] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw, options: { data: { username: username.trim() } } })
    setBusy(false)
    if (error) setMsg(error.message.includes('Database error') ? 'That username is taken. Try another.' : error.message)
  }

  const input = { width: '100%', padding: 12, borderRadius: 12, border: '2px solid #222', fontFamily: FONT, fontSize: 15, boxSizing: 'border-box', marginBottom: 10 }
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fdd6e1', fontFamily: FONT, padding: 16 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, background: '#fff', border: '3px solid #222', borderRadius: 24, padding: 24 }}>
        <h1 style={{ margin: '0 0 4px', letterSpacing: 3 }}>EARTHDEX</h1>
        <p style={{ marginTop: 0, color: '#666' }}>{mode === 'login' ? 'Log in to continue exploring' : 'Create your explorer account'}</p>
        {mode === 'signup' && <input style={input} placeholder="Username" required minLength={3} maxLength={20} value={username} onChange={(e) => setUsername(e.target.value)} />}
        <input style={input} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={input} type="password" placeholder="Password (6+ characters)" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
        {msg && <p style={{ color: '#b91c1c', fontSize: 13 }}>{msg}</p>}
        <button disabled={busy} style={{ ...input, background: '#9fd8f5', fontWeight: 800, cursor: 'pointer' }}>{busy ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }} style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, width: '100%' }}>
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  )
}