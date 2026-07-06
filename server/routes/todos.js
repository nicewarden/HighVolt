import { Router } from 'express';
import db from '../lib/db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT t.*, r.title AS recording_title
    FROM todos t
    LEFT JOIN recordings r ON r.id = t.recording_id
    ORDER BY t.done ASC, t.created_at DESC
  `).all());
});

router.post('/', (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });
  const info = db.prepare("INSERT INTO todos (content, source) VALUES (?, 'manual')").run(content.trim());
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch('/:id', (req, res) => {
  const { done } = req.body;
  db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(done ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
