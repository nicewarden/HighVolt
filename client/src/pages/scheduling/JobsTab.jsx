import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';

const EMPTY = { title: '', site: '', start_time: '', end_time: '', crew_ids: [], notes: '' };

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [crew, setCrew] = useState([]);
  const [view, setView] = useState('list'); // list | week | day
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [completingId, setCompletingId] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const load = () => {
    api.get('/scheduling/jobs').then(setJobs);
    api.get('/scheduling/crew').then(setCrew);
  };
  useEffect(load, []);

  const crewName = (id) => crew.find(c => c.id === id)?.name || `#${id}`;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.start_time) return;
    await api.post('/scheduling/jobs', form);
    setForm(EMPTY);
    setShowForm(false);
    load();
  };

  const toggleCrew = (id) => {
    setForm(f => ({ ...f, crew_ids: f.crew_ids.includes(id) ? f.crew_ids.filter(c => c !== id) : [...f.crew_ids, id] }));
  };

  const submitCompletion = async (id) => {
    await api.post(`/scheduling/jobs/${id}/complete`, { completion_notes: completionNotes });
    setCompletingId(null);
    setCompletionNotes('');
    load();
  };

  const remove = async (id) => { await api.del(`/scheduling/jobs/${id}`); load(); };

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [anchorDate]);

  const jobsOnDate = (date) => {
    const key = date.toISOString().slice(0, 10);
    return jobs.filter(j => j.start_time.slice(0, 10) === key);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Jobs & Dispatch</h2>
        <button className="btn" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ New Job'}</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card">
          <div className="form-grid">
            <div className="form-row"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Feeder 12 Switching" /></div>
            <div className="form-row"><label>Site</label><input value={form.site} onChange={e => setForm({ ...form, site: e.target.value })} /></div>
            <div className="form-row"><label>Start</label><input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
            <div className="form-row"><label>End (optional)</label><input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Assigned crew</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '6px 0 12px' }}>
            {crew.map(c => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.crew_ids.includes(c.id)} onChange={() => toggleCrew(c.id)} />
                {c.name}
              </label>
            ))}
            {crew.length === 0 && <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>Add crew members first on the Crew tab.</span>}
          </div>
          <div className="form-row"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <button type="submit" className="btn">Save Job</button>
        </form>
      )}

      <div className="tabs">
        {['list', 'week', 'day'].map(v => (
          <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
        ))}
      </div>

      {view === 'list' && (
        <div className="table-scroll">
        <table>
          <thead><tr><th>Start</th><th>Title</th><th>Site</th><th>Crew</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id}>
                <td>{fmtDateTime(j.start_time)}</td>
                <td>{j.title}</td>
                <td>{j.site || '-'}</td>
                <td>{j.crew_ids.map(crewName).join(', ') || '-'}</td>
                <td><span className={`badge ${j.status}`}>{j.status}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {j.status !== 'complete' && (
                    completingId === j.id ? (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <input placeholder="completion notes" value={completionNotes} onChange={e => setCompletionNotes(e.target.value)}
                          style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4 }} />
                        <button className="btn secondary" onClick={() => submitCompletion(j.id)}>Save</button>
                      </span>
                    ) : (
                      <button className="btn secondary" onClick={() => setCompletingId(j.id)}>Mark Complete</button>
                    )
                  )}{' '}
                  <button className="btn danger" onClick={() => remove(j.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan={6} className="empty-state">No jobs scheduled.</td></tr>}
          </tbody>
        </table>
        </div>
      )}

      {view === 'week' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button className="btn secondary" onClick={() => setAnchorDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd.toISOString().slice(0, 10); })}>Prev Week</button>
            <button className="btn secondary" onClick={() => setAnchorDate(new Date().toISOString().slice(0, 10))}>This Week</button>
            <button className="btn secondary" onClick={() => setAnchorDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd.toISOString().slice(0, 10); })}>Next Week</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: 8, overflowX: 'auto' }}>
            {weekDays.map(d => (
              <div key={d.toISOString()} className="card" style={{ padding: 10, minHeight: 120 }}>
                <strong style={{ fontSize: '0.8rem' }}>{d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                {jobsOnDate(d).map(j => (
                  <div key={j.id} style={{ fontSize: '0.75rem', marginTop: 6, padding: 4, background: '#f0f0f5', borderRadius: 4 }}>
                    {j.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'day' && (
        <div>
          <div className="form-row" style={{ maxWidth: 220, marginBottom: 12 }}>
            <label>Date</label>
            <input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} />
          </div>
          {jobsOnDate(new Date(anchorDate + 'T00:00:00')).map(j => (
            <div key={j.id} className="card">
              <strong>{j.title}</strong> <span className={`badge ${j.status}`}>{j.status}</span>
              <p style={{ margin: '4px 0', fontSize: '0.85rem', opacity: 0.8 }}>
                {fmtDateTime(j.start_time)} {j.end_time ? `- ${fmtDateTime(j.end_time)}` : ''} · {j.site || 'No site'}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Crew: {j.crew_ids.map(crewName).join(', ') || '-'}</p>
            </div>
          ))}
          {jobsOnDate(new Date(anchorDate + 'T00:00:00')).length === 0 && <p className="empty-state">No jobs on this day.</p>}
        </div>
      )}
    </div>
  );
}
