import { useState } from 'react';
import { api } from '../../api/client.js';

const TYPE_LABEL = { note: 'Note', reference: 'Reference Library', formula: 'Formula' };

export default function AskTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searched, setSearched] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await api.post('/chat/ask', { query });
    setResults(res.results);
    setSearched(true);
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Ask HighVolt</h2>
      <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
        This searches your saved notes, reference library, and the built-in formula glossary — everything runs
        locally on your laptop, nothing is sent to the internet.
      </p>
      <form onSubmit={ask} className="card">
        <div className="form-row">
          <label>Question or keywords</label>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. transformer sizing, or the substation manual" />
        </div>
        <button type="submit" className="btn">Search</button>
      </form>

      {searched && results && results.length === 0 && (
        <p className="empty-state">No matches in your notes, reference library, or formulas. Try different keywords, or save relevant info in Notes / Reference Library first.</p>
      )}

      {results && results.map(r => (
        <div key={`${r.type}-${r.id}`} className="card">
          <span className="badge upcoming">{TYPE_LABEL[r.type]}</span>
          <strong style={{ display: 'block', marginTop: 6 }}>{r.title}</strong>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{r.snippet}</p>
        </div>
      ))}
    </div>
  );
}
