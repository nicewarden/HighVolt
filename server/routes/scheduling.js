import { Router } from 'express';
import db from '../lib/db.js';

const router = Router();

// ---- Crew ----
router.get('/crew', (req, res) => {
  res.json(db.prepare('SELECT * FROM crew ORDER BY name').all());
});

router.post('/crew', (req, res) => {
  const { name, role, certifications, phone, email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const info = db.prepare(`
    INSERT INTO crew (name, role, certifications, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, role || null, certifications || null, phone || null, email || null, notes || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/crew/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM crew WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, role, certifications, phone, email, notes } = req.body;
  db.prepare(`
    UPDATE crew SET name=?, role=?, certifications=?, phone=?, email=?, notes=? WHERE id=?
  `).run(
    name ?? existing.name,
    role ?? existing.role,
    certifications ?? existing.certifications,
    phone ?? existing.phone,
    email ?? existing.email,
    notes ?? existing.notes,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/crew/:id', (req, res) => {
  db.prepare('DELETE FROM crew WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Jobs ----
router.get('/jobs', (req, res) => {
  const rows = db.prepare('SELECT * FROM jobs ORDER BY start_time').all();
  res.json(rows.map(r => ({ ...r, crew_ids: JSON.parse(r.crew_ids_json) })));
});

router.post('/jobs', (req, res) => {
  const { title, site, start_time, end_time, crew_ids, notes } = req.body;
  if (!title || !start_time) return res.status(400).json({ error: 'title and start_time are required' });
  const info = db.prepare(`
    INSERT INTO jobs (title, site, start_time, end_time, crew_ids_json, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, site || null, start_time, end_time || null, JSON.stringify(crew_ids || []), notes || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/jobs/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { title, site, start_time, end_time, crew_ids, notes, status } = req.body;
  db.prepare(`
    UPDATE jobs SET title=?, site=?, start_time=?, end_time=?, crew_ids_json=?, notes=?, status=? WHERE id=?
  `).run(
    title ?? existing.title,
    site ?? existing.site,
    start_time ?? existing.start_time,
    end_time ?? existing.end_time,
    crew_ids ? JSON.stringify(crew_ids) : existing.crew_ids_json,
    notes ?? existing.notes,
    status ?? existing.status,
    req.params.id
  );
  res.json({ ok: true });
});

router.post('/jobs/:id/complete', (req, res) => {
  const { completion_notes } = req.body;
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE jobs SET status='complete', completion_notes=? WHERE id=?`)
    .run(completion_notes ?? existing.completion_notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/jobs/:id', (req, res) => {
  db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
