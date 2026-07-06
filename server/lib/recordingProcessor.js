import fs from 'fs';
import os from 'os';
import path from 'path';
import db from './db.js';
import { convertToMp3, getAudioDurationSeconds, splitAudioBySegmentTime } from './audio.js';
import { geminiTranscribe } from './gemini.js';
import { ollamaChat } from './ollama.js';

// Stay comfortably under Gemini's ~20MB inline request limit after base64
// inflates raw bytes by ~4/3, plus a little headroom for the JSON envelope.
const MAX_INLINE_BYTES = 14 * 1024 * 1024;

function setStatus(id, status, extra = {}) {
  const fields = Object.keys(extra);
  const assignments = ['status = ?', "updated_at = datetime('now')", ...fields.map(f => `${f} = ?`)];
  const values = [status, ...fields.map(f => extra[f]), id];
  db.prepare(`UPDATE recordings SET ${assignments.join(', ')} WHERE id = ?`).run(...values);
}

// Transcribes via Gemini. Short recordings go up in a single request; longer
// ones are split into chunks that each fit under the inline size limit and
// transcribed one at a time, then stitched back into one transcript.
async function transcribeAudio(mp3Path) {
  const { size } = fs.statSync(mp3Path);
  if (size <= MAX_INLINE_BYTES) {
    return geminiTranscribe(fs.readFileSync(mp3Path), 'audio/mp3');
  }

  const duration = await getAudioDurationSeconds(mp3Path);
  const segmentSeconds = Math.max(30, Math.floor(duration * (MAX_INLINE_BYTES / size)));
  const chunks = await splitAudioBySegmentTime(mp3Path, '.mp3', segmentSeconds);
  try {
    const parts = [];
    for (const chunkPath of chunks) parts.push(await geminiTranscribe(fs.readFileSync(chunkPath), 'audio/mp3'));
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  } finally {
    for (const chunkPath of chunks) fs.rmSync(chunkPath, { force: true });
  }
}

// Strip any stray bracketed/parenthesized tags before judging whether
// there's enough real speech to summarize - otherwise the model tends to
// hallucinate a summary, and worse, invented to-dos/events, from silence.
function stripNonSpeechTags(transcript) {
  return transcript.replace(/[([][^()[\]]*[)\]]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function summarizeAndExtract(transcript) {
  const spoken = stripNonSpeechTags(transcript);
  if (spoken.split(' ').filter(Boolean).length < 6) {
    return { summary: 'Recording was too short or unclear to summarize - no speech detected.', todos: [], events: [] };
  }

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You will be given a transcript relevant to a high voltage field manager's work - either a voice
memo or a pasted meeting transcript. Today's date is ${today}. Respond with ONLY a JSON object, no other text, in
this exact shape:
{
  "summary": "a concise 2-4 sentence summary",
  "todos": ["short actionable to-do item", "..."],
  "events": [{"title": "short event title", "start_time": "YYYY-MM-DDTHH:MM", "site": "location if mentioned, else null"}]
}
Rules:
- If there are no clear action items, return an empty todos array.
- Only include an event if the transcript states or clearly implies a specific date (resolve relative dates like
  "tomorrow" or "next Tuesday" against today's date). Never guess a date - omit the event instead.
- Keep each to-do short and actionable.

Transcript:
"""
${transcript.slice(0, 12000)}
"""`;

  const reply = await ollamaChat([{ role: 'user', content: prompt }]);
  const raw = reply?.content || '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { summary: raw.trim().slice(0, 500), todos: [], events: [] };
  try {
    const parsed = JSON.parse(match[0]);
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      todos: Array.isArray(parsed.todos) ? parsed.todos.filter(t => typeof t === 'string' && t.trim()) : [],
      events: Array.isArray(parsed.events)
        ? parsed.events.filter(e => e && typeof e.title === 'string' && e.title.trim() && typeof e.start_time === 'string' && !Number.isNaN(Date.parse(e.start_time)))
        : [],
    };
  } catch {
    return { summary: raw.trim().slice(0, 500), todos: [], events: [] };
  }
}

// Shared tail end of processing once a transcript exists, whether it came
// from transcribing audio or was pasted in directly: summarize it, create
// any to-dos/events it mentions, and mark the recording done.
async function finishWithTranscript(recordingId, transcript, recordingTitle, sourceLabel) {
  try {
    setStatus(recordingId, 'summarizing', { transcript });
    const { summary, todos, events } = await summarizeAndExtract(transcript);

    const insertTodo = db.prepare('INSERT INTO todos (content, source, recording_id) VALUES (?, ?, ?)');
    const insertJob = db.prepare(`
      INSERT INTO jobs (title, site, start_time, notes, recording_id) VALUES (?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction(() => {
      for (const t of todos) insertTodo.run(t, 'recording', recordingId);
      for (const e of events) {
        insertJob.run(e.title, e.site || null, new Date(e.start_time).toISOString(), `Auto-created from ${sourceLabel}: ${recordingTitle}`, recordingId);
      }
    });
    insertMany();

    setStatus(recordingId, 'done', { summary });
  } catch (err) {
    setStatus(recordingId, 'error', { error: err.message });
  }
}

export async function processUpload(recordingId, sourcePath, recordingTitle) {
  const mp3Path = path.join(os.tmpdir(), `recording-${recordingId}-${Date.now()}.mp3`);
  try {
    setStatus(recordingId, 'transcribing');
    await convertToMp3(sourcePath, mp3Path);
    const transcript = await transcribeAudio(mp3Path);
    await finishWithTranscript(recordingId, transcript, recordingTitle, 'recording');
  } catch (err) {
    setStatus(recordingId, 'error', { error: err.message });
  } finally {
    fs.rmSync(sourcePath, { force: true });
    fs.rmSync(mp3Path, { force: true });
  }
}

// A transcript pasted in directly (e.g. from a meeting app's own transcript
// export) - no audio, no transcription step, straight to summarize/extract.
export async function processPastedTranscript(recordingId, transcript, recordingTitle) {
  await finishWithTranscript(recordingId, transcript, recordingTitle, 'transcript');
}
