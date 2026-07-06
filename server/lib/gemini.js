const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function requireApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in .env - get a free key at aistudio.google.com/apikey and add it there.');
  }
  return apiKey;
}

// Recording transcription runs on Google's free Gemini API tier via your own API
// key (aistudio.google.com - a genuinely free tier, no credit card or billing
// account required). Unlike the rest of the app, this means recording audio
// leaves the laptop and goes to Google's servers. Summarizing a transcript into
// to-dos/events afterward is unaffected - that stays on local Ollama.
//
// Transcribes a single audio buffer (must already be under Gemini's ~20MB inline
// request limit - the caller is responsible for chunking longer recordings first).
export async function geminiTranscribe(buffer, mimeType) {
  const apiKey = requireApiKey();

  const res = await fetch(`${GEMINI_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Transcribe this audio recording verbatim, word for word. Output only the raw transcript text - no commentary, no timestamps, no speaker labels, no markdown formatting. If there is no speech, output nothing.' },
          { inlineData: { mimeType, data: buffer.toString('base64') } },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini transcription request failed (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.filter(p => p.text).map(p => p.text).join(' ').trim();
}
