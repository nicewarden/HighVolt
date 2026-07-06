import fs from 'fs';
import os from 'os';
import path from 'path';
import db from './db.js';
import { isConnected } from './outlookAuth.js';
import { findMatchingEmails, getAudioAttachments } from './outlookMail.js';
import { processUpload } from './recordingProcessor.js';

const SUBJECT = process.env.PLAUD_EMAIL_SUBJECT || 'plaud';

let syncing = false;

export function isSyncing() {
  return syncing;
}

function logEmail(messageId, subject, receivedAt, status, extra = {}) {
  db.prepare(`
    INSERT INTO plaud_email_log (message_id, subject, received_at, status, recording_id, error)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(messageId, subject, receivedAt, status, extra.recordingId || null, extra.error || null);
}

// Checks the connected Outlook inbox for unprocessed emails matching the
// Plaud subject, downloads any audio attachments, and feeds each one into
// the same pipeline a manual upload uses (transcribe via Gemini, summarize
// via Ollama, extract to-dos/events).
export async function syncPlaudEmails() {
  if (syncing || !isConnected()) return { checked: 0, imported: 0 };
  syncing = true;
  try {
    const messages = await findMatchingEmails(SUBJECT);
    let imported = 0;

    for (const msg of messages) {
      if (db.prepare('SELECT 1 FROM plaud_email_log WHERE message_id = ?').get(msg.id)) continue;

      try {
        const attachments = await getAudioAttachments(msg.id);
        if (attachments.length === 0) {
          logEmail(msg.id, msg.subject, msg.receivedDateTime, 'skipped', { error: 'No audio attachment found' });
          continue;
        }

        for (const att of attachments) {
          const ext = path.extname(att.name || '') || '.mp3';
          const title = path.basename(att.name || '', ext) || `Plaud recording ${msg.receivedDateTime}`;
          const tmpPath = path.join(os.tmpdir(), `plaud-email-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
          fs.writeFileSync(tmpPath, Buffer.from(att.contentBytes, 'base64'));

          const info = db.prepare('INSERT INTO recordings (title, filename, status) VALUES (?, ?, ?)')
            .run(title, att.name || null, 'transcribing');
          const recordingId = info.lastInsertRowid;
          logEmail(msg.id, msg.subject, msg.receivedDateTime, 'processed', { recordingId });

          processUpload(recordingId, tmpPath, title).catch(err => console.error('Plaud email recording processing failed:', err.message));
          imported++;
        }
      } catch (err) {
        logEmail(msg.id, msg.subject, msg.receivedDateTime, 'error', { error: err.message });
      }
    }

    return { checked: messages.length, imported };
  } finally {
    syncing = false;
  }
}
