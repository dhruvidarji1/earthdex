// Turns text into speech with ElevenLabs. Runs on the server so the API key stays secret.
const MODEL = 'eleven_flash_v2_5' // fast and uses fewer credits

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })
  const key = process.env.ELEVENLABS_API_KEY
  const voice = process.env.ELEVENLABS_VOICE_ID
  if (!key || !voice) return res.status(500).json({ error: 'Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID' })
  const text = String(req.body?.text || '').slice(0, 600) // cap length to save credits
  if (!text) return res.status(400).json({ error: 'No text' })
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text, model_id: MODEL,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
      }),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      const msg = typeof j.detail === 'string' ? j.detail : j.detail?.message
      return res.status(502).json({ error: msg || `ElevenLabs error ${r.status}` })
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.send(Buffer.from(await r.arrayBuffer()))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}