import { useEffect, useState } from 'react';
import { Mic, Trash2 } from 'lucide-react';
import { api } from '../../api/client.js';
import UpcomingEvents from '../../components/UpcomingEvents.jsx';

export default function TodoTab() {
  const [todos, setTodos] = useState([]);
  const [content, setContent] = useState('');

  const loadTodos = () => api.get('/todos').then(setTodos);

  useEffect(() => {
    loadTodos();
  }, []);

  const addTodo = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    await api.post('/todos', { content });
    setContent('');
    loadTodos();
  };

  const toggle = async (t) => {
    setTodos(todos.map(x => x.id === t.id ? { ...x, done: t.done ? 0 : 1 } : x));
    await api.patch(`/todos/${t.id}`, { done: t.done ? 0 : 1 });
    loadTodos();
  };

  const remove = async (id) => {
    await api.del(`/todos/${id}`);
    loadTodos();
  };

  return (
    <div>
      <UpcomingEvents />

      <h2 style={{ marginTop: 0, marginBottom: 0 }}>To-Do</h2>
      <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
        Manual items plus to-do items automatically created from recordings you upload on the Recordings tab.
      </p>

      <form onSubmit={addTodo} className="card" style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a to-do..."
        />
        <button type="submit" className="btn">Add</button>
      </form>

      {todos.map(t => (
        <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <input type="checkbox" checked={!!t.done} onChange={() => toggle(t)} style={{ marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}>
              {t.content}
            </p>
            {t.source === 'recording' && (
              <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '4px 0 0' }}>
                <Mic size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                From recording: {t.recording_title || 'Untitled recording'}
              </p>
            )}
          </div>
          <button className="btn danger" style={{ padding: '4px 8px' }} onClick={() => remove(t.id)} aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {todos.length === 0 && <p className="empty-state">No to-dos yet.</p>}
    </div>
  );
}
