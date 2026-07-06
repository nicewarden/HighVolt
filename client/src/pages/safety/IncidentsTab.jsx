import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const EMPTY = { incident_date: new Date().toISOString().slice(0, 10), location: '', personnel: '', description: '', severity: 'near-miss', follow_up: '', status: 'open' };

export default function IncidentsTab() {
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = () => api.get('/safety/incidents').then(setIncidents);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.location || !form.description) return;
    await api.post('/safety/incidents', form);
    setForm(EMPTY);
    setShowForm(false);
    load();
  };

  const toggleStatus = async (inc) => {
    await api.put(`/safety/incidents/${inc.id}`, { status: inc.status === 'open' ? 'closed' : 'open' });
    load();
  };

  const remove = async (id) => { await api.del(`/safety/incidents/${id}`); load(); };

  const visible = incidents.filter(i => filter === 'all' || i.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Incidents & Near-Misses</h2>
        <button className="btn" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ Log Incident'}</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card">
          <div className="form-grid">
            <div className="form-row">
              <label>Date</label>
              <input type="date" value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Location</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Site / location" />
            </div>
            <div className="form-row">
              <label>Personnel involved</label>
              <input value={form.personnel} onChange={e => setForm({ ...form, personnel: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                <option value="near-miss">Near-miss</option>
                <option value="incident">Incident</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Follow-up actions</label>
            <textarea rows={2} value={form.follow_up} onChange={e => setForm({ ...form, follow_up: e.target.value })} />
          </div>
          <button type="submit" className="btn">Save Incident</button>
        </form>
      )}

      <div className="tabs">
        {['all', 'open', 'closed'].map(f => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="table-scroll">
      <table>
        <thead><tr><th>Date</th><th>Location</th><th>Severity</th><th>Description</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {visible.map(i => (
            <tr key={i.id}>
              <td>{i.incident_date}</td>
              <td>{i.location}</td>
              <td>{i.severity}</td>
              <td style={{ maxWidth: 280 }}>{i.description}</td>
              <td><span className={`badge ${i.status}`}>{i.status}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn secondary" onClick={() => toggleStatus(i)}>
                  {i.status === 'open' ? 'Close' : 'Reopen'}
                </button>{' '}
                <button className="btn danger" onClick={() => remove(i.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {visible.length === 0 && <tr><td colSpan={6} className="empty-state">No incidents match this filter.</td></tr>}
        </tbody>
      </table>
      </div>
    </div>
  );
}
