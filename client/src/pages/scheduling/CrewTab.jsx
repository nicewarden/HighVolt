import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const EMPTY = { name: '', role: '', certifications: '', phone: '', email: '', notes: '' };

export default function CrewTab() {
  const [crew, setCrew] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = () => api.get('/scheduling/crew').then(setCrew);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    if (editingId) {
      await api.put(`/scheduling/crew/${editingId}`, form);
    } else {
      await api.post('/scheduling/crew', form);
    }
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
    load();
  };

  const edit = (c) => {
    setForm({ name: c.name, role: c.role || '', certifications: c.certifications || '', phone: c.phone || '', email: c.email || '', notes: c.notes || '' });
    setEditingId(c.id);
    setShowForm(true);
  };

  const remove = async (id) => { await api.del(`/scheduling/crew/${id}`); load(); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Crew Roster</h2>
        <button className="btn" onClick={() => { setShowForm(s => !s); setEditingId(null); setForm(EMPTY); }}>
          {showForm ? 'Cancel' : '+ Add Crew Member'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card">
          <div className="form-grid">
            <div className="form-row"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-row"><label>Role</label><input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Lineman, Foreman" /></div>
            <div className="form-row"><label>Certifications</label><input value={form.certifications} onChange={e => setForm({ ...form, certifications: e.target.value })} placeholder="comma separated" /></div>
            <div className="form-row"><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-row"><label>Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="form-row"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <button type="submit" className="btn">{editingId ? 'Update' : 'Save'} Crew Member</button>
        </form>
      )}

      <div className="table-scroll">
      <table>
        <thead><tr><th>Name</th><th>Role</th><th>Certifications</th><th>Phone</th><th>Email</th><th></th></tr></thead>
        <tbody>
          {crew.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.role || '-'}</td>
              <td>{c.certifications || '-'}</td>
              <td>{c.phone || '-'}</td>
              <td>{c.email || '-'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn secondary" onClick={() => edit(c)}>Edit</button>{' '}
                <button className="btn danger" onClick={() => remove(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {crew.length === 0 && <tr><td colSpan={6} className="empty-state">No crew members yet.</td></tr>}
        </tbody>
      </table>
      </div>
    </div>
  );
}
