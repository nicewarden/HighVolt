import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function NotesTab() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');

  const load = (q) => api.get(`/notes${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setNotes);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    await api.post('/notes', { content });
    setContent('');
    load(query);
  };

  const remove = async (id) => { await api.del(`/notes/${id}`); load(query); };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Quick Notes</h2>
      <form onSubmit={submit} className="card">
        <div className="form-row">
          <label>New note</label>
          <textarea rows={3} value={content} onChange={e => setContent(e.target.value)} placeholder="Capture a quick thought, reading, or reminder..." />
        </div>
        <button type="submit" className="btn">Save Note</button>
      </form>

      <div className="form-row" style={{ maxWidth: 400 }}>
        <label>Search</label>
        <input value={query} onChange={e => { setQuery(e.target.value); load(e.target.value); }} placeholder="Search notes..." />
      </div>

      {notes.map(n => (
        <div key={n.id} className="card">
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{n.content}</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '8px 0 0' }}>
            {new Date(n.created_at).toLocaleString()}
            {' · '}<button className="btn danger" style={{ padding: '2px 8px' }} onClick={() => remove(n.id)}>Delete</button>
          </p>
        </div>
      ))}
      {notes.length === 0 && <p className="empty-state">No notes yet.</p>}
    </div>
  );
}
