import { Router } from 'express';
import db from '../lib/db.js';
import { FORMULAS } from '../lib/formulas.js';

const router = Router();

const STOPWORDS = new Set(['the', 'a', 'an', 'is', 'are', 'what', 'how', 'do', 'i', 'to', 'for', 'of', 'on', 'in', 'my', 'me', 'and', 'or', 'was', 'were']);

function tokenize(text) {
  return text.toLowerCase().match(/[a-z0-9]+/g)?.filter(w => !STOPWORDS.has(w) && w.length > 1) || [];
}

function score(text, terms) {
  const lower = text.toLowerCase();
  return terms.reduce((sum, t) => sum + (lower.includes(t) ? 1 : 0), 0);
}

// Local, offline "ask" endpoint. No external API calls, no cost.
// Searches saved notes, reference library items, and the built-in formula glossary,
// then returns the best-matching snippets so you can find what you saved quickly.
router.post('/ask', (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) return res.status(400).json({ error: 'query is required' });

  const terms = tokenize(query);
  if (terms.length === 0) return res.json({ results: [] });

  const notes = db.prepare('SELECT id, content, created_at FROM notes').all()
    .map(n => ({ type: 'note', id: n.id, title: 'Note', snippet: n.content, created_at: n.created_at, score: score(n.content, terms) }));

  const refs = db.prepare('SELECT id, title, content, tags, created_at FROM reference_items').all()
    .map(r => ({ type: 'reference', id: r.id, title: r.title, snippet: r.content || '', created_at: r.created_at, score: score(`${r.title} ${r.content || ''} ${r.tags || ''}`, terms) }));

  const formulaHits = FORMULAS
    .map(f => ({ type: 'formula', id: f.id, title: f.name, snippet: `${f.formula} — ${f.explanation}`, score: score(`${f.name} ${f.keywords.join(' ')} ${f.explanation}`, terms) }));

  const results = [...notes, ...refs, ...formulaHits]
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  res.json({ results, terms });
});

export default router;
