import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const EMPTY = { kind: 'email', subject: '', recipient: '', body: '' };

export default function DraftsTab() {
  const [drafts, setDrafts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [copiedId, setCopiedId] = useState(null);

  const load = () => api.get('/notes/drafts').then(setDrafts);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.body.trim()) return;
    await api.post('/notes/drafts', form);
    setForm(EMPTY);
    load();
  };

  const remove = async (id) => { await api.del(`/notes/drafts/${id}`); load(); };

  const copy = async (d) => {
    const text = d.kind === 'email'
      ? `To: ${d.recipient || ''}\nSubject: ${d.subject || ''}\n\n${d.body}`
      : d.body;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(d.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS) — user can still select and copy the text manually below.
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Draft Emails & Messages</h2>
      <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
        Compose here, then copy and send from your own email/messaging app. Nothing is ever sent automatically.
      </p>
      <form onSubmit={submit} className="card">
        <div className="form-grid">
          <div className="form-row">
            <label>Type</label>
            <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
              <option value="email">Email</option>
              <option value="message">Text / Message</option>
            </select>
          </div>
          {form.kind === 'email' && (
            <>
              <div className="form-row"><label>Recipient</label><input value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} /></div>
              <div className="form-row"><label>Subject</label><input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
            </>
          )}
        </div>
        <div className="form-row"><label>Body</label><textarea rows={5} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
        <button type="submit" className="btn">Save Draft</button>
      </form>

      {drafts.map(d => (
        <div key={d.id} className="card">
          <strong>{d.kind === 'email' ? d.subject || '(no subject)' : 'Message'}</strong>
          {d.kind === 'email' && <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '2px 0' }}>To: {d.recipient || '-'}</p>}
          <p style={{ whiteSpace: 'pre-wrap' }}>{d.body}</p>
          <button className="btn secondary" onClick={() => copy(d)}>{copiedId === d.id ? 'Copied!' : 'Copy to Clipboard'}</button>{' '}
          <button className="btn danger" onClick={() => remove(d.id)}>Delete</button>
        </div>
      ))}
      {drafts.length === 0 && <p className="empty-state">No saved drafts yet.</p>}
    </div>
  );
}
