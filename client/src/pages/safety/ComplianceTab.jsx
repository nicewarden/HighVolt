import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

const EMPTY = { name: '', site: '', equipment_type: '', frequency_days: 30, last_done: '', next_due: '' };

export default function ComplianceTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/safety/compliance').then(setItems);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.frequency_days) return;
    const nextDue = form.next_due || addDays(form.last_done || new Date().toISOString().slice(0, 10), form.frequency_days);
    await api.post('/safety/compliance', { ...form, next_due: nextDue });
    setForm(EMPTY);
    setShowForm(false);
    load();
  };

  const complete = async (id) => { await api.post(`/safety/compliance/${id}/complete`, {}); load(); };
  const remove = async (id) => { await api.del(`/safety/compliance/${id}`); load(); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Compliance Calendar</h2>
        <button className="btn" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ New Item'}</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card">
          <div className="form-grid">
            <div className="form-row">
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual Arc Flash Study" />
            </div>
            <div className="form-row">
              <label>Site</label>
              <input value={form.site} onChange={e => setForm({ ...form, site: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Equipment type</label>
              <input value={form.equipment_type} onChange={e => setForm({ ...form, equipment_type: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Repeats every (days)</label>
              <input type="number" min={1} value={form.frequency_days} onChange={e => setForm({ ...form, frequency_days: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Last done (optional)</label>
              <input type="date" value={form.last_done} onChange={e => setForm({ ...form, last_done: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Next due (optional - auto if blank)</label>
              <input type="date" value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn">Save</button>
        </form>
      )}

      <div className="table-scroll">
      <table>
        <thead><tr><th>Name</th><th>Site</th><th>Frequency</th><th>Last Done</th><th>Next Due</th><th></th></tr></thead>
        <tbody>
          {items.map(c => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.site || '-'}</td>
              <td>every {c.frequency_days}d</td>
              <td>{c.last_done || '-'}</td>
              <td>
                {c.next_due} {c.overdue && <span className="badge overdue">overdue</span>}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn secondary" onClick={() => complete(c.id)}>Mark Done</button>{' '}
                <button className="btn danger" onClick={() => remove(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={6} className="empty-state">No compliance items yet.</td></tr>}
        </tbody>
      </table>
      </div>
    </div>
  );
}
