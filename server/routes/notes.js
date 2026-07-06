import { Router } from 'express';
import db from '../lib/db.js';

const router = Router();

router.get('/', (req, res) => {
  const { q } = req.query;
  if (q) {
    const like = `%${q}%`;
    return res.json(db.prepare('SELECT * FROM notes WHERE content LIKE ? ORDER BY created_at DESC').all(like));
  }
  res.json(db.prepare('SELECT * FROM notes ORDER BY created_at DESC').all());
});

router.post('/', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const info = db.prepare('INSERT INTO notes (content) VALUES (?)').run(content);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Drafts (email / message composer) ----
router.get('/drafts', (req, res) => {
  res.json(db.prepare('SELECT * FROM drafts ORDER BY created_at DESC').all());
});

router.post('/drafts', (req, res) => {
  const { kind, subject, recipient, body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });
  const info = db.prepare(`
    INSERT INTO drafts (kind, subject, recipient, body) VALUES (?, ?, ?, ?)
  `).run(kind || 'email', subject || null, recipient || null, body);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/drafts/:id', (req, res) => {
  db.prepare('DELETE FROM drafts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
