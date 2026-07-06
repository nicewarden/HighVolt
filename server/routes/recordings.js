import { Router } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';
import db from '../lib/db.js';
import { processUpload, processPastedTranscript } from '../lib/recordingProcessor.js';
import { isConfigured, isConnected } from '../lib/outlookAuth.js';
import { syncPlaudEmails, isSyncing } from '../lib/plaudEmailSync.js';

const router = Router();

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.oga', '.webm', '.aac', '.flac', '.mp4'];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT id, title, filename, status, error, summary, created_at, updated_at
    FROM recordings ORDER BY created_at DESC
  `).all());
});

router.get('/:id', (req, res) => {
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Not found' });
  const todos = db.prepare('SELECT id, content, done FROM todos WHERE recording_id = ?').all(req.params.id);
  const events = db.prepare('SELECT id, title, site, start_time FROM jobs WHERE recording_id = ?').all(req.params.id);
  res.json({ ...rec, todos, events });
});

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (200MB max).' : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const { originalname, buffer } = req.file;
    const dotIndex = originalname.lastIndexOf('.');
    const ext = dotIndex >= 0 ? originalname.slice(dotIndex).toLowerCase() : '';
    if (!AUDIO_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: `Unsupported file type "${ext}". Upload an audio recording (.mp3, .m4a, .wav, .ogg, .webm, .aac, .flac).` });
    }

    const title = dotIndex >= 0 ? originalname.slice(0, dotIndex) : originalname;
    const info = db.prepare('INSERT INTO recordings (title, filename, status) VALUES (?, ?, ?)').run(title, originalname, 'transcribing');
    const recordingId = info.lastInsertRowid;

    const tmpPath = path.join(os.tmpdir(), `recording-upload-${recordingId}-${Date.now()}${ext}`);
    fs.writeFileSync(tmpPath, buffer);

    processUpload(recordingId, tmpPath, title).catch(err2 => console.error('Recording processing failed:', err2.message));

    res.status(201).json({ id: recordingId });
  });
});

router.post('/paste-transcript', (req, res) => {
  const { title, transcript } = req.body;
  if (!transcript || !transcript.trim()) return res.status(400).json({ error: 'transcript is required' });

  const resolvedTitle = (title && title.trim()) || `Pasted transcript - ${new Date().toLocaleString()}`;
  const info = db.prepare('INSERT INTO recordings (title, status, transcript) VALUES (?, ?, ?)')
    .run(resolvedTitle, 'summarizing', transcript.trim());
  const recordingId = info.lastInsertRowid;

  processPastedTranscript(recordingId, transcript.trim(), resolvedTitle)
    .catch(err => console.error('Pasted transcript processing failed:', err.message));

  res.status(201).json({ id: recordingId });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM recordings WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Plaud-by-email import (Outlook inbox, subject "plaud" + attachment) ----

router.get('/plaud-email/status', (req, res) => {
  const lastChecked = db.prepare('SELECT MAX(created_at) AS at FROM plaud_email_log').get()?.at || null;
  res.json({ configured: isConfigured(), connected: isConnected(), syncing: isSyncing(), lastChecked });
});

router.post('/plaud-email/check', async (req, res) => {
  if (!isConnected()) return res.status(400).json({ error: 'Outlook is not connected. Connect it from the Recordings tab first.' });
  try {
    const result = await syncPlaudEmails();
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: `Outlook Mail check failed: ${err.message}` });
  }
});

export default router;
