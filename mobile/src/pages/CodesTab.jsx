import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import STANDARDS from '../data/standards.json';

const SOURCE_LABELS = {
  'IEEE Standards': 'IEEE',
  'NESC (Safety Code)': 'NESC',
  'NERC Reliability Std': 'NERC',
  'Other Codes & Cross-Refs': 'Other Codes',
  'OSHA Standards': 'OSHA',
  'Acronym Cheat Sheet': 'Acronyms',
};

const PRIORITY_BADGE = { high: 'overdue', medium: 'upcoming', low: 'ok' };

function priorityLevel(priority) {
  if (!priority) return null;
  const p = priority.toUpperCase();
  if (p.startsWith('HIGH')) return 'high';
  if (p.startsWith('LOW')) return 'low';
  if (p.includes('MEDIUM')) return 'medium';
  return null;
}

// Bundled offline copy of the substation code/standards library (see
// server/data/seed/standards.json in the main app) - no server, no upload,
// just the reference data shipped inside the app.
export default function CodesTab() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [priority, setPriority] = useState('all');

  const sources = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const it of STANDARDS) {
      if (!seen.has(it.source)) { seen.add(it.source); list.push(it.source); }
    }
    return list;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STANDARDS.filter(it => {
      if (source !== 'all' && it.source !== source) return false;
      if (priority !== 'all' && priorityLevel(it.priority) !== priority) return false;
      if (!q) return true;
      const hay = `${it.code || ''} ${it.title} ${it.category || ''} ${it.detail || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, source, priority]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of filtered) {
      const key = `${it.source}|${it.category || ''}`;
      if (!map.has(key)) map.set(key, { label: it.category || it.source, rows: [] });
      map.get(key).rows.push(it);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Substation Codes</h2>
      </div>
      <p style={{ fontSize: '0.78rem', opacity: 0.6, margin: '4px 0 12px' }}>{STANDARDS.length} entries · bundled offline</p>

      <div className="form-row" style={{ marginBottom: 10 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search code, title, or keyword..."
        />
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 6 }}>
        <button className={`btn ${source === 'all' ? '' : 'secondary'}`} style={{ fontSize: '0.78rem', padding: '6px 12px', flexShrink: 0 }} onClick={() => setSource('all')}>
          All
        </button>
        {sources.map(s => (
          <button
            key={s}
            className={`btn ${source === s ? '' : 'secondary'}`}
            style={{ fontSize: '0.78rem', padding: '6px 12px', flexShrink: 0, whiteSpace: 'nowrap' }}
            onClick={() => setSource(s)}
          >
            {SOURCE_LABELS[s] || s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['all', 'high', 'medium', 'low'].map(p => (
          <button
            key={p}
            className={`btn ${priority === p ? '' : 'secondary'}`}
            style={{ fontSize: '0.75rem', padding: '4px 10px', textTransform: 'capitalize' }}
            onClick={() => setPriority(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {grouped.map(({ label, rows }) => (
        <div key={label} style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7, margin: '0 0 8px' }}>
            {label}
          </h3>
          {rows.map(it => {
            const level = priorityLevel(it.priority);
            return (
              <div key={`${it.source}-${it.sort_order}`} className="card" style={{ padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {it.code && it.code !== it.title && (
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{it.code}</span>
                  )}
                  {it.priority && (
                    <span className={`badge ${PRIORITY_BADGE[level] || 'ok'}`}>{it.priority}</span>
                  )}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 600 }}>{it.title}</p>
                {it.detail && <p style={{ margin: '8px 0 0', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{it.detail}</p>}
                {it.link && (
                  <a href={it.link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', marginTop: 8 }}>
                    <ExternalLink size={13} /> Open reference
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {filtered.length === 0 && <p className="empty-state">No matching entries.</p>}
    </div>
  );
}
