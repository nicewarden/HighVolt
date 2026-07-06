import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

function NewTemplateForm({ onCreated }) {
  const [name, setName] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [items, setItems] = useState(['']);
  const [saving, setSaving] = useState(false);

  const updateItem = (i, val) => setItems(items.map((it, idx) => idx === i ? val : it));
  const addItem = () => setItems([...items, '']);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    const cleanItems = items.map(i => i.trim()).filter(Boolean).map(label => ({ label }));
    if (!name || !equipmentType || cleanItems.length === 0) return;
    setSaving(true);
    await api.post('/safety/templates', { name, equipment_type: equipmentType, items: cleanItems });
    setSaving(false);
    setName(''); setEquipmentType(''); setItems(['']);
    onCreated();
  };

  return (
    <form onSubmit={submit} className="card">
      <h3 style={{ marginTop: 0 }}>New Checklist Template</h3>
      <div className="form-grid">
        <div className="form-row">
          <label>Template name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly Substation Inspection" />
        </div>
        <div className="form-row">
          <label>Equipment type</label>
          <input value={equipmentType} onChange={e => setEquipmentType(e.target.value)} placeholder="e.g. Substation, Transformer, Switchgear" />
        </div>
      </div>
      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Checklist items</label>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input style={{ flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
            value={it} onChange={e => updateItem(i, e.target.value)} placeholder={`Item ${i + 1}`} />
          {items.length > 1 && <button type="button" className="btn secondary" onClick={() => removeItem(i)}>Remove</button>}
        </div>
      ))}
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button type="button" className="btn secondary" onClick={addItem}>+ Add item</button>
        <button type="submit" className="btn" disabled={saving}>Save Template</button>
      </div>
    </form>
  );
}

function RunChecklist({ template, onDone }) {
  const [site, setSite] = useState('');
  const [completedBy, setCompletedBy] = useState('');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().slice(0, 10));
  const [results, setResults] = useState(template.items.map(it => ({ label: it.label, checked: false, note: '' })));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (i) => setResults(results.map((r, idx) => idx === i ? { ...r, checked: !r.checked } : r));
  const updateNote = (i, val) => setResults(results.map((r, idx) => idx === i ? { ...r, note: val } : r));

  const submit = async (e) => {
    e.preventDefault();
    if (!site) return;
    setSaving(true);
    await api.post('/safety/completions', {
      template_id: template.id, site, completed_by: completedBy, completed_date: completedDate, results, notes,
    });
    setSaving(false);
    onDone();
  };

  return (
    <form onSubmit={submit} className="card">
      <h3 style={{ marginTop: 0 }}>Run: {template.name}</h3>
      <div className="form-grid">
        <div className="form-row">
          <label>Site</label>
          <input value={site} onChange={e => setSite(e.target.value)} placeholder="Site / location" />
        </div>
        <div className="form-row">
          <label>Completed by</label>
          <input value={completedBy} onChange={e => setCompletedBy(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Date</label>
          <input type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        {results.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <input type="checkbox" checked={r.checked} onChange={() => toggle(i)} style={{ width: 18, height: 18 }} />
            <span style={{ flex: '0 0 auto', minWidth: 200 }}>{r.label}</span>
            <input placeholder="note (optional)" value={r.note} onChange={e => updateNote(i, e.target.value)}
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div className="form-row" style={{ marginTop: 10 }}>
        <label>Overall notes</label>
        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <button type="submit" className="btn" disabled={saving}>Submit Checklist</button>
    </form>
  );
}

export default function ChecklistsTab() {
  const [templates, setTemplates] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [runningTemplate, setRunningTemplate] = useState(null);

  const load = () => {
    api.get('/safety/templates').then(setTemplates);
    api.get('/safety/completions').then(setCompletions);
  };
  useEffect(load, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Checklist Templates</h2>
        <button className="btn" onClick={() => setShowNewForm(s => !s)}>{showNewForm ? 'Cancel' : '+ New Template'}</button>
      </div>

      {showNewForm && <NewTemplateForm onCreated={() => { setShowNewForm(false); load(); }} />}

      {runningTemplate && (
        <RunChecklist template={runningTemplate} onDone={() => { setRunningTemplate(null); load(); }} />
      )}

      <div className="grid grid-3">
        {templates.length === 0 && <p className="empty-state">No templates yet. Create one to get started.</p>}
        {templates.map(t => (
          <div key={t.id} className="card">
            <strong>{t.name}</strong>
            <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '4px 0 10px' }}>{t.equipment_type} · {t.items.length} items</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setRunningTemplate(t)}>Run</button>
              <button className="btn danger" onClick={async () => { await api.del(`/safety/templates/${t.id}`); load(); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <h2>Completed Checklists</h2>
      <div className="table-scroll">
      <table>
        <thead><tr><th>Date</th><th>Template</th><th>Site</th><th>By</th><th>Result</th></tr></thead>
        <tbody>
          {completions.map(c => {
            const passed = c.results.filter(r => r.checked).length;
            return (
              <tr key={c.id}>
                <td>{c.completed_date}</td>
                <td>{c.template_name}</td>
                <td>{c.site}</td>
                <td>{c.completed_by || '-'}</td>
                <td>{passed}/{c.results.length} checked</td>
              </tr>
            );
          })}
          {completions.length === 0 && <tr><td colSpan={5} className="empty-state">No completed checklists yet.</td></tr>}
        </tbody>
      </table>
      </div>
    </div>
  );
}
