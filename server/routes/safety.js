import { Router } from 'express';
import db from '../lib/db.js';

const router = Router();

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---- Checklist templates ----
router.get('/templates', (req, res) => {
  const rows = db.prepare('SELECT * FROM checklist_templates ORDER BY equipment_type, name').all();
  res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items_json) })));
});

router.post('/templates', (req, res) => {
  const { name, equipment_type, items } = req.body;
  if (!name || !equipment_type || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'name, equipment_type, and at least one item are required' });
  }
  const info = db.prepare('INSERT INTO checklist_templates (name, equipment_type, items_json) VALUES (?, ?, ?)')
    .run(name, equipment_type, JSON.stringify(items));
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/templates/:id', (req, res) => {
  db.prepare('DELETE FROM checklist_templates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Checklist completions ----
router.get('/completions', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, t.name AS template_name, t.equipment_type
    FROM checklist_completions c
    JOIN checklist_templates t ON t.id = c.template_id
    ORDER BY c.completed_date DESC, c.id DESC
  `).all();
  res.json(rows.map(r => ({ ...r, results: JSON.parse(r.results_json) })));
});

router.post('/completions', (req, res) => {
  const { template_id, site, completed_by, completed_date, results, notes } = req.body;
  if (!template_id || !site || !completed_date || !Array.isArray(results)) {
    return res.status(400).json({ error: 'template_id, site, completed_date, and results are required' });
  }
  const info = db.prepare(`
    INSERT INTO checklist_completions (template_id, site, completed_by, completed_date, results_json, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(template_id, site, completed_by || null, completed_date, JSON.stringify(results), notes || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

// ---- Incidents ----
router.get('/incidents', (req, res) => {
  const rows = db.prepare('SELECT * FROM incidents ORDER BY incident_date DESC, id DESC').all();
  res.json(rows);
});

router.post('/incidents', (req, res) => {
  const { incident_date, location, personnel, description, severity, follow_up, status } = req.body;
  if (!incident_date || !location || !description) {
    return res.status(400).json({ error: 'incident_date, location, and description are required' });
  }
  const info = db.prepare(`
    INSERT INTO incidents (incident_date, location, personnel, description, severity, follow_up, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(incident_date, location, personnel || null, description, severity || 'near-miss', follow_up || null, status || 'open');
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/incidents/:id', (req, res) => {
  const { incident_date, location, personnel, description, severity, follow_up, status } = req.body;
  const existing = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare(`
    UPDATE incidents SET incident_date=?, location=?, personnel=?, description=?, severity=?, follow_up=?, status=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(
    incident_date ?? existing.incident_date,
    location ?? existing.location,
    personnel ?? existing.personnel,
    description ?? existing.description,
    severity ?? existing.severity,
    follow_up ?? existing.follow_up,
    status ?? existing.status,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/incidents/:id', (req, res) => {
  db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Compliance calendar ----
router.get('/compliance', (req, res) => {
  const rows = db.prepare('SELECT * FROM compliance_items ORDER BY next_due ASC').all();
  const today = new Date().toISOString().slice(0, 10);
  res.json(rows.map(r => ({ ...r, overdue: r.next_due < today })));
});

router.post('/compliance', (req, res) => {
  const { name, site, equipment_type, frequency_days, last_done, next_due, notes } = req.body;
  if (!name || !frequency_days || !next_due) {
    return res.status(400).json({ error: 'name, frequency_days, and next_due are required' });
  }
  const info = db.prepare(`
    INSERT INTO compliance_items (name, site, equipment_type, frequency_days, last_done, next_due, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, site || null, equipment_type || null, frequency_days, last_done || null, next_due, notes || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Mark a compliance item done today -> recompute next_due from frequency_days
router.post('/compliance/:id/complete', (req, res) => {
  const item = db.prepare('SELECT * FROM compliance_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const today = new Date().toISOString().slice(0, 10);
  const nextDue = addDays(today, item.frequency_days);
  db.prepare('UPDATE compliance_items SET last_done=?, next_due=? WHERE id=?').run(today, nextDue, req.params.id);
  res.json({ ok: true, next_due: nextDue });
});

router.delete('/compliance/:id', (req, res) => {
  db.prepare('DELETE FROM compliance_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
