// Runs on the server (never on the phone), so the API key stays secret.
const MODEL = 'gemini-3.1-flash-lite'
const PROMPT = `You are EarthDex, a careful naturalist. Identify the main organism in this photo.
Reply with ONLY a JSON object:
{"found": true or false, "reason": "if found is false, a short reason", "commonName": "", "scientificName": "", "rank": "species|genus|family", "kind": "Animal|Plant|Fungus", "confidence": "high|medium|low", "alternatives": ["other likely common names"], "description": "2 engaging, Pokedex-style sentences using only well-established facts", "diet": "for animals what they eat; for plants/fungi how they get nutrients", "habitat": "typical habitat", "article": "a 150-200 word field-guide article covering appearance, behavior, geographic range, lifespan, and ecological role, using only well-established facts", "safety": "short safety note if relevant, otherwise empty"}
Rules: found=false if there is no real living animal, plant, or fungus (objects, furniture, toys, cartoons, drawings, or only people).
If you can only tell the genus or family, give that name and set rank to match. Never guess a breed or cultivar.
Use confidence "low" if the photo is blurry, too far away, or could be several species.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
  try {
    const ai = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: 'image/jpeg', data: req.body.image } },
          { text: PROMPT },
        ] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    })
    const j = await ai.json()
    if (!ai.ok) return res.status(502).json({ error: j.error?.message || 'AI request failed' })
    const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
    const a = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1))
    if (!a.found) return res.json({ found: false, reason: a.reason })
    if (a.confidence === 'low') return res.json({ found: true, confidence: 'low', alternatives: [a.commonName, ...(a.alternatives || [])] })

    // Verify the name in GBIF and get the official IUCN conservation status
    const g = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(a.scientificName)}`).then((r) => r.json()).catch(() => ({}))
    let status = 'Unknown'
    if (g.usageKey) {
      const iucn = await fetch(`https://api.gbif.org/v1/species/${g.usageKey}/iucnRedListCategory`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
      if (iucn.category) status = iucn.category.replace(/_/g, ' ').toLowerCase()
    }
    res.json({
      found: true, name: a.commonName, sci: g.canonicalName || a.scientificName, type: a.kind, rank: a.rank,
      confidence: a.confidence, desc: a.description, article: a.article, diet: a.diet, habitat: a.habitat, safety: a.safety,
      status, verified: !!g.usageKey && g.matchType !== 'NONE',
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}