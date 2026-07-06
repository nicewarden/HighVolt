import { Router } from 'express';
import multer from 'multer';
import db from '../lib/db.js';
import { parseStandardsWorkbook } from '../lib/standardsImport.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const { q } = req.query;
  if (q) {
    const like = `%${q}%`;
    const rows = db.prepare(`
      SELECT * FROM reference_items
      WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
      ORDER BY created_at DESC
    `).all(like, like, like);
    return res.json(rows);
  }
  res.json(db.prepare('SELECT * FROM reference_items ORDER BY created_at DESC').all());
});

router.post('/', (req, res) => {
  const { title, category, content, url, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const info = db.prepare(`
    INSERT INTO reference_items (title, category, content, url, tags) VALUES (?, ?, ?, ?, ?)
  `).run(title, category || 'note', content || null, url || null, tags || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM reference_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Substation code/standards library (imported from a spreadsheet) ----

router.get('/standards', (req, res) => {
  res.json(db.prepare('SELECT * FROM standards ORDER BY source, sort_order').all());
});

router.get('/standards/meta', (req, res) => {
  const sources = db.prepare('SELECT source FROM standards GROUP BY source ORDER BY MIN(sort_order)').all().map(r => r.source);
  const lastImport = db.prepare('SELECT MAX(created_at) AS at FROM standards').get()?.at || null;
  res.json({ sources, count: db.prepare('SELECT COUNT(*) c FROM standards').get().c, lastImport });
});

router.post('/standards/import', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (10MB max).' : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    let rows;
    try {
      rows = parseStandardsWorkbook(req.file.buffer);
    } catch (parseErr) {
      return res.status(400).json({ error: `Could not read that spreadsheet: ${parseErr.message}` });
    }
    if (rows.length === 0) {
      return res.status(400).json({ error: "No recognizable data found - each tab needs a header row with a 'Reference Link' or 'Source' column." });
    }

    const insert = db.prepare(`
      INSERT INTO standards (source, category, code, title, detail, priority, link, sort_order)
      VALUES (@source, @category, @code, @title, @detail, @priority, @link, @sort_order)
    `);
    const replaceAll = db.transaction((items) => {
      db.prepare('DELETE FROM standards').run();
      for (const item of items) insert.run(item);
    });
    replaceAll(rows);

    res.json({ imported: rows.length });
  });
});

export default router;
