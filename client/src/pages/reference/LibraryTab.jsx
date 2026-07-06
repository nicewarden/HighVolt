import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const EMPTY = { title: '', category: 'note', content: '', url: '', tags: '' };

export default function LibraryTab() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const load = (q) => api.get(`/reference${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setItems);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    await api.post('/reference', form);
    setForm(EMPTY);
    setShowForm(false);
    load(query);
  };

  const remove = async (id) => { await api.del(`/reference/${id}`); load(query); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Reference Library</h2>
        <button className="btn" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ Add Item'}</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card">
          <div className="form-grid">
            <div className="form-row"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="form-row">
              <label>Type</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="note">Note</option>
                <option value="spec-sheet">Spec Sheet</option>
                <option value="link">Link</option>
              </select>
            </div>
            <div className="form-row"><label>URL (optional)</label><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="link to manual / spec sheet" /></div>
            <div className="form-row"><label>Tags (comma separated)</label><input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          </div>
          <div className="form-row"><label>Content / notes</label><textarea rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
          <button type="submit" className="btn">Save</button>
        </form>
      )}

      <div className="form-row" style={{ maxWidth: 400 }}>
        <label>Search</label>
        <input value={query} onChange={e => { setQuery(e.target.value); load(e.target.value); }} placeholder="Search title, content, tags..." />
      </div>

      <div className="grid grid-3">
        {items.map(it => (
          <div key={it.id} className="card">
            <strong>{it.title}</strong>
            <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '2px 0 8px' }}>{it.category}{it.tags ? ` · ${it.tags}` : ''}</p>
            {it.content && <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{it.content}</p>}
            {it.url && <p><a href={it.url} target="_blank" rel="noreferrer">{it.url}</a></p>}
            <button className="btn danger" onClick={() => remove(it.id)}>Delete</button>
          </div>
        ))}
        {items.length === 0 && <p className="empty-state">No reference items yet.</p>}
      </div>
    </div>
  );
}
